# Storefront AI Chat-Style UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the one-shot "prompt textarea + apply button" AI design UI in the Page Design and Card Design storefront-builder steps into a Claude-Desktop-style chat: multi-turn history, AI-written explanations of what changed, and same-section design suggestions (text-only).

**Architecture:** A new shared, domain-agnostic `AiChatPanel` component (plus `ScopeSelectorStrip` and `ChatMessageBubble`) renders the chat UI for both `CardDesignEditor` and `PageDesignEditor`. The existing `useCardAiDesign`/`usePageAiDesign` hooks grow a `messages` array and change `applyCardAiDesign`/`applyPageAiDesign` to push a user turn, send the last 6 messages as `history` to the (still stateless) backend, and push an assistant turn with the AI's `explanation`/`suggestion` text. The OpenAI structured-output schemas grow two sibling fields (`explanation`, `suggestion`) alongside the existing style-intent fields.

**Tech Stack:** React (hooks, CSS Modules), Vitest + Testing Library, Cloudflare Pages Functions, OpenAI Responses API (`json_schema` strict mode).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-24-storefront-ai-chat-style-design.md` — every requirement in that doc must map to a task below.
- History cap: at most **6** messages (user+assistant combined) sent as conversational context per request; enforced both client-side (slice before sending) and server-side (`assertHistoryWithinLimits`, max 6 turns, max 500 chars per turn text).
- No history persistence to a database — `messages` lives only in React state, reset on `hydrateCardStyle`/`hydratePageStyle`/`discard*AiDesignSession` exactly like the existing prompt/scope state.
- Undo stays single-level (existing `lastCardAiSnapshot` behavior unchanged); Page Design still has no undo.
- Preserve every existing `data-testid` and accessible label used by `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx` and `PageDesignEditor.test.jsx`: `card-design-prompt`, `apply-ai-suggestion`, `undo-ai-changes`, `card-design-scope-*`, `apply-page-ai-design`, `page-design-scope-*`, `page-design-editor`, the `페이지 스타일 요청` label, `card-design-cards-per-row`.
- Recommendation text (`suggestion`) is plain text only — no one-click apply.
- All new/changed JSON schemas must keep OpenAI strict-mode shape: `additionalProperties: false` and every property listed in `required` (nullable fields use `type: [..., 'null']`).

---

### Task 1: Add `assertHistoryWithinLimits` request validation

**Files:**
- Modify: `react-app/functions/lib/requestValidation.js`
- Test: `react-app/functions/lib/__tests__/requestValidation.test.js`

**Interfaces:**
- Produces: `assertHistoryWithinLimits(history)` — throws `RequestValidationError` (422) if `history` is present but not an array, has more than 6 entries, or any entry's `role` isn't `'user'`/`'assistant'` or `text` isn't a string ≤ 500 chars. Returns `undefined` (no throw) when `history` is `undefined`/`null`/a valid array.

- [ ] **Step 1: Write the failing tests**

Add to the end of `react-app/functions/lib/__tests__/requestValidation.test.js`:

```js
import {
  RequestValidationError,
  assertHistoryWithinLimits,
  assertOfficeCodePresent,
  assertPostJsonRequest,
  assertPromptWithinLimit,
  pickAllowedKeys,
  readJsonBody,
} from '../requestValidation';
```

(replace the existing import block at the top of the file with the one above, adding `assertHistoryWithinLimits`)

```js
describe('assertHistoryWithinLimits', () => {
  it('passes when history is missing entirely', () => {
    expect(() => assertHistoryWithinLimits(undefined)).not.toThrow();
    expect(() => assertHistoryWithinLimits(null)).not.toThrow();
  });

  it('passes for a small valid history array', () => {
    expect(() =>
      assertHistoryWithinLimits([
        { role: 'user', text: '제목을 굵게 해줘' },
        { role: 'assistant', text: '제목을 더 굵게 바꿨습니다.' },
      ]),
    ).not.toThrow();
  });

  it('rejects a non-array history with 422', () => {
    expect(() => assertHistoryWithinLimits('not an array')).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });

  it('rejects more than 6 turns with 422', () => {
    const history = Array.from({ length: 7 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      text: `turn ${index}`,
    }));

    expect(() => assertHistoryWithinLimits(history)).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });

  it('rejects a turn with an invalid role with 422', () => {
    expect(() => assertHistoryWithinLimits([{ role: 'system', text: 'hi' }])).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });

  it('rejects a turn whose text is over 500 characters with 422', () => {
    expect(() =>
      assertHistoryWithinLimits([{ role: 'user', text: 'x'.repeat(501) }]),
    ).toThrow(expect.objectContaining({ status: 422 }));
  });

  it('rejects a turn whose text is not a string with 422', () => {
    expect(() => assertHistoryWithinLimits([{ role: 'user', text: 123 }])).toThrow(
      RequestValidationError,
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd react-app && npx vitest run functions/lib/__tests__/requestValidation.test.js`
Expected: FAIL — `assertHistoryWithinLimits is not a function` (or not exported).

- [ ] **Step 3: Implement `assertHistoryWithinLimits`**

In `react-app/functions/lib/requestValidation.js`, add the two new constants near the top (right after `MAX_REQUEST_BODY_BYTES`) and the new exported function at the end of the file:

```js
const MAX_PROMPT_LENGTH = 2000;
const MAX_REQUEST_BODY_BYTES = 20000;
const MAX_HISTORY_TURNS = 6;
const MAX_HISTORY_TURN_LENGTH = 500;
```

```js
export function assertHistoryWithinLimits(history) {
  if (history === undefined || history === null) {
    return;
  }

  if (!Array.isArray(history)) {
    throw new RequestValidationError('history must be an array.', 422);
  }

  if (history.length > MAX_HISTORY_TURNS) {
    throw new RequestValidationError(
      `history must contain at most ${MAX_HISTORY_TURNS} turns.`,
      422,
    );
  }

  for (const turn of history) {
    const role = turn?.role;
    const text = turn?.text;
    const hasValidRole = role === 'user' || role === 'assistant';
    const hasValidText = typeof text === 'string' && text.length <= MAX_HISTORY_TURN_LENGTH;

    if (!hasValidRole || !hasValidText) {
      throw new RequestValidationError(
        `each history turn must have role "user" or "assistant" and text of at most ${MAX_HISTORY_TURN_LENGTH} characters.`,
        422,
      );
    }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd react-app && npx vitest run functions/lib/__tests__/requestValidation.test.js`
Expected: PASS (all tests including the pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add react-app/functions/lib/requestValidation.js react-app/functions/lib/__tests__/requestValidation.test.js
git commit -m "feat(storefront-ai): add assertHistoryWithinLimits request validation"
```

---

### Task 2: Card AI contract — explanation/suggestion schema fields + history threading

**Files:**
- Modify: `react-app/src/features/storefront/services/cardStyleAiContract.js`
- Test: `react-app/src/features/storefront/__tests__/cardStyleAiContract.test.js`

**Interfaces:**
- Consumes: nothing new (same imports as today).
- Produces:
  - `CARD_STYLE_AI_SCHEMA` now includes `explanation: { type: 'string' }` and `suggestion: { type: ['string','null'] }`, both listed in `required`.
  - `buildCardStyleOpenAiRequestBody({ cardAiDesign, visibleFields, productCategoryName, openAiModel, currentCardStyle, history = [] })` — new optional `history` param: array of `{ role: 'user'|'assistant', text: string }`, spliced into `input` between the system message and the final user message as `{ role, content: text }`.
  - `buildHeuristicCardAiExplanation(intent)` — new export, returns a Korean sentence summarizing which top-level intent keys are non-null.
  - `normalizeOpenAiCardExplanation(payload)` — new export, returns `{ explanation: string, suggestion: string|null }`.

- [ ] **Step 1: Write the failing tests**

Add to `react-app/src/features/storefront/__tests__/cardStyleAiContract.test.js` (extend the existing import line and add new `describe` blocks at the end of the file):

```js
import {
  buildCardStyleOpenAiRequestBody,
  buildHeuristicCardAiExplanation,
  buildHeuristicCardAiIntent,
  CARD_STYLE_AI_SCHEMA,
  detectAccentHexFromPrompt,
  detectFieldIntentCandidate,
  detectHeaderIntentCandidate,
  detectImageIntentCandidate,
  detectInfoIntentCandidate,
  detectLayoutIntentCandidate,
  detectShellIntentCandidate,
  normalizeOpenAiCardExplanation,
  normalizeOpenAiCardIntent,
} from '../services/cardStyleAiContract';
```

```js
describe('CARD_STYLE_AI_SCHEMA explanation/suggestion fields', () => {
  it('requires explanation as a plain string and suggestion as a nullable string', () => {
    expect(CARD_STYLE_AI_SCHEMA.properties.explanation).toEqual({ type: 'string' });
    expect(CARD_STYLE_AI_SCHEMA.properties.suggestion.type).toContain('null');
    expect(CARD_STYLE_AI_SCHEMA.required).toContain('explanation');
    expect(CARD_STYLE_AI_SCHEMA.required).toContain('suggestion');
  });
});

describe('buildHeuristicCardAiExplanation', () => {
  it('lists the Korean labels of every non-null intent section', () => {
    const explanation = buildHeuristicCardAiExplanation({
      header: { fontWeight: 800 },
      field: { priceColorRole: 'brand' },
      image: null,
      info: null,
      shell: null,
      layout: null,
    });

    expect(explanation).toBe('제목 영역, 항목 스타일을 요청하신 대로 변경했습니다.');
  });

  it('returns a fallback sentence when nothing changed', () => {
    expect(
      buildHeuristicCardAiExplanation({
        header: null,
        field: null,
        image: null,
        info: null,
        shell: null,
        layout: null,
      }),
    ).toBe('요청하신 내용에서 적용할 수 있는 변경 사항을 찾지 못했습니다.');
  });
});

describe('normalizeOpenAiCardExplanation', () => {
  it('trims explanation/suggestion and nulls out a blank suggestion', () => {
    expect(
      normalizeOpenAiCardExplanation({ explanation: '  제목을 굵게 바꿨습니다.  ', suggestion: '  ' }),
    ).toEqual({ explanation: '제목을 굵게 바꿨습니다.', suggestion: null });
  });

  it('falls back to a default explanation when the payload omits it', () => {
    expect(normalizeOpenAiCardExplanation({})).toEqual({
      explanation: '요청하신 내용을 카드 디자인에 반영했습니다.',
      suggestion: null,
    });
  });

  it('keeps a real suggestion string', () => {
    expect(
      normalizeOpenAiCardExplanation({ explanation: 'ok', suggestion: '이미지도 함께 밝게 해보세요.' }),
    ).toEqual({ explanation: 'ok', suggestion: '이미지도 함께 밝게 해보세요.' });
  });
});

describe('buildCardStyleOpenAiRequestBody history threading', () => {
  it('splices history turns between the system message and the final user message', () => {
    const requestBody = buildCardStyleOpenAiRequestBody({
      cardAiDesign: { prompt: '더 크게 해줘', targetScope: '' },
      visibleFields: ['product_name'],
      productCategoryName: '',
      openAiModel: 'gpt-4.1-mini',
      currentCardStyle: undefined,
      history: [
        { role: 'user', text: '제목을 굵게 해줘' },
        { role: 'assistant', text: '제목을 더 굵게 바꿨습니다.' },
      ],
    });

    expect(requestBody.input[0].role).toBe('system');
    expect(requestBody.input[1]).toEqual({ role: 'user', content: '제목을 굵게 해줘' });
    expect(requestBody.input[2]).toEqual({ role: 'assistant', content: '제목을 더 굵게 바꿨습니다.' });
    expect(requestBody.input[3].role).toBe('user');
    expect(requestBody.input).toHaveLength(4);
  });

  it('drops blank history turns and defaults to no history when omitted', () => {
    const requestBody = buildCardStyleOpenAiRequestBody({
      cardAiDesign: { prompt: '더 크게 해줘', targetScope: '' },
      visibleFields: ['product_name'],
      productCategoryName: '',
      openAiModel: 'gpt-4.1-mini',
      currentCardStyle: undefined,
      history: [{ role: 'user', text: '   ' }],
    });

    expect(requestBody.input).toHaveLength(2);
  });

  it('mentions explanation and suggestion in the system prompt', () => {
    const requestBody = buildCardStyleOpenAiRequestBody({
      cardAiDesign: { prompt: 'x', targetScope: '' },
      visibleFields: [],
      productCategoryName: '',
      openAiModel: 'gpt-4.1-mini',
      currentCardStyle: undefined,
    });

    expect(requestBody.input[0].content).toContain('explanation');
    expect(requestBody.input[0].content).toContain('suggestion');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/cardStyleAiContract.test.js`
Expected: FAIL — `buildHeuristicCardAiExplanation`/`normalizeOpenAiCardExplanation` not exported, schema missing `explanation`/`suggestion`, `input` array length mismatches.

- [ ] **Step 3: Implement the schema, history threading, and explanation helpers**

In `react-app/src/features/storefront/services/cardStyleAiContract.js`, change the `CARD_STYLE_AI_SCHEMA` definition (around line 149) to:

```js
export const CARD_STYLE_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    structuralPresetRequest: { type: ['string', 'null'] },
    titleModeRequest: { type: ['string', 'null'] },
    layout: NULLABLE_LAYOUT_SCHEMA,
    shell: NULLABLE_SHELL_SCHEMA,
    header: NULLABLE_HEADER_SCHEMA,
    image: NULLABLE_IMAGE_SCHEMA,
    info: NULLABLE_INFO_SCHEMA,
    field: NULLABLE_FIELD_SCHEMA,
    explanation: { type: 'string' },
    suggestion: { type: ['string', 'null'] },
  },
  required: [
    'structuralPresetRequest',
    'titleModeRequest',
    'layout',
    'shell',
    'header',
    'image',
    'info',
    'field',
    'explanation',
    'suggestion',
  ],
};
```

Change `buildCardStyleOpenAiRequestBody` (around line 492) to thread `history` and extend the system prompt:

```js
export function buildCardStyleOpenAiRequestBody({
  cardAiDesign,
  visibleFields,
  productCategoryName,
  openAiModel,
  currentCardStyle,
  history = [],
}) {
  const activeSkillIds = selectCardStyleSkillPackIds({ productCategoryName, mode: 'preview' });
  const scopeInstruction = buildCardAiTargetScopeInstruction(cardAiDesign.targetScope);
  const scopedPrompt = scopeInstruction ? `${scopeInstruction}\n사용자 요청:\n${cardAiDesign.prompt}` : cardAiDesign.prompt;
  const historyMessages = (Array.isArray(history) ? history : [])
    .map((turn) => ({
      role: turn?.role === 'assistant' ? 'assistant' : 'user',
      content: toTrimmedString(turn?.text),
    }))
    .filter((turn) => turn.content);

  return {
    model: openAiModel,
    input: [
      {
        role: 'system',
        content: [
          buildCardStyleAiSystemPrompt(activeSkillIds),
          'Return only a valid JSON object that matches the schema.',
          'Treat the response as an incremental patch over currentCardStyle.',
          'Preserve earlier card edits unless the user explicitly changes them.',
          'For every nested property you do not want to change, return null.',
          'If a target scope is given, only that scope (header/image/info/field) may be non-null. All other area objects must be null.',
          'shell, structuralPresetRequest, and titleModeRequest are general and may be set regardless of the target scope.',
          'Always set "explanation" to 1-2 short Korean sentences describing what you changed, written for a non-technical store owner.',
          'If a clear complementary tweak exists for another section of this same card (header/image/info/field), set "suggestion" to one short Korean sentence describing it. Otherwise set "suggestion" to null. Never suggest changes outside this card.',
        ].join('\n\n'),
      },
      ...historyMessages,
      {
        role: 'user',
        content: JSON.stringify(
          {
            request: { ...cardAiDesign, scopeInstruction, scopedPrompt },
            visibleFields,
            currentCardStyle: normalizeCardStyle(currentCardStyle),
          },
          null,
          2,
        ),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'storefront_card_style_suggestion',
        strict: true,
        schema: CARD_STYLE_AI_SCHEMA,
      },
    },
    max_output_tokens: 900,
  };
}
```

Add these two new exports at the end of the file (after `normalizeOpenAiCardIntent`):

```js
const CARD_INTENT_EXPLANATION_SECTION_LABELS = {
  shell: '카드 테두리/배경',
  header: '제목 영역',
  image: '이미지',
  info: '정보 영역',
  field: '항목 스타일',
  layout: '레이아웃',
};

export function buildHeuristicCardAiExplanation(intent) {
  const changedLabels = Object.entries(CARD_INTENT_EXPLANATION_SECTION_LABELS)
    .filter(([key]) => Boolean(intent?.[key]))
    .map(([, label]) => label);

  if (changedLabels.length === 0) {
    return '요청하신 내용에서 적용할 수 있는 변경 사항을 찾지 못했습니다.';
  }

  return `${changedLabels.join(', ')}을 요청하신 대로 변경했습니다.`;
}

export function normalizeOpenAiCardExplanation(payload) {
  return {
    explanation: toTrimmedString(payload?.explanation) || '요청하신 내용을 카드 디자인에 반영했습니다.',
    suggestion: toTrimmedString(payload?.suggestion) || null,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/cardStyleAiContract.test.js`
Expected: PASS (all tests, including the pre-existing strict-mode schema checks).

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/services/cardStyleAiContract.js react-app/src/features/storefront/__tests__/cardStyleAiContract.test.js
git commit -m "feat(storefront-ai): add explanation/suggestion + history threading to card AI contract"
```

---

### Task 3: Page AI contract — explanation/suggestion schema fields + history threading

**Files:**
- Modify: `react-app/src/features/storefront/services/pageStyleAiContract.js`
- Test: `react-app/src/features/storefront/__tests__/pageStyleAiContract.test.js`

**Interfaces:**
- Produces: same shape as Task 2 but for page style — `PAGE_STYLE_AI_SCHEMA` gains `explanation`/`suggestion`; `buildPageStyleOpenAiRequestBody(...)` gains `history = []`; new exports `buildHeuristicPageAiExplanation(intent)` and `normalizePageStyleAiExplanation(payload)`.

- [ ] **Step 1: Write the failing tests**

Read `react-app/src/features/storefront/__tests__/pageStyleAiContract.test.js` first to match its existing import style, then add (mirroring Task 2's test shape exactly, substituting page names):

```js
describe('PAGE_STYLE_AI_SCHEMA explanation/suggestion fields', () => {
  it('requires explanation as a plain string and suggestion as a nullable string', () => {
    expect(PAGE_STYLE_AI_SCHEMA.properties.explanation).toEqual({ type: 'string' });
    expect(PAGE_STYLE_AI_SCHEMA.properties.suggestion.type).toContain('null');
    expect(PAGE_STYLE_AI_SCHEMA.required).toContain('explanation');
    expect(PAGE_STYLE_AI_SCHEMA.required).toContain('suggestion');
  });
});

describe('buildHeuristicPageAiExplanation', () => {
  it('lists the Korean labels of every non-null intent section', () => {
    const explanation = buildHeuristicPageAiExplanation({
      palette: { accentHex: '#2563eb' },
      header: null,
      categoryChips: { textHex: '#111827' },
      search: null,
    });

    expect(explanation).toBe('전체 색감, 카테고리 칩을 요청하신 대로 변경했습니다.');
  });

  it('returns a fallback sentence when nothing changed', () => {
    expect(
      buildHeuristicPageAiExplanation({ palette: null, header: null, categoryChips: null, search: null }),
    ).toBe('요청하신 내용에서 적용할 수 있는 변경 사항을 찾지 못했습니다.');
  });
});

describe('normalizePageStyleAiExplanation', () => {
  it('trims explanation/suggestion and nulls out a blank suggestion', () => {
    expect(
      normalizePageStyleAiExplanation({ explanation: '  배경을 밝게 바꿨습니다.  ', suggestion: '  ' }),
    ).toEqual({ explanation: '배경을 밝게 바꿨습니다.', suggestion: null });
  });

  it('falls back to a default explanation when the payload omits it', () => {
    expect(normalizePageStyleAiExplanation({})).toEqual({
      explanation: '요청하신 내용을 페이지 스타일에 반영했습니다.',
      suggestion: null,
    });
  });
});

describe('buildPageStyleOpenAiRequestBody history threading', () => {
  it('splices history turns between the system message and the final user message', () => {
    const requestBody = buildPageStyleOpenAiRequestBody({
      pageAiDesign: { prompt: '더 크게 해줘', targetScope: '' },
      openAiModel: 'gpt-4.1-mini',
      currentPageStyle: undefined,
      history: [
        { role: 'user', text: '파란색으로 해줘' },
        { role: 'assistant', text: '배경을 파란색으로 바꿨습니다.' },
      ],
    });

    expect(requestBody.input[0].role).toBe('system');
    expect(requestBody.input[1]).toEqual({ role: 'user', content: '파란색으로 해줘' });
    expect(requestBody.input[2]).toEqual({ role: 'assistant', content: '배경을 파란색으로 바꿨습니다.' });
    expect(requestBody.input[3].role).toBe('user');
    expect(requestBody.input).toHaveLength(4);
  });

  it('mentions explanation and suggestion in the system prompt', () => {
    const requestBody = buildPageStyleOpenAiRequestBody({
      pageAiDesign: { prompt: 'x', targetScope: '' },
      openAiModel: 'gpt-4.1-mini',
      currentPageStyle: undefined,
    });

    expect(requestBody.input[0].content).toContain('explanation');
    expect(requestBody.input[0].content).toContain('suggestion');
  });
});
```

Add `buildHeuristicPageAiExplanation`, `normalizePageStyleAiExplanation`, `PAGE_STYLE_AI_SCHEMA`, `buildPageStyleOpenAiRequestBody` to that file's existing import line from `../services/pageStyleAiContract`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleAiContract.test.js`
Expected: FAIL — new exports missing, schema missing fields, `input` length mismatches.

- [ ] **Step 3: Implement**

In `react-app/src/features/storefront/services/pageStyleAiContract.js`:

1. Add the import at the top of the file (it's currently missing):

```js
import { toTrimmedString } from '../../../common/utils/text';
```

2. Change `PAGE_STYLE_AI_SCHEMA` (around line 97) to:

```js
export const PAGE_STYLE_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    palette: NULLABLE_PALETTE_SCHEMA,
    header: NULLABLE_HEADER_SCHEMA,
    categoryChips: NULLABLE_CATEGORY_CHIPS_SCHEMA,
    search: NULLABLE_SEARCH_SCHEMA,
    explanation: { type: 'string' },
    suggestion: { type: ['string', 'null'] },
  },
  required: ['palette', 'header', 'categoryChips', 'search', 'explanation', 'suggestion'],
};
```

3. Change `buildPageStyleOpenAiRequestBody` (around line 493) to:

```js
export function buildPageStyleOpenAiRequestBody({
  pageAiDesign,
  openAiModel,
  currentPageStyle,
  history = [],
}) {
  const scopeInstruction = buildPageAiTargetScopeInstruction(
    pageAiDesign.targetScope,
  );
  const scopedPrompt = scopeInstruction
    ? `${scopeInstruction}\n사용자 요청:\n${pageAiDesign.prompt}`
    : pageAiDesign.prompt;
  const historyMessages = (Array.isArray(history) ? history : [])
    .map((turn) => ({
      role: turn?.role === 'assistant' ? 'assistant' : 'user',
      content: toTrimmedString(turn?.text),
    }))
    .filter((turn) => turn.content);

  return {
    model: openAiModel,
    input: [
      {
        role: 'system',
        content: [
          'You style one storefront page background palette, header text, category chips, and search box.',
          'Treat the response as an incremental patch over currentPageStyle.',
          'Preserve earlier page-style edits unless the user explicitly changes them.',
          'For every property you do not want to change, return null.',
          'If targetScope is present, only that scope may change. All non-target area objects must be null.',
          'When targetScope is not palette, palette must be null and may not be used as a backdoor to restyle other sections.',
          'Search may only carry sizeToken and borderStrengthToken. Never invent background, radius, or icon properties.',
          'Category chips may only carry background/text/border/active-state colors. Never invent shape or placement properties.',
          'Header may only carry title color, letter spacing, and font weight. Never rewrite the title text itself.',
          'Always set "explanation" to 1-2 short Korean sentences describing what you changed, written for a non-technical store owner.',
          'If a clear complementary tweak exists for another scope of this same page (palette/header/categoryChips/search), set "suggestion" to one short Korean sentence describing it. Otherwise set "suggestion" to null.',
        ].join('\n'),
      },
      ...historyMessages,
      {
        role: 'user',
        content: JSON.stringify(
          {
            request: {
              ...pageAiDesign,
              scopeInstruction,
              scopedPrompt,
            },
            currentPageStyle: normalizePageStyle(currentPageStyle),
          },
          null,
          2,
        ),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'storefront_page_style_suggestion',
        strict: true,
        schema: PAGE_STYLE_AI_SCHEMA,
      },
    },
    max_output_tokens: 800,
  };
}
```

4. Add these two new exports at the end of the file:

```js
const PAGE_INTENT_EXPLANATION_SECTION_LABELS = {
  palette: '전체 색감',
  header: '헤더 텍스트',
  categoryChips: '카테고리 칩',
  search: '검색창',
};

export function buildHeuristicPageAiExplanation(intent) {
  const changedLabels = Object.entries(PAGE_INTENT_EXPLANATION_SECTION_LABELS)
    .filter(([key]) => Boolean(intent?.[key]))
    .map(([, label]) => label);

  if (changedLabels.length === 0) {
    return '요청하신 내용에서 적용할 수 있는 변경 사항을 찾지 못했습니다.';
  }

  return `${changedLabels.join(', ')}을 요청하신 대로 변경했습니다.`;
}

export function normalizePageStyleAiExplanation(payload) {
  return {
    explanation: toTrimmedString(payload?.explanation) || '요청하신 내용을 페이지 스타일에 반영했습니다.',
    suggestion: toTrimmedString(payload?.suggestion) || null,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleAiContract.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/services/pageStyleAiContract.js react-app/src/features/storefront/__tests__/pageStyleAiContract.test.js
git commit -m "feat(storefront-ai): add explanation/suggestion + history threading to page AI contract"
```

---

### Task 4: Card backend handler — accept history, return explanation/suggestion

**Files:**
- Modify: `react-app/functions/api/storefront-ai/card-style.js`
- Test: `react-app/functions/api/storefront-ai/__tests__/card-style.test.js`

**Interfaces:**
- Consumes: `assertHistoryWithinLimits` (Task 1), `normalizeOpenAiCardExplanation` (Task 2).
- Produces: response body becomes `{ intent, explanation, suggestion }` (was `{ intent }`).

- [ ] **Step 1: Write the failing test**

Add to `react-app/functions/api/storefront-ai/__tests__/card-style.test.js`, replacing the final success test's `output_parsed` and assertions:

```js
it('returns 200 with a normalized intent, explanation, and suggestion on success', async () => {
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
          explanation: '제목을 더 굵게 바꿨습니다.',
          suggestion: '이미지 섹션도 같이 밝게 해보면 어울릴 것 같아요.',
        },
      }),
    }),
  );
  const request = buildRequest({
    officeCode: 'OFF-1',
    cardAiDesign: { prompt: 'make the title bolder', targetScope: 'header' },
    visibleFields: ['product_name'],
    history: [{ role: 'user', text: '제목을 굵게 해줘' }],
  });

  const response = await onRequestPost({ request, env: TEST_ENV });
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.intent.header).toEqual({ fontWeight: 800 });
  expect(body.explanation).toBe('제목을 더 굵게 바꿨습니다.');
  expect(body.suggestion).toBe('이미지 섹션도 같이 밝게 해보면 어울릴 것 같아요.');
});

it('returns 422 when history has more than 6 turns', async () => {
  createClient.mockReturnValue(buildSupabaseStub());
  const history = Array.from({ length: 7 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    text: `turn ${index}`,
  }));
  const request = buildRequest({
    officeCode: 'OFF-1',
    cardAiDesign: { prompt: 'make the title bolder' },
    visibleFields: ['product_name'],
    history,
  });

  const response = await onRequestPost({ request, env: TEST_ENV });

  expect(response.status).toBe(422);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd react-app && npx vitest run functions/api/storefront-ai/__tests__/card-style.test.js`
Expected: FAIL — `body.explanation`/`body.suggestion` are `undefined`; the 7-turn history request returns 200 instead of 422.

- [ ] **Step 3: Implement**

In `react-app/functions/api/storefront-ai/card-style.js`:

```js
import { normalizeCardAiDesignInput } from '../../../src/features/storefront/model/cardAiDesignModel.js';
import { normalizeCardStyle } from '../../../src/features/storefront/model/cardStyleModel.js';
import { requestOpenAiJson } from '../../../src/features/storefront/services/openAiJsonRequest.js';
import {
  buildCardStyleOpenAiRequestBody,
  normalizeOpenAiCardExplanation,
  normalizeOpenAiCardIntent,
} from '../../../src/features/storefront/services/cardStyleAiContract.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  RequestValidationError,
  assertHistoryWithinLimits,
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
  'history',
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
    const history = Array.isArray(body.history) ? body.history : [];
    assertHistoryWithinLimits(history);

    const { supabase, user } = await requireAuthenticatedSupabaseUser(request, env);
    await assertOfficeOwnership({ supabase, authUserId: user.id, officeCode });

    const requestBody = buildCardStyleOpenAiRequestBody({
      cardAiDesign,
      visibleFields,
      productCategoryName,
      openAiModel: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      currentCardStyle,
      history,
    });

    let payload;

    try {
      payload = await requestOpenAiJson(requestBody, env.OPENAI_API_KEY);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : 'OpenAI request failed.', 502);
    }

    const intent = normalizeOpenAiCardIntent(payload, cardAiDesign.targetScope);
    const { explanation, suggestion } = normalizeOpenAiCardExplanation(payload);

    return jsonResponse({ intent, explanation, suggestion });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse('Unexpected server error.', 500);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd react-app && npx vitest run functions/api/storefront-ai/__tests__/card-style.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add react-app/functions/api/storefront-ai/card-style.js react-app/functions/api/storefront-ai/__tests__/card-style.test.js
git commit -m "feat(storefront-ai): accept history and return explanation/suggestion from card-style endpoint"
```

---

### Task 5: Page backend handler — accept history, return explanation/suggestion

**Files:**
- Modify: `react-app/functions/api/storefront-ai/page-style.js`
- Test: `react-app/functions/api/storefront-ai/__tests__/page-style.test.js`

**Interfaces:** Same shape as Task 4, mirrored for page style.

- [ ] **Step 1: Write the failing test**

Read `react-app/functions/api/storefront-ai/__tests__/page-style.test.js` first to copy its exact `buildSupabaseStub`/`buildRequest` helpers, then add (mirroring Task 4's two new tests):

```js
it('returns 200 with a normalized intent, explanation, and suggestion on success', async () => {
  createClient.mockReturnValue(buildSupabaseStub());
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_parsed: {
          palette: null,
          header: { titleColorHex: null, letterSpacing: null, fontWeight: 800 },
          categoryChips: null,
          search: null,
          explanation: '제목을 더 굵게 바꿨습니다.',
          suggestion: '검색창 테두리도 같이 강하게 해보면 어울릴 것 같아요.',
        },
      }),
    }),
  );
  const request = buildRequest({
    officeCode: 'OFF-1',
    pageAiDesign: { prompt: 'make the title bolder', targetScope: 'header' },
    history: [{ role: 'user', text: '제목을 굵게 해줘' }],
  });

  const response = await onRequestPost({ request, env: TEST_ENV });
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.intent.header).toEqual({ fontWeight: 800 });
  expect(body.explanation).toBe('제목을 더 굵게 바꿨습니다.');
  expect(body.suggestion).toBe('검색창 테두리도 같이 강하게 해보면 어울릴 것 같아요.');
});

it('returns 422 when history has more than 6 turns', async () => {
  createClient.mockReturnValue(buildSupabaseStub());
  const history = Array.from({ length: 7 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    text: `turn ${index}`,
  }));
  const request = buildRequest({
    officeCode: 'OFF-1',
    pageAiDesign: { prompt: 'make the title bolder' },
    history,
  });

  const response = await onRequestPost({ request, env: TEST_ENV });

  expect(response.status).toBe(422);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd react-app && npx vitest run functions/api/storefront-ai/__tests__/page-style.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `react-app/functions/api/storefront-ai/page-style.js`:

```js
import { normalizePageAiDesignInput } from '../../../src/features/storefront/model/pageAiDesignModel.js';
import { normalizePageStyle } from '../../../src/features/storefront/model/pageStyleModel.js';
import { requestOpenAiJson } from '../../../src/features/storefront/services/openAiJsonRequest.js';
import {
  buildPageStyleOpenAiRequestBody,
  normalizePageStyleAiExplanation,
  normalizePageStyleAiIntent,
} from '../../../src/features/storefront/services/pageStyleAiContract.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  RequestValidationError,
  assertHistoryWithinLimits,
  assertOfficeCodePresent,
  assertPostJsonRequest,
  assertPromptWithinLimit,
  pickAllowedKeys,
  readJsonBody,
} from '../../lib/requestValidation.js';
import { requireAuthenticatedSupabaseUser } from '../../lib/supabaseServerAuth.js';
import { assertOfficeOwnership } from '../../lib/officeOwnershipGuard.js';

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const REQUEST_BODY_ALLOWED_KEYS = ['officeCode', 'pageAiDesign', 'currentPageStyle', 'history'];

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
    const history = Array.isArray(body.history) ? body.history : [];
    assertHistoryWithinLimits(history);

    const { supabase, user } = await requireAuthenticatedSupabaseUser(request, env);
    await assertOfficeOwnership({ supabase, authUserId: user.id, officeCode });

    const requestBody = buildPageStyleOpenAiRequestBody({
      pageAiDesign,
      openAiModel: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      currentPageStyle,
      history,
    });

    let payload;

    try {
      payload = await requestOpenAiJson(requestBody, env.OPENAI_API_KEY);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : 'OpenAI request failed.', 502);
    }

    const intent = normalizePageStyleAiIntent(payload, currentPageStyle.palette.accentHex, pageAiDesign.targetScope);
    const { explanation, suggestion } = normalizePageStyleAiExplanation(payload);

    return jsonResponse({ intent, explanation, suggestion });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse('Unexpected server error.', 500);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd react-app && npx vitest run functions/api/storefront-ai/__tests__/page-style.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/functions/api/storefront-ai/page-style.js react-app/functions/api/storefront-ai/__tests__/page-style.test.js
git commit -m "feat(storefront-ai): accept history and return explanation/suggestion from page-style endpoint"
```

---

### Task 6: Card gateway — send history, return `{ intent, explanation, suggestion }`

**Files:**
- Modify: `react-app/src/features/storefront/services/cardStyleAiGateway.js`
- Test: `react-app/src/features/storefront/__tests__/cardStyleAiGateway.test.js`

**Interfaces:**
- Produces: `requestCardStyleAiIntent({ cardAiDesign, visibleFields, productCategoryName, currentCardStyle, officeCode, history })` now resolves to `{ intent, explanation, suggestion }` instead of just `intent`.

- [ ] **Step 1: Write the failing tests**

Modify `react-app/src/features/storefront/__tests__/cardStyleAiGateway.test.js`:

Replace the heuristic-mode test's assertion:

```js
it('uses the local heuristic and skips the network call when VITE_STOREFRONT_AI_LOCAL_HEURISTIC is true', async () => {
  vi.stubEnv('VITE_STOREFRONT_AI_LOCAL_HEURISTIC', 'true');
  const fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);

  const result = await requestCardStyleAiIntent({
    cardAiDesign: { prompt: 'make the title bolder and darker' },
    visibleFields: ['product_name'],
    currentCardStyle: DEFAULT_CARD_STYLE,
    officeCode: 'OFF-1',
  });

  expect(fetchSpy).not.toHaveBeenCalled();
  expect(result.intent.header).toEqual({ titleColorHex: '#111827', fontWeight: 800 });
  expect(result.explanation).toBe('제목 영역을 요청하신 대로 변경했습니다.');
  expect(result.suggestion).toBeNull();
});
```

Replace the success-path test's assertions and request body:

```js
it('posts to the same-origin endpoint with the bearer token, the history, and normalizes the response', async () => {
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
      explanation: '제목을 더 굵게 바꿨습니다.',
      suggestion: '이미지도 같이 밝게 해보면 어울릴 것 같아요.',
    }),
  });
  vi.stubGlobal('fetch', fetchSpy);

  const result = await requestCardStyleAiIntent({
    cardAiDesign: { prompt: 'make the title bolder', targetScope: 'header' },
    visibleFields: ['product_name', 'tax_price'],
    productCategoryName: 'Fertilizer Upload',
    currentCardStyle: DEFAULT_CARD_STYLE,
    officeCode: 'OFF-1',
    history: [{ role: 'user', text: '제목을 굵게 해줘' }],
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
  expect(sentBody.history).toEqual([{ role: 'user', text: '제목을 굵게 해줘' }]);
  expect(result.intent.header).toEqual({ fontWeight: 800 });
  expect(result.explanation).toBe('제목을 더 굵게 바꿨습니다.');
  expect(result.suggestion).toBe('이미지도 같이 밝게 해보면 어울릴 것 같아요.');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/cardStyleAiGateway.test.js`
Expected: FAIL — `result.intent`/`result.explanation` undefined (current return value is the bare intent object), `sentBody.history` undefined.

- [ ] **Step 3: Implement**

In `react-app/src/features/storefront/services/cardStyleAiGateway.js`:

```js
import supabase from '../../../lib/supabaseClient';
import { toTrimmedString } from '../../../common/utils/text';
import { normalizeCardAiDesignInput } from '../model/cardAiDesignModel';
import { normalizeCardStyle } from '../model/cardStyleModel';
import {
  buildHeuristicCardAiExplanation,
  buildHeuristicCardAiIntent,
  normalizeOpenAiCardIntent,
} from './cardStyleAiContract';

const CARD_STYLE_AI_ENDPOINT = '/api/storefront-ai/card-style';
const SESSION_EXPIRED_ERROR_MESSAGE = '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.';
const DEFAULT_EXPLANATION_MESSAGE = '요청하신 내용을 카드 디자인에 반영했습니다.';

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
  history,
} = {}) {
  const normalizedInput = normalizeCardAiDesignInput(cardAiDesign);
  const normalizedVisibleFields = Array.isArray(visibleFields) ? visibleFields : [];
  const normalizedHistory = Array.isArray(history) ? history : [];

  if (isLocalHeuristicModeEnabled()) {
    const intent = buildHeuristicCardAiIntent({ cardAiDesign: normalizedInput, visibleFields: normalizedVisibleFields });

    return { intent, explanation: buildHeuristicCardAiExplanation(intent), suggestion: null };
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
      history: normalizedHistory,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const body = await response.json();

  return {
    intent: normalizeOpenAiCardIntent(body?.intent, normalizedInput.targetScope),
    explanation: toTrimmedString(body?.explanation) || DEFAULT_EXPLANATION_MESSAGE,
    suggestion: toTrimmedString(body?.suggestion) || null,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/cardStyleAiGateway.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/services/cardStyleAiGateway.js react-app/src/features/storefront/__tests__/cardStyleAiGateway.test.js
git commit -m "feat(storefront-ai): send history and surface explanation/suggestion from card gateway"
```

---

### Task 7: Page gateway — send history, return `{ intent, explanation, suggestion }`

**Files:**
- Modify: `react-app/src/features/storefront/services/pageStyleAiGateway.js`
- Test: `react-app/src/features/storefront/__tests__/pageStyleAiGateway.test.js`

**Interfaces:** Mirrors Task 6 for `requestPageStyleAiIntent`.

- [ ] **Step 1: Write the failing tests**

In `react-app/src/features/storefront/__tests__/pageStyleAiGateway.test.js`, replace the heuristic-mode test with:

```js
it('uses the local heuristic and skips the network call when VITE_STOREFRONT_AI_LOCAL_HEURISTIC is true', async () => {
  vi.stubEnv('VITE_STOREFRONT_AI_LOCAL_HEURISTIC', 'true');
  const fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);

  const result = await requestPageStyleAiIntent({
    pageAiDesign: { prompt: 'make it feel blue and trustworthy' },
    currentPageStyle: DEFAULT_PAGE_STYLE,
    officeCode: 'OFF-1',
  });

  expect(fetchSpy).not.toHaveBeenCalled();
  expect(result.intent.palette.accentHex).toBe('#2563eb');
  expect(result.explanation).toBe('전체 색감을 요청하신 대로 변경했습니다.');
  expect(result.suggestion).toBeNull();
});
```

Replace the "posts to the same-origin endpoint..." test with:

```js
it('posts to the same-origin endpoint with the bearer token, the history, and normalizes the response', async () => {
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
      explanation: '검색창을 더 크게 바꿨습니다.',
      suggestion: '헤더 색상도 같이 어울리게 바꿔보면 좋을 것 같아요.',
    }),
  });
  vi.stubGlobal('fetch', fetchSpy);

  const result = await requestPageStyleAiIntent({
    pageAiDesign: { prompt: 'make the search box larger', targetScope: 'search' },
    currentPageStyle: DEFAULT_PAGE_STYLE,
    officeCode: 'OFF-1',
    history: [{ role: 'user', text: '검색창을 더 잘 보이게 해줘' }],
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
  expect(sentBody.history).toEqual([{ role: 'user', text: '검색창을 더 잘 보이게 해줘' }]);
  expect(result.intent.search).toEqual({ sizeToken: 'lg' });
  expect(result.intent.palette).toBeNull();
  expect(result.explanation).toBe('검색창을 더 크게 바꿨습니다.');
  expect(result.suggestion).toBe('헤더 색상도 같이 어울리게 바꿔보면 좋을 것 같아요.');
});
```

The other two tests in this file (no active session / server error) are unaffected and stay as-is.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleAiGateway.test.js`
Expected: FAIL — `result.intent`/`result.explanation` are `undefined` (current code returns the bare intent), `sentBody.history` is `undefined`.

- [ ] **Step 3: Implement**

In `react-app/src/features/storefront/services/pageStyleAiGateway.js`:

```js
import supabase from '../../../lib/supabaseClient';
import { toTrimmedString } from '../../../common/utils/text';
import { normalizePageAiDesignInput } from '../model/pageAiDesignModel';
import { normalizePageStyle } from '../model/pageStyleModel';
import {
  buildHeuristicPageAiExplanation,
  buildHeuristicPageAiIntent,
  normalizePageStyleAiIntent,
} from './pageStyleAiContract';

const PAGE_STYLE_AI_ENDPOINT = '/api/storefront-ai/page-style';
const SESSION_EXPIRED_ERROR_MESSAGE = '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.';
const DEFAULT_EXPLANATION_MESSAGE = '요청하신 내용을 페이지 스타일에 반영했습니다.';

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

export async function requestPageStyleAiIntent({ pageAiDesign, currentPageStyle, officeCode, history } = {}) {
  const normalizedInput = normalizePageAiDesignInput(pageAiDesign);
  const resolvedCurrentPageStyle = normalizePageStyle(currentPageStyle);
  const normalizedHistory = Array.isArray(history) ? history : [];

  if (isLocalHeuristicModeEnabled()) {
    const intent = buildHeuristicPageAiIntent(normalizedInput, resolvedCurrentPageStyle);

    return { intent, explanation: buildHeuristicPageAiExplanation(intent), suggestion: null };
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
      history: normalizedHistory,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const body = await response.json();

  return {
    intent: normalizePageStyleAiIntent(body?.intent, resolvedCurrentPageStyle.palette.accentHex, normalizedInput.targetScope),
    explanation: toTrimmedString(body?.explanation) || DEFAULT_EXPLANATION_MESSAGE,
    suggestion: toTrimmedString(body?.suggestion) || null,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleAiGateway.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/services/pageStyleAiGateway.js react-app/src/features/storefront/__tests__/pageStyleAiGateway.test.js
git commit -m "feat(storefront-ai): send history and surface explanation/suggestion from page gateway"
```

---

### Task 8: `useCardAiDesign` hook — chat messages + history-aware send

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useCardAiDesign.js`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js:339-351` (the `cardDesignStep` object)
- Test: `react-app/src/features/storefront/__tests__/useCardAiDesign.test.js`

**Interfaces:**
- Produces: hook now also returns `cardAiMessages: Array<{ id, role: 'user'|'assistant', text, scope, ts, suggestion?, warningMessage? }>`.
- `applyCardAiDesign` behavior change: pushes a user message (then clears `cardAiDesign.prompt`) before calling the gateway with `history` (last 6 messages), and on success pushes an assistant message carrying `explanation`/`suggestion`/the contrast warning.
- `useStorefrontBuilder.js`'s `cardDesignStep` object gains `cardAiMessages: cardAi.cardAiMessages` and drops the now-dead `cardAiWarningMessage: cardAi.cardAiWarningMessage` line (the warning is now embedded per-message).

- [ ] **Step 1: Write the failing tests**

In `react-app/src/features/storefront/__tests__/useCardAiDesign.test.js`, update the existing "applies a successful interpretation+compile" test's gateway mock and expectations, and add two new tests. Replace this line:

```js
requestCardStyleAiIntent.mockResolvedValue({ header: { fontWeight: 800 } });
```

with:

```js
requestCardStyleAiIntent.mockResolvedValue({
  intent: { header: { fontWeight: 800 } },
  explanation: '제목을 더 굵게 바꿨습니다.',
  suggestion: '이미지도 같이 밝게 해보면 어울릴 것 같아요.',
});
```

and update the call-args assertion to include `history`:

```js
expect(requestCardStyleAiIntent).toHaveBeenCalledWith({
  cardAiDesign: { prompt: 'make the title bolder', targetScope: 'header' },
  visibleFields: ['product_name', 'spec'],
  productCategoryName: 'Fertilizer Upload',
  currentCardStyle: DEFAULT_CARD_STYLE,
  officeCode: undefined,
  history: [],
});
```

and add, right after the existing `expect(result.current.canUndoCardAiDesign).toBe(true);` line:

```js
expect(result.current.cardAiDesign.prompt).toBe('');
expect(result.current.cardAiMessages).toEqual([
  expect.objectContaining({ role: 'user', text: 'make the title bolder', scope: 'header' }),
  expect.objectContaining({
    role: 'assistant',
    text: '제목을 더 굵게 바꿨습니다.',
    suggestion: '이미지도 같이 밝게 해보면 어울릴 것 같아요.',
    warningMessage: '대비가 낮습니다.',
    scope: 'header',
  }),
]);
```

Update every other `requestCardStyleAiIntent.mockResolvedValue(...)` call in the file (the undo test and the discard test) to wrap their return value in `{ intent: ..., explanation: '...', suggestion: null }`, e.g. change:

```js
requestCardStyleAiIntent.mockResolvedValue({});
```

to:

```js
requestCardStyleAiIntent.mockResolvedValue({ intent: {}, explanation: '한 칸씩 보여드렸습니다.', suggestion: null });
```

(do this for both the `undoLastCardAiDesign` test and the `discardCardAiDesignSession` test).

Add a new test after the existing "applies a successful interpretation+compile..." test:

```js
it('sends up to the last 6 prior messages as history and clears the input on send', async () => {
  requestCardStyleAiIntent.mockResolvedValue({ intent: {}, explanation: '반영했습니다.', suggestion: null });
  compileCardStyle.mockReturnValue({ cardStyle: DEFAULT_CARD_STYLE, bodySlots: [], warning: '' });

  const { result } = renderHook(() => useCardAiDesign());

  act(() => result.current.setPrompt('첫 번째 요청'));
  await act(async () => {
    await result.current.applyCardAiDesign({ visibleFields: ['product_name'] });
  });

  act(() => result.current.setPrompt('두 번째 요청'));
  await act(async () => {
    await result.current.applyCardAiDesign({ visibleFields: ['product_name'] });
  });

  expect(requestCardStyleAiIntent).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      history: [
        expect.objectContaining({ role: 'user', text: '첫 번째 요청' }),
        expect.objectContaining({ role: 'assistant', text: '반영했습니다.' }),
      ],
    }),
  );
  expect(result.current.cardAiDesign.prompt).toBe('');
});

it('hydrateCardStyle and discardCardAiDesignSession both clear the message thread', async () => {
  requestCardStyleAiIntent.mockResolvedValue({ intent: {}, explanation: '반영했습니다.', suggestion: null });
  compileCardStyle.mockReturnValue({ cardStyle: DEFAULT_CARD_STYLE, bodySlots: [], warning: '' });

  const { result } = renderHook(() => useCardAiDesign());

  act(() => result.current.setPrompt('요청'));
  await act(async () => {
    await result.current.applyCardAiDesign({ visibleFields: ['product_name'] });
  });
  expect(result.current.cardAiMessages).toHaveLength(2);

  act(() => result.current.discardCardAiDesignSession());
  expect(result.current.cardAiMessages).toEqual([]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/useCardAiDesign.test.js`
Expected: FAIL — `cardAiMessages` is `undefined`, `requestCardStyleAiIntent` called without `history`, prompt not cleared after apply.

- [ ] **Step 3: Implement**

Replace the full contents of `react-app/src/features/storefront/hooks/useCardAiDesign.js` with:

```js
import { useRef, useState } from 'react';

import { normalizeCardsPerRow, resolveStructuralPreset } from '../model/cardCompositionModel';
import {
  DEFAULT_CARD_AI_DESIGN,
  normalizeCardAiDesignInput,
  normalizeCardAiTargetScope,
} from '../model/cardAiDesignModel';
import { normalizeCardStyle } from '../model/cardStyleModel';
import { requestCardStyleAiIntent } from '../services/cardStyleAiGateway';
import { compileCardStyle } from '../services/cardStyleCompiler';

const MISSING_CARD_PROMPT_ERROR_MESSAGE = '카드 디자인 요청을 먼저 입력해 주세요.';
const APPLY_FAILED_ERROR_MESSAGE = '카드 디자인을 적용하지 못했습니다.';
const MAX_CARD_AI_HISTORY_TURNS = 6;

export function useCardAiDesign({ officeCode, initialCardStyle, initialBodySlots = [] } = {}) {
  const [cardStyle, setCardStyle] = useState(() => normalizeCardStyle(initialCardStyle));
  const [bodySlots, setBodySlots] = useState(initialBodySlots);
  const [cardAiDesign, setCardAiDesignState] = useState(DEFAULT_CARD_AI_DESIGN);
  const [cardAiMessages, setCardAiMessages] = useState([]);
  const [isApplyingCardAiDesign, setIsApplyingCardAiDesign] = useState(false);
  const [cardAiErrorMessage, setCardAiErrorMessage] = useState('');
  const [cardAiWarningMessage, setCardAiWarningMessage] = useState('');
  const [lastCardAiSnapshot, setLastCardAiSnapshot] = useState(null);
  const messageIdRef = useRef(0);

  function nextMessageId() {
    messageIdRef.current += 1;
    return `card-ai-message-${messageIdRef.current}`;
  }

  function hydrateCardStyle(nextCardStyle, nextBodySlots = []) {
    setCardStyle(normalizeCardStyle(nextCardStyle));
    setBodySlots(nextBodySlots);
    setCardAiDesignState(DEFAULT_CARD_AI_DESIGN);
    setCardAiMessages([]);
    setCardAiErrorMessage('');
    setCardAiWarningMessage('');
    setLastCardAiSnapshot(null);
  }

  function setPrompt(value) {
    setCardAiDesignState((current) => ({ ...current, prompt: value }));
  }

  function setTargetScope(targetScope) {
    setCardAiDesignState((current) => ({
      ...current,
      targetScope: normalizeCardAiTargetScope(targetScope),
    }));
  }

  function setCardsPerRow(value) {
    setCardStyle((current) => {
      const nextCardsPerRow = normalizeCardsPerRow(value, current.cardsPerRow);

      return normalizeCardStyle({
        ...current,
        cardsPerRow: nextCardsPerRow,
        structuralPreset: resolveStructuralPreset(current.structuralPreset, nextCardsPerRow),
        layoutPlan: {
          ...current.layoutPlan,
          cardsPerRow: nextCardsPerRow,
        },
      });
    });
  }

  async function applyCardAiDesign({ visibleFields, fieldLabels, productCategoryName } = {}) {
    const normalizedInput = normalizeCardAiDesignInput(cardAiDesign);

    if (!normalizedInput.prompt) {
      setCardAiErrorMessage(MISSING_CARD_PROMPT_ERROR_MESSAGE);
      return;
    }

    const history = cardAiMessages
      .slice(-MAX_CARD_AI_HISTORY_TURNS)
      .map((message) => ({ role: message.role, text: message.text }));

    setCardAiMessages((current) => [
      ...current,
      {
        id: nextMessageId(),
        role: 'user',
        text: normalizedInput.prompt,
        scope: normalizedInput.targetScope,
        ts: Date.now(),
      },
    ]);
    setPrompt('');
    setIsApplyingCardAiDesign(true);
    setCardAiErrorMessage('');
    setCardAiWarningMessage('');

    try {
      const { intent, explanation, suggestion } = await requestCardStyleAiIntent({
        cardAiDesign: normalizedInput,
        visibleFields,
        productCategoryName,
        currentCardStyle: cardStyle,
        officeCode,
        history,
      });
      const result = compileCardStyle({
        intent,
        previousCardStyle: cardStyle,
        previousBodySlots: bodySlots,
        cardsPerRow: cardStyle.cardsPerRow,
        visibleFields,
        fieldLabels,
      });

      setLastCardAiSnapshot({ cardStyle, bodySlots });
      setCardStyle(result.cardStyle);
      setBodySlots(result.bodySlots);
      setCardAiWarningMessage(result.warning);
      setCardAiMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: 'assistant',
          text: explanation,
          suggestion,
          scope: normalizedInput.targetScope,
          ts: Date.now(),
          warningMessage: result.warning,
        },
      ]);
    } catch (error) {
      setCardAiErrorMessage(error instanceof Error ? error.message : APPLY_FAILED_ERROR_MESSAGE);
    } finally {
      setIsApplyingCardAiDesign(false);
    }
  }

  function undoLastCardAiDesign() {
    if (!lastCardAiSnapshot) {
      return;
    }

    setCardStyle(lastCardAiSnapshot.cardStyle);
    setBodySlots(lastCardAiSnapshot.bodySlots);
    setCardAiWarningMessage('');
    setLastCardAiSnapshot(null);
  }

  function discardCardAiDesignSession() {
    setCardAiDesignState(DEFAULT_CARD_AI_DESIGN);
    setCardAiMessages([]);
  }

  return {
    cardStyle,
    bodySlots,
    cardAiDesign,
    cardAiMessages,
    isApplyingCardAiDesign,
    cardAiErrorMessage,
    cardAiWarningMessage,
    canUndoCardAiDesign: Boolean(lastCardAiSnapshot),
    hydrateCardStyle,
    setCardsPerRow,
    setPrompt,
    setTargetScope,
    applyCardAiDesign,
    undoLastCardAiDesign,
    discardCardAiDesignSession,
  };
}
```

In `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`, change the `cardDesignStep` object (around line 339):

```js
  const cardDesignStep = {
    cardStyle: cardAi.cardStyle,
    cardAiDesign: cardAi.cardAiDesign,
    cardAiMessages: cardAi.cardAiMessages,
    isAiApplying: cardAi.isApplyingCardAiDesign,
    aiErrorMessage: cardAi.cardAiErrorMessage,
    canUndoAiChanges: cardAi.canUndoCardAiDesign,
    setPrompt: cardAi.setPrompt,
    setTargetScope: cardAi.setTargetScope,
    setCardsPerRow: cardAi.setCardsPerRow,
    applyAiSuggestion,
    undoAiChanges,
    saveDraft,
    status,
    qrExport: {
      officeCode: toTrimmedString(officeCode),
      officeName,
      isAvailable: hasSavedStorefront,
      hasUnsavedChanges,
    },
  };
```

(this drops the `cardAiWarningMessage: cardAi.cardAiWarningMessage,` line that was there before — that value is now embedded per-message in `cardAiMessages` instead of being a separate top-level field).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/useCardAiDesign.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/hooks/useCardAiDesign.js react-app/src/features/storefront/hooks/useStorefrontBuilder.js react-app/src/features/storefront/__tests__/useCardAiDesign.test.js
git commit -m "feat(storefront-ai): turn useCardAiDesign into a chat-history-aware hook"
```

---

### Task 9: `usePageAiDesign` hook — chat messages + history-aware send

**Files:**
- Modify: `react-app/src/features/storefront/hooks/usePageAiDesign.js`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js:319-327` (the `pageDesignStep` object)
- Test: `react-app/src/features/storefront/__tests__/usePageAiDesign.test.js`

**Interfaces:** Mirrors Task 8 for page style (no undo, no warning concept).

- [ ] **Step 1: Write the failing tests**

In `react-app/src/features/storefront/__tests__/usePageAiDesign.test.js`, update the "applies a successful interpretation+compile..." test's mock:

```js
requestPageStyleAiIntent.mockResolvedValue({
  intent: {
    palette: compiledStyle.palette,
    header: null,
    categoryChips: null,
    search: { sizeToken: 'lg', borderStrengthToken: 'strong' },
  },
  explanation: '검색창을 더 크고 강하게 바꿨습니다.',
  suggestion: '헤더 색상도 같이 어울리게 바꿔보면 좋을 것 같아요.',
});
```

and update the call-args assertion to add `history: []`, and add after the existing assertions:

```js
expect(result.current.pageAiDesign.prompt).toBe('');
expect(result.current.pageAiMessages).toEqual([
  expect.objectContaining({ role: 'user', text: 'warm and friendly, make the search box larger with a stronger border', scope: 'search' }),
  expect.objectContaining({
    role: 'assistant',
    text: '검색창을 더 크고 강하게 바꿨습니다.',
    suggestion: '헤더 색상도 같이 어울리게 바꿔보면 좋을 것 같아요.',
    scope: 'search',
  }),
]);
```

Update the other two `requestPageStyleAiIntent.mockResolvedValue(...)` calls (in the error test there is none to change; in the `discardPageAiDesignSession` test) to wrap in `{ intent: {...}, explanation: '...', suggestion: null }` the same way as Task 8, and add a new history-threading test mirroring Task 8's:

```js
it('sends up to the last 6 prior messages as history and clears the input on send', async () => {
  requestPageStyleAiIntent.mockResolvedValue({ intent: {}, explanation: '반영했습니다.', suggestion: null });
  compilePageStyle.mockReturnValue(DEFAULT_PAGE_STYLE);

  const { result } = renderHook(() => usePageAiDesign());

  act(() => result.current.setPrompt('첫 번째 요청'));
  await act(async () => {
    await result.current.applyPageAiDesign();
  });

  act(() => result.current.setPrompt('두 번째 요청'));
  await act(async () => {
    await result.current.applyPageAiDesign();
  });

  expect(requestPageStyleAiIntent).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      history: [
        expect.objectContaining({ role: 'user', text: '첫 번째 요청' }),
        expect.objectContaining({ role: 'assistant', text: '반영했습니다.' }),
      ],
    }),
  );
  expect(result.current.pageAiDesign.prompt).toBe('');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/usePageAiDesign.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

Replace the full contents of `react-app/src/features/storefront/hooks/usePageAiDesign.js` with:

```js
import { useRef, useState } from 'react';

import {
  DEFAULT_PAGE_AI_DESIGN,
  normalizePageAiDesignInput,
  normalizePageAiTargetScope,
} from '../model/pageAiDesignModel';
import { normalizePageStyle } from '../model/pageStyleModel';
import { requestPageStyleAiIntent } from '../services/pageStyleAiGateway';
import { compilePageStyle } from '../services/pageStyleCompiler';

const MISSING_PAGE_PROMPT_ERROR_MESSAGE = '페이지 분위기를 먼저 입력해 주세요.';
const APPLY_FAILED_ERROR_MESSAGE = '페이지 스타일을 적용하지 못했습니다.';
const MAX_PAGE_AI_HISTORY_TURNS = 6;

export function usePageAiDesign({ officeCode, initialPageStyle } = {}) {
  const [pageStyle, setPageStyle] = useState(() =>
    normalizePageStyle(initialPageStyle),
  );
  const [pageAiDesign, setPageAiDesignState] =
    useState(DEFAULT_PAGE_AI_DESIGN);
  const [pageAiMessages, setPageAiMessages] = useState([]);
  const [isApplyingPageAiDesign, setIsApplyingPageAiDesign] = useState(false);
  const [pageAiErrorMessage, setPageAiErrorMessage] = useState('');
  const messageIdRef = useRef(0);

  function nextMessageId() {
    messageIdRef.current += 1;
    return `page-ai-message-${messageIdRef.current}`;
  }

  function hydratePageStyle(nextPageStyle) {
    setPageStyle(normalizePageStyle(nextPageStyle));
    setPageAiDesignState(DEFAULT_PAGE_AI_DESIGN);
    setPageAiMessages([]);
    setPageAiErrorMessage('');
  }

  function setPrompt(value) {
    setPageAiDesignState((current) => ({
      ...current,
      prompt: value,
    }));
  }

  function setTargetScope(targetScope) {
    setPageAiDesignState((current) => ({
      ...current,
      targetScope: normalizePageAiTargetScope(targetScope),
    }));
  }

  async function applyPageAiDesign() {
    const normalizedInput = normalizePageAiDesignInput(pageAiDesign);

    if (!normalizedInput.prompt) {
      setPageAiErrorMessage(MISSING_PAGE_PROMPT_ERROR_MESSAGE);
      return;
    }

    const history = pageAiMessages
      .slice(-MAX_PAGE_AI_HISTORY_TURNS)
      .map((message) => ({ role: message.role, text: message.text }));

    setPageAiMessages((current) => [
      ...current,
      {
        id: nextMessageId(),
        role: 'user',
        text: normalizedInput.prompt,
        scope: normalizedInput.targetScope,
        ts: Date.now(),
      },
    ]);
    setPrompt('');
    setIsApplyingPageAiDesign(true);
    setPageAiErrorMessage('');

    try {
      const { intent, explanation, suggestion } = await requestPageStyleAiIntent({
        pageAiDesign: normalizedInput,
        currentPageStyle: pageStyle,
        officeCode,
        history,
      });
      const nextPageStyle = compilePageStyle({
        intent,
        previousPageStyle: pageStyle,
        targetScope: normalizedInput.targetScope,
      });

      setPageStyle(nextPageStyle);
      setPageAiMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: 'assistant',
          text: explanation,
          suggestion,
          scope: normalizedInput.targetScope,
          ts: Date.now(),
        },
      ]);
    } catch (error) {
      setPageAiErrorMessage(
        error instanceof Error ? error.message : APPLY_FAILED_ERROR_MESSAGE,
      );
    } finally {
      setIsApplyingPageAiDesign(false);
    }
  }

  function discardPageAiDesignSession() {
    setPageAiDesignState(DEFAULT_PAGE_AI_DESIGN);
    setPageAiMessages([]);
  }

  return {
    pageStyle,
    pageAiDesign,
    pageAiMessages,
    isApplyingPageAiDesign,
    pageAiErrorMessage,
    hydratePageStyle,
    setPrompt,
    setTargetScope,
    applyPageAiDesign,
    discardPageAiDesignSession,
  };
}
```

In `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`, change the `pageDesignStep` object (around line 319) to add `pageAiMessages`:

```js
  const pageDesignStep = {
    pageAiDesign: pageAi.pageAiDesign,
    pageAiMessages: pageAi.pageAiMessages,
    isApplyingPageAiDesign: pageAi.isApplyingPageAiDesign,
    pageAiErrorMessage: pageAi.pageAiErrorMessage,
    setPagePrompt: pageAi.setPrompt,
    setPageTargetScope: pageAi.setTargetScope,
    applyPageAiDesign: pageAi.applyPageAiDesign,
    selectedProductCategoryName,
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/usePageAiDesign.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/hooks/usePageAiDesign.js react-app/src/features/storefront/hooks/useStorefrontBuilder.js react-app/src/features/storefront/__tests__/usePageAiDesign.test.js
git commit -m "feat(storefront-ai): turn usePageAiDesign into a chat-history-aware hook"
```

---

### Task 10: `ScopeSelectorStrip` shared component

**Files:**
- Create: `react-app/src/features/storefront/components/ai-chat/ScopeSelectorStrip.jsx`
- Create: `react-app/src/features/storefront/components/ai-chat/ScopeSelectorStrip.module.css`
- Test: `react-app/src/features/storefront/__tests__/ScopeSelectorStrip.test.jsx`

**Interfaces:**
- Produces: `ScopeSelectorStrip({ scopeOptions, selectedScope, onScopeChange, testIdPrefix, listTestId, includeNoneOption = false, noneOptionLabel = '선택 안 함' })` — renders a `<ul data-testid={listTestId}>` of chip buttons, each `data-testid={`${testIdPrefix}-${option.id}`}` (or `${testIdPrefix}-none` for the optional none chip), `aria-pressed` reflecting selection, calling `onScopeChange(option.id)` (or `onScopeChange('')` for none) on click.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/ScopeSelectorStrip.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ScopeSelectorStrip from '../components/ai-chat/ScopeSelectorStrip';

const SCOPE_OPTIONS = [
  { id: 'header', label: '제목 영역', detail: '배경색, 글자색' },
  { id: 'image', label: '이미지', detail: '크기, 채우기 방식' },
];

describe('ScopeSelectorStrip', () => {
  it('renders a chip per scope option and marks the selected one as pressed', () => {
    render(
      <ScopeSelectorStrip
        scopeOptions={SCOPE_OPTIONS}
        selectedScope="header"
        onScopeChange={vi.fn()}
        testIdPrefix="card-design-scope"
        listTestId="card-design-scope-list"
      />,
    );

    expect(screen.getByTestId('card-design-scope-list')).toBeInTheDocument();
    expect(screen.getByTestId('card-design-scope-header')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('card-design-scope-image')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onScopeChange with the clicked option id', async () => {
    const onScopeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ScopeSelectorStrip
        scopeOptions={SCOPE_OPTIONS}
        selectedScope=""
        onScopeChange={onScopeChange}
        testIdPrefix="card-design-scope"
        listTestId="card-design-scope-list"
      />,
    );

    await user.click(screen.getByTestId('card-design-scope-image'));
    expect(onScopeChange).toHaveBeenCalledWith('image');
  });

  it('renders an optional "none" chip that reports an empty scope', async () => {
    const onScopeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ScopeSelectorStrip
        scopeOptions={SCOPE_OPTIONS}
        selectedScope=""
        onScopeChange={onScopeChange}
        testIdPrefix="card-design-scope"
        listTestId="card-design-scope-list"
        includeNoneOption
      />,
    );

    expect(screen.getByTestId('card-design-scope-none')).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByTestId('card-design-scope-none'));
    expect(onScopeChange).toHaveBeenCalledWith('');
  });

  it('omits the "none" chip by default', () => {
    render(
      <ScopeSelectorStrip
        scopeOptions={SCOPE_OPTIONS}
        selectedScope=""
        onScopeChange={vi.fn()}
        testIdPrefix="page-design-scope"
        listTestId="page-design-scope-list"
      />,
    );

    expect(screen.queryByTestId('page-design-scope-none')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/ScopeSelectorStrip.test.jsx`
Expected: FAIL — module `../components/ai-chat/ScopeSelectorStrip` does not exist.

- [ ] **Step 3: Implement**

Create `react-app/src/features/storefront/components/ai-chat/ScopeSelectorStrip.jsx`:

```jsx
import styles from './ScopeSelectorStrip.module.css';

export default function ScopeSelectorStrip({
  scopeOptions,
  selectedScope,
  onScopeChange,
  testIdPrefix,
  listTestId,
  includeNoneOption = false,
  noneOptionLabel = '선택 안 함',
}) {
  return (
    <ul className={styles.scopeList} data-testid={listTestId}>
      {includeNoneOption ? (
        <li className={styles.scopeItem}>
          <button
            type="button"
            className={`${styles.scopeChip} ${!selectedScope ? styles.scopeChipActive : ''}`}
            data-testid={`${testIdPrefix}-none`}
            aria-pressed={!selectedScope}
            onClick={() => onScopeChange('')}
          >
            {noneOptionLabel}
          </button>
        </li>
      ) : null}
      {scopeOptions.map((option) => {
        const isSelected = selectedScope === option.id;

        return (
          <li key={option.id} className={styles.scopeItem}>
            <button
              type="button"
              className={`${styles.scopeChip} ${isSelected ? styles.scopeChipActive : ''}`}
              data-testid={`${testIdPrefix}-${option.id}`}
              aria-pressed={isSelected}
              title={option.detail}
              onClick={() => onScopeChange(option.id)}
            >
              {option.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

Create `react-app/src/features/storefront/components/ai-chat/ScopeSelectorStrip.module.css`:

```css
.scopeList {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.scopeItem {
  margin: 0;
}

.scopeChip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 14px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: var(--corp-radius-pill);
  background: #ffffff;
  color: var(--corp-text);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    color 140ms ease;
}

.scopeChip:hover {
  border-color: rgba(37, 99, 235, 0.32);
  background: rgba(239, 246, 255, 0.72);
}

.scopeChip:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.18);
  outline-offset: 2px;
  border-color: #2563eb;
}

