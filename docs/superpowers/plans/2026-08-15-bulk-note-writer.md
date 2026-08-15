# AI 일괄비고 작성 (Bulk Note Writer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third AI sub-tab ("일괄비고작성") to the office-product-editor that lets a user type a natural-language condition + note text, previews which rows AI matched, and — only after the user clicks 적용 — writes that note into all matched rows through the existing manual-edit annotation pipeline.

**Architecture:** Mirrors the existing `market-research` and `ai-recommendations` AI sub-features exactly: a Cloudflare Pages Function calls OpenAI's Responses API with a JSON-schema-constrained prompt, a client-side model layer serializes rows and normalizes the response, a hook holds ephemeral preview state, and a new panel component renders inside `WorkbookAiRecommendationPanel`'s existing sub-tab bar. The one new piece of behavior — an AI feature that can mutate row data — is deliberately *not* a new persistence path: applying a match calls the same `updateNote(rowId, note)` function manual note edits already use, so it rides the existing annotation → sessionStorage → save pipeline.

**Tech Stack:** React (hooks, no new libraries), Cloudflare Pages Functions, OpenAI Responses API (`json_schema` strict mode), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-15-bulk-note-writer-design.md`

## Global Constraints

- Row cap: 500 rows per request (`MAX_WORKBOOK_AI_ROWS`, reused from `model/ai-recommendations/workbookAiRequestBodyModel.js`), enforced client-side and server-side.
- Note text cap: 300 characters, enforced server-side in `bulkNoteMatchModel.js`.
- Any `row_id` the AI returns that wasn't among the rows actually sent in that request must be dropped before it reaches the client.
- Nothing touches row `annotations` state until the user explicitly clicks 적용 — the preview step must never call `updateNote` itself.
- Existing notes are overwritten (not appended) when a match is applied.
- All UI copy is Korean, matching the rest of the panel.

---

## File Structure

```
react-app/functions/api/bulk-note/
  analyze.js
  __tests__/analyze.test.js

react-app/src/features/office-product-editor/model/bulk-note/
  bulkNoteWriterPrompt.js
  bulkNoteRequestBodyModel.js        (schema, serializeRowsForBulkNoteReview, buildBulkNoteRequestBody)
  bulkNoteMatchModel.js              (normalizeBulkNoteMatches — drops unknown row_ids, caps note length)
  bulkNoteAnalysisModel.js           (analyzeBulkNoteMatches — client orchestration)

react-app/src/features/office-product-editor/services/bulk-note/
  bulkNoteClient.js                  (requestBulkNoteMatches — fetch wrapper)

react-app/src/features/office-product-editor/hooks/bulk-note/
  useBulkNoteWriterState.js

react-app/src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/
  BulkNoteWriterPanel.jsx
  BulkNoteWriterPanel.module.css

react-app/src/features/office-product-editor/__tests__/
  bulkNoteRequestBodyModel.test.js
  bulkNoteMatchModel.test.js
  bulkNoteAnalysisModel.test.js
  useBulkNoteWriterState.test.js
  (WorkbookAiRecommendationPanel.test.jsx — extended, not created)

Modified:
  react-app/src/features/office-product-editor/hooks/useOfficeProductEditorState.js
  react-app/src/features/office-product-editor/components/DataEditorSection.jsx
  react-app/src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/WorkbookAiRecommendationPanel.jsx
```

---

### Task 1: Request body model — schema, row serializer, prompt

**Files:**
- Create: `react-app/src/features/office-product-editor/model/bulk-note/bulkNoteWriterPrompt.js`
- Create: `react-app/src/features/office-product-editor/model/bulk-note/bulkNoteRequestBodyModel.js`
- Test: `react-app/src/features/office-product-editor/__tests__/bulkNoteRequestBodyModel.test.js`

**Interfaces:**
- Consumes: `MAX_WORKBOOK_AI_ROWS` from `../ai-recommendations/workbookAiRequestBodyModel.js` (already exists, value `500`); `toTrimmedString` from `../../../../common/utils/text`; `toNumberOrNull` from `../../../../common/utils/number`.
- Produces: `serializeRowsForBulkNoteReview(rows) => Array<{row_id, product_name, spec, medium_category, small_category, detail_category, product_category, note, tax_price, zero_tax_price, exempt_tax_price}>`; `buildBulkNoteRequestBody({rows, tableNameMode, instruction, openAiModel, prompt}) => OpenAI request body object`; `BULK_NOTE_WRITER_PROMPT` (string constant). These are consumed by Task 3 (server endpoint) and Task 4 (client analysis model).

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/office-product-editor/__tests__/bulkNoteRequestBodyModel.test.js`:

```js
import { describe, expect, it } from 'vitest';

import {
  buildBulkNoteRequestBody,
  serializeRowsForBulkNoteReview,
} from '../model/bulk-note/bulkNoteRequestBodyModel';
import { BULK_NOTE_WRITER_PROMPT } from '../model/bulk-note/bulkNoteWriterPrompt';
import { MAX_WORKBOOK_AI_ROWS } from '../model/ai-recommendations/workbookAiRequestBodyModel';

describe('serializeRowsForBulkNoteReview', () => {
  it('trims a row down to the fields the bulk note writer needs', () => {
    const rows = [
      {
        row_id: 'A100__01',
        product_name: '유기질비료',
        spec: '20kg',
        medium_category: '유기질비료',
        small_category: '가축분퇴비',
        detail_category: '',
        product_category: '',
        note: '기존 비고',
        tax_price: 15000,
        zero_tax_price: null,
        exempt_tax_price: null,
        product_usage: [{ cropName: '벼' }],
      },
    ];

    expect(serializeRowsForBulkNoteReview(rows)).toEqual([
      {
        row_id: 'A100__01',
        product_name: '유기질비료',
        spec: '20kg',
        medium_category: '유기질비료',
        small_category: '가축분퇴비',
        detail_category: '',
        product_category: '',
        note: '기존 비고',
        tax_price: 15000,
        zero_tax_price: null,
        exempt_tax_price: null,
      },
    ]);
  });

  it('caps the row count at MAX_WORKBOOK_AI_ROWS', () => {
    const rows = Array.from({ length: MAX_WORKBOOK_AI_ROWS + 10 }, (_, i) => ({
      row_id: `R${i}`,
    }));

    expect(serializeRowsForBulkNoteReview(rows)).toHaveLength(MAX_WORKBOOK_AI_ROWS);
  });

  it('returns an empty array for non-array input', () => {
    expect(serializeRowsForBulkNoteReview(null)).toEqual([]);
    expect(serializeRowsForBulkNoteReview(undefined)).toEqual([]);
  });
});

describe('buildBulkNoteRequestBody', () => {
  it('builds an OpenAI Responses API request body with the bulk-note schema', () => {
    const requestBody = buildBulkNoteRequestBody({
      rows: [{ row_id: 'A100__01', product_name: '유기질비료', spec: '20kg' }],
      tableNameMode: 'fertilizer',
      instruction: "소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘",
      openAiModel: 'gpt-4.1-mini',
      prompt: BULK_NOTE_WRITER_PROMPT,
    });

    expect(requestBody.model).toBe('gpt-4.1-mini');
    expect(requestBody.input[0]).toEqual({ role: 'system', content: BULK_NOTE_WRITER_PROMPT });

    const userContent = JSON.parse(requestBody.input[1].content);
    expect(userContent.table_name_mode).toBe('fertilizer');
    expect(userContent.instruction).toBe("소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘");
    expect(userContent.rows).toEqual([
      {
        row_id: 'A100__01',
        product_name: '유기질비료',
        spec: '20kg',
        medium_category: '',
        small_category: '',
        detail_category: '',
        product_category: '',
        note: '',
        tax_price: null,
        zero_tax_price: null,
        exempt_tax_price: null,
      },
    ]);

    expect(requestBody.text.format.type).toBe('json_schema');
    expect(requestBody.text.format.strict).toBe(true);
    expect(requestBody.text.format.schema.required).toEqual(['matches', 'unmatched_reason']);
    expect(requestBody.text.format.schema.properties.matches.items.required).toEqual([
      'row_id',
      'note',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `react-app/`): `npx vitest run src/features/office-product-editor/__tests__/bulkNoteRequestBodyModel.test.js`
Expected: FAIL — cannot find module `../model/bulk-note/bulkNoteRequestBodyModel` (and `bulkNoteWriterPrompt`).

- [ ] **Step 3: Write the prompt file**

Create `react-app/src/features/office-product-editor/model/bulk-note/bulkNoteWriterPrompt.js`:

```js
export const BULK_NOTE_WRITER_PROMPT = `
You bulk-fill the note(비고) column of a Korean agricultural produce
office's product list, based on one natural-language instruction from the
operator.

The user message is JSON with:
- table_name_mode: the active table mode (fertilizer, pesticide, custom, or empty).
- instruction: the operator's natural-language request in Korean. It
  describes a condition selecting some rows, plus the literal note text to
  write into those rows.
- rows: the current product list. Each row has row_id, product_name, spec,
  medium_category, small_category, detail_category, product_category
  (used for pesticides), note (its current value), tax_price,
  zero_tax_price, exempt_tax_price.

Rules:
- Find every row that satisfies the condition in instruction, matching
  against product_name, spec, and the category fields as literally as
  possible. Prefer conservative, exact matches over guesses.
- For each matching row, return its exact row_id together with the note
  text the instruction specifies, copied verbatim. Do not paraphrase,
  translate, summarize, or add commentary to the note text. Do not invent
  a note phrase the instruction didn't specify.
- Only use row_id values that appear in rows. Never invent a row_id.
- If instruction doesn't specify a clear condition, doesn't specify what
  text to write, or matches no rows, return an empty matches array and
  explain why in unmatched_reason. Otherwise set unmatched_reason to null.
- Write unmatched_reason in Korean.
`.trim();
```

- [ ] **Step 4: Write the request body model**

Create `react-app/src/features/office-product-editor/model/bulk-note/bulkNoteRequestBodyModel.js`:

```js
import { toTrimmedString } from '../../../../common/utils/text';
import { toNumberOrNull } from '../../../../common/utils/number';
import { MAX_WORKBOOK_AI_ROWS } from '../ai-recommendations/workbookAiRequestBodyModel';

