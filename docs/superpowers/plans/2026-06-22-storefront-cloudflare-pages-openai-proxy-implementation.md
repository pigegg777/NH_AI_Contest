# Storefront Cloudflare Pages OpenAI Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the storefront feature's AI design calls from reading `VITE_OPENAI_API_KEY` in the browser; move them behind two narrow, auth-gated Cloudflare Pages Functions routes, while keeping the heuristic fallback and the public QR storefront untouched.

**Architecture:** Split each AI interpreter file into (1) a pure contract module (schema + request builder + response normalizer + heuristic fallback, framework/env-agnostic, importable by both Vite and the Workers runtime), (2) a client gateway (decides heuristic vs. same-origin fetch, attaches the Supabase access token), and (3) a Cloudflare Pages Function (validates the JWT and office ownership, calls OpenAI with the server-only key, returns a normalized intent).

**Tech Stack:** React 19 + Vite 8 + Vitest 4 (existing), Cloudflare Pages Functions (Workers runtime, no new dependency), `@supabase/supabase-js` (already a dependency, used server-side too).

## Global Constraints

- Pages project root directory is `react-app/`; Functions must live at `react-app/functions/`.
- Routes: `POST /api/storefront-ai/page-style`, `POST /api/storefront-ai/card-style`. No generic/catch-all OpenAI proxy route.
- Server-only env vars (Pages Function environment, never `VITE_*`): `OPENAI_API_KEY`, optional `OPENAI_MODEL` (default `gpt-4.1-mini`).
- Client-safe env vars (unchanged, already `VITE_*`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_PUBLIC_APP_URL`. These are also read inside the Function via `env.VITE_SUPABASE_URL` / `env.VITE_SUPABASE_PUBLISHABLE_KEY` — Cloudflare Pages exposes dashboard-configured env vars to both the build and the Functions runtime regardless of the `VITE_` prefix; the prefix only controls Vite's client-bundle inlining.
- `VITE_OPENAI_API_KEY` must not be read anywhere in `src/` after this plan (verified by grep in Task 11).
- New client-only escape hatch: `VITE_STOREFRONT_AI_LOCAL_HEURISTIC` — when set to the string `'true'`, the client gateway skips the network call and returns the heuristic intent directly (for local dev without `wrangler pages dev` running, and to keep existing integration tests deterministic).
- Every Function route: only `POST`, only `application/json`, must validate a Supabase access token via a server-side `auth.getUser()` call (never trust `getSession()`/client state), must check the payload's `officeCode` against the requesting user's `login_users.office_code` row and reject with `403` on mismatch.
- Chosen bounds (spec leaves exact numbers open; these are this plan's concrete defaults — adjust later if needed): `MAX_PROMPT_LENGTH = 2000` characters, `MAX_REQUEST_BODY_BYTES = 20000` bytes.
- Function error status codes: `401` no/invalid bearer token, `403` office mismatch, `405` non-POST, `413` oversized body, `422` invalid payload shape, `502` invalid/failed OpenAI upstream response, `500` unexpected.
- No service-role Supabase key anywhere. No new backend/Express/Nest server. No global rate-limiting infra in this slice (matches spec's Non-Goals).
- Known out-of-scope risk (do NOT fix in this plan, just leave as-is): `react-app/src/features/office-product-editor/model/ai-recommendations/index.js:21` also reads `VITE_OPENAI_API_KEY` client-side. The spec's File-Level Direction section only covers the storefront feature; office-product-editor is a separate, unaddressed gap in the overall "no OpenAI key in the browser" goal.
- Naming: "Contract" modules hold pure schema/build/normalize/heuristic logic; "Gateway" modules hold the client-side decide-and-fetch orchestration. Keep these two words consistent across both page-style and card-style file pairs.

---

## Task 1: Make card-design-skill reference content portable to both Vite and Workers

**Problem:** `cardStyleSkillPromptService.js` imports 6 markdown files using Vite-only `?raw` suffixes. A Cloudflare Pages Function (Workers/esbuild bundler) cannot resolve `?raw` imports. JSON imports, however, are natively supported by both Vite and Workers with zero config, so converting the 6 `.md` files into `.json` files (each holding the markdown text as a single JSON string) removes the bundler-portability blocker without hand-escaping backtick-heavy content.

**Files:**
- Create: `react-app/src/features/storefront/card-design-skill/skillMarkdown.json`
- Create: `react-app/src/features/storefront/card-design-skill/references/scopeModelMarkdown.json`
- Create: `react-app/src/features/storefront/card-design-skill/references/fieldGroupingRulesMarkdown.json`
- Create: `react-app/src/features/storefront/card-design-skill/references/editableRegionsMarkdown.json`
- Create: `react-app/src/features/storefront/card-design-skill/references/outputContractMarkdown.json`
- Create: `react-app/src/features/storefront/card-design-skill/references/examplesMarkdown.json`
- Delete: the 6 corresponding `.md` files (same directories)
- Modify: `react-app/src/features/storefront/services/cardStyleSkillPromptService.js:1-7`
- Test: `react-app/src/features/storefront/__tests__/cardStyleSkillPromptService.test.js` (no edits needed — it is the correctness check for this conversion)

**Interfaces:**
- Produces: `skillMarkdown.json`, `references/scopeModelMarkdown.json`, `references/fieldGroupingRulesMarkdown.json`, `references/editableRegionsMarkdown.json`, `references/outputContractMarkdown.json`, `references/examplesMarkdown.json` — each a JSON-encoded string, default-importable in both Vite and Workers.

- [ ] **Step 1: Convert each markdown file to a JSON string file, then delete the markdown source**

Run from `react-app/`:

```bash
node -e "const fs=require('fs');const p='src/features/storefront/card-design-skill/SKILL.md';fs.writeFileSync('src/features/storefront/card-design-skill/skillMarkdown.json', JSON.stringify(fs.readFileSync(p,'utf8')));fs.unlinkSync(p);"
node -e "const fs=require('fs');const p='src/features/storefront/card-design-skill/references/scope-model.md';fs.writeFileSync('src/features/storefront/card-design-skill/references/scopeModelMarkdown.json', JSON.stringify(fs.readFileSync(p,'utf8')));fs.unlinkSync(p);"
node -e "const fs=require('fs');const p='src/features/storefront/card-design-skill/references/field-grouping-rules.md';fs.writeFileSync('src/features/storefront/card-design-skill/references/fieldGroupingRulesMarkdown.json', JSON.stringify(fs.readFileSync(p,'utf8')));fs.unlinkSync(p);"
node -e "const fs=require('fs');const p='src/features/storefront/card-design-skill/references/editable-regions.md';fs.writeFileSync('src/features/storefront/card-design-skill/references/editableRegionsMarkdown.json', JSON.stringify(fs.readFileSync(p,'utf8')));fs.unlinkSync(p);"
node -e "const fs=require('fs');const p='src/features/storefront/card-design-skill/references/output-contract.md';fs.writeFileSync('src/features/storefront/card-design-skill/references/outputContractMarkdown.json', JSON.stringify(fs.readFileSync(p,'utf8')));fs.unlinkSync(p);"
node -e "const fs=require('fs');const p='src/features/storefront/card-design-skill/references/examples.md';fs.writeFileSync('src/features/storefront/card-design-skill/references/examplesMarkdown.json', JSON.stringify(fs.readFileSync(p,'utf8')));fs.unlinkSync(p);"
```

Expected: 6 new `.json` files exist, the 6 `.md` files are gone. Verify with:

```bash
find src/features/storefront/card-design-skill -type f | sort
```

Expected output: only `skillMarkdown.json`, `references/scopeModelMarkdown.json`, `references/fieldGroupingRulesMarkdown.json`, `references/editableRegionsMarkdown.json`, `references/outputContractMarkdown.json`, `references/examplesMarkdown.json` (no `.md` files left).

- [ ] **Step 2: Update the imports in `cardStyleSkillPromptService.js`**

Replace lines 1-7:

```js
import { toTrimmedString } from '../../../common/utils/text';
import storefrontDesignSkillMarkdown from '../card-design-skill/SKILL.md?raw';
import storefrontEditableRegionsMarkdown from '../card-design-skill/references/editable-regions.md?raw';
import storefrontExamplesMarkdown from '../card-design-skill/references/examples.md?raw';
import storefrontFieldGroupingRulesMarkdown from '../card-design-skill/references/field-grouping-rules.md?raw';
import storefrontOutputContractMarkdown from '../card-design-skill/references/output-contract.md?raw';
import storefrontScopeModelMarkdown from '../card-design-skill/references/scope-model.md?raw';
```

with:

```js
import { toTrimmedString } from '../../../common/utils/text';
import storefrontDesignSkillMarkdown from '../card-design-skill/skillMarkdown.json';
import storefrontEditableRegionsMarkdown from '../card-design-skill/references/editableRegionsMarkdown.json';
import storefrontExamplesMarkdown from '../card-design-skill/references/examplesMarkdown.json';
import storefrontFieldGroupingRulesMarkdown from '../card-design-skill/references/fieldGroupingRulesMarkdown.json';
import storefrontOutputContractMarkdown from '../card-design-skill/references/outputContractMarkdown.json';
import storefrontScopeModelMarkdown from '../card-design-skill/references/scopeModelMarkdown.json';
```

No other line in the file changes — the rest of the file already treats these as plain strings.

- [ ] **Step 3: Run the existing test to confirm the content round-tripped correctly**

Run: `npx vitest run src/features/storefront/__tests__/cardStyleSkillPromptService.test.js`
Expected: 3 tests pass (this test asserts the prompt contains `'independent-first'`, `'card.field'`, `'grouping'`, `'preview'` — all of which only appear inside the converted markdown content, so a passing run proves the JSON conversion preserved the text exactly).

- [ ] **Step 4: Commit**

```bash
git add src/features/storefront/card-design-skill src/features/storefront/services/cardStyleSkillPromptService.js
git commit -m "refactor(storefront): make card-design-skill reference content portable to Workers runtime"
```

---

## Task 2: Split `pageStyleAiInterpreter.js` into a pure contract module

**Problem:** `pageStyleAiInterpreter.js` mixes pure schema/build/normalize/heuristic logic (env-agnostic) with one env-coupled orchestrator function (`interpretPageAiDesign`, which reads `import.meta.env.VITE_OPENAI_API_KEY` and calls OpenAI directly from the browser). The pure parts must become importable from a Cloudflare Pages Function; the orchestrator must disappear from the client entirely.

**Files:**
- Create: `react-app/src/features/storefront/services/pageStyleAiContract.js`
- Delete: `react-app/src/features/storefront/services/pageStyleAiInterpreter.js`
- Create: `react-app/src/features/storefront/__tests__/pageStyleAiContract.test.js`
- Delete: `react-app/src/features/storefront/__tests__/pageStyleAiInterpreter.test.js`

**Interfaces:**
- Produces: `PAGE_STYLE_AI_SCHEMA`, `buildPageStyleOpenAiRequestBody({ pageAiDesign, openAiModel, currentPageStyle })`, `normalizePageStyleAiIntent(payload, fallbackAccentHex, targetScope)`, `buildHeuristicPageAiIntent(pageAiDesign, currentPageStyle)`, `normalizePaletteIntent`, `normalizeHeaderIntent`, `normalizeCategoryChipsIntent`, `normalizeSearchIntent` — all pure, no `import.meta.env`, no `fetch`. Consumed by Task 4 (gateway) and Task 8 (Function).

- [ ] **Step 1: Create the contract module**

Write `react-app/src/features/storefront/services/pageStyleAiContract.js` with the full content of the current `pageStyleAiInterpreter.js` (read it first), but:
- drop the unused `import { toTrimmedString } from '../../../common/utils/text';` line (verified zero call sites in this file)
- drop the `import { requestOpenAiJson } from './openAiJsonRequest';` line
- delete the `interpretPageAiDesign` function entirely (the last function in the file)
- add `export` to `buildPageStyleOpenAiRequestBody` (currently unexported)
- add `export` to `normalizePageStyleAiIntent` (currently unexported, currently named as a local function — keep the same name, just export it)
- leave every other export/function exactly as-is (schema, `normalizePaletteIntent`, `normalizeHeaderIntent`, `normalizeCategoryChipsIntent`, `normalizeSearchIntent`, `normalizePalettePatchIntent` (stays unexported, internal), `detectAccentHexFromPrompt`/`detectHeaderIntentCandidate`/`detectCategoryChipsIntentCandidate`/`detectPaletteIntentCandidate`/`detectSearchIntentCandidate` (stay unexported, internal), `limitIntentToTargetScope` (stays unexported, internal), `buildHeuristicPageAiIntent` (stays exported))

- [ ] **Step 2: Delete the old interpreter file**

```bash
rm src/features/storefront/services/pageStyleAiInterpreter.js
```

- [ ] **Step 3: Move and trim the test file**

Create `react-app/src/features/storefront/__tests__/pageStyleAiContract.test.js` with the same content as the current `pageStyleAiInterpreter.test.js`, except:
- change the import path on line 4 from `'../services/pageStyleAiInterpreter'` to `'../services/pageStyleAiContract'`
- add `normalizePageStyleAiIntent` and `buildPageStyleOpenAiRequestBody` to the named imports from that module (so later steps in this same plan, or future tests, can exercise them directly if needed) — not required by any assertion in this step, but they are now part of the module's public surface
- remove the `import { requestOpenAiJson } from '../services/openAiJsonRequest';` line and the `vi.mock('../services/openAiJsonRequest', ...)` block (lines 4 and 15-17 of the original) — no longer relevant since this module never calls it
- remove the entire `describe('interpretPageAiDesign structured-output patch semantics', ...)` block (the last describe block) — that behavior moves to Task 4's gateway test
- keep every other `describe` block unchanged

Then delete the old test file:

```bash
rm src/features/storefront/__tests__/pageStyleAiInterpreter.test.js
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/features/storefront/__tests__/pageStyleAiContract.test.js`
Expected: all tests pass (same assertions as before, minus the removed orchestrator describe block).

- [ ] **Step 5: Commit**

```bash
git add src/features/storefront/services/pageStyleAiContract.js src/features/storefront/__tests__/pageStyleAiContract.test.js
git rm src/features/storefront/services/pageStyleAiInterpreter.js src/features/storefront/__tests__/pageStyleAiInterpreter.test.js
git commit -m "refactor(storefront): split pageStyleAiInterpreter into a pure, server-importable contract module"
```

---

## Task 3: Split `cardStyleAiInterpreter.js` into a pure contract module

**Files:**
- Create: `react-app/src/features/storefront/services/cardStyleAiContract.js`
- Delete: `react-app/src/features/storefront/services/cardStyleAiInterpreter.js`
- Create: `react-app/src/features/storefront/__tests__/cardStyleAiContract.test.js`
- Delete: `react-app/src/features/storefront/__tests__/cardStyleAiInterpreter.test.js`

**Interfaces:**
- Consumes: `cardStyleSkillPromptService.js` (unchanged import path, now JSON-backed per Task 1).
- Produces: `CARD_STYLE_AI_SCHEMA`, `buildCardStyleOpenAiRequestBody({ cardAiDesign, visibleFields, productCategoryName, openAiModel, currentCardStyle })`, `normalizeOpenAiCardIntent(payload, targetScope)`, `buildHeuristicCardAiIntent({ cardAiDesign, visibleFields })`, plus the already-exported `detect*` functions and `detectAccentHexFromPrompt`. Consumed by Task 5 (gateway) and Task 9 (Function).

- [ ] **Step 1: Create the contract module**

Write `react-app/src/features/storefront/services/cardStyleAiContract.js` with the full content of the current `cardStyleAiInterpreter.js`, but:
- drop the unused `import { toTrimmedString } from '../../../common/utils/text';` line (verified zero call sites)
- drop the unused `normalizeCardAiTargetScope` name from the `cardAiDesignModel` import (keep `normalizeCardAiDesignInput`, drop `normalizeCardAiTargetScope` — verified zero call sites in this file)
- drop the `import { requestOpenAiJson } from './openAiJsonRequest';` line
- delete the `interpretCardAiDesign` function entirely (the last function in the file)
- add `export` to `buildCardStyleOpenAiRequestBody` (currently unexported)
- add `export` to `normalizeOpenAiCardIntent` (currently unexported)
- leave every other export/function exactly as-is, including the internal-only `normalizeShellIntent`, `normalizeHeaderIntent` (the card-specific one), `normalizeImageIntent`, `normalizeInfoIntent`, `normalizeLayoutIntent`, `normalizeFieldIntent`, and `limitCardIntentToTargetScope` (all stay unexported — `normalizeOpenAiCardIntent` is their only caller and is now the exported entry point)

- [ ] **Step 2: Delete the old interpreter file**

```bash
rm src/features/storefront/services/cardStyleAiInterpreter.js
```

- [ ] **Step 3: Move and trim the test file**

Create `react-app/src/features/storefront/__tests__/cardStyleAiContract.test.js` with the same content as `cardStyleAiInterpreter.test.js`, except:
- change the import path on line 4-16's `from '../services/cardStyleAiInterpreter'` to `from '../services/cardStyleAiContract'`
- remove the `import { requestOpenAiJson } from '../services/openAiJsonRequest';` line and its `vi.mock(...)` block
- remove `interpretCardAiDesign` from the named imports
- remove the entire `describe('interpretCardAiDesign structured-output patch semantics', ...)` block (moves to Task 5's gateway test)
- keep every other `describe` block (schema checks, `detectAccentHexFromPrompt`, `detectShellIntentCandidate`, `detectHeaderIntentCandidate`, `detectImageIntentCandidate`, `detectInfoIntentCandidate`, `detectLayoutIntentCandidate`, `detectFieldIntentCandidate`, `buildHeuristicCardAiIntent scope gating`) unchanged

Then delete the old test file:

```bash
rm src/features/storefront/__tests__/cardStyleAiInterpreter.test.js
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/features/storefront/__tests__/cardStyleAiContract.test.js`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/storefront/services/cardStyleAiContract.js src/features/storefront/__tests__/cardStyleAiContract.test.js
git rm src/features/storefront/services/cardStyleAiInterpreter.js src/features/storefront/__tests__/cardStyleAiInterpreter.test.js
git commit -m "refactor(storefront): split cardStyleAiInterpreter into a pure, server-importable contract module"
```

---

## Task 4: Add the page-style client gateway

**Files:**
- Create: `react-app/src/features/storefront/services/pageStyleAiGateway.js`
- Create: `react-app/src/features/storefront/__tests__/pageStyleAiGateway.test.js`

**Interfaces:**
- Consumes: `supabase` (default export of `src/lib/supabaseClient.js`), `toTrimmedString` from `common/utils/text`, `normalizePageAiDesignInput` from `model/pageAiDesignModel`, `normalizePageStyle` from `model/pageStyleModel`, `buildHeuristicPageAiIntent` + `normalizePageStyleAiIntent` from `services/pageStyleAiContract` (Task 2).
- Produces: `requestPageStyleAiIntent({ pageAiDesign, currentPageStyle, officeCode })` → `Promise<PageStyleAiIntent>`. Consumed by Task 6 (`usePageAiDesign`).

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/pageStyleAiGateway.test.js`:

```js
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PAGE_STYLE } from '../model/pageStyleModel';
import { requestPageStyleAiIntent } from '../services/pageStyleAiGateway';

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

