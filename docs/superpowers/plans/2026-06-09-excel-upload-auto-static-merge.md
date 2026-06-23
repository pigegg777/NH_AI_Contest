# Excel Upload Auto Static Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기본 카테고리(`비료`, `농약`) 선택 시 엑셀 업로드 뒤 정적 병합이 자동으로 이어지고, 추가 카테고리 등록에서는 병합이 비활성화되도록 만든다.

**Architecture:** 저장 카테고리 선택 상태는 `tableNameMode`에 유지한다. 추출 hook은 그대로 두고, 자동 병합 트리거만 작은 hook으로 분리한다. 리뷰 파이프라인은 `isStaticMergeEnabled` 플래그로 병합 결과 노출 여부만 제어한다.

**Tech Stack:** React hooks, Vitest, Testing Library, Vite

---

### Task 1: Define selection and auto-merge tests

**Files:**
- Modify: `react-app/src/features/excel-extract/__tests__/officeProductDataCatalogModel.test.js`
- Create: `react-app/src/features/excel-extract/__tests__/useWorkbookAutoStaticMerge.test.js`
- Modify: `react-app/src/features/excel-extract/__tests__/useWorkbookReviewPipeline.test.js`
- Modify: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

- [ ] **Step 1: Write failing model test for selectable default cards**

```js
expect(model.cards[0]).toEqual(
  expect.objectContaining({
    categoryName: '비료',
    isSelectable: true,
    selectionMode: 'fertilizer',
  }),
);
expect(model.cards[2]).toEqual(
  expect.objectContaining({
    categoryName: '종자',
    isSelectable: false,
    selectionMode: null,
  }),
);
```

- [ ] **Step 2: Write failing auto-merge hook tests**

```js
renderHook(() =>
  useWorkbookAutoStaticMerge({
    workbookFingerprint: 'workbook-a',
    hasResult: true,
    isStaticMergeEnabled: true,
    isMerged: false,
    isMerging: false,
    handleMerge,
  }),
);

expect(handleMerge).toHaveBeenCalledTimes(1);
```

- [ ] **Step 3: Write failing pipeline test for merge disable fallback**

```js
const { result, rerender } = renderHook(
  ({ isStaticMergeEnabled }) =>
    useWorkbookReviewPipeline(sampleRows, 'workbook-a', { isStaticMergeEnabled }),
  { initialProps: { isStaticMergeEnabled: true } },
);

await act(async () => {
  await result.current.handleMerge();
});

rerender({ isStaticMergeEnabled: false });

expect(result.current.mergedRows[0].img_url).toBeUndefined();
```

- [ ] **Step 4: Write failing page tests for preset selection and hidden merge button**

```jsx
await user.click(screen.getByRole('button', { name: /비료/i }));
await user.click(screen.getByRole('button', { name: '저장하기' }));

expect(saveOfficeProductData).toHaveBeenCalledWith(
  expect.objectContaining({ categoryName: '비료' }),
);

expect(screen.queryByRole('button', { name: '병합하기' })).not.toBeInTheDocument();
```

- [ ] **Step 5: Run focused tests to verify RED**

Run:
`npm run test:run -- src/features/excel-extract/__tests__/officeProductDataCatalogModel.test.js src/features/excel-extract/__tests__/useWorkbookAutoStaticMerge.test.js src/features/excel-extract/__tests__/useWorkbookReviewPipeline.test.js src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

Expected: FAIL with missing selection metadata, missing hook, old pipeline signature, or old page behavior.

### Task 2: Add selection metadata and auto-merge policy

**Files:**
- Modify: `react-app/src/features/excel-extract/model/save/index.js`
- Modify: `react-app/src/features/excel-extract/model/catalog/officeProductDataCatalogModel.js`

- [ ] **Step 1: Add table-mode helper functions**

```js
export function resolveTableNameModeFromCategoryName(categoryName) {
  return TABLE_NAME_MODE_BY_LABEL[toTrimmedString(categoryName)] ?? null;
}