const BULK_NOTE_MATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          row_id: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['row_id', 'note'],
      },
    },
    unmatched_reason: { type: ['string', 'null'] },
  },
  required: ['matches', 'unmatched_reason'],
};

export function serializeRowsForBulkNoteReview(rows) {
  const cappedRows = (Array.isArray(rows) ? rows : []).slice(0, MAX_WORKBOOK_AI_ROWS);

  return cappedRows.map((row) => ({
    row_id: toTrimmedString(row?.row_id),
    product_name: toTrimmedString(row?.product_name),
    spec: toTrimmedString(row?.spec),
    medium_category: toTrimmedString(row?.medium_category),
    small_category: toTrimmedString(row?.small_category),
    detail_category: toTrimmedString(row?.detail_category),
    product_category: toTrimmedString(row?.product_category),
    note: toTrimmedString(row?.note),
    tax_price: toNumberOrNull(row?.tax_price),
    zero_tax_price: toNumberOrNull(row?.zero_tax_price),
    exempt_tax_price: toNumberOrNull(row?.exempt_tax_price),
  }));
}

export function buildBulkNoteRequestBody({ rows, tableNameMode, instruction, openAiModel, prompt }) {
  return {
    model: openAiModel,
    input: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: JSON.stringify({
          table_name_mode: toTrimmedString(tableNameMode),
          instruction: toTrimmedString(instruction),
          rows: serializeRowsForBulkNoteReview(rows),
        }),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'bulk_note_matches',
        strict: true,
        schema: BULK_NOTE_MATCH_SCHEMA,
      },
    },
    max_output_tokens: 8000,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/office-product-editor/__tests__/bulkNoteRequestBodyModel.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add react-app/src/features/office-product-editor/model/bulk-note/bulkNoteWriterPrompt.js \
        react-app/src/features/office-product-editor/model/bulk-note/bulkNoteRequestBodyModel.js \
        react-app/src/features/office-product-editor/__tests__/bulkNoteRequestBodyModel.test.js
git commit -m "feat(office-product-editor): add bulk note writer prompt and request body model"
```

---

### Task 2: Match normalization model — drop hallucinated row_ids, cap note length

**Files:**
- Create: `react-app/src/features/office-product-editor/model/bulk-note/bulkNoteMatchModel.js`
- Test: `react-app/src/features/office-product-editor/__tests__/bulkNoteMatchModel.test.js`

**Interfaces:**
- Consumes: `toTrimmedString` from `../../../../common/utils/text`.
- Produces: `normalizeBulkNoteMatches(payload, sentRowIds) => { matches: Array<{rowId, note}>, unmatchedReason: string|null }`. Consumed server-side by Task 3 (`functions/api/bulk-note/analyze.js`).

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/office-product-editor/__tests__/bulkNoteMatchModel.test.js`:

```js
import { describe, expect, it } from 'vitest';

import { normalizeBulkNoteMatches } from '../model/bulk-note/bulkNoteMatchModel';

describe('normalizeBulkNoteMatches', () => {
  it('normalizes matches whose row_id was actually sent', () => {
    const result = normalizeBulkNoteMatches(
      { matches: [{ row_id: 'A100__01', note: '보조 1500원' }], unmatched_reason: null },
      ['A100__01', 'B200__01'],
    );

    expect(result).toEqual({
      matches: [{ rowId: 'A100__01', note: '보조 1500원' }],
      unmatchedReason: null,
    });
  });

  it('drops a match whose row_id was not among the rows actually sent', () => {
    const result = normalizeBulkNoteMatches(
      {
        matches: [
          { row_id: 'A100__01', note: '보조 1500원' },
          { row_id: 'HALLUCINATED__99', note: '보조 1500원' },
        ],
        unmatched_reason: null,
      },
      ['A100__01'],
    );

    expect(result.matches).toEqual([{ rowId: 'A100__01', note: '보조 1500원' }]);
  });

  it('drops matches missing a row_id or note', () => {
    const result = normalizeBulkNoteMatches(
      {
        matches: [
          { row_id: '', note: '보조 1500원' },
          { row_id: 'A100__01', note: '' },
        ],
        unmatched_reason: null,
      },
      ['A100__01'],
    );

    expect(result.matches).toEqual([]);
  });

  it('truncates a note longer than 300 characters', () => {
    const longNote = 'x'.repeat(400);

    const result = normalizeBulkNoteMatches(
      { matches: [{ row_id: 'A100__01', note: longNote }], unmatched_reason: null },
      ['A100__01'],
    );

    expect(result.matches[0].note).toHaveLength(300);
  });

  it('defaults missing fields to safe empty values and carries through a Korean unmatched_reason', () => {
    expect(normalizeBulkNoteMatches({}, ['A100__01'])).toEqual({
      matches: [],
      unmatchedReason: null,
    });

    expect(
      normalizeBulkNoteMatches(
        { matches: [], unmatched_reason: '조건에 맞는 상품을 찾지 못했습니다.' },
        [],
      ),
    ).toEqual({
      matches: [],
      unmatchedReason: '조건에 맞는 상품을 찾지 못했습니다.',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/office-product-editor/__tests__/bulkNoteMatchModel.test.js`
