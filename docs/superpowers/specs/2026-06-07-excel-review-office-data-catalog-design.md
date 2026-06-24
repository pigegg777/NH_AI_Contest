# Excel Review Office Data Catalog Design

## Goal

Add a read-only registered-data catalog to the top of `react-app/src/features/excel-extract`.

The catalog should load rows from `office_product_datas` using the current user's `office_code` and render a simple summary list above the existing workbook upload and review flow.

This step is display-only. It must not add create, edit, delete, or row-body loading behavior yet.

## Scope

- Included
  - Fetch registered data summaries by `office_code`
  - Render a top catalog panel in the workbook review page
  - Always show default categories for `비료` and `농약`
  - Show additional registered categories returned from the database
  - Show a trailing `+ 추가` item as UI only
  - Show loading and error states for the catalog panel

- Excluded
  - Adding new categories
  - Editing registered data
  - Deleting registered data
  - Loading `product_data` row bodies into the current review table
  - Clicking catalog items to switch page state
  - Schema changes or new migrations

## Data Source

Existing table:

- `public.office_product_datas`

Read only the summary fields needed for the catalog UI:

- `id`
- `office_code`
- `office_name`
- `product_data_category_name`
- `row_count`
- `source_file_name`
- `updated_at`

Do not fetch `product_data` for this first step.

## Architecture

Recommended split:

### 1. Service seam

Add a read-only adapter to `officeProductDataService.js`.

Responsibilities:

- Validate `user.office_code`
- Query `office_product_datas`
- Filter with `.eq('office_code', officeCode)`
- Order by `updated_at` descending
- Normalize the returned summary rows into a stable client shape

Recommended return shape:

```js
{
  id,
  categoryName,
  rowCount,
  sourceFileName,
  updatedAt,
}
```

### 2. Hook seam

Add a new hook for page-level catalog state.

Recommended file:

- `react-app/src/features/excel-extract/hooks/workbook-review/useOfficeProductDataCatalog.js`

Responsibilities:

- Trigger loading when `user.office_code` becomes available
- Expose `items`, `isLoading`, and `errorMessage`
- Return an empty list when the user does not have an `office_code`
- Keep this independent from workbook extraction, merge, save, and AI flows

### 3. UI seam

Render a new top panel in `ExcelExtractWorkbookReviewPage.jsx`.

Placement:

- Directly under the hero section
- Above the existing upload/save panel

The panel renders:

1. `비료` card
2. `농약` card
3. Any additional registered categories returned from the database
4. A final `+ 추가` card

## Display Rules

### Default categories

`비료` and `농약` are always visible, even when no saved data exists.

If no matching row exists in the database:

- Show status as `미등록`
- Show no row count

If a matching row exists:

- Show status as `등록됨`
- Show `row_count`
- Show `source_file_name` when present
- Show a formatted `updated_at`

### Additional categories

Any category other than `비료` and `농약` should be appended after the two defaults.

These categories are shown only when they exist in the database.

### Add item

The final `+ 추가` item is a static placeholder for future work.

For now:

- Render it visually as a card/item
- Do not attach behavior
- Do not open inputs or dialogs

## UI Behaviour

- Catalog items are read-only in this phase
- Clicking a card should do nothing
- The current upload/review/save flow remains unchanged
- The existing table-name select remains in place for now

## Error Handling

If catalog loading fails:

- Show an inline error box inside the catalog panel
- Do not block the rest of the workbook review page

If there is no logged-in user or no `office_code`:

- Render the default catalog shell (`비료`, `농약`, `+ 추가`)
- Treat database-backed items as empty

## Testing

Add or extend tests for:

- Service query shape for `office_code` filtering
- Hook loading success and empty-user behavior
- Page rendering of:
  - default `비료`
  - default `농약`
  - extra registered category
  - trailing `+ 추가`
  - summary metadata for registered categories
  - error state rendering

## Verification

- `cd react-app && npm run test:run -- src/features/excel-extract/__tests__`
- `cd react-app && npm run build`