export function isStaticMergeEnabledForTableNameMode(tableNameMode) {
  return tableNameMode === 'fertilizer' || tableNameMode === 'pesticide';
}
```

- [ ] **Step 2: Extend catalog cards with selectable metadata**

```js
return {
  categoryName,
  variant,
  isEmpty,
  isSelectable: variant === CATALOG_CARD_VARIANT.default,
  selectionMode:
    variant === CATALOG_CARD_VARIANT.default
      ? resolveTableNameModeFromCategoryName(categoryName)
      : null,
  ...
};
```

- [ ] **Step 3: Run focused model tests to verify GREEN**

Run:
`npm run test:run -- src/features/excel-extract/__tests__/officeProductDataCatalogModel.test.js`

Expected: PASS

### Task 3: Add isolated auto-merge hook

**Files:**
- Create: `react-app/src/features/excel-extract/hooks/useWorkbookAutoStaticMerge.js`
- Test: `react-app/src/features/excel-extract/__tests__/useWorkbookAutoStaticMerge.test.js`

- [ ] **Step 1: Implement minimal auto-merge effect**

```js
export function useWorkbookAutoStaticMerge({
  workbookFingerprint,
  hasResult,
  isStaticMergeEnabled,
  isMerged,
  isMerging,
  handleMerge,
}) {
  const attemptedFingerprintRef = useRef(null);

  useEffect(() => {
    if (!isStaticMergeEnabled) {
      attemptedFingerprintRef.current = null;
      return;
    }

    if (!workbookFingerprint || !hasResult || isMerged || isMerging) {
      return;
    }

    if (attemptedFingerprintRef.current === workbookFingerprint) {
      return;
    }

    attemptedFingerprintRef.current = workbookFingerprint;
    void handleMerge();
  }, [handleMerge, hasResult, isMerged, isMerging, isStaticMergeEnabled, workbookFingerprint]);
}
```

- [ ] **Step 2: Run focused hook test to verify GREEN**

Run:
`npm run test:run -- src/features/excel-extract/__tests__/useWorkbookAutoStaticMerge.test.js`

Expected: PASS

### Task 4: Teach the pipeline to hide merged rows when auto-merge is disabled

**Files:**
- Modify: `react-app/src/features/excel-extract/hooks/useWorkbookReviewPipeline.js`
- Test: `react-app/src/features/excel-extract/__tests__/useWorkbookReviewPipeline.test.js`

- [ ] **Step 1: Add options argument with default**

```js
export function useWorkbookReviewPipeline(
  extractedRows,
  workbookFingerprint,
  { isStaticMergeEnabled = false } = {},
) {
```

- [ ] **Step 2: Gate mergedRows and mergeStatusMessage by enable flag**

```js
const mergedRows = useMemo(() => {
  if (!isStaticMergeEnabled || !isMerged || !staticFertilizerLookup) {
    return annotatedRows;
  }

  return mergeRowsWithStaticFertilizer(annotatedRows, staticFertilizerLookup);
}, [annotatedRows, isMerged, isStaticMergeEnabled, staticFertilizerLookup]);

const mergeStatusMessage = isStaticMergeEnabled
  ? buildMergeStatusMessage(mergeSummary)
  : '';
```

- [ ] **Step 3: Run focused pipeline tests to verify GREEN**

Run:
`npm run test:run -- src/features/excel-extract/__tests__/useWorkbookReviewPipeline.test.js`

Expected: PASS

### Task 5: Wire the page to sidebar selection and remove the merge button

**Files:**
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.jsx`
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.module.css`
- Modify: `react-app/src/features/excel-extract/hooks/useWorkbookReviewSave.js`
- Test: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

- [ ] **Step 1: Expose the save mode from the save hook**

```js
return {
  tableNameMode,
  setTableNameMode,
  customTableName,
  setCustomTableName,
  resolvedCategoryName,
  ...
};
```

- [ ] **Step 2: Render default cards as selectable buttons**

```jsx
{card.isSelectable ? (
  <button
    type="button"
    className={[styles.catalogListItemButton, isSelected ? styles.catalogListItemActive : ''].join(' ')}
    onClick={() => setTableNameMode(card.selectionMode)}
  >
```

- [ ] **Step 3: Switch custom input back to custom mode on typing**

```jsx
onChange={(event) => {
  setTableNameMode('custom');
  setCustomTableName(event.target.value);
}}
```

- [ ] **Step 4: Use the new auto-merge hook and remove merge button**

```jsx
useWorkbookAutoStaticMerge({
  workbookFingerprint,
  hasResult: Boolean(result),
  isStaticMergeEnabled,
  isMerged,
  isMerging,
  handleMerge,
});
```

- [ ] **Step 5: Run focused page test to verify GREEN**

Run:
`npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

Expected: PASS

### Task 6: Full regression and build verification

**Files:**
- Verify only

- [ ] **Step 1: Run excel-extract test suite**

Run:
`npm run test:run -- src/features/excel-extract/__tests__`

Expected: PASS

- [ ] **Step 2: Run production build**

Run:
`npm run build`

Expected: build succeeds; existing chunk-size warning may remain
