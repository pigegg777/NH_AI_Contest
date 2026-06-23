# Excel Review Office Data Catalog Plan

## Goal

Add a read-only "registered data" catalog to the top of the Excel workbook review page in `react-app/src/features/excel-extract`, loading summary rows from `office_product_datas` by `office_code` and rendering them in the current page structure.

## Constraints

- Keep the existing `excel-extract` folder structure and visual language.
- Do not implement add/edit behavior yet.
- Always show default categories `비료` and `농약`.
- Show additional categories only when they already exist in saved office data.
- Keep save/upload/review behavior unchanged.
- Follow lightweight React patterns: small focused hooks/components, stable derived state, no unnecessary effects or memoization.

## Implementation Steps

### 1. Add catalog data access

Update `react-app/src/features/excel-extract/services/officeProductDataService.js` with a read-only fetch function that:

- accepts `officeCode`
- validates trimmed input
- selects only summary fields
- orders rows by `updated_at desc`
- returns normalized item objects for the UI layer

Add service tests in `react-app/src/features/excel-extract/__tests__/officeProductDataService.test.js` first, then implement until green.

### 2. Add a focused catalog hook

Create `react-app/src/features/excel-extract/hooks/workbook-review/useOfficeProductDataCatalog.js` that:

- derives `officeCode` from `user`
- skips fetching when the office code is missing
- exposes `{ items, isLoading, errorMessage }`
- guards against stale async updates during re-renders/unmount

Add a hook test that covers:

- no office code -> no fetch
- office code present -> fetch result exposed
- service failure -> error state exposed

### 3. Add the read-only catalog UI

Create a small presentational component inside the feature, then integrate it near the top of `ExcelExtractWorkbookReviewPage`.

Rendering rules:

- card order is `비료`, `농약`, dynamic categories, `+ 추가`
- default cards render even when data is missing
- missing default cards show `미등록`
- registered cards show row count, source file, and update time
- `+ 추가` is display-only and non-interactive
- show compact loading and error states inside the panel

Add page-level rendering tests before implementation to confirm:

- default cards always render
- extra registered categories render
- add card renders
- loading/error text renders when returned by the hook

### 4. Verify and refine

Run targeted tests first, then the relevant feature suite and build:

```bash
npm run test:run -- src/features/excel-extract/__tests__/officeProductDataService.test.js src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx src/features/excel-extract/__tests__/useOfficeProductDataCatalog.test.js
npm run build
```

If the UI wiring introduces broader regressions, expand to the full `excel-extract` test suite before closing.

## Execution Mode

Proceed inline in this session: tests first, then implementation, then verification.
