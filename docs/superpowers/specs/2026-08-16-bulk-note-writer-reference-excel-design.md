# AI 일괄비고 작성 — 참고 엑셀 업로드 — Design

**Status:** Approved for planning
**Date:** 2026-08-16

## Problem

일괄비고작성(`BulkNoteWriterPanel`)은 현재 텍스트 instruction만으로 조건을 판단한다
(`"소분류가 가축분퇴비인 상품에는 '보조 1500원'이라는 비고 작성해줘"`). 하지만 조건 판단에 필요한 배경
지식(가격 시세표, 카탈로그 등)이 워크북 안에 없는 경우 — 예: "이 참고표 기준으로 시세보다 낮은 상품엔
할인비고 써줘" — instruction만으로는 AI가 조건을 판단할 근거가 없다.

이 기능은 사용자가 엑셀 파일 하나를 참고 컨텍스트(배경 지식)로 업로드하고, AI가 조건 판단 시 그 내용을
참고할 수 있게 한다.

## Placement

기존 `BulkNoteWriterPanel.jsx`(일괄비고작성 서브탭) 내부 확장. instruction 텍스트박스 위에 파일 업로드
행을 추가한다. 새 서브탭이나 새 최상위 탭은 만들지 않는다.

## Scope decision: 참고 자료, 매핑 테이블 아님

엑셀은 "상품명→비고" 매핑 테이블이 아니라 배경 지식(가격표, 카탈로그 등)이다. AI는 여전히 note 문구를
**instruction에 적힌 문구 그대로** 사용한다 — 엑셀 값을 조합해 새 문장을 짓지 않는다. 엑셀은 오직
"어떤 행이 조건에 맞는지" 판단하는 데만 쓰인다. 기존 스펙(2026-08-15)의 핵심 안전장치(verbatim note,
row_id 화이트리스트)를 그대로 유지하기 위한 결정.

## Data flow

1. 사용자가 파일 선택(`.xlsx`/`.xls`)을 하면 클라이언트에서 즉시 파싱한다 — 기존
   `services/workbookSheetReader.js`의 `readWorkbookSheet(file)`를 그대로 재사용(신규 파서 없음).
   - 확장자가 `.xlsx`/`.xls`가 아니면 파싱을 시도하지 않고 즉시 거부.
   - 파싱 실패(손상 파일 등) 시 거부.
   - `sheetRows.length`(헤더 포함)가 500행을 넘으면 거부 — 잘라서 받지 않고 전체 반려. 사용자가
     직접 파일을 줄여서 다시 올려야 한다.
   - 통과하면 `{ fileName, sheetName, rows }` 형태로 훅 상태에 저장한다.
2. 참고 엑셀 상태는 **미리보기(취소)나 적용과 독립적인 생명주기**를 가진다 — 서브탭을 이동하거나
   매칭을 여러 번 미리보기/적용해도 유지된다. 사용자가 명시적으로 제거하거나 새 파일을 선택해 교체할
   때까지 살아있는다. 하나의 참고 엑셀로 여러 instruction을 순차적으로 제출할 수 있다.
3. 사용자가 **매칭 미리보기**를 누르면, `analyzeBulkNoteMatches(rows, { officeCode, tableNameMode,
   instruction, referenceSheet })`가 참고 엑셀을 함께 `/api/bulk-note/analyze`로 전송한다.
   `referenceSheet`가 없으면 `null`을 보낸다 — 이 필드는 완전히 선택적이며, 없을 때의 동작은
   2026-08-15 스펙과 100% 동일하다.
4. 서버는 `referenceSheet.rows`도 500행으로 재차 캡(defense-in-depth, 클라 검증 우회 대비 — 에러
   없이 조용히 앞 500행만 사용, 기존 `rows.slice(0, MAX_WORKBOOK_AI_ROWS)` 패턴과 동일).
5. `buildBulkNoteRequestBody`가 OpenAI user 메시지에 `reference_sheet: { sheet_name, rows } | null`을
   포함시킨다. `rows`는 헤더 행을 포함한 2D 배열을 그대로 직렬화한다(열 구성이 자유형식이므로 스키마를
   강제하지 않는다).
6. `BULK_NOTE_WRITER_PROMPT`에 규칙을 추가한다: reference_sheet가 있으면 조건 판단(가격/등급 조회 등)
   에만 참고하고, note 문구는 여전히 instruction에 적힌 문구를 그대로 사용해야 한다는 것.
7. 응답 스키마, row_id 화이트리스트 교차검증, note 300자 cap, 미리보기→적용 흐름은 2026-08-15 스펙과
   변경 없음.

## Changed files

신규 파일 없음 — 기존 파일 확장만.