Expected: FAIL — cannot find module `../model/bulk-note/bulkNoteMatchModel`.

- [ ] **Step 3: Write the minimal implementation**

Create `react-app/src/features/office-product-editor/model/bulk-note/bulkNoteMatchModel.js`:

```js
import { toTrimmedString } from '../../../../common/utils/text';

const MAX_NOTE_LENGTH = 300;

function normalizeMatch(rawMatch, sentRowIdSet) {
  const rowId = toTrimmedString(rawMatch?.row_id);
  const note = toTrimmedString(rawMatch?.note).slice(0, MAX_NOTE_LENGTH);

  if (rowId === '' || note === '' || !sentRowIdSet.has(rowId)) {
    return null;
  }

  return { rowId, note };
}

export function normalizeBulkNoteMatches(payload, sentRowIds) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const sentRowIdSet = new Set(Array.isArray(sentRowIds) ? sentRowIds : []);
  const rawMatches = Array.isArray(safePayload.matches) ? safePayload.matches : [];

  const matches = rawMatches
    .map((rawMatch) => normalizeMatch(rawMatch, sentRowIdSet))
    .filter((match) => match !== null);

  return {
    matches,
    unmatchedReason: toTrimmedString(safePayload.unmatched_reason) || null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/office-product-editor/__tests__/bulkNoteMatchModel.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/office-product-editor/model/bulk-note/bulkNoteMatchModel.js \
        react-app/src/features/office-product-editor/__tests__/bulkNoteMatchModel.test.js
git commit -m "feat(office-product-editor): add bulk note match normalization with row_id allowlist"
```

---

### Task 3: Cloudflare Pages Function endpoint

**Files:**
- Create: `react-app/functions/api/bulk-note/analyze.js`
- Test: `react-app/functions/api/bulk-note/__tests__/analyze.test.js`

**Interfaces:**
- Consumes: `buildBulkNoteRequestBody` and `MAX_WORKBOOK_AI_ROWS` (Task 1), `normalizeBulkNoteMatches` (Task 2), `BULK_NOTE_WRITER_PROMPT` (Task 1), `requestOpenAiJson` (existing, `src/features/storefront/services/openai/openAiJsonRequest.js`), `errorResponse`/`jsonResponse` (existing, `functions/lib/jsonResponse.js`), `RequestValidationError`/`assertOfficeCodePresent`/`assertPostJsonRequest`/`assertPromptWithinLimit`/`pickAllowedKeys`/`readJsonBody` (existing, `functions/lib/requestValidation.js`), `requireAuthenticatedSupabaseUser` (existing, `functions/lib/supabaseServerAuth.js`), `assertOfficeOwnership` (existing, `functions/lib/officeOwnershipGuard.js`).
- Produces: `onRequestPost({ request, env })` handler responding `{ matches: [{rowId, note}], unmatchedReason }` on success. Consumed by Task 4's client (`POST /api/bulk-note/analyze`).

- [ ] **Step 1: Write the failing test**

Create `react-app/functions/api/bulk-note/__tests__/analyze.test.js`:

```js
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { onRequestPost } from '../analyze';

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

  return new Request('https://example.com/api/bulk-note/analyze', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const sampleRows = [
  { row_id: 'A100__01', product_name: '유기질비료', spec: '20kg', small_category: '가축분퇴비' },
];

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/bulk-note/analyze', () => {
  it('returns 401 when no bearer token is present', async () => {
    const request = buildRequest(
      { officeCode: 'OFF-1', instruction: '조건', rows: sampleRows },
      { authorization: '' },
    );

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(401);
  });

  it('returns 403 when officeCode does not match the profile', async () => {
    createClient.mockReturnValue(buildSupabaseStub({ officeCode: 'OFF-OTHER' }));
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '조건', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(403);
  });

  it('returns 422 when officeCode is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: '', instruction: '조건', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns 422 when instruction is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns an empty match list without calling OpenAI when there are no rows', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '조건', rows: [] });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ matches: [], unmatchedReason: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 502 when OpenAI fails', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '조건', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(502);
  });

  it('drops a row_id OpenAI returns that was not among the rows actually sent', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    matches: [
                      { row_id: 'A100__01', note: '보조 1500원' },
                      { row_id: 'HALLUCINATED__99', note: '보조 1500원' },
                    ],
                    unmatched_reason: null,
                  }),
                },
              ],
            },
          ],
        }),
      }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '조건', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.matches).toEqual([{ rowId: 'A100__01', note: '보조 1500원' }]);
  });

  it('returns 200 with normalized matches on success', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    matches: [{ row_id: 'A100__01', note: '보조 1500원' }],
                    unmatched_reason: null,
                  }),
                },
              ],
            },
          ],
        }),
      }),
    );
    const request = buildRequest({
      officeCode: 'OFF-1',
      instruction: "소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘",
      rows: sampleRows,
    });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      matches: [{ rowId: 'A100__01', note: '보조 1500원' }],
      unmatchedReason: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/api/bulk-note/__tests__/analyze.test.js`
Expected: FAIL — cannot find module `../analyze`.

- [ ] **Step 3: Write the minimal implementation**

Create `react-app/functions/api/bulk-note/analyze.js`:

```js
import { buildBulkNoteRequestBody } from '../../../src/features/office-product-editor/model/bulk-note/bulkNoteRequestBodyModel.js';
import { normalizeBulkNoteMatches } from '../../../src/features/office-product-editor/model/bulk-note/bulkNoteMatchModel.js';
import { BULK_NOTE_WRITER_PROMPT } from '../../../src/features/office-product-editor/model/bulk-note/bulkNoteWriterPrompt.js';
import { MAX_WORKBOOK_AI_ROWS } from '../../../src/features/office-product-editor/model/ai-recommendations/workbookAiRequestBodyModel.js';
import { requestOpenAiJson } from '../../../src/features/storefront/services/openai/openAiJsonRequest.js';
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

const DEFAULT_OPENAI_MODEL = 'gpt-5.6-luna';
const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'tableNameMode',
  'instruction',
  'rows',
  'supabaseUrl',
  'supabasePublishableKey',
];
const MAX_REQUEST_BODY_BYTES = 300000;

function toOptionalTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isLocalDevelopmentRequest(request) {
  try {
    const hostname = new URL(request.url).hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

function buildLocalSupabaseEnvFallback(request, body) {
  if (!isLocalDevelopmentRequest(request)) {
    return {};
  }

  const supabaseUrl = toOptionalTrimmedString(body.supabaseUrl);
  const supabasePublishableKey = toOptionalTrimmedString(body.supabasePublishableKey);
  const fallbackEnv = {};

  if (supabaseUrl) {
    fallbackEnv.SUPABASE_URL = supabaseUrl;
  }

  if (supabasePublishableKey) {
    fallbackEnv.SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey;
  }

  return fallbackEnv;
}

export async function onRequestPost({ request, env }) {
  try {
    assertPostJsonRequest(request);

    const rawBody = await readJsonBody(request, { maxBytes: MAX_REQUEST_BODY_BYTES });
    const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
    const officeCode = toOptionalTrimmedString(body.officeCode);
    const tableNameMode = toOptionalTrimmedString(body.tableNameMode);
    const instruction = toOptionalTrimmedString(body.instruction);

    assertOfficeCodePresent(officeCode);
    assertPromptWithinLimit(instruction);

    const rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_WORKBOOK_AI_ROWS) : [];
    const sentRowIds = rows
      .map((row) => toOptionalTrimmedString(row?.row_id))
      .filter((rowId) => rowId !== '');

    if (rows.length === 0) {
      return jsonResponse({ matches: [], unmatchedReason: null });
    }

    const effectiveEnv = {
      ...buildLocalSupabaseEnvFallback(request, body),
      ...env,
    };

    const { supabase, user } = await requireAuthenticatedSupabaseUser(request, effectiveEnv);
    await assertOfficeOwnership({ supabase, authUserId: user.id, officeCode });

    const requestBody = buildBulkNoteRequestBody({
      rows,
      tableNameMode,
      instruction,
      openAiModel: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      prompt: BULK_NOTE_WRITER_PROMPT,
    });

    let payload;

    try {
      payload = await requestOpenAiJson(requestBody, env.OPENAI_API_KEY);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : 'OpenAI request failed.',
        502,
      );
    }

    const { matches, unmatchedReason } = normalizeBulkNoteMatches(payload, sentRowIds);

    return jsonResponse({ matches, unmatchedReason });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse('Unexpected server error.', 500);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/api/bulk-note/__tests__/analyze.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add react-app/functions/api/bulk-note/analyze.js \
        react-app/functions/api/bulk-note/__tests__/analyze.test.js
git commit -m "feat(office-product-editor): add bulk note writer Cloudflare function endpoint"
```

---

### Task 4: Client service + analysis model

**Files:**
- Create: `react-app/src/features/office-product-editor/services/bulk-note/bulkNoteClient.js`
- Create: `react-app/src/features/office-product-editor/model/bulk-note/bulkNoteAnalysisModel.js`
- Test: `react-app/src/features/office-product-editor/__tests__/bulkNoteAnalysisModel.test.js`

**Interfaces:**
- Consumes: `serializeRowsForBulkNoteReview` (Task 1); Supabase client singleton from `../../../../lib/supabaseClient`; `toTrimmedString` from `../../../../common/utils/text`.
- Produces: `requestBulkNoteMatches({officeCode, tableNameMode, instruction, rows}) => Promise<{matches, unmatchedReason}>`; `analyzeBulkNoteMatches(rows, {officeCode, tableNameMode, instruction}) => Promise<{mode: 'idle'|'unavailable'|'openai'|'error', matches, unmatchedReason, message?}>`. `analyzeBulkNoteMatches` is consumed by Task 5's hook.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/office-product-editor/__tests__/bulkNoteAnalysisModel.test.js`:

```js
import { afterEach, describe, expect, it, vi } from 'vitest';

import { analyzeBulkNoteMatches } from '../model/bulk-note/bulkNoteAnalysisModel';
import { requestBulkNoteMatches } from '../services/bulk-note/bulkNoteClient';

vi.mock('../services/bulk-note/bulkNoteClient', () => ({
  requestBulkNoteMatches: vi.fn(),
}));

const sampleRows = [{ row_id: 'A100__01', product_name: '유기질비료', spec: '20kg' }];

afterEach(() => {
  vi.clearAllMocks();
});

describe('analyzeBulkNoteMatches', () => {
  it('serializes rows and returns the client result on success', async () => {
    requestBulkNoteMatches.mockResolvedValue({
      matches: [{ rowId: 'A100__01', note: '보조 1500원' }],
      unmatchedReason: null,
    });

    const result = await analyzeBulkNoteMatches(sampleRows, {
      officeCode: 'OFF-1',
      tableNameMode: 'fertilizer',
      instruction: "소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘",
    });

    expect(requestBulkNoteMatches).toHaveBeenCalledWith({
      officeCode: 'OFF-1',
      tableNameMode: 'fertilizer',
      instruction: "소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘",
      rows: [
        {
          row_id: 'A100__01',
          product_name: '유기질비료',
          spec: '20kg',
          medium_category: '',
          small_category: '',
          detail_category: '',
          product_category: '',
          note: '',
          tax_price: null,
          zero_tax_price: null,
          exempt_tax_price: null,
        },
      ],
    });
    expect(result.mode).toBe('openai');
    expect(result.matches).toEqual([{ rowId: 'A100__01', note: '보조 1500원' }]);
  });

  it('returns an idle result when instruction is empty', async () => {
    const result = await analyzeBulkNoteMatches(sampleRows, { officeCode: 'OFF-1', instruction: '' });

    expect(result.mode).toBe('idle');
    expect(result.matches).toEqual([]);
    expect(requestBulkNoteMatches).not.toHaveBeenCalled();
  });

  it('returns an idle result when there are no rows', async () => {
    const result = await analyzeBulkNoteMatches([], { officeCode: 'OFF-1', instruction: '조건' });

    expect(result.mode).toBe('idle');
    expect(requestBulkNoteMatches).not.toHaveBeenCalled();
  });

  it('returns an unavailable result when officeCode is empty', async () => {
    const result = await analyzeBulkNoteMatches(sampleRows, { officeCode: '', instruction: '조건' });

    expect(result.mode).toBe('unavailable');
    expect(requestBulkNoteMatches).not.toHaveBeenCalled();
  });

  it('returns an error result when the client fails', async () => {
    requestBulkNoteMatches.mockRejectedValue(new Error('일괄비고 작성 요청에 실패했습니다.'));

    const result = await analyzeBulkNoteMatches(sampleRows, { officeCode: 'OFF-1', instruction: '조건' });

    expect(result.mode).toBe('error');
    expect(result.matches).toEqual([]);
    expect(result.message).toBe('일괄비고 작성 요청에 실패했습니다.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/office-product-editor/__tests__/bulkNoteAnalysisModel.test.js`
Expected: FAIL — cannot find module `../model/bulk-note/bulkNoteAnalysisModel` (and `../services/bulk-note/bulkNoteClient`).

- [ ] **Step 3: Write the client service**

Create `react-app/src/features/office-product-editor/services/bulk-note/bulkNoteClient.js`:

```js
import supabase from '../../../../lib/supabaseClient';
import { toTrimmedString } from '../../../../common/utils/text';

const BULK_NOTE_ENDPOINT = '/api/bulk-note/analyze';
const SESSION_EXPIRED_ERROR_MESSAGE = '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.';
const LOCAL_SUPABASE_URL = toTrimmedString(import.meta.env.VITE_SUPABASE_URL);
const LOCAL_SUPABASE_PUBLISHABLE_KEY = toTrimmedString(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_KEY,
);

async function readErrorMessage(response) {
  try {
    const body = await response.json();
    return toTrimmedString(body?.error) || `Bulk note request failed with status ${response.status}.`;
  } catch {
    return `Bulk note request failed with status ${response.status}.`;
  }
}

export async function requestBulkNoteMatches({ officeCode, tableNameMode, instruction, rows }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error(SESSION_EXPIRED_ERROR_MESSAGE);
  }

  const response = await fetch(BULK_NOTE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      officeCode: toTrimmedString(officeCode),
      tableNameMode: toTrimmedString(tableNameMode),
      instruction: toTrimmedString(instruction),
      rows,
      supabaseUrl: LOCAL_SUPABASE_URL,
      supabasePublishableKey: LOCAL_SUPABASE_PUBLISHABLE_KEY,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const body = await response.json();

  return {
    matches: Array.isArray(body?.matches) ? body.matches : [],
    unmatchedReason: body?.unmatchedReason ?? null,
  };
}
```

