# Excel Upload Merge Save Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the upload -> static merge -> save flow easier to read by renaming unclear modules/functions and moving save rules behind the existing save seam without changing layout placement.

**Architecture:** Keep `ExcelExtractWorkbookReviewPage` as the page composition module. Refine the existing `excel-extract` seams by renaming broad modules to clearer names and centralizing save-category / merge-eligibility / save-payload rules in the feature's save model. Do not add a new workflow layer.

**Tech Stack:** React, Vitest, Testing Library, Vite

---

### Task 1: Rename the static merge and review table state seams

**Files:**
- Modify: `react-app/src/features/excel-extract/hooks/useWorkbookReviewPipeline.js`
- Modify: `react-app/src/features/excel-extract/hooks/useWorkbookAutoStaticMerge.js`
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.jsx`
- Test: `react-app/src/features/excel-extract/__tests__/useWorkbookReviewPipeline.test.js`
- Test: `react-app/src/features/excel-extract/__tests__/useWorkbookAutoStaticMerge.test.js`

- [ ] **Step 1: Write the failing rename-focused tests**

Add or update tests so they import the new seam names:
- `useWorkbookReviewTableState`
- `useWorkbookStaticMergeTrigger`
- `handleStaticDataMerge`

- [ ] **Step 2: Run focused tests to verify RED**

Run:

```bash
cd react-app && npm run test:run -- src/features/excel-extract/__tests__/useWorkbookReviewPipeline.test.js src/features/excel-extract/__tests__/useWorkbookAutoStaticMerge.test.js
```

Expected: FAIL because the renamed exports do not exist yet.

- [ ] **Step 3: Implement the minimal rename**

Rename the hook exports and internal handler names while preserving behavior:
- `useWorkbookReviewPipeline` -> `useWorkbookReviewTableState`
- `useWorkbookAutoStaticMerge` -> `useWorkbookStaticMergeTrigger`
- `handleMerge` -> `handleStaticDataMerge`

- [ ] **Step 4: Run focused tests to verify GREEN**

Run:

```bash
cd react-app && npm run test:run -- src/features/excel-extract/__tests__/useWorkbookReviewPipeline.test.js src/features/excel-extract/__tests__/useWorkbookAutoStaticMerge.test.js
```

Expected: PASS

### Task 2: Deepen the save seam with clearer names and shared save rules

**Files:**
- Modify: `react-app/src/features/excel-extract/hooks/useWorkbookReviewSave.js`
- Modify: `react-app/src/features/excel-extract/model/save/index.js`
- Modify: `react-app/src/features/excel-extract/services/officeProductDataService.js`
- Test: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`
- Test: `react-app/src/features/excel-extract/__tests__/officeProductDataService.test.js`

- [ ] **Step 1: Write the failing save-rule tests**

Cover the new names and centralized save behavior:
- `useWorkbookSave`
- `resolveSaveCategoryName`
- `shouldUseStaticDataMerge`
- save path still uses the resolved category name for preset and custom categories

- [ ] **Step 2: Run focused tests to verify RED**

Run:

```bash
cd react-app && npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx src/features/excel-extract/__tests__/officeProductDataService.test.js
```

Expected: FAIL because the renamed exports and shared save rules do not exist yet.

- [ ] **Step 3: Implement the minimal save refactor**

Refactor without adding a new workflow layer:
- `useWorkbookReviewSave` -> `useWorkbookSave`
- `resolveTableCategoryName` -> `resolveSaveCategoryName`
- `isStaticMergeEnabledForTableNameMode` -> `shouldUseStaticDataMerge`
- keep save validation and payload shaping behind the save seam

- [ ] **Step 4: Run focused tests to verify GREEN**

Run:

```bash
cd react-app && npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx src/features/excel-extract/__tests__/officeProductDataService.test.js
```

Expected: PASS

### Task 3: Update page wiring and run targeted regression checks

**Files:**
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.jsx`
- Modify: related import sites in `react-app/src/features/excel-extract/components/` and `react-app/src/App.jsx` only if required by renamed exports
- Test: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`
- Test: `react-app/src/features/excel-extract/__tests__/useWorkbookReviewPipeline.test.js`
- Test: `react-app/src/features/excel-extract/__tests__/useWorkbookAutoStaticMerge.test.js`

- [ ] **Step 1: Re-run the page-level regression suite**

Run:

```bash
cd react-app && npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx src/features/excel-extract/__tests__/useWorkbookReviewPipeline.test.js src/features/excel-extract/__tests__/useWorkbookAutoStaticMerge.test.js
```

Expected: PASS

- [ ] **Step 2: Run the feature build verification**

Run:

```bash
cd react-app && npm run build
```

Expected: PASS
