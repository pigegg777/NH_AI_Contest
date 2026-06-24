# Excel Review Add Category Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `비료/농약`은 기본 클릭 선택으로 유지하고, 나머지 카테고리는 `+ 추가`를 눌렀을 때만 이름 입력 UI가 나타나도록 바꾼다.

**Architecture:** page가 `tableNameMode`와 `customTableName`을 계속 들고, `+ 추가`는 `custom` 선택 카드로 취급한다. 입력칸은 `custom`일 때만 렌더하고, 저장 hook과 auto-merge hook은 기존 계약을 유지한다.

**Tech Stack:** React hooks, Vitest, Testing Library, Vite

---

### Task 1: Define the new UX in tests

**Files:**
- Modify: `react-app/src/features/excel-extract/__tests__/officeProductDataCatalogModel.test.js`
- Modify: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

- [ ] **Step 1: Write failing catalog model expectation for selectable add card**

```js
expect(model.cards[3]).toEqual(
  expect.objectContaining({
    categoryName: '+ 추가',
    isSelectable: true,
    selectionMode: 'custom',
  }),
);
```

- [ ] **Step 2: Replace always-visible input tests with conditional-visibility tests**

```jsx
expect(screen.queryByLabelText('테이블 이름')).not.toBeInTheDocument();

await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

expect(screen.getByLabelText('테이블 이름')).toBeInTheDocument();
```

- [ ] **Step 3: Add preserve-and-restore test**

```jsx
await user.click(screen.getByRole('button', { name: /\+ 추가/i }));
await user.type(screen.getByLabelText('테이블 이름'), '자재');
await user.click(screen.getByRole('button', { name: /비료/i }));
expect(screen.queryByLabelText('테이블 이름')).not.toBeInTheDocument();
await user.click(screen.getByRole('button', { name: /\+ 추가/i }));
expect(screen.getByLabelText('테이블 이름')).toHaveValue('자재');
```

- [ ] **Step 4: Add disabled-save test for empty custom name**

```jsx
await user.click(screen.getByRole('button', { name: /\+ 추가/i }));
expect(screen.getByRole('button', { name: '저장하기' })).toBeDisabled();
```

- [ ] **Step 5: Run focused tests to verify RED**

Run:
`npm run test:run -- src/features/excel-extract/__tests__/officeProductDataCatalogModel.test.js src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

Expected: FAIL because add card is not selectable yet and the input is still always rendered.

### Task 2: Make `+ 추가` a selectable custom category

**Files:**
- Modify: `react-app/src/features/excel-extract/model/catalog/officeProductDataCatalogModel.js`

- [ ] **Step 1: Return selectable metadata from the add card**

```js
function createAddCard() {
  return {
    categoryName: '+ 추가',
    variant: CATALOG_CARD_VARIANT.add,
    isEmpty: false,
    isSelectable: true,
    selectionMode: 'custom',
    ...
  };
}
```

- [ ] **Step 2: Run focused model tests to verify GREEN**

Run:
`npm run test:run -- src/features/excel-extract/__tests__/officeProductDataCatalogModel.test.js`

Expected: PASS

### Task 3: Show the input only in custom mode

**Files:**
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.jsx`
- Modify: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

- [ ] **Step 1: Start with no category selected**

```js
const [tableNameMode, setTableNameMode] = useState('');
```

- [ ] **Step 2: Render the sidebar input conditionally**

```jsx
{tableNameMode === 'custom' ? (
  <div className={styles.sidebarCard}>
    ...
  </div>
) : null}
```

- [ ] **Step 3: Reuse the preserved custom value**

```jsx
onChange={(event) => {
  setTableNameMode('custom');
  setCustomTableName(event.target.value);
}}
```

- [ ] **Step 4: Keep default-card click and add-card click on the same selection path**

```jsx
<SidebarCatalogItem
  ...
  onSelect={setTableNameMode}
/>
```

- [ ] **Step 5: Run focused page tests to verify GREEN**

Run:
`npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

Expected: PASS

### Task 4: Full regression and build verification

**Files:**
- Verify only

- [ ] **Step 1: Run excel-extract test suite**

Run:
`npm run test:run -- src/features/excel-extract/__tests__`

Expected: PASS

- [ ] **Step 2: Run production build**

Run:
`npm run build`

Expected: build succeeds