```
functions/api/bulk-note/analyze.js
  - REQUEST_BODY_ALLOWED_KEYS에 'referenceSheet' 추가
  - referenceSheet.rows 500행 서버측 cap(조용히 truncate)
  - buildBulkNoteRequestBody 호출에 referenceSheet 전달

src/features/office-product-editor/model/bulk-note/
  bulkNoteRequestBodyModel.js
    - BULK_NOTE_REFERENCE_SHEET_MAX_ROWS = 500 상수 추가(클라/서버 공용)
    - serializeReferenceSheetForBulkNoteReview(referenceSheet) 추가 — cap + 형태 정리
    - buildBulkNoteRequestBody가 referenceSheet 파라미터 받아 reference_sheet 필드로 직렬화(null 허용)
  bulkNoteWriterPrompt.js
    - reference_sheet 필드 설명 + "조건 판단에만 사용, note는 여전히 instruction 문구 그대로" 규칙 추가
  bulkNoteAnalysisModel.js
    - analyzeBulkNoteMatches가 referenceSheet 옵션을 받아 클라이언트로 전달

src/features/office-product-editor/services/bulk-note/
  bulkNoteClient.js
    - requestBulkNoteMatches가 referenceSheet를 요청 바디에 포함

src/features/office-product-editor/hooks/bulk-note/
  useBulkNoteWriterState.js
    - referenceSheet, referenceSheetError state 추가
    - handleUploadReferenceSheet(file), handleRemoveReferenceSheet() 추가
    - handlePreview가 referenceSheet를 analyzeBulkNoteMatches에 함께 전달
    - handleClear/handleApply는 referenceSheet를 건드리지 않음(독립 생명주기)

src/features/office-product-editor/components/data-edit-controls/workbook-ai-recommendation/bulk-note/
  BulkNoteWriterPanel.jsx (+ .module.css)
    - instruction 텍스트박스 위에 파일 업로드 행 추가
    - 미선택 시: "📎 참고 엑셀 업로드" 버튼(input[type=file] accept=".xlsx,.xls")
    - 선택 후: "📎 {fileName} · {sheetName} · {N}행" + "제거" 버튼
    - referenceSheetError 표시
```

## UI

`ExcelUploadPanel`(메인 워크북 업로드)처럼 드롭존을 만들지 않는다 — YAGNI. 컴팩트 패널에 맞춰
버튼형 파일 입력 + 파일명/시트명/행수 한 줄 표시 + 제거 버튼으로 충분하다.

`WorkbookAiRecommendationPanel.jsx`, `DataEditorSection.jsx`, `AiCtx` 배선은 이미 `bulkNoteWriter`
객체 전체를 그대로 넘기고 있어 변경이 필요 없다 — 훅이 새 필드/핸들러를 노출하면 패널이 그대로
구조분해해서 쓴다.

## Error handling

| 상황 | 처리 |
|---|---|
| 확장자가 `.xlsx`/`.xls` 아님 | 파싱 시도 없이 즉시 거부, "엑셀(.xlsx, .xls) 파일만 업로드할 수 있습니다." |
| 파일 손상/파싱 실패 | "엑셀 파일을 읽을 수 없습니다." |
| 500행 초과 | "참고 엑셀은 500행 이하만 지원합니다." — 반려, 기존 `referenceSheet`는 그대로 유지 |
| 서버: `referenceSheet.rows` 500행 초과 도착(클라 우회) | 조용히 앞 500행만 사용 |
| OpenAI 요청 실패 | 기존과 동일 — 502 + 한국어 에러 메시지. `referenceSheet`는 유지(재시도 시 재사용 가능) |
| `referenceSheet` 없이 미리보기 | 2026-08-15 스펙과 100% 동일한 동작(완전 하위 호환) |

## Safety

기존 안전장치 변경 없음:
- Row cap(`MAX_WORKBOOK_AI_ROWS`=500)은 워크북 rows에 그대로 적용.
- row_id 화이트리스트 교차검증 그대로.
- note 300자 cap 그대로.
- Preview-then-apply 그대로.

새 안전장치:
- 참고 엑셀 500행 cap — 클라이언트는 초과 시 업로드 자체를 거부(에러), 서버는 방어적으로 truncate.
- 참고 엑셀은 note 문구 생성에 관여하지 않는다(프롬프트 규칙) — verbatim note 원칙이 깨지지 않도록.

## Testing

- `bulkNoteRequestBodyModel.test.js` — `reference_sheet` 필드 포함/누락(null) 직렬화, 500행 cap
- `bulkNoteAnalysisModel.test.js` — `referenceSheet`가 client 호출까지 전달되는지
- `useBulkNoteWriterState.test.js` — 업로드 성공/실패(확장자·파싱·행수) 상태 전이, `handleClear`/
  `handleApply` 이후에도 `referenceSheet` 유지, 새 파일로 교체 시 이전 파일 대체
- `functions/api/bulk-note/__tests__/analyze.test.js` — `referenceSheet` 허용 키, 서버측 cap,
  OpenAI 요청 바디에 `reference_sheet` 포함 여부
- `BulkNoteWriterPanel` — 업로드/제거 버튼 인터랙션에 대한 가벼운 렌더/상호작용 케이스 추가
  (2026-08-15 스펙과 동일하게 전용 테스트 파일은 만들지 않음)

## Out of scope

- 엑셀 값을 조합한 note 문구 자동 생성(여전히 instruction 문구 verbatim만 사용).
- 참고 엑셀 다중 업로드(파일 1개만 지원, 새 파일 선택 시 기존 파일 완전 교체).
- 참고 엑셀의 서버측 영구 저장 — 매 요청마다 클라이언트가 파싱된 내용을 함께 전송하며, 별도
  persistence 경로는 추가하지 않는다.
- 참고 엑셀 내용에 대한 컬럼 스키마 검증 — 자유형식 그대로 AI에 전달한다.
