# Excel Review AI Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엑셀 추출 검토 페이지에 AI 추천 패널과 관련 행 강조 기능을 추가한다.

**Architecture:** 분석 로직은 모델/서비스/훅으로 분리하고, 페이지는 버튼과 추천 패널만 조립한다. 추천 결과는 기존 warning과 분리된 `AIRecommendation` 스키마로 관리하며, 테이블 행 강조는 활성 추천의 `relatedRowIds`를 기반으로 렌더링 단계에서 계산한다. 구현은 `mock` fallback과 OpenAI `Responses API` 실제 호출을 함께 지원한다.

> Follow-up note: 현재 구현은 `react-app/src/features/excel-extract/services/workbookAiRecommendationService.js`에서 구조화 JSON 스키마 기반 OpenAI 호출과 규칙 기반 추천 병합을 수행한다.

**Tech Stack:** React 19, Vite, Vitest, Testing Library

---

### Task 1: AI Recommendation Model Test First

**Files:**
- Create: `react-app/src/features/excel-extract/__tests__/workbookAiRecommendations.test.js`
- Create: `react-app/src/features/excel-extract/model/workbook-review/aiRecommendations.js`

- [ ] **Step 1: Write the failing model tests**

```js
it('normalizes recommendation schema', () => {
  expect(createAiRecommendation({ id: 'r1', kind: 'zero-tax-higher-than-tax' }))
    .toEqual(expect.objectContaining({ severity: 'medium', relatedRowIds: [] }));
});

it('creates a recommendation when zero tax price exceeds tax price', () => {
  const recommendations = buildRuleBasedAiRecommendations([
    { row_id: 'A__01', product_code: 'A', product_name: 'Alpha', tax_price: 100, zero_tax_price: 120 },
  ]);

  expect(recommendations.some((item) => item.kind === 'zero-tax-higher-than-tax')).toBe(true);
});

it('groups likely same products with different product codes', () => {
  const recommendations = buildRuleBasedAiRecommendations([
    { row_id: 'A__01', product_code: 'A100', product_name: 'Alpha', nutrient: 'N-P-K', spec: '20kg', manufacturer_list: [{ manufacturer_name: 'NH', manufacturer_code: 'M1' }] },
    { row_id: 'B__01', product_code: 'B200', product_name: 'Alpha', nutrient: 'N-P-K', spec: '20kg', manufacturer_list: [{ manufacturer_name: 'NH', manufacturer_code: 'M1' }] },
  ]);

  expect(recommendations.some((item) => item.kind === 'same-product-different-code')).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/workbookAiRecommendations.test.js`
Expected: FAIL because `aiRecommendations.js` does not exist yet

- [ ] **Step 3: Write the minimal model implementation**

```js
export function createAiRecommendation(input) { /* normalize defaults */ }
export function buildRuleBasedAiRecommendations(rows) { /* two rules + same code mismatch */ }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/workbookAiRecommendations.test.js`
Expected: PASS

### Task 2: Mock Provider Service Test First

**Files:**
- Modify: `react-app/src/features/excel-extract/__tests__/workbookAiRecommendations.test.js`
- Create: `react-app/src/features/excel-extract/services/workbookAiRecommendationService.js`

- [ ] **Step 1: Write the failing service tests**

```js
it('returns mock mode when api key is empty', async () => {
  const result = await analyzeWorkbookAiRecommendations([], { openAiApiKey: '' });
  expect(result.mode).toBe('mock');
});

it('returns mock provider recommendations', async () => {
  const result = await analyzeWorkbookAiRecommendations(sampleRows, { openAiApiKey: '' });
  expect(Array.isArray(result.recommendations)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/workbookAiRecommendations.test.js`
Expected: FAIL because `workbookAiRecommendationService.js` does not exist yet

- [ ] **Step 3: Write the minimal service implementation**

```js
export async function analyzeWorkbookAiRecommendations(rows, config = {}) {
  return {
    mode: !config.openAiApiKey ? 'mock' : 'mock',
    recommendations: buildRuleBasedAiRecommendations(rows),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/workbookAiRecommendations.test.js`
Expected: PASS

### Task 3: Panel and Row Highlight Test First

**Files:**
- Create: `react-app/src/features/excel-extract/__tests__/workbookAiReviewPanel.test.jsx`
- Create: `react-app/src/features/excel-extract/components/AiRecommendationPanel.jsx`
- Create: `react-app/src/features/excel-extract/hooks/workbook-review/useWorkbookAiRecommendations.js`
- Modify: `react-app/src/features/excel-extract/components/ResultTableSection.jsx`
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.jsx`
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.module.css`

- [ ] **Step 1: Write the failing UI test**

```jsx
it('highlights related rows when a recommendation card is clicked', async () => {
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: /same product/i }));
  expect(screen.getByTestId('row-A100__01')).toHaveClass('rowHighlighted');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/workbookAiReviewPanel.test.jsx`
Expected: FAIL because panel and highlight props do not exist yet

- [ ] **Step 3: Write the minimal UI implementation**

```jsx
<button onClick={handleAnalyze}>AI 분석하기</button>
<AiRecommendationPanel ... />
<ResultTableSection highlightedRowIds={activeRowIds} ... />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/workbookAiReviewPanel.test.jsx`
Expected: PASS

### Task 4: Full Verification

**Files:**
- Modify: `react-app/.env.example`
- Test: `react-app/src/features/excel-extract/__tests__/workbookAiRecommendations.test.js`
- Test: `react-app/src/features/excel-extract/__tests__/workbookAiReviewPanel.test.jsx`

- [ ] **Step 1: Add placeholder env values**

```env
VITE_OPENAI_API_KEY=
VITE_OPENAI_MODEL=gpt-4.1-mini
```

- [ ] **Step 2: Run targeted tests**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/workbookAiRecommendations.test.js src/features/excel-extract/__tests__/workbookAiReviewPanel.test.jsx`
Expected: PASS

- [ ] **Step 3: Run build verification**

Run: `cd react-app && npm run build`
Expected: build succeeds with exit code 0