.scopeChipActive {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/ScopeSelectorStrip.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/components/ai-chat/ScopeSelectorStrip.jsx react-app/src/features/storefront/components/ai-chat/ScopeSelectorStrip.module.css react-app/src/features/storefront/__tests__/ScopeSelectorStrip.test.jsx
git commit -m "feat(storefront-ai): add shared ScopeSelectorStrip chat component"
```

---

### Task 11: `ChatMessageBubble` shared component

**Files:**
- Create: `react-app/src/features/storefront/components/ai-chat/ChatMessageBubble.jsx`
- Create: `react-app/src/features/storefront/components/ai-chat/ChatMessageBubble.module.css`
- Test: `react-app/src/features/storefront/__tests__/ChatMessageBubble.test.jsx`

**Interfaces:**
- Consumes: a single `message: { id, role, text, suggestion?, warningMessage? }` object (the `id`/`scope` fields are used by the caller, not required by this component) and an optional `scopeLabel` string.
- Produces: an `<li>` chat bubble; user messages render only `text`; assistant messages additionally render `scopeLabel` (if given), `suggestion` (if given), and `warningMessage` (if given).

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/ChatMessageBubble.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ChatMessageBubble from '../components/ai-chat/ChatMessageBubble';

describe('ChatMessageBubble', () => {
  it('renders a user message without a scope tag or suggestion', () => {
    render(
      <ul>
        <ChatMessageBubble message={{ id: '1', role: 'user', text: '제목을 굵게 해줘' }} />
      </ul>,
    );

    expect(screen.getByText('제목을 굵게 해줘')).toBeInTheDocument();
  });

  it('renders an assistant message with its scope tag, explanation, and suggestion', () => {
    render(
      <ul>
        <ChatMessageBubble
          message={{
            id: '2',
            role: 'assistant',
            text: '제목을 더 굵게 바꿨습니다.',
            suggestion: '이미지 섹션도 같이 어울리게 바꿔보면 좋을 것 같아요.',
          }}
          scopeLabel="제목 영역"
        />
      </ul>,
    );

    expect(screen.getByText('제목 영역')).toBeInTheDocument();
    expect(screen.getByText('제목을 더 굵게 바꿨습니다.')).toBeInTheDocument();
    expect(screen.getByText('이미지 섹션도 같이 어울리게 바꿔보면 좋을 것 같아요.')).toBeInTheDocument();
  });

  it('renders the warning message when present', () => {
    render(
      <ul>
        <ChatMessageBubble
          message={{
            id: '3',
            role: 'assistant',
            text: '헤더 배경을 바꿨습니다.',
            warningMessage: '헤더 글자색과 배경색의 대비가 낮아 읽기 어려울 수 있습니다.',
          }}
        />
      </ul>,
    );

    expect(
      screen.getByText('헤더 글자색과 배경색의 대비가 낮아 읽기 어려울 수 있습니다.'),
    ).toBeInTheDocument();
  });

  it('does not render a scope tag, suggestion, or warning for a user message even if present', () => {
    render(
      <ul>
        <ChatMessageBubble
          message={{ id: '4', role: 'user', text: '요청', suggestion: '제안', warningMessage: '경고' }}
          scopeLabel="제목 영역"
        />
      </ul>,
    );

    expect(screen.queryByText('제목 영역')).not.toBeInTheDocument();
    expect(screen.queryByText('제안')).not.toBeInTheDocument();
    expect(screen.queryByText('경고')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/ChatMessageBubble.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `react-app/src/features/storefront/components/ai-chat/ChatMessageBubble.jsx`:

```jsx
import styles from './ChatMessageBubble.module.css';

export default function ChatMessageBubble({ message, scopeLabel }) {
  const isUser = message.role === 'user';

  return (
    <li className={`${styles.bubbleRow} ${isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant}`}>
      <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
        {!isUser && scopeLabel ? <span className={styles.scopeTag}>{scopeLabel}</span> : null}
        <p className={styles.bubbleText}>{message.text}</p>
        {!isUser && message.suggestion ? <p className={styles.suggestionText}>{message.suggestion}</p> : null}
        {!isUser && message.warningMessage ? <p className={styles.warningText}>{message.warningMessage}</p> : null}
      </div>
    </li>
  );
}
```

Create `react-app/src/features/storefront/components/ai-chat/ChatMessageBubble.module.css`:

```css
.bubbleRow {
  display: flex;
  list-style: none;
}

.bubbleRowUser {
  justify-content: flex-end;
}

.bubbleRowAssistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 86%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 0.86rem;
  line-height: 1.5;
}