import supabase from '../../../lib/supabaseClient';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('requestPageStyleAiIntent', () => {
  it('uses the local heuristic and skips the network call when VITE_STOREFRONT_AI_LOCAL_HEURISTIC is true', async () => {
    vi.stubEnv('VITE_STOREFRONT_AI_LOCAL_HEURISTIC', 'true');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const intent = await requestPageStyleAiIntent({
      pageAiDesign: { prompt: 'make it feel blue and trustworthy' },
      currentPageStyle: DEFAULT_PAGE_STYLE,
      officeCode: 'OFF-1',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(intent.palette.accentHex).toBe('#2563eb');
  });

  it('throws a clear error when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(
      requestPageStyleAiIntent({
        pageAiDesign: { prompt: 'warm' },
        currentPageStyle: DEFAULT_PAGE_STYLE,
        officeCode: 'OFF-1',
      }),
    ).rejects.toThrow('로그인 정보가 만료되었습니다');
  });

  it('posts to the same-origin endpoint with the bearer token and normalizes the response', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        intent: {
          palette: null,
          header: null,
          categoryChips: null,
          search: { sizeToken: 'lg', borderStrengthToken: null },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const intent = await requestPageStyleAiIntent({
      pageAiDesign: { prompt: 'make the search box larger', targetScope: 'search' },
      currentPageStyle: DEFAULT_PAGE_STYLE,
      officeCode: 'OFF-1',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/storefront-ai/page-style',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.officeCode).toBe('OFF-1');
    expect(sentBody.pageAiDesign).toEqual({ prompt: 'make the search box larger', targetScope: 'search' });
    expect(intent.search).toEqual({ sizeToken: 'lg' });
    expect(intent.palette).toBeNull();
  });

  it('throws with the server error message when the response is not ok', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'officeCode does not match the authenticated user.' }),
      }),
    );

    await expect(
      requestPageStyleAiIntent({
        pageAiDesign: { prompt: 'warm' },
        currentPageStyle: DEFAULT_PAGE_STYLE,
        officeCode: 'OFF-2',
      }),
    ).rejects.toThrow('officeCode does not match the authenticated user.');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/storefront/__tests__/pageStyleAiGateway.test.js`
Expected: FAIL with "Failed to resolve import" or "does not provide an export named 'requestPageStyleAiIntent'" (the module does not exist yet).

- [ ] **Step 3: Write the gateway**

Create `react-app/src/features/storefront/services/pageStyleAiGateway.js`:

```js
import supabase from '../../../lib/supabaseClient';
import { toTrimmedString } from '../../../common/utils/text';
import { normalizePageAiDesignInput } from '../model/pageAiDesignModel';
import { normalizePageStyle } from '../model/pageStyleModel';
import { buildHeuristicPageAiIntent, normalizePageStyleAiIntent } from './pageStyleAiContract';

