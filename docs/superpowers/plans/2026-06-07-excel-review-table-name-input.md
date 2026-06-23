# Excel Review Table Name Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엑셀 검토 페이지 상단 패널에 테이블 이름 선택/직접입력 UI를 추가하고 페이지 로컬 state로만 유지한다.

**Architecture:** 상태는 `ExcelExtractWorkbookReviewPage` 내부 `useState`로 관리한다. 업로드 패널에 `select`를 추가하고 `기타`일 때만 조건부 `input`을 노출한다. 기존 업로드, 병합, AI 분석 흐름은 변경하지 않는다.

**Tech Stack:** React 19, Vite, Vitest, Testing Library

---

### Task 1: Page UI Test First

**Files:**
- Create: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.jsx`

- [ ] **Step 1: Write the failing page UI tests**

```jsx
it('shows the custom input only when custom is selected', async () => {
  render(<ExcelExtractWorkbookReviewPage />);

  const select = screen.getByLabelText('테이블 이름');
  expect(screen.queryByLabelText('직접 입력')).not.toBeInTheDocument();

  await user.selectOptions(select, 'custom');
  expect(screen.getByLabelText('직접 입력')).toBeInTheDocument();
});

it('preserves custom input text when switching away and back', async () => {
  render(<ExcelExtractWorkbookReviewPage />);

  const select = screen.getByLabelText('테이블 이름');
  await user.selectOptions(select, 'custom');
  await user.type(screen.getByLabelText('직접 입력'), '자재');
  await user.selectOptions(select, 'fertilizer');
  await user.selectOptions(select, 'custom');

  expect(screen.getByLabelText('직접 입력')).toHaveValue('자재');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`
Expected: FAIL because the page does not render the new table name controls yet

- [ ] **Step 3: Write the minimal page implementation**

```jsx
const [tableNameMode, setTableNameMode] = useState('');
const [customTableName, setCustomTableName] = useState('');

<label htmlFor="table-name-select">
  <span>테이블 이름</span>
  <select id="table-name-select" value={tableNameMode} onChange={...}>
    <option value="">선택하세요</option>
    <option value="fertilizer">비료</option>
    <option value="pesticide">농약</option>
    <option value="custom">기타</option>
  </select>
</label>

{tableNameMode === 'custom' ? (
  <label htmlFor="table-name-custom-input">
    <span>직접 입력</span>
    <input id="table-name-custom-input" value={customTableName} onChange={...} />
  </label>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`
Expected: PASS

### Task 2: Layout Styling

**Files:**
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.module.css`

- [ ] **Step 1: Add layout styles for the table name controls**

```css
.tableNameControls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 220px));
  gap: 10px;
  margin-top: 12px;
}
```

- [ ] **Step 2: Verify the page test still passes**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`
Expected: PASS

### Task 3: Full Verification

**Files:**
- Test: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`
- Build: `react-app`

- [ ] **Step 1: Run focused tests**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx src/features/excel-extract/__tests__/workbookAiReviewPanel.test.jsx src/features/excel-extract/__tests__/workbookAiRecommendations.test.js`
Expected: PASS

- [ ] **Step 2: Run build verification**

Run: `cd react-app && npm run build`
Expected: build succeeds with exit code 0