.bubbleUser {
  background: var(--corp-primary);
  color: var(--corp-on-primary);
  border-bottom-right-radius: 4px;
}

.bubbleAssistant {
  background: #f1f5f9;
  color: var(--corp-text);
  border-bottom-left-radius: 4px;
}

.scopeTag {
  display: inline-block;
  margin-bottom: 4px;
  padding: 1px 8px;
  border-radius: var(--corp-radius-pill);
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  font-size: 0.66rem;
  font-weight: 800;
}

.bubbleText {
  margin: 0;
  white-space: pre-wrap;
}

.suggestionText {
  margin: 6px 0 0;
  padding-top: 6px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  color: #475569;
  font-size: 0.78rem;
  font-style: italic;
}

.warningText {
  margin: 6px 0 0;
  color: #92400e;
  font-size: 0.78rem;
  font-weight: 600;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/ChatMessageBubble.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/components/ai-chat/ChatMessageBubble.jsx react-app/src/features/storefront/components/ai-chat/ChatMessageBubble.module.css react-app/src/features/storefront/__tests__/ChatMessageBubble.test.jsx
git commit -m "feat(storefront-ai): add shared ChatMessageBubble component"
```

---

### Task 12: `AiChatPanel` shared component (composes Tasks 10+11)

**Files:**
- Create: `react-app/src/features/storefront/components/ai-chat/AiChatPanel.jsx`
- Create: `react-app/src/features/storefront/components/ai-chat/AiChatPanel.module.css`
- Test: `react-app/src/features/storefront/__tests__/AiChatPanel.test.jsx`

**Interfaces:**
- Consumes: `ScopeSelectorStrip` (Task 10), `ChatMessageBubble` (Task 11).
- Produces: `AiChatPanel({ messages, scopeOptions, selectedScope, onScopeChange, scopeTestIdPrefix, scopeListTestId, includeNoneScopeOption, inputField, onSend, sendLabel, sendTestId, isSending, onUndo, undoTestId, canUndo, errorMessage, panelTestId, emptyStateText })` — the single component `CardDesignEditor`/`PageDesignEditor` will render instead of their old two-column layout. `inputField` is a caller-supplied React node (the existing `CardStylePromptField`/`PageStylePromptField`), so accessible labels/testids on the textarea itself are untouched.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/AiChatPanel.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AiChatPanel from '../components/ai-chat/AiChatPanel';

const SCOPE_OPTIONS = [
  { id: 'header', label: '제목 영역', detail: '배경색, 글자색' },
  { id: 'image', label: '이미지', detail: '크기, 채우기 방식' },
];

describe('AiChatPanel', () => {
  it('renders the empty state when there are no messages yet', () => {
    render(
      <AiChatPanel
        messages={[]}
        scopeOptions={SCOPE_OPTIONS}
        selectedScope=""
        onScopeChange={vi.fn()}
        scopeTestIdPrefix="card-design-scope"
        scopeListTestId="card-design-scope-list"
        inputField={<input aria-label="요청" />}
        onSend={vi.fn()}
        sendLabel="보내기"
        sendTestId="apply-ai-suggestion"
        emptyStateText="아직 대화가 없습니다."
      />,
    );

    expect(screen.getByText('아직 대화가 없습니다.')).toBeInTheDocument();
  });

  it('renders each message with its resolved scope label and calls onSend', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(
      <AiChatPanel
        messages={[
          { id: '1', role: 'user', text: '제목 굵게', scope: 'header' },
          { id: '2', role: 'assistant', text: '제목을 굵게 바꿨습니다.', scope: 'header' },
        ]}
        scopeOptions={SCOPE_OPTIONS}
        selectedScope="header"
        onScopeChange={vi.fn()}
        scopeTestIdPrefix="card-design-scope"
        scopeListTestId="card-design-scope-list"
        inputField={<input aria-label="요청" />}
        onSend={onSend}
        sendLabel="보내기"
        sendTestId="apply-ai-suggestion"
      />,
    );

    expect(screen.getByText('제목 굵게')).toBeInTheDocument();
    expect(screen.getByText('제목을 굵게 바꿨습니다.')).toBeInTheDocument();
    expect(screen.getAllByText('제목 영역').length).toBeGreaterThan(0);

    await user.click(screen.getByTestId('apply-ai-suggestion'));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('disables send while sending and shows the undo button and error message', () => {
    render(
      <AiChatPanel
        messages={[]}
        scopeOptions={SCOPE_OPTIONS}
        selectedScope=""
        onScopeChange={vi.fn()}
        scopeTestIdPrefix="card-design-scope"
        scopeListTestId="card-design-scope-list"
        inputField={<input aria-label="요청" />}
        onSend={vi.fn()}
        sendLabel="보내기"
        sendTestId="apply-ai-suggestion"
        isSending
        onUndo={vi.fn()}
        undoTestId="undo-ai-changes"
        canUndo
        errorMessage="문제가 발생했습니다."
      />,
    );

    expect(screen.getByTestId('apply-ai-suggestion')).toBeDisabled();
    expect(screen.getByTestId('undo-ai-changes')).toBeInTheDocument();
    expect(screen.getByText('문제가 발생했습니다.')).toBeInTheDocument();
  });

  it('omits the undo button by default', () => {
    render(
      <AiChatPanel
        messages={[]}
        scopeOptions={SCOPE_OPTIONS}
        selectedScope=""
        onScopeChange={vi.fn()}
        scopeTestIdPrefix="page-design-scope"
        scopeListTestId="page-design-scope-list"
        inputField={<input aria-label="요청" />}
        onSend={vi.fn()}
        sendLabel="보내기"
        sendTestId="apply-page-ai-design"
      />,
    );

    expect(screen.queryByTestId('undo-ai-changes')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/AiChatPanel.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `react-app/src/features/storefront/components/ai-chat/AiChatPanel.jsx`:

```jsx
import panelStyles from '../../../office-product-editor/components/shared/panel.module.css';
import ChatMessageBubble from './ChatMessageBubble';
import ScopeSelectorStrip from './ScopeSelectorStrip';
import styles from './AiChatPanel.module.css';

function resolveScopeLabel(scopeOptions, scopeId) {
  if (!scopeId) {
    return '';
  }

  return (scopeOptions || []).find((option) => option.id === scopeId)?.label ?? '';
}

export default function AiChatPanel({
  messages,
  scopeOptions,
  selectedScope,
  onScopeChange,
  scopeTestIdPrefix,
  scopeListTestId,
  includeNoneScopeOption = false,
  inputField,
  onSend,
  sendLabel,
  sendTestId,
  isSending,
  onUndo,
  undoTestId,
  canUndo = false,
  errorMessage,
  panelTestId,
  emptyStateText,
}) {
  return (
    <div className={styles.panel} data-testid={panelTestId}>
      <ScopeSelectorStrip
        scopeOptions={scopeOptions}
        selectedScope={selectedScope}
        onScopeChange={onScopeChange}
        testIdPrefix={scopeTestIdPrefix}
        listTestId={scopeListTestId}
        includeNoneOption={includeNoneScopeOption}
      />

      <ul className={styles.messageList}>
        {messages.length === 0 ? (
          <li className={styles.emptyState}>{emptyStateText}</li>
        ) : (
          messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              scopeLabel={resolveScopeLabel(scopeOptions, message.scope)}
            />
          ))
        )}
      </ul>

      <div className={styles.inputRow}>
        {inputField}
        <button
          type="button"
          className={styles.sendButton}
          data-testid={sendTestId}
          onClick={onSend}
          disabled={isSending}
        >
          {isSending ? '적용 중...' : sendLabel}
        </button>
        {canUndo ? (
          <button type="button" className={styles.undoButton} data-testid={undoTestId} onClick={onUndo}>
            되돌리기
          </button>
        ) : null}
      </div>

      {errorMessage ? <div className={panelStyles.errorBox}>{errorMessage}</div> : null}
    </div>
  );
}
```

Create `react-app/src/features/storefront/components/ai-chat/AiChatPanel.module.css`:

```css
.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 22px;
}