- [ ] **Step 4: Write the analysis model**

Create `react-app/src/features/office-product-editor/model/bulk-note/bulkNoteAnalysisModel.js`:

```js
import { toTrimmedString } from '../../../../common/utils/text';
import { requestBulkNoteMatches } from '../../services/bulk-note/bulkNoteClient';
import { serializeRowsForBulkNoteReview } from './bulkNoteRequestBodyModel';

export async function analyzeBulkNoteMatches(rows, { officeCode, tableNameMode, instruction } = {}) {
  const safeInstruction = toTrimmedString(instruction);
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeInstruction === '' || safeRows.length === 0) {
    return { mode: 'idle', matches: [], unmatchedReason: null };
  }

  if (!toTrimmedString(officeCode)) {
    return { mode: 'unavailable', matches: [], unmatchedReason: null };
  }

  try {
    const { matches, unmatchedReason } = await requestBulkNoteMatches({
      officeCode,
      tableNameMode,
      instruction: safeInstruction,
      rows: serializeRowsForBulkNoteReview(safeRows),
    });

    return { mode: 'openai', matches, unmatchedReason: unmatchedReason ?? null };
  } catch (error) {
    return {
      mode: 'error',
      matches: [],
      unmatchedReason: null,
      message: error instanceof Error ? error.message : '일괄비고 작성 요청에 실패했습니다.',
    };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/office-product-editor/__tests__/bulkNoteAnalysisModel.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add react-app/src/features/office-product-editor/services/bulk-note/bulkNoteClient.js \
        react-app/src/features/office-product-editor/model/bulk-note/bulkNoteAnalysisModel.js \
        react-app/src/features/office-product-editor/__tests__/bulkNoteAnalysisModel.test.js
git commit -m "feat(office-product-editor): add bulk note writer client and analysis model"
```

---

### Task 5: `useBulkNoteWriterState` hook

**Files:**
- Create: `react-app/src/features/office-product-editor/hooks/bulk-note/useBulkNoteWriterState.js`
- Test: `react-app/src/features/office-product-editor/__tests__/useBulkNoteWriterState.test.js`

**Interfaces:**
- Consumes: `analyzeBulkNoteMatches` (Task 4).
- Produces: `useBulkNoteWriterState(officeCode, rows, tableNameMode, updateNote) => { isLoading, mode, matches, unmatchedReason, message, appliedCount, handlePreview(instruction), handleApply(), handleClear() }`. `handleApply` calls `updateNote(rowId, note)` once per current match. Consumed by Task 6 (wiring) and Task 7 (`BulkNoteWriterPanel`).

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/office-product-editor/__tests__/useBulkNoteWriterState.test.js`:

```js
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBulkNoteWriterState } from '../hooks/bulk-note/useBulkNoteWriterState';
import { analyzeBulkNoteMatches } from '../model/bulk-note/bulkNoteAnalysisModel';

vi.mock('../model/bulk-note/bulkNoteAnalysisModel', () => ({
  analyzeBulkNoteMatches: vi.fn(),
}));

const sampleMatches = [
  { rowId: 'A100__01', note: '보조 1500원' },
  { rowId: 'B200__01', note: '보조 1500원' },
];

afterEach(() => {
  vi.clearAllMocks();
});

