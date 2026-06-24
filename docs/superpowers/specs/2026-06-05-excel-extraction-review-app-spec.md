# Excel Extraction Review App Spec

## Purpose

This document defines the app-side behavior for review after extraction.

- Included: WARN badge behavior, preview flow, blocking tail-question UX, answer persistence, and extractor-to-UI contracts.
- Excluded: workbook parsing rules, header detection logic, merge precedence, and validation thresholds. Those live in the extraction skill.

## Primary goal

Let extraction continue automatically whenever results are safe enough, while making risky or ambiguous cases visible and reviewable before final apply.

## Screen flow

1. User uploads workbook.
2. Extractor returns normalized rows plus extraction metadata.
3. App branches on `status`.
4. `auto`: show preview immediately.
5. `warn`: show preview immediately with a warning badge and review actions.
6. `ask`: pause final apply and open one blocking question at a time.
7. After all blocking questions are answered, rerun normalization if needed and refresh preview.
8. User chooses `apply`, `edit`, or `re-extract`.

## Extractor-to-UI contract

The app consumes two payloads:

- normalized rows
- extraction report

Required report fields:

```json
{
  "status": "warn",
  "confidence": 0.88,
  "warning_count": 2,
  "ask_count": 1,
  "warnings": [],
  "questions": [],
  "overrides_suggested": []
}
```

## WARN experience

`warn` never blocks preview.

Top banner requirements:

- show total warning count
- state that auto-processing completed
- make review optional but obvious
- expose direct actions

Recommended banner copy pattern:

`주의 3건. 자동 처리 완료. 검토 권장`

Recommended actions:

- `경고만 보기`
- `전체 보기`
- `그대로 적용`

## WARN detail panel

Each warning item should show:

- issue type
- affected `product_code`
- field name
- selected value
- candidate values if present
- auto rule used
- confidence
- follow-up action

Example item:

```json
{
  "code": "MANUFACTURER_MULTI",
  "product_code": "2100031144112",
  "field": "manufacturer_display",
  "selected_value": "남해화학",
  "candidates": ["남해화학", "NH남해화학"],
  "rule": "first_value",
  "confidence": 0.86
}
```

## Preview table behavior

Preview should visually connect warnings to rows.

- rows with warnings get a visible marker
- auto-selected cells use a soft highlight
- hover or click reveals reason and selected rule
- filtering to `problem rows only` should be available

## Blocking tail-question UX

`ask` blocks final apply, not file upload itself.

Question rules:

- one question at a time
- fixed structure
- recommended answer shown first
- user can inspect evidence without leaving flow

Question template:

1. issue summary
2. recommended answer
3. candidate options
4. impact of each choice
5. confirm action

Example:

`상품코드 2100031144112 제조업체 후보 3개 발견. 추천값은 남해화학. 대표 표시값을 선택해 주세요.`

## Question answer persistence

User answers should be reusable on later uploads when safe.

Persist:

- header override decisions
- manufacturer display decisions
- category override decisions
- approved synonym additions

Each saved override should keep:

- workbook or source pattern
- canonical field
- selected value
- evidence snapshot
- save scope such as `this file only` or `reuse when pattern matches`

## State model

Suggested review states:

- `idle`
- `extracting`
- `preview_auto`
- `preview_warn`
- `blocking_question`
- `reconciling_answers`
- `ready_to_apply`
- `applied`

## Apply guardrails

Final apply is allowed when:

- no blocking questions remain
- normalized rows exist
- extractor report is internally consistent

Final apply is blocked when:

- `ask_count > 0`
- extractor returns missing core fields without user decision
- answer reconciliation fails

## Auditability

The app should keep a review trail for each run:

- upload timestamp
- extractor version or rule-set version
- warning list
- blocking questions shown
- answers chosen
- final apply timestamp

## Out of scope

Do not put these rules in the app spec:

- header scoring thresholds
- tax or zero-tax mapping logic
- merge precedence
- product code validation logic

Those belong to the extraction skill and its reference file.