.messageList {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 4px 2px;
  list-style: none;
  max-height: 360px;
  overflow-y: auto;
}

.emptyState {
  list-style: none;
  color: var(--corp-muted);
  font-size: 0.84rem;
  text-align: center;
  padding: 24px 8px;
}

.inputRow {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.inputRow > label {
  flex: 1;
}

.sendButton {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: var(--corp-radius);
  background: var(--corp-primary);
  color: var(--corp-on-primary);
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
}

.sendButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.undoButton {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--corp-line);
  border-radius: var(--corp-radius);
  background: var(--corp-panel);
  color: var(--corp-text);
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 560px) {
  .inputRow {
    flex-direction: column;
    align-items: stretch;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/AiChatPanel.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/components/ai-chat/AiChatPanel.jsx react-app/src/features/storefront/components/ai-chat/AiChatPanel.module.css react-app/src/features/storefront/__tests__/AiChatPanel.test.jsx
git commit -m "feat(storefront-ai): add shared AiChatPanel component"
```

---

### Task 13: Rewire `CardDesignEditor` onto `AiChatPanel`

**Files:**
- Modify: `react-app/src/features/storefront/components/card-design/CardDesignEditor.jsx`
- Modify: `react-app/src/features/storefront/components/card-design/CardDesignEditor.module.css`
- Modify: `react-app/src/features/storefront/pages/storefront-builder/CardDesignStep.jsx:17-29`
- Verify (no source change expected): `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

**Interfaces:**
- Consumes: `AiChatPanel` (Task 12), `cardAiMessages` (Task 8).
- Produces: `CardDesignEditor` keeps the exact same externally-relevant `data-testid`s it has today (`card-design-editor`, `card-design-cards-per-row`, `card-design-prompt`, `card-design-prompt-panel`, `card-design-scope-list`, `card-design-scope-none`, `card-design-scope-{header,image,info,field}`, `apply-ai-suggestion`, `undo-ai-changes`), but now accepts `cardAiMessages` instead of `warningMessage`.

- [ ] **Step 1: Confirm the integration test already covers this (no new test file needed)**

`StorefrontBuilderPage.test.jsx` already exercises `card-design-prompt`, `apply-ai-suggestion`, `card-design-scope-field`, and `undo-ai-changes` end-to-end (see lines 211-213, 246-248, 273, 395-397). Run it now to capture the current baseline:

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS (still using the old `CardDesignEditor`/`PageDesignEditor` — this step just confirms the baseline before rewiring; do not skip it).

- [ ] **Step 2: Implement the rewire**

Replace the full contents of `react-app/src/features/storefront/components/card-design/CardDesignEditor.jsx` with:

```jsx
import { CARD_AI_TARGET_SCOPE_OPTIONS } from '../../model/cardAiDesignModel';
import { CARD_CARDS_PER_ROW_OPTIONS } from '../../model/cardCompositionModel';
import AiChatPanel from '../ai-chat/AiChatPanel';
import CardStylePromptField from './CardStylePromptField';
import styles from './CardDesignEditor.module.css';

export default function CardDesignEditor({
  cardStyle,
  cardAiDesign,
  cardAiMessages,
  onChangePrompt,
  onChangeTargetScope,
  onChangeCardsPerRow,
  onApply,
  onUndo,
  canUndo,
  isApplying,
  errorMessage,
}) {
  return (
    <div className={styles.editor} data-testid="card-design-editor">
      <div className={styles.densityRow}>
        <span className={styles.densityLabel}>한 줄에 보일 카드 수</span>
        <div className={styles.densityOptions} data-testid="card-design-cards-per-row">
          {CARD_CARDS_PER_ROW_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.densityButton} ${cardStyle.cardsPerRow === option ? styles.densityButtonActive : ''}`}
              aria-pressed={cardStyle.cardsPerRow === option}
              onClick={() => onChangeCardsPerRow(option)}
            >
              {option}개
            </button>
          ))}
        </div>
      </div>

      <AiChatPanel
        panelTestId="card-design-prompt-panel"
        messages={cardAiMessages}
        scopeOptions={CARD_AI_TARGET_SCOPE_OPTIONS}
        selectedScope={cardAiDesign.targetScope}
        onScopeChange={onChangeTargetScope}
        scopeTestIdPrefix="card-design-scope"
        scopeListTestId="card-design-scope-list"
        includeNoneScopeOption
        inputField={
          <CardStylePromptField
            value={cardAiDesign.prompt}
            onChange={onChangePrompt}
            describedBy="card-style-prompt-help"
            testId="card-design-prompt"
          />
        }
        onSend={onApply}
        sendLabel="AI로 카드 다듬기"
        sendTestId="apply-ai-suggestion"
        isSending={isApplying}
        onUndo={onUndo}
        undoTestId="undo-ai-changes"
        canUndo={canUndo}
        errorMessage={errorMessage}
        emptyStateText="원하는 카드 변경을 자세히 적어 주세요. 예: 비료 상품을 신뢰감 있게 보여주고, 제목은 조금 더 굵게 해줘"
      />
    </div>
  );
}
```

Replace the full contents of `react-app/src/features/storefront/components/card-design/CardDesignEditor.module.css` with (keeps only the density-row rules that are still used; drops every now-dead `editorLayout`/`promptPanel`/`scopePanel`/`warningBox` rule):

```css
.editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.densityRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.densityLabel {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--corp-text);
}