const PAGE_STYLE_AI_ENDPOINT = '/api/storefront-ai/page-style';
const SESSION_EXPIRED_ERROR_MESSAGE = '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.';

function isLocalHeuristicModeEnabled() {
  return toTrimmedString(import.meta.env.VITE_STOREFRONT_AI_LOCAL_HEURISTIC) === 'true';
}

async function readErrorMessage(response) {
  try {
    const body = await response.json();
    return toTrimmedString(body?.error) || `Storefront AI request failed with status ${response.status}.`;
  } catch {
    return `Storefront AI request failed with status ${response.status}.`;
  }
}

export async function requestPageStyleAiIntent({ pageAiDesign, currentPageStyle, officeCode } = {}) {
  const normalizedInput = normalizePageAiDesignInput(pageAiDesign);
  const resolvedCurrentPageStyle = normalizePageStyle(currentPageStyle);

  if (isLocalHeuristicModeEnabled()) {
    return buildHeuristicPageAiIntent(normalizedInput, resolvedCurrentPageStyle);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error(SESSION_EXPIRED_ERROR_MESSAGE);
  }

  const response = await fetch(PAGE_STYLE_AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      officeCode: toTrimmedString(officeCode),
      pageAiDesign: normalizedInput,
      currentPageStyle: resolvedCurrentPageStyle,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const body = await response.json();

  return normalizePageStyleAiIntent(
    body?.intent,
    resolvedCurrentPageStyle.palette.accentHex,
    normalizedInput.targetScope,
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/storefront/__tests__/pageStyleAiGateway.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/storefront/services/pageStyleAiGateway.js src/features/storefront/__tests__/pageStyleAiGateway.test.js
git commit -m "feat(storefront): add page-style AI client gateway calling the same-origin proxy route"
```

---

## Task 5: Add the card-style client gateway

**Files:**
- Create: `react-app/src/features/storefront/services/cardStyleAiGateway.js`
- Create: `react-app/src/features/storefront/__tests__/cardStyleAiGateway.test.js`

**Interfaces:**
- Consumes: `supabase`, `toTrimmedString`, `normalizeCardAiDesignInput` (from `model/cardAiDesignModel`), `normalizeCardStyle` (from `model/cardStyleModel`), `buildHeuristicCardAiIntent` + `normalizeOpenAiCardIntent` from `services/cardStyleAiContract` (Task 3).
- Produces: `requestCardStyleAiIntent({ cardAiDesign, visibleFields, productCategoryName, currentCardStyle, officeCode })` → `Promise<CardStyleAiIntent>`. Consumed by Task 6 (`useCardAiDesign`).

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/cardStyleAiGateway.test.js`:

```js
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_CARD_STYLE } from '../model/cardStyleModel';
import { requestCardStyleAiIntent } from '../services/cardStyleAiGateway';

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

import supabase from '../../../lib/supabaseClient';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('requestCardStyleAiIntent', () => {
  it('uses the local heuristic and skips the network call when VITE_STOREFRONT_AI_LOCAL_HEURISTIC is true', async () => {
    vi.stubEnv('VITE_STOREFRONT_AI_LOCAL_HEURISTIC', 'true');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const intent = await requestCardStyleAiIntent({
      cardAiDesign: { prompt: 'make the title bolder and darker' },
      visibleFields: ['product_name'],
      currentCardStyle: DEFAULT_CARD_STYLE,
      officeCode: 'OFF-1',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(intent.header).toEqual({ titleColorHex: '#111827', fontWeight: 800 });
  });

  it('throws a clear error when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(
      requestCardStyleAiIntent({
        cardAiDesign: { prompt: 'warm' },
        visibleFields: ['product_name'],
        currentCardStyle: DEFAULT_CARD_STYLE,
        officeCode: 'OFF-1',
      }),
    ).rejects.toThrow('로그인 정보가 만료되었습니다');
  });

  it('posts to the same-origin endpoint with the bearer token and normalizes the response', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        intent: {
          structuralPresetRequest: null,
          titleModeRequest: null,
          layout: null,
          shell: null,
          header: { backgroundColor: null, titleColorHex: null, letterSpacing: null, fontWeight: 800 },
          image: null,
          info: null,
          field: null,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const intent = await requestCardStyleAiIntent({
      cardAiDesign: { prompt: 'make the title bolder', targetScope: 'header' },
      visibleFields: ['product_name', 'tax_price'],
      productCategoryName: 'Fertilizer Upload',
      currentCardStyle: DEFAULT_CARD_STYLE,
      officeCode: 'OFF-1',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/storefront-ai/card-style',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.officeCode).toBe('OFF-1');
    expect(sentBody.visibleFields).toEqual(['product_name', 'tax_price']);
    expect(sentBody.productCategoryName).toBe('Fertilizer Upload');
    expect(intent.header).toEqual({ fontWeight: 800 });
  });

  it('throws with the server error message when the response is not ok', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'officeCode does not match the authenticated user.' }),
      }),
    );

    await expect(
      requestCardStyleAiIntent({
        cardAiDesign: { prompt: 'warm' },
        visibleFields: ['product_name'],
        currentCardStyle: DEFAULT_CARD_STYLE,
        officeCode: 'OFF-2',
      }),
    ).rejects.toThrow('officeCode does not match the authenticated user.');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/storefront/__tests__/cardStyleAiGateway.test.js`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Write the gateway**

Create `react-app/src/features/storefront/services/cardStyleAiGateway.js`:

```js
import supabase from '../../../lib/supabaseClient';
import { toTrimmedString } from '../../../common/utils/text';
import { normalizeCardAiDesignInput } from '../model/cardAiDesignModel';
import { normalizeCardStyle } from '../model/cardStyleModel';
import { buildHeuristicCardAiIntent, normalizeOpenAiCardIntent } from './cardStyleAiContract';

const CARD_STYLE_AI_ENDPOINT = '/api/storefront-ai/card-style';
const SESSION_EXPIRED_ERROR_MESSAGE = '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.';

function isLocalHeuristicModeEnabled() {
  return toTrimmedString(import.meta.env.VITE_STOREFRONT_AI_LOCAL_HEURISTIC) === 'true';
}

async function readErrorMessage(response) {
  try {
    const body = await response.json();
    return toTrimmedString(body?.error) || `Storefront AI request failed with status ${response.status}.`;
  } catch {
    return `Storefront AI request failed with status ${response.status}.`;
  }
}

export async function requestCardStyleAiIntent({
  cardAiDesign,
  visibleFields,
  productCategoryName,
  currentCardStyle,
  officeCode,
} = {}) {
  const normalizedInput = normalizeCardAiDesignInput(cardAiDesign);
  const normalizedVisibleFields = Array.isArray(visibleFields) ? visibleFields : [];

  if (isLocalHeuristicModeEnabled()) {
    return buildHeuristicCardAiIntent({ cardAiDesign: normalizedInput, visibleFields: normalizedVisibleFields });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error(SESSION_EXPIRED_ERROR_MESSAGE);
  }

  const response = await fetch(CARD_STYLE_AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      officeCode: toTrimmedString(officeCode),
      cardAiDesign: normalizedInput,
      visibleFields: normalizedVisibleFields,
      productCategoryName: toTrimmedString(productCategoryName),
      currentCardStyle: normalizeCardStyle(currentCardStyle),
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const body = await response.json();

  return normalizeOpenAiCardIntent(body?.intent, normalizedInput.targetScope);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/storefront/__tests__/cardStyleAiGateway.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/storefront/services/cardStyleAiGateway.js src/features/storefront/__tests__/cardStyleAiGateway.test.js
git commit -m "feat(storefront): add card-style AI client gateway calling the same-origin proxy route"
```

---

## Task 6: Wire `officeCode` through the hooks and switch them to the gateways

**Files:**
- Modify: `react-app/src/features/storefront/hooks/usePageAiDesign.js`
- Modify: `react-app/src/features/storefront/hooks/useCardAiDesign.js`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js:60-61`
- Modify: `react-app/src/features/storefront/__tests__/usePageAiDesign.test.js`
- Modify: `react-app/src/features/storefront/__tests__/useCardAiDesign.test.js`

**Interfaces:**
- Consumes: `requestPageStyleAiIntent` (Task 4), `requestCardStyleAiIntent` (Task 5).
- Produces: `usePageAiDesign({ officeCode, initialPageStyle })`, `useCardAiDesign({ officeCode, initialCardStyle, initialBodySlots })` — both hooks gain a required-in-practice `officeCode` field, otherwise identical public shape to today.

- [ ] **Step 1: Update `usePageAiDesign.js`**

Replace line 9 (`import { interpretPageAiDesign } from '../services/pageStyleAiInterpreter';`) with:

```js
import { requestPageStyleAiIntent } from '../services/pageStyleAiGateway';
```

Replace line 15 (`export function usePageAiDesign({ initialPageStyle } = {}) {`) with:

```js
export function usePageAiDesign({ officeCode, initialPageStyle } = {}) {
```

Replace the body of `applyPageAiDesign` (lines 44-74) with:

```js
  async function applyPageAiDesign() {
    const normalizedInput = normalizePageAiDesignInput(pageAiDesign);

    if (!normalizedInput.prompt) {
      setPageAiErrorMessage(MISSING_PAGE_PROMPT_ERROR_MESSAGE);
      return;
    }

    setIsApplyingPageAiDesign(true);
    setPageAiErrorMessage('');

    try {
      const intent = await requestPageStyleAiIntent({
        pageAiDesign: normalizedInput,
        currentPageStyle: pageStyle,
        officeCode,
      });
      const nextPageStyle = compilePageStyle({
        intent,
        previousPageStyle: pageStyle,
        targetScope: normalizedInput.targetScope,
      });

      setPageStyle(nextPageStyle);
    } catch (error) {
      setPageAiErrorMessage(
        error instanceof Error ? error.message : APPLY_FAILED_ERROR_MESSAGE,
      );
    } finally {
      setIsApplyingPageAiDesign(false);
    }
  }
```

- [ ] **Step 2: Update `useCardAiDesign.js`**

Replace line 10 (`import { interpretCardAiDesign } from '../services/cardStyleAiInterpreter';`) with:

```js
import { requestCardStyleAiIntent } from '../services/cardStyleAiGateway';
```

Replace line 16 (`export function useCardAiDesign({ initialCardStyle, initialBodySlots = [] } = {}) {`) with:

```js
export function useCardAiDesign({ officeCode, initialCardStyle, initialBodySlots = [] } = {}) {
```

Replace the body of `applyCardAiDesign` (lines 61-97) with:

```js
  async function applyCardAiDesign({ visibleFields, fieldLabels, productCategoryName } = {}) {
    const normalizedInput = normalizeCardAiDesignInput(cardAiDesign);

    if (!normalizedInput.prompt) {
      setCardAiErrorMessage(MISSING_CARD_PROMPT_ERROR_MESSAGE);
      return;
    }

    setIsApplyingCardAiDesign(true);
    setCardAiErrorMessage('');
    setCardAiWarningMessage('');

    try {
      const intent = await requestCardStyleAiIntent({
        cardAiDesign: normalizedInput,
        visibleFields,
        productCategoryName,
        currentCardStyle: cardStyle,
        officeCode,
      });
      const result = compileCardStyle({
        intent,
        previousCardStyle: cardStyle,
        cardsPerRow: cardStyle.cardsPerRow,
        visibleFields,
        fieldLabels,
      });

      setLastCardAiSnapshot({ cardStyle, bodySlots });
      setCardStyle(result.cardStyle);
      setBodySlots(result.bodySlots);
      setCardAiWarningMessage(result.warning);
    } catch (error) {
      setCardAiErrorMessage(error instanceof Error ? error.message : APPLY_FAILED_ERROR_MESSAGE);
    } finally {
      setIsApplyingCardAiDesign(false);
    }
  }
```

- [ ] **Step 3: Pass `officeCode` from `useStorefrontBuilder.js`**

Replace lines 60-61:

```js
  const pageAi = usePageAiDesign();
  const cardAi = useCardAiDesign();
```

with:

```js
  const pageAi = usePageAiDesign({ officeCode });
  const cardAi = useCardAiDesign({ officeCode });
```

- [ ] **Step 4: Update `usePageAiDesign.test.js`**

Replace line 7 (`import { interpretPageAiDesign } from '../services/pageStyleAiInterpreter';`) with:

```js
import { requestPageStyleAiIntent } from '../services/pageStyleAiGateway';
```

Replace line 10 (`vi.mock('../services/pageStyleAiInterpreter', () => ({ interpretPageAiDesign: vi.fn() }));`) with:

```js
vi.mock('../services/pageStyleAiGateway', () => ({ requestPageStyleAiIntent: vi.fn() }));
```

Then replace every remaining occurrence of `interpretPageAiDesign` in the file with `requestPageStyleAiIntent` (5 occurrences: the "not.toHaveBeenCalled" assertion, two "mockResolvedValue" calls, one "mockRejectedValue" call, and the "toHaveBeenCalledWith" assertion). In that last assertion, add `officeCode: undefined` to the expected call-argument object, since `renderHook(() => usePageAiDesign())` in these tests passes no `officeCode`:

```js
    expect(requestPageStyleAiIntent).toHaveBeenCalledWith({
      pageAiDesign: {
        prompt: 'warm and friendly, make the search box larger with a stronger border',
        targetScope: 'search',
      },
      currentPageStyle: DEFAULT_PAGE_STYLE,
      officeCode: undefined,
    });
```

- [ ] **Step 5: Update `useCardAiDesign.test.js`**

Replace line 7 (`import { interpretCardAiDesign } from '../services/cardStyleAiInterpreter';`) with:

```js
import { requestCardStyleAiIntent } from '../services/cardStyleAiGateway';
```

Replace line 10 (`vi.mock('../services/cardStyleAiInterpreter', () => ({ interpretCardAiDesign: vi.fn() }));`) with:

```js
vi.mock('../services/cardStyleAiGateway', () => ({ requestCardStyleAiIntent: vi.fn() }));
```

Replace every remaining occurrence of `interpretCardAiDesign` in the file with `requestCardStyleAiIntent` (6 occurrences). In the `toHaveBeenCalledWith` assertion, add `officeCode: undefined`:

```js
    expect(requestCardStyleAiIntent).toHaveBeenCalledWith({
      cardAiDesign: { prompt: 'make the title bolder', targetScope: 'header' },
      visibleFields: ['product_name', 'spec'],
      productCategoryName: 'Fertilizer Upload',
      currentCardStyle: DEFAULT_CARD_STYLE,
      officeCode: undefined,
    });
```

- [ ] **Step 6: Run both hook test files**

Run: `npx vitest run src/features/storefront/__tests__/usePageAiDesign.test.js src/features/storefront/__tests__/useCardAiDesign.test.js`
Expected: PASS, all tests (6 in the page-style file, 8 in the card-style file).

- [ ] **Step 7: Commit**

```bash
git add src/features/storefront/hooks/usePageAiDesign.js src/features/storefront/hooks/useCardAiDesign.js src/features/storefront/hooks/useStorefrontBuilder.js src/features/storefront/__tests__/usePageAiDesign.test.js src/features/storefront/__tests__/useCardAiDesign.test.js
git commit -m "refactor(storefront): wire officeCode through AI hooks and switch them to the new gateways"
```

---

## Task 7: Cloudflare Pages Functions shared library

**Files:**
- Create: `react-app/functions/lib/jsonResponse.js`
- Create: `react-app/functions/lib/requestValidation.js`
- Create: `react-app/functions/lib/supabaseServerAuth.js`
- Create: `react-app/functions/lib/officeOwnershipGuard.js`
- Test: `react-app/functions/lib/__tests__/requestValidation.test.js`
- Test: `react-app/functions/lib/__tests__/officeOwnershipGuard.test.js`

**Interfaces:**
- Produces: `jsonResponse(body, { status })`, `errorResponse(message, status)`; `RequestValidationError`, `MAX_PROMPT_LENGTH`, `MAX_REQUEST_BODY_BYTES`, `assertPostJsonRequest(request)`, `readJsonBody(request)`, `assertPromptWithinLimit(prompt)`, `assertOfficeCodePresent(officeCode)`, `pickAllowedKeys(source, allowedKeys)`; `extractBearerToken(request)`, `createRequestScopedSupabaseClient(env, accessToken)`, `requireAuthenticatedSupabaseUser(request, env)`; `assertOfficeOwnership({ supabase, authUserId, officeCode })`. Consumed by Task 8 and Task 9.

- [ ] **Step 1: Write `jsonResponse.js`**

```js
export function jsonResponse(body, { status = 200 } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message, status) {
  return jsonResponse({ error: message }, { status });
}
```

- [ ] **Step 2: Write `requestValidation.js`**

```js
export const MAX_PROMPT_LENGTH = 2000;
export const MAX_REQUEST_BODY_BYTES = 20000;

export class RequestValidationError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'RequestValidationError';
    this.status = status;
  }
}

export function assertPostJsonRequest(request) {
  if (request.method !== 'POST') {
    throw new RequestValidationError('Only POST is supported.', 405);
  }

  const contentType = request.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new RequestValidationError('Request body must be application/json.', 422);
  }
}

export async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length'));

  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
    throw new RequestValidationError('Request body is too large.', 413);
  }

  const rawBody = await request.text();

  if (rawBody.length > MAX_REQUEST_BODY_BYTES) {
    throw new RequestValidationError('Request body is too large.', 413);
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new RequestValidationError('Request body must be valid JSON.', 422);
  }
}

export function assertPromptWithinLimit(prompt) {
  if (typeof prompt !== 'string' || prompt.length > MAX_PROMPT_LENGTH) {
    throw new RequestValidationError(`prompt must be a string of at most ${MAX_PROMPT_LENGTH} characters.`, 422);
  }
}

export function assertOfficeCodePresent(officeCode) {
  if (typeof officeCode !== 'string' || officeCode.trim() === '') {
    throw new RequestValidationError('officeCode is required.', 422);
  }
}

export function pickAllowedKeys(source, allowedKeys) {
  const result = {};
  const safeSource = source && typeof source === 'object' ? source : {};

  for (const key of allowedKeys) {
    result[key] = safeSource[key];
  }

  return result;
}
```

- [ ] **Step 3: Write `supabaseServerAuth.js`**

```js
import { createClient } from '@supabase/supabase-js';

import { RequestValidationError } from './requestValidation';

export function createRequestScopedSupabaseClient(env, accessToken) {
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

export function extractBearerToken(request) {
  const header = request.headers.get('Authorization') || request.headers.get('authorization');

  if (!header || !header.startsWith('Bearer ')) {
    throw new RequestValidationError('Missing bearer token.', 401);
  }

  const token = header.slice('Bearer '.length).trim();

  if (!token) {
    throw new RequestValidationError('Missing bearer token.', 401);
  }

  return token;
}

export async function requireAuthenticatedSupabaseUser(request, env) {
  const accessToken = extractBearerToken(request);
  const supabase = createRequestScopedSupabaseClient(env, accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data?.user?.id) {
    throw new RequestValidationError('Invalid or expired session.', 401);
  }

  return { supabase, user: data.user };
}
```

- [ ] **Step 4: Write `officeOwnershipGuard.js`**

```js
import { RequestValidationError } from './requestValidation';

export async function assertOfficeOwnership({ supabase, authUserId, officeCode }) {
  const { data, error } = await supabase
    .from('login_users')
    .select('office_code')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error || !data || data.office_code !== officeCode) {
    throw new RequestValidationError('officeCode does not match the authenticated user.', 403);
  }
}
```

- [ ] **Step 5: Write the failing tests**

Create `react-app/functions/lib/__tests__/requestValidation.test.js`:

```js
import { describe, expect, it } from 'vitest';

import {
  RequestValidationError,
  assertOfficeCodePresent,
  assertPostJsonRequest,
  assertPromptWithinLimit,
  pickAllowedKeys,
  readJsonBody,
} from '../requestValidation';

function buildRequest({ method = 'POST', contentType = 'application/json', body = '{}', contentLength } = {}) {
  const headers = new Headers({ 'content-type': contentType });

  if (contentLength !== undefined) {
    headers.set('content-length', String(contentLength));
  }

  return new Request('https://example.com/api/storefront-ai/page-style', { method, headers, body });
}

describe('assertPostJsonRequest', () => {
  it('passes for a POST request with a JSON content type', () => {
    expect(() => assertPostJsonRequest(buildRequest())).not.toThrow();
  });

  it('rejects non-POST methods with 405', () => {
    expect(() => assertPostJsonRequest(buildRequest({ method: 'GET' }))).toThrow(
      expect.objectContaining({ status: 405 }),
    );
  });

  it('rejects a non-JSON content type with 422', () => {
    expect(() => assertPostJsonRequest(buildRequest({ contentType: 'text/plain' }))).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });
});

describe('readJsonBody', () => {
  it('parses a small valid JSON body', async () => {
    const body = await readJsonBody(buildRequest({ body: '{"officeCode":"OFF-1"}' }));
    expect(body).toEqual({ officeCode: 'OFF-1' });
  });

  it('rejects an oversized body via content-length with 413', async () => {
    await expect(readJsonBody(buildRequest({ contentLength: 999999 }))).rejects.toEqual(
      expect.objectContaining({ status: 413 }),
    );
  });

  it('rejects invalid JSON with 422', async () => {
    await expect(readJsonBody(buildRequest({ body: 'not json' }))).rejects.toEqual(
      expect.objectContaining({ status: 422 }),
    );
  });
});

describe('assertPromptWithinLimit', () => {
  it('passes for a short prompt', () => {
    expect(() => assertPromptWithinLimit('hello')).not.toThrow();
  });

  it('rejects a prompt over the max length with 422', () => {
    expect(() => assertPromptWithinLimit('x'.repeat(2001))).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });

  it('rejects a non-string prompt', () => {
    expect(() => assertPromptWithinLimit(undefined)).toThrow(RequestValidationError);
  });
});

describe('assertOfficeCodePresent', () => {
  it('rejects an empty officeCode with 422', () => {
    expect(() => assertOfficeCodePresent('')).toThrow(expect.objectContaining({ status: 422 }));
  });

  it('passes for a non-empty officeCode', () => {
    expect(() => assertOfficeCodePresent('OFF-1')).not.toThrow();
  });
});

describe('pickAllowedKeys', () => {
  it('keeps only the listed keys and drops everything else', () => {
    expect(pickAllowedKeys({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('fills missing keys with undefined instead of throwing', () => {
    expect(pickAllowedKeys({ a: 1 }, ['a', 'b'])).toEqual({ a: 1, b: undefined });
  });
});
```

Create `react-app/functions/lib/__tests__/officeOwnershipGuard.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';

import { assertOfficeOwnership } from '../officeOwnershipGuard';

function buildSupabaseStub(maybeSingleResult) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue(maybeSingleResult),
        })),
      })),
    })),
  };
}

