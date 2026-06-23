# Excel Sales Price Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `react-app` 안에 판매단가 엑셀 파일을 읽고 정규화된 결과 행 배열을 반환하는 순수 추출기를 추가한다.

**Architecture:** React 컴포넌트와 분리된 순수 `xlsx` 기반 파서를 `features/excel-extract` 아래에 만든다. 헤더/범위 탐지, 컬럼 매핑, 정규화, `product_code + sale_price_type` 집계를 한 서비스에서 시작하고, 테스트로 실제 엑셀 fixture를 검증한다.

**Tech Stack:** React app, Vite, Vitest, `xlsx`

---

### Task 1: 추출기 테스트 골격 추가

**Files:**
- Create: `react-app/src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js`
- Test: `react-app/src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

실제 fixture와 mock sheet 양쪽을 검증하는 테스트를 추가한다.

- [ ] **Step 2: 테스트가 올바르게 실패하는지 실행**

Run: `npm run test:run -- src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js`

Expected: 추출기 모듈이 없거나 함수가 미구현이라 FAIL

### Task 2: 추출기 최소 구현

**Files:**
- Create: `react-app/src/features/excel-extract/services/salesPriceWorkbookExtractor.js`
- Modify: `react-app/src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js`

- [ ] **Step 1: workbook 입력 정규화 구현**

`File | ArrayBuffer | Uint8Array`를 받아 `xlsx.read`로 workbook을 만들 수 있게 한다.

- [ ] **Step 2: 헤더 행/데이터 범위 탐지 구현**

상단 30행 검사, 대표 헤더 점수화, 후행 빈 행 종료 규칙을 구현한다.

- [ ] **Step 3: 컬럼 매핑과 원본 행 정규화 구현**

대표 헤더를 canonical 필드에 연결하고 숫자/문자열 정규화를 구현한다.

- [ ] **Step 4: 집계 규칙 구현**

`product_code + sale_price_type` 키로 묶고 `tax_price`, `zero_tax_price`, `manufacturer_list`, `warnings`를 채운다.

- [ ] **Step 5: 테스트 재실행**

Run: `npm run test:run -- src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js`

Expected: PASS

### Task 3: 회귀 검증

**Files:**
- Test: `react-app/src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js`
- Test: `react-app/src/App.test.jsx`

- [ ] **Step 1: 추출기 테스트 재확인**

Run: `npm run test:run -- src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js`

Expected: PASS

- [ ] **Step 2: 전체 React app 테스트 실행**

Run: `npm run test:run`

Expected: PASS
