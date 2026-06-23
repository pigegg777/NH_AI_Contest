# Excel Review Inline Add Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the custom table-name UI into an inline add panel under `+ 추가` so the user clearly understands the flow as `+ 추가 -> 이름 입력 -> 저장`.

**Architecture:** Keep `tableNameMode` and `customTableName` in the page component and render a lightweight inline panel inside the existing catalog sidebar card when `tableNameMode === 'custom'`. Avoid new hooks and keep save and auto-merge behavior unchanged so the UI refinement stays local to the page, styles, and tests.

**Tech Stack:** React, CSS modules, Vitest, Testing Library, Vite

---

### Task 1: Define the inline add panel behavior in tests

**Files:**
- Modify: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

- [ ] **Step 1: Add expectations for inline panel helper content**

```jsx
await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

expect(screen.getByText('새 테이블 이름')).toBeInTheDocument();
expect(
  screen.getByText('추가할 테이블 이름을 입력한 뒤 저장하세요'),
).toBeInTheDocument();
```

- [ ] **Step 2: Add focus expectation for the custom input**

```jsx
const input = screen.getByLabelText('테이블 이름');

expect(input).toHaveFocus();
```

- [ ] **Step 3: Add blank-state helper expectation**

```jsx
expect(screen.getByText('저장 전에 테이블 이름을 입력하세요')).toBeInTheDocument();
```

- [ ] **Step 4: Run focused page tests to verify RED**

Run:
`npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

Expected: FAIL because the current UI still renders the custom input in a separate sidebar card and does not show the inline helper title, guide text, or focus behavior.

### Task 2: Render the inline add panel in the catalog area

**Files:**
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.jsx`

- [ ] **Step 1: Add a ref for the custom input**

```jsx
const customTableNameInputRef = useRef(null);
```

- [ ] **Step 2: Focus the input when custom mode becomes active**

```jsx
useEffect(() => {
  if (tableNameMode === 'custom') {
    customTableNameInputRef.current?.focus();
  }
}, [tableNameMode]);
```

- [ ] **Step 3: Replace the separate save-setting card with an inline add panel**

```jsx
{tableNameMode === 'custom' ? (
  <div className={styles.catalogInlinePanel}>
    <div className={styles.catalogInlinePanelHeader}>
      <h3 className={styles.catalogInlinePanelTitle}>새 테이블 이름</h3>
      <p className={styles.catalogInlinePanelDescription}>
        추가할 테이블 이름을 입력한 뒤 저장하세요
      </p>
    </div>
    <label className={styles.catalogInlineField} htmlFor="sidebar-table-name-input">
      <span className={styles.catalogInlineLabel}>테이블 이름</span>
      <input
        ref={customTableNameInputRef}
        id="sidebar-table-name-input"
        ...
      />
    </label>
  </div>
) : null}
```

- [ ] **Step 4: Keep the empty helper visible only while the input is blank**

```jsx
{customTableName.trim() ? null : (
  <p className={styles.catalogInlineHint}>저장 전에 테이블 이름을 입력하세요</p>
)}
```

- [ ] **Step 5: Run focused page tests to verify GREEN**

Run:
`npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

Expected: PASS

### Task 3: Style the inline add panel as a child step of `+ 추가`

**Files:**
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.module.css`

- [ ] **Step 1: Add compact inline panel container styles**

```css
.catalogInlinePanel {
  margin-top: 8px;
  padding: 10px 10px 12px;
  border-radius: var(--corp-radius-sm);
  background: rgba(29, 74, 46, 0.05);
  box-shadow: inset 0 0 0 1px rgba(29, 74, 46, 0.12);
}
```

- [ ] **Step 2: Add title, description, and hint styles**

```css
.catalogInlinePanelTitle {
  margin: 0;
  color: var(--corp-text);
  font-size: 0.8rem;
  font-weight: 700;
}

.catalogInlinePanelDescription,
.catalogInlineHint {
  margin: 4px 0 0;
  color: var(--corp-muted);
  font-size: 0.74rem;
  line-height: 1.4;
}
```

- [ ] **Step 3: Add field spacing tuned for sidebar density**

```css
.catalogInlineField {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 10px;
}
```

- [ ] **Step 4: Run focused page tests again**

Run:
`npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

Expected: PASS

### Task 4: Regression and build verification

**Files:**
- Verify only

- [ ] **Step 1: Run the excel-extract test suite**

Run:
`npm run test:run -- src/features/excel-extract/__tests__`

Expected: PASS

- [ ] **Step 2: Run the production build**

Run:
`npm run build`

Expected: build succeeds
