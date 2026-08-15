# AI 일괄비고 작성 (Bulk Note Writer) — Design

**Status:** Approved for planning
**Date:** 2026-08-15

## Problem

Users currently edit the `note`(비고) column one row at a time. They want to type a natural-language
instruction — e.g. `"소분류가 가축분퇴비인 상품에는 '보조 1500원'이라는 비고 작성해줘"` — and have AI find every
row matching the condition and write that literal note text into all of them at once.

This is the first AI feature in the app that writes back into row state (existing AI features —
duplicate-recommendation, market research — are read-only/display-only). Because a bad match could
silently overwrite existing notes across many rows, the feature must show what it's about to do before
doing it.

## Placement

Third sub-tab in the existing `AI_ANALYSIS_SUB_TABS` inside `WorkbookAiRecommendationPanel.jsx`, alongside
`유사상품분석` and `시장조사`: **`일괄비고작성`**. Same panel, same tab bar, no new top-level tab.

## Data flow

1. User types an instruction into a textarea (same 1-line/row-layout pattern as the other two sub-tabs)
   and clicks **매칭 미리보기**.
2. Client calls `analyzeBulkNoteMatches(mergedRows, { officeCode, tableNameMode, instruction })`, which:
   - Reuses the existing `serializeWorkbookRowsForAiReview(rows, tableNameMode)` (from
     `model/ai-recommendations/workbookAiRequestBodyModel.js`) to trim rows to AI-relevant fields
     (`row_id`, `product_name`, `spec`, category fields, prices, current `note`) and cap the count at the
     existing `MAX_WORKBOOK_AI_ROWS` (500) — no new serializer needed.
   - POSTs to `/api/bulk-note/analyze` with `{ officeCode, tableNameMode, instruction, rows }`.
3. The function calls OpenAI with a prompt instructing it to: read the rows, interpret the instruction as
   a condition + a literal note phrase, and return every matching row's `row_id` paired with that note
   text verbatim (no paraphrasing). If the instruction is ambiguous or nothing matches, return an empty
   `matches` array and a Korean `unmatched_reason`.
4. Response is normalized and **cross-checked against the row_ids that were actually sent** — any
   `row_id` OpenAI returns that wasn't in the request is dropped. This is the key safety check: it bounds
   the AI to rows it was actually shown.
5. UI renders a preview list: for each match, look up the row in `mergedRows` by `row_id` and show
   product name/spec, current note → new note. Shows a count and, if empty, the `unmatched_reason`.
6. User clicks **적용**. For each previewed match, the client calls the *existing*
   `tableState.updateNote(rowId, note)` (from `useAnnotations`, already exposed through
   `useWorkbookReviewTableState`) — the same function manual note edits already use. This rides the
   existing annotation → sessionStorage → save pipeline with zero new persistence code. Existing notes
   are **overwritten** (confirmed behavior, not appended).
7. Preview state clears after apply; a brief "N개 행에 비고를 적용했습니다" confirmation shows.

No new persistence path, no new save-payload changes — the only new state is the ephemeral
preview-before-apply list, which does not need to survive a tab switch or reload (unlike market research's
report, which is intentionally persisted). It resets to idle whenever the sub-tab unmounts/remounts or a
new instruction is submitted.

## New files

Mirrors the existing `market-research` and `ai-recommendations` feature layout:

```
functions/api/bulk-note/analyze.js                              (+ __tests__/analyze.test.js)
src/features/office-product-editor/model/bulk-note/
  bulkNoteWriterPrompt.js
  bulkNoteRequestBodyModel.js        (schema + request body, mirrors marketResearchRequestBodyModel.js)
  bulkNoteMatchModel.js              (normalizes AI response, drops unknown row_ids)
  bulkNoteAnalysisModel.js           (client orchestration, mirrors workbookAiAnalysisModel.js)
src/features/office-product-editor/services/bulk-note/
  bulkNoteClient.js                  (fetch wrapper, mirrors marketResearchClient.js)
src/features/office-product-editor/hooks/bulk-note/
  useBulkNoteWriterState.js          (isLoading/mode/matches/unmatchedReason + handlePreview/handleApply/handleClear)
src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/
  BulkNoteWriterPanel.jsx            (new sub-tab UI, own .module.css)
```

## Request/response shape

Request body (server-built, mirrors `buildMarketResearchRequestBody`):
```
{
  model, input: [
    { role: 'system', content: <prompt> },
    { role: 'user', content: JSON.stringify({
        table_name_mode, instruction,
        rows: serializeWorkbookRowsForAiReview(rows, tableNameMode),
      }) },
  ],
  text: { format: { type: 'json_schema', strict: true, schema: BULK_NOTE_SCHEMA } },
}
```

Output schema:
```js
{
  matches: [{ row_id: string, note: string }],   // note: literal text, capped at 300 chars server-side
  unmatched_reason: string | null,
}
```

## Safety

- Row cap: `MAX_WORKBOOK_AI_ROWS` (500), enforced client-side (before request) and server-side (defense in
  depth), reusing the existing constant.
- Row-id allowlist: any match whose `row_id` isn't among the rows actually sent is dropped before it ever
  reaches the preview list.
- Note length cap (300 chars) applied server-side to each match's `note`.
- Preview-then-apply: nothing touches `annotations` state until the user clicks 적용.
- Overwrite semantics are explicit in the UI copy ("기존 비고를 새 내용으로 덮어씁니다") so the user isn't
  surprised.

## Error handling

Same pattern as the other two AI sub-features: OpenAI failure → 502 + Korean error message rendered in
the panel; empty/ambiguous match → `unmatched_reason` shown, not treated as an error; loading state
disables the preview button.

## Testing

- `bulkNoteRequestBodyModel.test.js` — request shape, schema fields.
- `bulkNoteMatchModel.test.js` — normalization, and explicitly a case where the AI returns a `row_id` not
  present in the sent rows (must be dropped).
- `bulkNoteAnalysisModel.test.js` — idle/unavailable/error/success paths (mirrors
  `marketResearchAnalysisModel.test.js`).
- `useBulkNoteWriterState.test.js` — preview → apply → clear state transitions, request-id race handling
  on rapid re-submits (mirrors `useWorkbookAiRecommendationState`'s `activeRequestIdRef` pattern).
- `functions/api/bulk-note/__tests__/analyze.test.js` — auth/ownership/validation/502/success (mirrors
  `functions/api/market-research/__tests__/analyze.test.js`).
- `BulkNoteWriterPanel.jsx` — no dedicated test file planned; covered indirectly through
  `WorkbookAiRecommendationPanel.test.jsx` sub-tab switching, plus a few of its own render/interaction
  cases (preview render, apply calls `updateNote` per match, disabled states).

## Out of scope

- Per-row varying note *generation* beyond what the instruction literally specifies (the AI extracts and
  echoes the literal phrase; it does not compose new prose per row).
- Undo after apply — reverting relies on the existing manual note-edit UI, same as any other annotation
  change.
- Cross-table-mode matching — only the currently active table's rows are sent, same scope as the other
  two AI sub-features.