.densityOptions {
  display: flex;
  gap: 6px;
}

.densityButton {
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid var(--corp-line);
  border-radius: var(--corp-radius-pill);
  background: var(--corp-panel);
  color: var(--corp-text);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.densityButtonActive {
  border-color: var(--corp-primary);
  background: var(--corp-primary);
  color: var(--corp-on-primary);
}
```

In `react-app/src/features/storefront/pages/storefront-builder/CardDesignStep.jsx`, change the `<CardDesignEditor ... />` call (lines 17-29) to:

```jsx
      <CardDesignEditor
        cardStyle={step.cardStyle}
        cardAiDesign={step.cardAiDesign}
        cardAiMessages={step.cardAiMessages}
        onChangePrompt={step.setPrompt}
        onChangeTargetScope={step.setTargetScope}
        onChangeCardsPerRow={step.setCardsPerRow}
        onApply={step.applyAiSuggestion}
        onUndo={step.undoAiChanges}
        canUndo={step.canUndoAiChanges}
        isApplying={step.isAiApplying}
        errorMessage={step.aiErrorMessage}
      />
```

(this drops the `warningMessage={step.cardAiWarningMessage}` prop — `CardDesignEditor` no longer accepts it, since the warning is now embedded in each assistant chat message).

- [ ] **Step 3: Run the integration test to verify it still passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS — every existing `card-design-*`/`apply-ai-suggestion`/`undo-ai-changes` interaction still works because those exact testids are preserved through `AiChatPanel`'s props.

- [ ] **Step 4: Run the full storefront test directory as a regression check**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: PASS for every file except possibly `PageDesignEditor.test.jsx` (handled in Task 14 — if it fails here, that is expected and will be fixed next).

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/components/card-design/CardDesignEditor.jsx react-app/src/features/storefront/components/card-design/CardDesignEditor.module.css react-app/src/features/storefront/pages/storefront-builder/CardDesignStep.jsx
git commit -m "feat(storefront-ai): rewire CardDesignEditor onto the shared AiChatPanel"
```

---

### Task 14: Rewire `PageDesignEditor` onto `AiChatPanel` and rewrite its test

**Files:**
- Modify: `react-app/src/features/storefront/components/page-design/PageDesignEditor.jsx`
- Modify: `react-app/src/features/storefront/components/page-design/PageDesignEditor.module.css`
- Modify: `react-app/src/features/storefront/pages/storefront-builder/PageDesignStep.jsx`
- Modify: `react-app/src/features/storefront/__tests__/PageDesignEditor.test.jsx`

**Interfaces:**
- Consumes: `AiChatPanel` (Task 12), `pageAiMessages` (Task 9).
- Produces: `PageDesignEditor` keeps `page-design-editor`, `page-design-prompt-panel`, `page-design-scope-list`, `page-design-scope-{palette,header,categoryChips,search}`, `apply-page-ai-design`, and the `페이지 스타일 요청` accessible label; now accepts `pageAiMessages`.

- [ ] **Step 1: Update the failing test first**

Replace the full contents of `react-app/src/features/storefront/__tests__/PageDesignEditor.test.jsx` with:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PageDesignEditor from '../components/page-design/PageDesignEditor';
import { DEFAULT_PAGE_AI_DESIGN } from '../model/pageAiDesignModel';

describe('PageDesignEditor', () => {
  it('renders one page-style prompt field, lets the user choose a target scope, and calls onApply', async () => {
    const onChangePrompt = vi.fn();
    const onChangeTargetScope = vi.fn();
    const onApply = vi.fn();
    const user = userEvent.setup();

    render(
      <PageDesignEditor
        pageAiDesign={DEFAULT_PAGE_AI_DESIGN}
        pageAiMessages={[]}
        onChangePrompt={onChangePrompt}
        onChangeTargetScope={onChangeTargetScope}
        onApply={onApply}
        isApplying={false}
        errorMessage=""
        representativeCategoryLabel="Fertilizer Upload"
      />,
    );

    const promptField = screen.getByRole('textbox');

    expect(screen.getByTestId('page-design-prompt-panel')).toBeInTheDocument();
    expect(screen.getByTestId('page-design-scope-list')).toBeInTheDocument();
    expect(promptField).toHaveAttribute('name', 'page-style-prompt');
    expect(promptField).toHaveAttribute('autocomplete', 'off');

    await user.type(promptField, 'b');
    expect(onChangePrompt).toHaveBeenCalledWith('b');

    await user.click(screen.getByTestId('page-design-scope-search'));
    expect(onChangeTargetScope).toHaveBeenCalledWith('search');

    await user.click(screen.getByTestId('apply-page-ai-design'));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('marks the selected target scope as pressed', () => {
    render(
      <PageDesignEditor
        pageAiDesign={{ ...DEFAULT_PAGE_AI_DESIGN, targetScope: 'header' }}
        pageAiMessages={[]}
        onChangePrompt={vi.fn()}
        onChangeTargetScope={vi.fn()}
        onApply={vi.fn()}
        isApplying={false}
        errorMessage=""
        representativeCategoryLabel=""
      />,
    );

    expect(screen.getByTestId('page-design-scope-header')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('page-design-scope-search')).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables the apply button while applying and shows the error message', () => {
    render(
      <PageDesignEditor
        pageAiDesign={DEFAULT_PAGE_AI_DESIGN}
        pageAiMessages={[]}
        onChangePrompt={vi.fn()}
        onChangeTargetScope={vi.fn()}
        onApply={vi.fn()}
        isApplying
        errorMessage="페이지 스타일을 적용하지 못했습니다."
        representativeCategoryLabel=""
      />,
    );

    expect(screen.getByTestId('apply-page-ai-design')).toBeDisabled();
    expect(screen.getByText('페이지 스타일을 적용하지 못했습니다.')).toBeInTheDocument();
  });

  it('renders the conversation thread with each message and its scope label', () => {
    render(
      <PageDesignEditor
        pageAiDesign={DEFAULT_PAGE_AI_DESIGN}
        pageAiMessages={[
          { id: '1', role: 'user', text: '검색창을 크게 해줘', scope: 'search' },
          { id: '2', role: 'assistant', text: '검색창을 더 크게 바꿨습니다.', scope: 'search', suggestion: '헤더 색상도 같이 어울리게 바꿔보면 좋을 것 같아요.' },
        ]}
        onChangePrompt={vi.fn()}
        onChangeTargetScope={vi.fn()}
        onApply={vi.fn()}
        isApplying={false}
        errorMessage=""
        representativeCategoryLabel=""
      />,
    );

    expect(screen.getByText('검색창을 크게 해줘')).toBeInTheDocument();
    expect(screen.getByText('검색창을 더 크게 바꿨습니다.')).toBeInTheDocument();
    expect(screen.getByText('헤더 색상도 같이 어울리게 바꿔보면 좋을 것 같아요.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/PageDesignEditor.test.jsx`
Expected: FAIL — `PageDesignEditor` doesn't yet accept/render `pageAiMessages`.

- [ ] **Step 3: Implement**

Replace the full contents of `react-app/src/features/storefront/components/page-design/PageDesignEditor.jsx` with:

```jsx
import { PAGE_AI_TARGET_SCOPE_OPTIONS } from '../../model/pageAiDesignModel';
import AiChatPanel from '../ai-chat/AiChatPanel';
import PageStylePromptField from './PageStylePromptField';
import styles from './PageDesignEditor.module.css';

export default function PageDesignEditor({
  pageAiDesign,
  pageAiMessages,
  onChangePrompt,
  onChangeTargetScope,
  onApply,
  isApplying,
  errorMessage,
  representativeCategoryLabel,
}) {
  return (
    <div className={styles.editor} data-testid="page-design-editor">
      {representativeCategoryLabel ? (
        <p className={styles.metaLine}>기준 카테고리: {representativeCategoryLabel}</p>
      ) : null}

      <AiChatPanel
        panelTestId="page-design-prompt-panel"
        messages={pageAiMessages}
        scopeOptions={PAGE_AI_TARGET_SCOPE_OPTIONS}
        selectedScope={pageAiDesign.targetScope}
        onScopeChange={onChangeTargetScope}
        scopeTestIdPrefix="page-design-scope"
        scopeListTestId="page-design-scope-list"
        inputField={
          <PageStylePromptField
            value={pageAiDesign.prompt}
            onChange={onChangePrompt}
            describedBy="page-style-prompt-help"
          />
        }
        onSend={onApply}
        sendLabel="페이지 스타일 적용"
        sendTestId="apply-page-ai-design"
        isSending={isApplying}
        errorMessage={errorMessage}
        emptyStateText="원하는 분위기를 자세히 적어 주세요. 예: 신뢰감 있는 블루 톤으로 정리하고, 제목은 조금 더 굵게 해줘"
      />
    </div>
  );
}
```

Replace the full contents of `react-app/src/features/storefront/components/page-design/PageDesignEditor.module.css` with:

```css
.editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metaLine {
  margin: 0;
  font-size: 0.76rem;
  color: #64748b;
}
```

In `react-app/src/features/storefront/pages/storefront-builder/PageDesignStep.jsx`, add `pageAiMessages`:

```jsx
import StepShell from '../../components/step-shell/StepShell';
import PageDesignEditor from '../../components/page-design/PageDesignEditor';

export default function PageDesignStep({ step }) {
  return (
    <StepShell
      eyebrow="2단계"
      title="페이지 디자인 설정"
      description="페이지 분위기와 핵심 스타일을 정해 주세요."
    >
      <PageDesignEditor
        pageAiDesign={step.pageAiDesign}
        pageAiMessages={step.pageAiMessages}
        onChangePrompt={step.setPagePrompt}
        onChangeTargetScope={step.setPageTargetScope}
        onApply={step.applyPageAiDesign}
        isApplying={step.isApplyingPageAiDesign}
        errorMessage={step.pageAiErrorMessage}
        representativeCategoryLabel={step.selectedProductCategoryName}
      />
    </StepShell>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/PageDesignEditor.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/components/page-design/PageDesignEditor.jsx react-app/src/features/storefront/components/page-design/PageDesignEditor.module.css react-app/src/features/storefront/pages/storefront-builder/PageDesignStep.jsx react-app/src/features/storefront/__tests__/PageDesignEditor.test.jsx
git commit -m "feat(storefront-ai): rewire PageDesignEditor onto the shared AiChatPanel"
```

---

### Task 15: Full regression pass

**Files:** None (verification only).

- [ ] **Step 1: Run the entire storefront test suite**

Run: `cd react-app && npx vitest run src/features/storefront functions`
Expected: PASS — every test file under `src/features/storefront/__tests__` and `functions/**/__tests__` is green, including `StorefrontBuilderPage.test.jsx`'s seven integration tests that drive the AI chat flows end-to-end.

- [ ] **Step 2: Run the full project test suite**

Run: `cd react-app && npm test -- --run`
Expected: PASS (or only the 3 pre-existing `supabaseUrl is required` failures noted in project memory as a local `.env` gap unrelated to this change — confirm no *new* failures appear).

- [ ] **Step 3: Manually exercise the chat UI in the dev server**

Run: `cd react-app && npm run dev` (or use the `run` skill), open the storefront builder, reach the Page Design step, and confirm: typing a request and clicking "페이지 스타일 적용" adds a user bubble then an assistant bubble with an explanation, the input clears after sending, the scope chips toggle correctly, and a second prompt (e.g. "더 크게 해줘") still works without re-stating the first request. Repeat for the Card Design step including the undo button. Use `VITE_STOREFRONT_AI_LOCAL_HEURISTIC=true` if no `OPENAI_API_KEY` is configured locally.

- [ ] **Step 4: Fix any fallout**

If any test or manual check fails, fix the specific regression in its owning task's file (do not patch around it in an unrelated file) and re-run Steps 1-2 until clean.

- [ ] **Step 5: Final commit (only if Step 4 produced changes)**

```bash
git add -A
git commit -m "fix(storefront-ai): address regressions found in full chat-style UI verification pass"
```