describe('useBulkNoteWriterState', () => {
  it('previews matches for an instruction without touching annotations', async () => {
    analyzeBulkNoteMatches.mockResolvedValue({ mode: 'openai', matches: sampleMatches, unmatchedReason: null });
    const updateNote = vi.fn();

    const { result } = renderHook(() => useBulkNoteWriterState('OFF-1', [], 'fertilizer', updateNote));

    await act(async () => {
      await result.current.handlePreview("소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.mode).toBe('openai');
    expect(result.current.matches).toEqual(sampleMatches);
    expect(updateNote).not.toHaveBeenCalled();
  });

  it('exposes loading state while the preview request is pending', async () => {
    let resolvePromise;
    analyzeBulkNoteMatches.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    const { result } = renderHook(() => useBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn()));

    act(() => {
      void result.current.handlePreview('조건');
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise({ mode: 'openai', matches: [], unmatchedReason: null });
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('calls updateNote once per match and clears the preview when applied', async () => {
    analyzeBulkNoteMatches.mockResolvedValue({ mode: 'openai', matches: sampleMatches, unmatchedReason: null });
    const updateNote = vi.fn();

    const { result } = renderHook(() => useBulkNoteWriterState('OFF-1', [], 'fertilizer', updateNote));

    await act(async () => {
      await result.current.handlePreview('조건');
    });

    act(() => {
      result.current.handleApply();
    });

    expect(updateNote).toHaveBeenCalledTimes(2);
    expect(updateNote).toHaveBeenNthCalledWith(1, 'A100__01', '보조 1500원');
    expect(updateNote).toHaveBeenNthCalledWith(2, 'B200__01', '보조 1500원');
    expect(result.current.matches).toEqual([]);
    expect(result.current.appliedCount).toBe(2);
  });

  it('clears the preview without applying when handleClear is called', async () => {
    analyzeBulkNoteMatches.mockResolvedValue({ mode: 'openai', matches: sampleMatches, unmatchedReason: null });
    const updateNote = vi.fn();

    const { result } = renderHook(() => useBulkNoteWriterState('OFF-1', [], 'fertilizer', updateNote));

    await act(async () => {
      await result.current.handlePreview('조건');
    });

    act(() => {
      result.current.handleClear();
    });

    expect(updateNote).not.toHaveBeenCalled();
    expect(result.current.matches).toEqual([]);
  });

  it('keeps only the result of the latest preview request when submitted twice quickly', async () => {
    let resolveFirst;
    let resolveSecond;
    analyzeBulkNoteMatches
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
      );

    const { result } = renderHook(() => useBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn()));

    act(() => {
      void result.current.handlePreview('조건A');
      void result.current.handlePreview('조건B');
    });

    await act(async () => {
      resolveSecond({ mode: 'openai', matches: [{ rowId: 'B', note: 'B' }], unmatchedReason: null });
    });

    await act(async () => {
      resolveFirst({ mode: 'openai', matches: [{ rowId: 'A', note: 'A' }], unmatchedReason: null });
    });

    expect(result.current.matches).toEqual([{ rowId: 'B', note: 'B' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/office-product-editor/__tests__/useBulkNoteWriterState.test.js`
Expected: FAIL — cannot find module `../hooks/bulk-note/useBulkNoteWriterState`.

- [ ] **Step 3: Write the minimal implementation**

Create `react-app/src/features/office-product-editor/hooks/bulk-note/useBulkNoteWriterState.js`:

```js
import { useRef, useState } from 'react';
import { analyzeBulkNoteMatches } from '../../model/bulk-note/bulkNoteAnalysisModel';

export function useBulkNoteWriterState(officeCode, rows, tableNameMode, updateNote) {
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('idle');
  const [matches, setMatches] = useState([]);
  const [unmatchedReason, setUnmatchedReason] = useState(null);
  const [message, setMessage] = useState('');
  const [appliedCount, setAppliedCount] = useState(0);
  const requestIdRef = useRef(0);

  async function handlePreview(instruction) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setAppliedCount(0);

    const result = await analyzeBulkNoteMatches(rows, { officeCode, tableNameMode, instruction });

    if (requestIdRef.current !== requestId) {
      return;
    }

    setIsLoading(false);
    setMode(result.mode);
    setMatches(result.matches);
    setUnmatchedReason(result.unmatchedReason ?? null);
    setMessage(result.message ?? '');
  }

  function handleApply() {
    matches.forEach((match) => updateNote(match.rowId, match.note));
    setAppliedCount(matches.length);
    setMatches([]);
    setUnmatchedReason(null);
    setMode('idle');
  }

  function handleClear() {
    setMatches([]);
    setUnmatchedReason(null);
    setMode('idle');
    setMessage('');
    setAppliedCount(0);
  }

  return {
    isLoading,
    mode,
    matches,
    unmatchedReason,
    message,
    appliedCount,
    handlePreview,
    handleApply,
    handleClear,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/office-product-editor/__tests__/useBulkNoteWriterState.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/office-product-editor/hooks/bulk-note/useBulkNoteWriterState.js \
        react-app/src/features/office-product-editor/__tests__/useBulkNoteWriterState.test.js
git commit -m "feat(office-product-editor): add useBulkNoteWriterState hook"
```

---

### Task 6: Wire the hook into `useOfficeProductEditorState` and `AiCtx`

**Files:**
- Modify: `react-app/src/features/office-product-editor/hooks/useOfficeProductEditorState.js`

**Interfaces:**
- Consumes: `useBulkNoteWriterState` (Task 5); `tableState.mergedRows`, `tableState.updateNote`, `tableNameMode`, `user?.office_code` (all already exist in this file).
- Produces: `ai.bulkNoteWriter` — an object of shape `{ isLoading, mode, matches, unmatchedReason, message, appliedCount, handlePreview, handleApply, handleClear, rows }` (the hook's own return value plus a `rows` field for the preview UI's row lookups), available through `useAiCtx()`. Consumed by Task 7 (`DataEditorSection.jsx`, `WorkbookAiRecommendationPanel.jsx`).

This task is pure wiring — no new testable logic (the hook's behavior is already covered by Task 5's tests). Verify by running the existing suite, not a new test file.

- [ ] **Step 1: Add the import**

In `react-app/src/features/office-product-editor/hooks/useOfficeProductEditorState.js`, add the import next to the existing `useMarketResearchState` import (currently around line 7):

```js
import { useMarketResearchState } from './market-research/useMarketResearchState';
import { useBulkNoteWriterState } from './bulk-note/useBulkNoteWriterState';
```

- [ ] **Step 2: Instantiate the hook**

Find this existing line (currently around line 78):

```js
  const marketResearchState = useMarketResearchState(user?.office_code, tableState.annotatedRows);
```

Add immediately after it:

```js
  const bulkNoteWriterState = useBulkNoteWriterState(
    user?.office_code,
    tableState.mergedRows,
    tableNameMode,
    tableState.updateNote,
  );
```

- [ ] **Step 3: Expose it through the `ai` context block**

Find the existing `ai:` block in the function's returned object (currently around line 224):

```js
    ai: {
      recommendations: aiState.recommendations,
      isLoading: aiState.isLoading,
      analysisMode: aiState.analysisMode,
      analysisMessage: aiState.analysisMessage,
      activeRecommendationId: aiState.activeRecommendationId,
      handleAnalyze: aiState.handleAnalyze,
      handleRecommendationSelect: aiState.handleRecommendationSelect,
      marketResearch: marketResearchState,
    },
```

Add `bulkNoteWriter` after `marketResearch`:

```js
    ai: {
      recommendations: aiState.recommendations,
      isLoading: aiState.isLoading,
      analysisMode: aiState.analysisMode,
      analysisMessage: aiState.analysisMessage,
      activeRecommendationId: aiState.activeRecommendationId,
      handleAnalyze: aiState.handleAnalyze,
      handleRecommendationSelect: aiState.handleRecommendationSelect,
      marketResearch: marketResearchState,
      bulkNoteWriter: {
        ...bulkNoteWriterState,
        rows: tableState.mergedRows,
      },
    },
```

- [ ] **Step 4: Run the existing suite to confirm nothing broke**

Run (from `react-app/`): `npx vitest run src/features/office-product-editor/__tests__/DataEditorSection.test.jsx src/features/office-product-editor/__tests__/officeProductEditorDraftPersistence.test.jsx src/features/office-product-editor/__tests__/useOfficeProductDataCatalog.test.js`
Expected: PASS — same results as before this change (this wiring adds a new context field; it doesn't change any existing behavior).

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/office-product-editor/hooks/useOfficeProductEditorState.js
git commit -m "feat(office-product-editor): wire bulk note writer state into AiCtx"
```

---

### Task 7: `BulkNoteWriterPanel` component, third sub-tab wiring, and panel tests

**Files:**
- Create: `react-app/src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/BulkNoteWriterPanel.jsx`
- Create: `react-app/src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/BulkNoteWriterPanel.module.css`
- Modify: `react-app/src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/WorkbookAiRecommendationPanel.jsx`
- Modify: `react-app/src/features/office-product-editor/components/DataEditorSection.jsx`
- Modify (add tests): `react-app/src/features/office-product-editor/__tests__/WorkbookAiRecommendationPanel.test.jsx`

**Interfaces:**
- Consumes: `primitives` from `./panelPrimitives.module.css` (`.panel`, `.compactPanel`, `.panelHeader`, `.panelTitle`, `.promptRow`, `.promptInput` — all already exist); the `ai.bulkNoteWriter` object from Task 6 (`{ isLoading, mode, matches, unmatchedReason, message, appliedCount, handlePreview, handleApply, handleClear, rows }`).
- Produces: `BulkNoteWriterPanel({ bulkNoteWriter })` component, rendered as the third `AI_ANALYSIS_SUB_TABS` entry.

- [ ] **Step 1: Write the panel component**

Create `react-app/src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/BulkNoteWriterPanel.jsx`:

```jsx
import { useState } from 'react';
import primitives from './panelPrimitives.module.css';
import styles from './BulkNoteWriterPanel.module.css';

function findRowById(rows, rowId) {
  return (Array.isArray(rows) ? rows : []).find((row) => row.row_id === rowId) ?? null;
}

function BulkNoteMatchList({ matches, rows }) {
  return (
    <ul className={styles.matchList}>
      {matches.map((match) => {
        const row = findRowById(rows, match.rowId);

        return (
          <li key={match.rowId} className={styles.matchItem}>
            <div className={styles.matchHeader}>
              <strong>{row?.product_name || match.rowId}</strong>
              {row?.spec ? <span className={styles.matchSpec}>{row.spec}</span> : null}
            </div>
            <p className={styles.matchNoteDiff}>
              {row?.note ? <span className={styles.matchOldNote}>{row.note}</span> : null}
              {row?.note ? <span className={styles.matchArrow}> → </span> : null}
              <span className={styles.matchNewNote}>{match.note}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function BulkNoteWriterPanel({ bulkNoteWriter }) {
  const [instructionDraft, setInstructionDraft] = useState('');

  if (!bulkNoteWriter) {
    return null;
  }

  const {
    rows,
    isLoading,
    mode,
    matches,
    unmatchedReason,
    message,
    appliedCount,
    handlePreview,
    handleApply,
    handleClear,
  } = bulkNoteWriter;

  function handleSubmit() {
    const instruction = instructionDraft.trim();

    if (instruction === '') {
      return;
    }

    handlePreview(instruction);
  }

  return (
    <section className={`${primitives.panel} ${primitives.compactPanel} ${styles.panelBlock}`}>
      <div className={primitives.panelHeader}>
        <h4 id="bulk-note-writer-label" className={primitives.panelTitle}>
          📝 일괄비고작성
        </h4>
      </div>
      <p className={styles.desc}>
        조건과 작성할 비고 내용을 함께 말해주세요. 예: 소분류가 가축분퇴비인 상품에는 &apos;보조
        1500원&apos;이라는 비고 작성해줘
      </p>
      <div className={primitives.promptRow}>
        <textarea
          id="bulk-note-writer-instruction"
          aria-labelledby="bulk-note-writer-label"
          className={primitives.promptInput}
          value={instructionDraft}
          onChange={(event) => setInstructionDraft(event.target.value)}
          placeholder="예: 소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘"
          rows={1}
        />
        <button
          type="button"
          className={styles.previewButton}
          disabled={instructionDraft.trim() === '' || isLoading}
          onClick={handleSubmit}
        >
          매칭 미리보기
        </button>
      </div>

      {isLoading ? <p className={styles.status}>매칭 중...</p> : null}
      {!isLoading && mode === 'error' ? (
        <p className={styles.status}>{message || '일괄비고 작성에 실패했습니다.'}</p>
      ) : null}
      {!isLoading && mode === 'openai' && matches.length === 0 ? (
        <p className={styles.status}>{unmatchedReason || '조건에 맞는 상품을 찾지 못했습니다.'}</p>
      ) : null}
      {!isLoading && matches.length > 0 ? (
        <div className={styles.previewBlock}>
          <p className={styles.matchCount}>
            {matches.length}개 상품이 매칭되었습니다. 기존 비고를 새 내용으로 덮어씁니다.
          </p>
          <BulkNoteMatchList matches={matches} rows={rows} />
          <div className={styles.previewActions}>
            <button type="button" className={styles.applyButton} onClick={handleApply}>
              적용
            </button>
            <button type="button" className={styles.cancelButton} onClick={handleClear}>
              취소
            </button>
          </div>
        </div>
      ) : null}
      {!isLoading && appliedCount > 0 ? (
        <p className={styles.status}>{appliedCount}개 행에 비고를 적용했습니다.</p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Write the panel's CSS**

Create `react-app/src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/BulkNoteWriterPanel.module.css`:

```css
.panelBlock {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.desc {
  margin: 0;
  color: var(--corp-muted);
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.5;
}

.previewButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 18px;
  border-radius: var(--corp-radius);
  border: 1px solid rgba(29, 74, 46, 0.6);
  background: rgb(57, 57, 199);
  color: var(--corp-on-primary);
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--corp-transition);
}

.previewButton:hover:not(:disabled) {
  background: rgb(117, 117, 236);
}

.previewButton:focus-visible {
  outline: none;
  box-shadow: var(--corp-focus-ring);
}

.previewButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  margin: 0;
  color: var(--corp-muted);
  font-size: 0.72rem;
  line-height: 1.6;
}

.previewBlock {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 9px;
  border-radius: var(--corp-radius-sm);
  background: rgba(29, 74, 46, 0.05);
}

.matchCount {
  margin: 0;
  color: var(--corp-text);
  font-size: 0.74rem;
  font-weight: 700;
}

.matchList {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  max-height: 240px;
  overflow-y: auto;
}

.matchItem {
  padding: 6px 0;
  border-top: 1px solid var(--corp-line);
}

.matchItem:first-child {
  border-top: none;
  padding-top: 0;
}

.matchHeader {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 0.74rem;
  color: var(--corp-text);
}

.matchSpec {
  color: var(--corp-muted);
  font-size: 0.7rem;
}

.matchNoteDiff {
  margin: 2px 0 0;
  font-size: 0.7rem;
  line-height: 1.5;
}

.matchOldNote {
  color: var(--corp-muted);
  text-decoration: line-through;
}

.matchArrow {
  color: var(--corp-muted);
}

.matchNewNote {
  color: var(--corp-primary);
  font-weight: 700;
}

.previewActions {
  display: flex;
  gap: 6px;
}

.applyButton {
  padding: 6px 16px;
  border-radius: var(--corp-radius);
  border: 1px solid rgba(29, 74, 46, 0.6);
  background: var(--corp-primary);
  color: var(--corp-on-primary);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.cancelButton {
  padding: 6px 16px;
  border-radius: var(--corp-radius);
  border: 1px solid var(--corp-line);
  background: var(--corp-panel);
  color: var(--corp-muted);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}
```

- [ ] **Step 3: Wire the third sub-tab into `WorkbookAiRecommendationPanel.jsx`**

In `react-app/src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/WorkbookAiRecommendationPanel.jsx`, replace the full file with:

```jsx
import { useState } from 'react';
import { TabBar } from '../TabBar';
import { SimilarityAnalysisPanel } from './SimilarityAnalysisPanel';
import { NaturalLanguagePromptInput } from './NaturalLanguagePromptInput';
import { MarketResearchPanel } from './MarketResearchPanel';
import { BulkNoteWriterPanel } from './BulkNoteWriterPanel';
import styles from './WorkbookAiRecommendationPanel.module.css';

const AI_ANALYSIS_SUB_TABS = [
  { id: 'similarity', label: '유사상품분석' },
  { id: 'marketResearch', label: '시장조사' },
  { id: 'bulkNote', label: '일괄비고작성' },
];

export function WorkbookAiRecommendationPanel({
  onAiAnalyze,
  aiDisabled,
  hasRows,
  aiRecommendations = [],
  aiIsLoading = false,
  aiAnalysisMode = 'idle',
  aiAnalysisMessage = '',
  aiActiveRecommendationId = null,
  onAiRecommendationSelect,
  marketResearch,
  bulkNoteWriter,
}) {
  const [analysisHint, setAnalysisHint] = useState('');
  const [activeSubTabId, setActiveSubTabId] = useState('similarity');

  return (
    <div className={styles.aiSubTabs}>
      <h4 className={styles.sectionTitle}>AI 분석</h4>

      <TabBar
        tabs={AI_ANALYSIS_SUB_TABS}
        activeTabId={activeSubTabId}
        onTabChange={setActiveSubTabId}
      />

      {activeSubTabId === 'similarity' ? (
        <SimilarityAnalysisPanel
          analysisHint={analysisHint}
          onAnalysisHintChange={setAnalysisHint}
          onAiAnalyze={onAiAnalyze}
          aiDisabled={aiDisabled}
          hasRows={hasRows}
          aiIsLoading={aiIsLoading}
          aiRecommendations={aiRecommendations}
          aiAnalysisMode={aiAnalysisMode}
          aiAnalysisMessage={aiAnalysisMessage}
          aiActiveRecommendationId={aiActiveRecommendationId}
          onAiRecommendationSelect={onAiRecommendationSelect}
        />
      ) : null}

      {activeSubTabId === 'marketResearch' ? (
        <div className={styles.aiSubTabPanel}>
          <NaturalLanguagePromptInput marketResearch={marketResearch} />
          <MarketResearchPanel marketResearch={marketResearch} />
        </div>
      ) : null}

      {activeSubTabId === 'bulkNote' ? (
        <div className={styles.aiSubTabPanel}>
          <BulkNoteWriterPanel bulkNoteWriter={bulkNoteWriter} />
        </div>
      ) : null}
    </div>
  );
}
```

(This changes the previous `if/else` between two sub-tabs into three parallel `if` blocks — needed now that there are three mutually exclusive panels instead of two.)

- [ ] **Step 4: Thread `bulkNoteWriter` through `DataEditorSection.jsx`**

In `react-app/src/features/office-product-editor/components/DataEditorSection.jsx`, update the `useAiCtx()` destructure (currently lines 18-27):

```js
  const {
    recommendations: aiRecommendations,
    isLoading: aiIsLoading = false,
    analysisMode: aiAnalysisMode,
    analysisMessage: aiAnalysisMessage,
    activeRecommendationId: aiActiveRecommendationId,
    handleAnalyze: onAiAnalyze,
    handleRecommendationSelect: onAiRecommendationSelect,
    marketResearch,
    bulkNoteWriter,
  } = useAiCtx();
```

And add the prop to `<WorkbookAiRecommendationPanel />` (currently lines 44-55):

```jsx
            <WorkbookAiRecommendationPanel
              onAiAnalyze={onAiAnalyze}
              aiDisabled={false}
              hasRows={rows.length > 0}
              aiRecommendations={aiRecommendations}
              aiIsLoading={aiIsLoading}
              aiAnalysisMode={aiAnalysisMode}
              aiAnalysisMessage={aiAnalysisMessage}
              aiActiveRecommendationId={aiActiveRecommendationId}
              onAiRecommendationSelect={onAiRecommendationSelect}
              marketResearch={marketResearch}
              bulkNoteWriter={bulkNoteWriter}
            />
```

- [ ] **Step 5: Add tests to `WorkbookAiRecommendationPanel.test.jsx`**

Append these test cases to the end of `react-app/src/features/office-product-editor/__tests__/WorkbookAiRecommendationPanel.test.jsx`, inside the existing top-level `describe('WorkbookAiRecommendationPanel', ...)` block (add them right before its closing `});`). No new imports are needed — these tests only use `render`, `screen`, and `fireEvent`, all already imported at the top of the file.

```js
  it('switches to the 일괄비고작성 sub-tab and shows its instruction textarea', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [],
          isLoading: false,
          mode: 'idle',
          matches: [],
          unmatchedReason: null,
          message: '',
          appliedCount: 0,
          handlePreview: vi.fn(),
          handleApply: vi.fn(),
          handleClear: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '일괄비고작성' }));

    expect(screen.getByRole('tab', { name: '일괄비고작성' })).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByPlaceholderText("예: 소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘")
    ).toBeInTheDocument();
  });

  it('submits the typed instruction for bulk note preview', () => {
    const handlePreview = vi.fn();
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [],
          isLoading: false,
          mode: 'idle',
          matches: [],
          unmatchedReason: null,
          message: '',
          appliedCount: 0,
          handlePreview,
          handleApply: vi.fn(),
          handleClear: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '일괄비고작성' }));

    const textarea = screen.getByPlaceholderText(
      "예: 소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘"
    );
    fireEvent.change(textarea, {
      target: { value: "소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘" },
    });
    fireEvent.click(screen.getByRole('button', { name: '매칭 미리보기' }));

    expect(handlePreview).toHaveBeenCalledWith("소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘");
  });

  it('renders the match preview and calls updateNote once per match on 적용', () => {
    const handleApply = vi.fn();
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [
            { row_id: 'A100__01', product_name: '유기질비료', spec: '20kg', note: '기존 비고' },
            { row_id: 'B200__01', product_name: '축분퇴비', spec: '10kg', note: '' },
          ],
          isLoading: false,
          mode: 'openai',
          matches: [
            { rowId: 'A100__01', note: '보조 1500원' },
            { rowId: 'B200__01', note: '보조 1500원' },
          ],
          unmatchedReason: null,
          message: '',
          appliedCount: 0,
          handlePreview: vi.fn(),
          handleApply,
          handleClear: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '일괄비고작성' }));

    expect(screen.getByText('2개 상품이 매칭되었습니다. 기존 비고를 새 내용으로 덮어씁니다.')).toBeInTheDocument();
    expect(screen.getByText('유기질비료')).toBeInTheDocument();
    expect(screen.getByText('축분퇴비')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(handleApply).toHaveBeenCalledTimes(1);
  });

  it('shows the unmatched reason when the AI finds no matching rows', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [],
          isLoading: false,
          mode: 'openai',
          matches: [],
          unmatchedReason: '조건에 맞는 상품을 찾지 못했습니다.',
          message: '',
          appliedCount: 0,
          handlePreview: vi.fn(),
          handleApply: vi.fn(),
          handleClear: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '일괄비고작성' }));

    expect(screen.getByText('조건에 맞는 상품을 찾지 못했습니다.')).toBeInTheDocument();
  });

  it('disables the 매칭 미리보기 button while the instruction textarea is empty', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [],
          isLoading: false,
          mode: 'idle',
          matches: [],
          unmatchedReason: null,
          message: '',
          appliedCount: 0,
          handlePreview: vi.fn(),
          handleApply: vi.fn(),
          handleClear: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '일괄비고작성' }));

    expect(screen.getByRole('button', { name: '매칭 미리보기' })).toBeDisabled();
  });