describe('assertOfficeOwnership', () => {
  it('passes when the profile office_code matches the payload officeCode', async () => {
    const supabase = buildSupabaseStub({ data: { office_code: 'OFF-1' }, error: null });

    await expect(
      assertOfficeOwnership({ supabase, authUserId: 'user-1', officeCode: 'OFF-1' }),
    ).resolves.toBeUndefined();
  });

  it('rejects with 403 when the office codes do not match', async () => {
    const supabase = buildSupabaseStub({ data: { office_code: 'OFF-1' }, error: null });

    await expect(
      assertOfficeOwnership({ supabase, authUserId: 'user-1', officeCode: 'OFF-2' }),
    ).rejects.toEqual(expect.objectContaining({ status: 403 }));
  });

  it('rejects with 403 when no profile row exists', async () => {
    const supabase = buildSupabaseStub({ data: null, error: null });

    await expect(
      assertOfficeOwnership({ supabase, authUserId: 'user-1', officeCode: 'OFF-1' }),
    ).rejects.toEqual(expect.objectContaining({ status: 403 }));
  });

  it('rejects with 403 when the lookup itself errors', async () => {
    const supabase = buildSupabaseStub({ data: null, error: new Error('db down') });

    await expect(
      assertOfficeOwnership({ supabase, authUserId: 'user-1', officeCode: 'OFF-1' }),
    ).rejects.toEqual(expect.objectContaining({ status: 403 }));
  });
});
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run functions/lib/__tests__`
Expected: PASS, 15 tests across both files.

- [ ] **Step 7: Commit**

```bash
git add functions/lib
git commit -m "feat(functions): add shared request validation, supabase auth, and office ownership helpers"
```

---

## Task 8: `POST /api/storefront-ai/page-style` Pages Function

**Files:**
- Create: `react-app/functions/api/storefront-ai/page-style.js`
- Test: `react-app/functions/api/storefront-ai/__tests__/page-style.test.js`

**Interfaces:**
- Consumes: `buildPageStyleOpenAiRequestBody`, `normalizePageStyleAiIntent` (Task 2, via `../../../src/features/storefront/services/pageStyleAiContract.js`); `requestOpenAiJson` (via `../../../src/features/storefront/services/openAiJsonRequest.js`, unchanged); `normalizePageStyle` (via `../../../src/features/storefront/model/pageStyleModel.js`); `normalizePageAiDesignInput` (via `../../../src/features/storefront/model/pageAiDesignModel.js`); everything from Task 7's `functions/lib/*`.
- Produces: `onRequestPost({ request, env })` → `Response`.

- [ ] **Step 1: Write the failing test**

Create `react-app/functions/api/storefront-ai/__tests__/page-style.test.js`:

```js
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { onRequestPost } from '../page-style';

const TEST_ENV = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  OPENAI_API_KEY: 'sk-test',
};

function buildSupabaseStub({ user = { id: 'user-1' }, officeCode = 'OFF-1' } = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { office_code: officeCode }, error: null }),
        })),
      })),
    })),
  };
}

function buildRequest(body, { authorization = 'Bearer test-token' } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });

  if (authorization) {
    headers.set('authorization', authorization);
  }

  return new Request('https://example.com/api/storefront-ai/page-style', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('POST /api/storefront-ai/page-style', () => {
  it('returns 401 when no bearer token is present', async () => {
    const request = buildRequest({ officeCode: 'OFF-1', pageAiDesign: { prompt: 'warm' } }, { authorization: '' });
    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(401);
  });

  it('returns 403 when officeCode does not match the profile', async () => {
    createClient.mockReturnValue(buildSupabaseStub({ officeCode: 'OFF-OTHER' }));
    const request = buildRequest({ officeCode: 'OFF-1', pageAiDesign: { prompt: 'warm' } });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(403);
  });

  it('returns 422 when the prompt is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: 'OFF-1', pageAiDesign: { prompt: '' } });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns 502 when OpenAI fails', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }));
    const request = buildRequest({ officeCode: 'OFF-1', pageAiDesign: { prompt: 'warm and trustworthy' } });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(502);
  });

  it('returns 200 with a normalized intent on success', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output_parsed: {
            palette: { backgroundHex: '#eef3fd', surfaceHex: '#ffffff', accentHex: '#2563eb', textHex: '#111827' },
            header: null,
            categoryChips: null,
            search: null,
          },
        }),
      }),
    );
    const request = buildRequest({
      officeCode: 'OFF-1',
      pageAiDesign: { prompt: 'make it feel blue and trustworthy' },
    });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.intent.palette.accentHex).toBe('#2563eb');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/api/storefront-ai/__tests__/page-style.test.js`
Expected: FAIL — `../page-style` does not exist yet.

- [ ] **Step 3: Write the Function**

Create `react-app/functions/api/storefront-ai/page-style.js`:

```js
import { normalizePageAiDesignInput } from '../../../src/features/storefront/model/pageAiDesignModel.js';
import { normalizePageStyle } from '../../../src/features/storefront/model/pageStyleModel.js';
import { requestOpenAiJson } from '../../../src/features/storefront/services/openAiJsonRequest.js';
import {
  buildPageStyleOpenAiRequestBody,
  normalizePageStyleAiIntent,
} from '../../../src/features/storefront/services/pageStyleAiContract.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  RequestValidationError,
  assertOfficeCodePresent,
  assertPostJsonRequest,
  assertPromptWithinLimit,
  pickAllowedKeys,
  readJsonBody,
} from '../../lib/requestValidation.js';
import { requireAuthenticatedSupabaseUser } from '../../lib/supabaseServerAuth.js';
import { assertOfficeOwnership } from '../../lib/officeOwnershipGuard.js';

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const REQUEST_BODY_ALLOWED_KEYS = ['officeCode', 'pageAiDesign', 'currentPageStyle'];

export async function onRequestPost({ request, env }) {
  try {
    assertPostJsonRequest(request);

    const rawBody = await readJsonBody(request);
    const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
    const officeCode = typeof body.officeCode === 'string' ? body.officeCode.trim() : '';
    assertOfficeCodePresent(officeCode);

    const pageAiDesign = normalizePageAiDesignInput(body.pageAiDesign);
    assertPromptWithinLimit(pageAiDesign.prompt);

    const currentPageStyle = normalizePageStyle(body.currentPageStyle);

    const { supabase, user } = await requireAuthenticatedSupabaseUser(request, env);
    await assertOfficeOwnership({ supabase, authUserId: user.id, officeCode });

    const requestBody = buildPageStyleOpenAiRequestBody({
      pageAiDesign,
      openAiModel: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      currentPageStyle,
    });

    let payload;

    try {
      payload = await requestOpenAiJson(requestBody, env.OPENAI_API_KEY);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : 'OpenAI request failed.', 502);
    }

    const intent = normalizePageStyleAiIntent(payload, currentPageStyle.palette.accentHex, pageAiDesign.targetScope);

    return jsonResponse({ intent });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse('Unexpected server error.', 500);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run functions/api/storefront-ai/__tests__/page-style.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add functions/api/storefront-ai/page-style.js functions/api/storefront-ai/__tests__/page-style.test.js
git commit -m "feat(functions): add POST /api/storefront-ai/page-style proxy route"
```

---

## Task 9: `POST /api/storefront-ai/card-style` Pages Function

**Files:**
- Create: `react-app/functions/api/storefront-ai/card-style.js`
- Test: `react-app/functions/api/storefront-ai/__tests__/card-style.test.js`

**Interfaces:**
- Consumes: `buildCardStyleOpenAiRequestBody`, `normalizeOpenAiCardIntent` (Task 3); `requestOpenAiJson`; `normalizeCardStyle` (via `model/cardStyleModel.js`); `normalizeCardAiDesignInput` (via `model/cardAiDesignModel.js`); Task 7's `functions/lib/*`.
- Produces: `onRequestPost({ request, env })` → `Response`.

- [ ] **Step 1: Write the failing test**

Create `react-app/functions/api/storefront-ai/__tests__/card-style.test.js`:

```js
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { onRequestPost } from '../card-style';

const TEST_ENV = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  OPENAI_API_KEY: 'sk-test',
};

function buildSupabaseStub({ user = { id: 'user-1' }, officeCode = 'OFF-1' } = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { office_code: officeCode }, error: null }),
        })),
      })),
    })),
  };
}

function buildRequest(body, { authorization = 'Bearer test-token' } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });

  if (authorization) {
    headers.set('authorization', authorization);
  }

  return new Request('https://example.com/api/storefront-ai/card-style', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('POST /api/storefront-ai/card-style', () => {
  it('returns 401 when no bearer token is present', async () => {
    const request = buildRequest(
      { officeCode: 'OFF-1', cardAiDesign: { prompt: 'bold title' }, visibleFields: ['product_name'] },
      { authorization: '' },
    );

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(401);
  });

  it('returns 403 when officeCode does not match the profile', async () => {
    createClient.mockReturnValue(buildSupabaseStub({ officeCode: 'OFF-OTHER' }));
    const request = buildRequest({
      officeCode: 'OFF-1',
      cardAiDesign: { prompt: 'bold title' },
      visibleFields: ['product_name'],
    });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(403);
  });

  it('returns 422 when the prompt is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({
      officeCode: 'OFF-1',
      cardAiDesign: { prompt: '' },
      visibleFields: ['product_name'],
    });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns 502 when OpenAI fails', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }));
    const request = buildRequest({
      officeCode: 'OFF-1',
      cardAiDesign: { prompt: 'make the title bolder' },
      visibleFields: ['product_name'],
    });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(502);
  });

  it('returns 200 with a normalized intent on success', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output_parsed: {
            structuralPresetRequest: null,
            titleModeRequest: null,
            layout: null,
            shell: null,
            header: { backgroundColor: null, titleColorHex: null, letterSpacing: null, fontWeight: 800 },
            image: null,
            info: null,
            field: null,
          },
        }),
      }),
    );
    const request = buildRequest({
      officeCode: 'OFF-1',
      cardAiDesign: { prompt: 'make the title bolder', targetScope: 'header' },
      visibleFields: ['product_name'],
    });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.intent.header).toEqual({ fontWeight: 800 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/api/storefront-ai/__tests__/card-style.test.js`
Expected: FAIL — `../card-style` does not exist yet.

- [ ] **Step 3: Write the Function**

Create `react-app/functions/api/storefront-ai/card-style.js`:

```js
import { normalizeCardAiDesignInput } from '../../../src/features/storefront/model/cardAiDesignModel.js';
import { normalizeCardStyle } from '../../../src/features/storefront/model/cardStyleModel.js';
import { requestOpenAiJson } from '../../../src/features/storefront/services/openAiJsonRequest.js';
import {
  buildCardStyleOpenAiRequestBody,
  normalizeOpenAiCardIntent,
} from '../../../src/features/storefront/services/cardStyleAiContract.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  RequestValidationError,
  assertOfficeCodePresent,
  assertPostJsonRequest,
  assertPromptWithinLimit,
  pickAllowedKeys,
  readJsonBody,
} from '../../lib/requestValidation.js';
import { requireAuthenticatedSupabaseUser } from '../../lib/supabaseServerAuth.js';
import { assertOfficeOwnership } from '../../lib/officeOwnershipGuard.js';

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'cardAiDesign',
  'visibleFields',
  'productCategoryName',
  'currentCardStyle',
];

export async function onRequestPost({ request, env }) {
  try {
    assertPostJsonRequest(request);

    const rawBody = await readJsonBody(request);
    const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
    const officeCode = typeof body.officeCode === 'string' ? body.officeCode.trim() : '';
    assertOfficeCodePresent(officeCode);

    const cardAiDesign = normalizeCardAiDesignInput(body.cardAiDesign);
    assertPromptWithinLimit(cardAiDesign.prompt);

    const visibleFields = Array.isArray(body.visibleFields) ? body.visibleFields : [];
    const productCategoryName = typeof body.productCategoryName === 'string' ? body.productCategoryName : '';
    const currentCardStyle = normalizeCardStyle(body.currentCardStyle);

    const { supabase, user } = await requireAuthenticatedSupabaseUser(request, env);
    await assertOfficeOwnership({ supabase, authUserId: user.id, officeCode });

    const requestBody = buildCardStyleOpenAiRequestBody({
      cardAiDesign,
      visibleFields,
      productCategoryName,
      openAiModel: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      currentCardStyle,
    });

    let payload;

    try {
      payload = await requestOpenAiJson(requestBody, env.OPENAI_API_KEY);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : 'OpenAI request failed.', 502);
    }

    const intent = normalizeOpenAiCardIntent(payload, cardAiDesign.targetScope);

    return jsonResponse({ intent });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse('Unexpected server error.', 500);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run functions/api/storefront-ai/__tests__/card-style.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add functions/api/storefront-ai/card-style.js functions/api/storefront-ai/__tests__/card-style.test.js
git commit -m "feat(functions): add POST /api/storefront-ai/card-style proxy route"
```

---

## Task 10: Env/config cleanup and integration-test stub swap

**Files:**
- Create: `react-app/wrangler.toml`
- Create: `react-app/.env.example`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

**Interfaces:** none (config + test-only task).

- [ ] **Step 1: Add a minimal `wrangler.toml` for local Functions testing**

Create `react-app/wrangler.toml`:

```toml
name = "react-app"
pages_build_output_dir = "dist"
compatibility_date = "2026-06-22"
```

Note: Cloudflare Pages dashboard settings (Root directory = `react-app`, Build command = `npm run build`, Build output directory = `dist`, and the actual `OPENAI_API_KEY`/`OPENAI_MODEL`/`VITE_*` environment variable values for Preview and Production) are configured in the Cloudflare dashboard, not in this file or in this plan — that is an operator/deployment-checklist step from the spec, not a code change.

- [ ] **Step 2: Document the env var contract**

Create `react-app/.env.example`:

```
# Client-safe (Vite inlines these into the browser bundle — never put secrets here)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_PUBLIC_APP_URL=

# Optional local-dev escape hatch: set to "true" to skip the /api/storefront-ai/* network
# call and use the heuristic intent builder directly (no Functions backend required).
VITE_STOREFRONT_AI_LOCAL_HEURISTIC=

# Server-only — set these in the Cloudflare Pages project's environment variables
# (Preview and Production), never in this file, never with a VITE_ prefix:
#   OPENAI_API_KEY=
#   OPENAI_MODEL=gpt-4.1-mini
```

- [ ] **Step 3: Swap the heuristic-mode env stub in the integration test**

In `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`, replace every occurrence of:

```js
    vi.stubEnv('VITE_OPENAI_API_KEY', '');
```

with:

```js
    vi.stubEnv('VITE_STOREFRONT_AI_LOCAL_HEURISTIC', 'true');
```

Use a single find-and-replace-all across the file (5 occurrences, confirmed via `grep -n "VITE_OPENAI_API_KEY" src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx` before editing).

- [ ] **Step 4: Verify `VITE_OPENAI_API_KEY` is gone from the storefront client bundle**

Run: `grep -rn "VITE_OPENAI_API_KEY" src/features/storefront`
Expected: no output (zero matches). If this still shows a match, an earlier task (2 or 3) was not completed correctly — go back and finish it before continuing.

Run (informational only, expected to still show one match — this is the documented out-of-scope gap, not a bug in this plan):

```bash
grep -rn "VITE_OPENAI_API_KEY" src/features/office-product-editor
```

Expected: `src/features/office-product-editor/model/ai-recommendations/index.js` still reads it — leave it untouched, it is out of scope per the Global Constraints section.

- [ ] **Step 5: Run the full storefront test suite**

Run: `npx vitest run src/features/storefront`
Expected: PASS, all test files green.

- [ ] **Step 6: Commit**

```bash
git add wrangler.toml .env.example src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
git commit -m "chore(storefront): document env contract, add wrangler config, swap test heuristic stub"
```

---

## Task 11: Full-suite verification and vercel-react-best-practices self-audit

**Files:** none created/modified — verification only.

- [ ] **Step 1: Run the entire react-app test suite**

Run: `npx vitest run`
Expected: every test file passes, including all of `src/features/storefront/__tests__`, `functions/lib/__tests__`, and `functions/api/storefront-ai/__tests__`.

- [ ] **Step 2: Confirm no stray imports of the deleted interpreter files remain**

Run: `grep -rn "pageStyleAiInterpreter\|cardStyleAiInterpreter" src functions`
Expected: no output. If anything matches, find that file and update its import to the corresponding `*AiContract` or `*AiGateway` module from Tasks 2-5.

- [ ] **Step 3: Vercel React best-practices self-check**

Walk through the new/changed code against these specific rules and fix anything that fails:

- `bundle-analyzable-paths` — every new import in `functions/api/storefront-ai/*.js` and `functions/lib/*.js` is a static relative path or a bare npm specifier (`@supabase/supabase-js`); none use dynamic `import()` with a computed string, and the markdown-portability fix in Task 1 removed the only Vite-special-syntax import (`?raw`) in this code path. Confirm by re-reading both Function files.
- `async-cheap-condition-before-await` — in both `page-style.js` and `card-style.js`, the ordering is: `assertPostJsonRequest` (sync) → `readJsonBody` (cheap) → `pickAllowedKeys`/`assertOfficeCodePresent`/`assertPromptWithinLimit` (sync) → THEN `requireAuthenticatedSupabaseUser` (network) → THEN `assertOfficeOwnership` (network) → THEN `requestOpenAiJson` (network, most expensive). Confirm this order was not accidentally changed.
- `js-early-exit` — every validation helper in `functions/lib/requestValidation.js` throws immediately on the first failing condition rather than accumulating errors; confirm no helper was rewritten to do otherwise.
- `rerender-functional-setstate` — `usePageAiDesign.js`/`useCardAiDesign.js` still use the functional form of `setCardStyle`/`setPageAiDesignState` everywhere they did before Task 6's edit (the edit only touched `applyPageAiDesign`/`applyCardAiDesign`'s body, not the setter calls elsewhere in the file). Confirm by re-reading both hook files in full.
- `rerender-no-inline-components` — Task 6 did not introduce any new component defined inside another component's render body (it only changed hook internals, no JSX). Confirm true.

- [ ] **Step 4: Manual smoke check of the heuristic path in the browser**

Run: `npm run dev` (from `react-app/`), then in the running app, navigate to the storefront builder, select a category, go to the page-design step, leave `VITE_STOREFRONT_AI_LOCAL_HEURISTIC` unset in your local `.env`, and type a prompt like "make it feel blue and trustworthy," then click "페이지 스타일 적용." Since there is no `wrangler pages dev` running locally, the fetch to `/api/storefront-ai/page-style` will fail (404 from the Vite dev server) — confirm the UI surfaces the resulting error message via `pageAiErrorMessage` rather than crashing, and that the last valid page style is still shown. Then set `VITE_STOREFRONT_AI_LOCAL_HEURISTIC=true` in `.env`, restart `npm run dev`, repeat the same prompt, and confirm the heuristic intent now applies (the page accent color should turn blue, `#2563eb`) without any network call.

This is not automatable in this plan — it is a manual verification step. Report the observed behavior before proceeding to Task 12.

---

## Task 12: improve-codebase-architecture second pass

**Files:** any file touched in Tasks 1-10, reviewed for cleanup.

This task is the explicit second pass the user asked for: re-examine everything just written through the same lens used earlier in this session (deletion test, locality, intuitive naming) and fix what's found. It is not optional — it is part of this plan because the user's instruction was "vercel-react-best-practice로 코드 작성후 improve codebase로 코드 한번더 수정."

- [ ] **Step 1: Check for over-exported surface on the new contract/gateway/function-lib modules**

Run: `grep -n "^export" src/features/storefront/services/pageStyleAiContract.js src/features/storefront/services/cardStyleAiContract.js src/features/storefront/services/pageStyleAiGateway.js src/features/storefront/services/cardStyleAiGateway.js functions/lib/*.js functions/api/storefront-ai/*.js`

For each exported symbol, confirm it has at least one call site outside its own file (in `src/` or `functions/`, including test files). Use `grep -rn "<symbolName>"` for any export you're unsure about. Demote (remove `export`) anything with zero outside callers — but do not demote anything Task 2-9 explicitly required to be exported per its Interfaces block (those have real callers in later tasks).

- [ ] **Step 2: Confirm no leftover dead files**

Run: `find src/features/storefront/services src/features/storefront/__tests__ -name "*Interpreter*"`
Expected: no output (both old files and their old tests were deleted in Tasks 2-3).

- [ ] **Step 3: Naming pass**

Re-read `pageStyleAiContract.js`, `cardStyleAiContract.js`, `pageStyleAiGateway.js`, `cardStyleAiGateway.js`, and every file under `functions/`. For each exported function, ask: does the name say what it does without needing to open the file? Specifically confirm:
- `requestPageStyleAiIntent`/`requestCardStyleAiIntent` (gateways) read as "ask for an AI intent," not "build" or "compile" (those words are reserved for `pageStyleCompiler.js`/`cardStyleCompiler.js`, a different responsibility).
- `assertOfficeOwnership` reads as a guard that throws, not a boolean-returning predicate (it has no `is`/`has` prefix, consistent with `assertPostJsonRequest`/`assertPromptWithinLimit` in the same codebase).
- `requireAuthenticatedSupabaseUser` reads as "get the user or throw," consistent with the `assert*`/`require*` naming pattern already used in `functions/lib`.

If any name reads ambiguously to a fresh reader, rename it and update every call site (grep for the old name first to find them all).

- [ ] **Step 4: Run the full suite one last time**

Run: `npx vitest run`
Expected: PASS, same totals as Task 11 Step 1 (renames/export demotions in this task must not change behavior).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(storefront): tighten export surface and naming after the OpenAI-proxy split"
```

(If Steps 1-3 found nothing to change, skip this commit — there is nothing to commit.)

---

## Self-Review

**Spec coverage:**
- "prevent OpenAI keys from entering the browser bundle" → Tasks 2-6, verified in Task 10 Step 4.
- "prevent arbitrary public callers from abusing the proxy endpoint" → Task 7 (`requireAuthenticatedSupabaseUser`, `assertOfficeOwnership`) + Tasks 8-9 wire them into both routes.
- Two narrow routes, not a generic proxy → Tasks 8-9, one file each, no catch-all.
- Auth via `getUser()` (not `getSession()`) on the server → `functions/lib/supabaseServerAuth.js` Step 3 of Task 7.
- Office ownership gate, 403 on mismatch → `functions/lib/officeOwnershipGuard.js`, Task 7 Step 4.
- Payload/size/prompt-length bounds → `functions/lib/requestValidation.js`, Task 7 Step 2.
- Error status codes 401/403/405/413/422/502/500 → covered across Task 7-9; verified by the Function tests in Task 8/9.
- "keep the last valid preview if the AI request fails" / "surface a concise error message" → unchanged hook catch-blocks in Task 6, preserved from the original code.
- Heuristic fallback preserved for dev/disabled mode → `VITE_STOREFRONT_AI_LOCAL_HEURISTIC` flag in Tasks 4-5.
- "Each function should import only the pure builders/normalizers needed... not the full browser hook surface" → Task 8-9 import only from `model/`+`services/*Contract.js`+`services/openAiJsonRequest.js`, never from `hooks/`.
- File-level direction's three named frontend files (`pageStyleAiInterpreter.js`, `cardStyleAiInterpreter.js`, `openAiJsonRequest.js`) → first two split (Tasks 2-3), third left as the already-pure transport util it was (no change needed, confirmed in this plan's research phase).
- Deployment checklist's dashboard/env items → Task 10 (`.env.example`, `wrangler.toml`); the actual dashboard clicking is explicitly called out as out-of-scope-for-code in Task 10 Step 1.

**Placeholder scan:** none found — every step above has literal file content, exact commands, or exact grep patterns.

**Type/name consistency check:** `requestPageStyleAiIntent`/`requestCardStyleAiIntent` (Tasks 4-5) match the names imported in Task 6's hook edits and Task 4-5's own tests. `buildPageStyleOpenAiRequestBody`/`normalizePageStyleAiIntent`/`buildHeuristicPageAiIntent` (Task 2) match the names imported in Task 4 and Task 8. `buildCardStyleOpenAiRequestBody`/`normalizeOpenAiCardIntent`/`buildHeuristicCardAiIntent` (Task 3) match Task 5 and Task 9. `RequestValidationError`/`assertPostJsonRequest`/`readJsonBody`/`assertPromptWithinLimit`/`assertOfficeCodePresent`/`pickAllowedKeys` (Task 7) match the imports in Task 8-9. `requireAuthenticatedSupabaseUser`/`assertOfficeOwnership` (Task 7) match Task 8-9. `jsonResponse`/`errorResponse` (Task 7) match Task 8-9.

