# Excel Workbook Review Annotations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엑셀 리뷰 화면에 `shadow` 체크와 `note` 입력을 추가하고, 필터/정렬/세션 변화 중에도 annotation 상태가 유지되도록 만든다.

**Architecture:** 추출 결과는 그대로 유지하고, `row_id` 기반 annotation layer를 별도 hook으로 관리한다. extractor는 안정적인 `row_id`를 반환하고, review hook은 `shadow`/`note`를 `sessionStorage`와 동기화하며, 테이블은 merged final row를 렌더한다.

**Tech Stack:** React, Vite, Vitest, Testing Library, `xlsx`

---

### Task 1: Extractor Row Identity

**Files:**
- Modify: `react-app/src/features/excel-extract/services/salesPriceWorkbook/rowAggregation.js`
- Modify: `react-app/src/features/excel-extract/services/salesPriceWorkbookExtractor.js`
- Test: `react-app/src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js`

- [ ] **Step 1: `row_id` 기대 failing test 추가**

`aggregateRows` 결과 각 row가 `row_id`를 포함하고, 같은 `product_code + sale_price_type_code` 조합이면 안정적으로 재사용되는지 검증한다.

- [ ] **Step 2: 테스트 실행으로 RED 확인**

Run: `npm run test:run -- src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js`

Expected: `row_id` 누락 assertion fail

- [ ] **Step 3: 최소 구현으로 `row_id` 추가**

집계 키와 동일한 규칙으로 `row_id`를 aggregate result에 넣는다.

- [ ] **Step 4: extractor test 재실행으로 GREEN 확인**

Run: `npm run test:run -- src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js`

Expected: PASS

### Task 2: Annotation Model and Session Persistence

**Files:**
- Create: `react-app/src/features/excel-extract/model/workbook-review/annotations.js`
- Create: `react-app/src/features/excel-extract/hooks/workbook-review/useWorkbookReviewAnnotations.js`
- Test: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewAnnotations.test.js`

- [ ] **Step 1: annotation model failing tests 추가**

검증 대상:
- 기본 annotation 값 생성
- `shadow` toggle
- `note` update
- final row merge
- workbook fingerprint key 생성

- [ ] **Step 2: hook failing tests 추가**

검증 대상:
- 초기 annotation 복원
- annotation 변경 시 `sessionStorage` 저장
- 새 workbook fingerprint에서는 기존 annotation 분리

- [ ] **Step 3: 테스트 실행으로 RED 확인**

Run: `npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewAnnotations.test.js`

Expected: module not found 또는 assertion fail

- [ ] **Step 4: annotation model 최소 구현**

`row_id` 기반 map, 기본값, merge helper, fingerprint helper를 구현한다.

- [ ] **Step 5: annotation hook 최소 구현**

`sessionStorage` 복원/저장, `toggleShadow`, `updateNote`, `clearAnnotations`, `finalRows` 계산을 구현한다.

- [ ] **Step 6: annotation tests 재실행으로 GREEN 확인**

Run: `npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewAnnotations.test.js`

Expected: PASS

### Task 3: Workbook Review Page Integration

**Files:**
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.jsx`
- Modify: `react-app/src/features/excel-extract/hooks/workbook-review/useWorkbookExtraction.js`
- Modify: `react-app/src/features/excel-extract/hooks/workbook-review/useWorkbookTableModel.js`
- Modify: `react-app/src/features/excel-extract/components/ResultTableSection.jsx`
- Modify: `react-app/src/features/excel-extract/model/workbook-review/constants.js`
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.module.css`

- [ ] **Step 1: table model failing test 추가**

검증 대상:
- annotation merge 후 filtered/sorted row에서 `shadow`, `note` 유지
- `note`는 검색 대상에 포함되지 않음

- [ ] **Step 2: UI behavior failing test 추가**

검증 대상:
- 첫 열 checkbox로 `shadow` toggle
- note cell 클릭 시 input 표시
- 입력 후 blur 저장
- 필터 변경 후 state 유지

- [ ] **Step 3: 테스트 실행으로 RED 확인**

Run: `npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewTableModel.test.js src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

Expected: missing props / missing UI / assertion fail

- [ ] **Step 4: page에 annotation hook 연결**

추출 결과 row를 annotation hook에 넘기고, merged final row를 table model input으로 사용한다.

- [ ] **Step 5: table component 확장**

첫 열 checkbox, 마지막 `비고` 열, 셀 클릭 편집 모드, 저장/취소 동작을 구현한다. `shadow` 일반 컬럼은 렌더하지 않는다.

- [ ] **Step 6: CSS 최소 보강**

checkbox 열, note cell 편집 input, active editing state만 스타일링한다.

- [ ] **Step 7: UI tests 재실행으로 GREEN 확인**

Run: `npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewTableModel.test.js src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

Expected: PASS

### Task 4: Full Verification

**Files:**
- Test: `react-app/src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js`
- Test: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewAnnotations.test.js`
- Test: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewTableModel.test.js`
- Test: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

- [ ] **Step 1: feature test suite 실행**

Run: `npm run test:run -- src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js src/features/excel-extract/__tests__/excelExtractWorkbookReviewAnnotations.test.js src/features/excel-extract/__tests__/excelExtractWorkbookReviewTableModel.test.js src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

Expected: PASS

- [ ] **Step 2: 전체 build 검증**

Run: `npm run build`

Expected: build success

- [ ] **Step 3: 필요 시 App-level smoke test 실행**

Run: `npm run test:run`

Expected: project tests remain green or unrelated existing failure only