```

- [ ] **Step 6: Run the full panel test file**

Run: `npx vitest run src/features/office-product-editor/__tests__/WorkbookAiRecommendationPanel.test.jsx`
Expected: the 5 new tests PASS. (Three pre-existing failures — `'renders the report as its own card...'`, `'renders the natural language prompt as a distinct labeled section...'`, `'renders the auto-analysis button inside its own labeled section...'` — were already failing before this task, due to a heading-text mismatch (`💬 자연어로 요청하기`/`⚙️ 자동 분석` vs the component's current `💬 요청사항 입력`/`⚙️ 요청사항 입력`) introduced by unrelated in-progress edits earlier in this session. This task does not need to fix them, but do not let this task's own changes add any *new* failures beyond that pre-existing set — confirm the failing-test count doesn't grow.)

- [ ] **Step 7: Run the broader suite as a final regression check**

Run: `npx vitest run src/features/office-product-editor src/features/storefront`
Expected: no failures beyond the pre-existing 3 (from Step 6) and any other failures already present before this plan started. If new failures appear, they must trace to a mistake in this task's edits — fix before committing.

- [ ] **Step 8: Commit**

```bash
git add react-app/src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/BulkNoteWriterPanel.jsx \
        react-app/src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/BulkNoteWriterPanel.module.css \
        react-app/src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/WorkbookAiRecommendationPanel.jsx \
        react-app/src/features/office-product-editor/components/DataEditorSection.jsx \
        react-app/src/features/office-product-editor/__tests__/WorkbookAiRecommendationPanel.test.jsx
git commit -m "feat(office-product-editor): add 일괄비고작성 sub-tab with preview-before-apply UI"
```

---

## Post-plan manual check

After all tasks land, before considering the feature done:

- [ ] Run the dev server, open a workbook with rows that have `small_category` values, switch to the 일괄비고작성 sub-tab, type an instruction matching the spec's example, click 매칭 미리보기, confirm the preview list shows the right products, click 적용, and confirm the note actually shows up in the main table's note column (proving it rode the real `updateNote`/annotation/sessionStorage path, not just the mocked test path).
- [ ] Confirm `git status` only shows the files this plan touched before committing the final task — this session has had commits accidentally sweep in unrelated staged files before; double check before every `git commit` in this plan.
