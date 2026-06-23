# Excel Review Save Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엑셀 검토 페이지에 저장 버튼을 추가하고 현재 검토 rows를 Supabase `office_product_datas` 테이블에 upsert 저장한다.

**Architecture:** 저장 로직은 전용 service로 분리하고, 페이지는 버튼/상태/UI만 관리한다. 로그인 user의 `office_code`, `office_name`, `id`를 payload에 포함하며 저장 대상은 필터링 전 전체 `mergedRows`다.

**Tech Stack:** React 19, Vite, Supabase JS, Vitest, Testing Library

---

### Task 1: Save Service Test First

**Files:**
- Create: `react-app/src/features/excel-extract/__tests__/officeProductDataService.test.js`
- Create: `react-app/src/features/excel-extract/services/officeProductDataService.js`

- [ ] **Step 1: Write the failing service test**

```js
it('upserts office product data with office_code and category name', async () => {
  await saveOfficeProductData({
    user: { id: 7, office_code: 'OFF-1', office_name: '본점' },
    rows: [{ row_id: 'A100__01', product_code: 'A100' }],
    categoryName: '농약',
    sourceFileName: 'demo.xlsx',
  });

  expect(upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      office_code: 'OFF-1',
      product_data_category_name: '농약',
      row_count: 1,
    }),
    expect.objectContaining({ onConflict: 'office_code,product_data_category_name' }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/officeProductDataService.test.js`
Expected: FAIL because `officeProductDataService.js` does not exist yet

- [ ] **Step 3: Write the minimal service implementation**

```js
export async function saveOfficeProductData({ user, rows, categoryName, sourceFileName }) {
  return supabase
    .from('office_product_datas')
    .upsert(
      {
        office_code: user.office_code,
        office_name: user.office_name,
        product_data_category_name: categoryName,
        product_data: rows,
        row_count: rows.length,
        source_file_name: sourceFileName,
        updated_who: user.id,
      },
      { onConflict: 'office_code,product_data_category_name' },
    )
    .select('id, updated_at, row_count')
    .single();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/officeProductDataService.test.js`
Expected: PASS

### Task 2: Page Save UI Test First

**Files:**
- Modify: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`
- Modify: `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.jsx`

- [ ] **Step 1: Write the failing page save test**

```jsx
it('saves with custom category name', async () => {
  render(<ExcelExtractWorkbookReviewPage user={{ id: 7, office_code: 'OFF-1', office_name: '본점' }} />);

  await user.selectOptions(screen.getByLabelText('테이블 이름'), 'custom');
  await user.type(screen.getByLabelText('직접 입력'), '자재');
  await user.click(screen.getByRole('button', { name: '저장하기' }));

  expect(saveOfficeProductData).toHaveBeenCalledWith(
    expect.objectContaining({ categoryName: '자재' }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`
Expected: FAIL because save UI and handler do not exist yet

- [ ] **Step 3: Write the minimal page implementation**

```jsx
const canSave = Boolean(user?.id && user?.office_code && resolvedTableName && mergedRows.length > 0);

<button onClick={handleSave} disabled={!canSave || isSaving}>저장하기</button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`
Expected: PASS

### Task 3: Schema Files

**Files:**
- Modify: `react-app/supabase_setup.sql`
- Create: `react-app/supabase/migrations/20260607_create_office_product_datas.sql`

- [ ] **Step 1: Add `office_product_datas` table DDL**

```sql
create table if not exists public.office_product_datas (
  id bigint generated always as identity primary key,
  office_code text not null,
  office_name text not null,
  product_data_category_name text not null,
  product_data jsonb not null default '[]'::jsonb,
  row_count integer not null default 0,
  source_file_name text,
  updated_who bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (office_code, product_data_category_name)
);
```

- [ ] **Step 2: Add demo grants and RLS policies**

```sql
alter table public.office_product_datas enable row level security;
grant select, insert, update on public.office_product_datas to anon, authenticated;
create policy "office_product_datas_select_demo" on public.office_product_datas for select to anon, authenticated using (true);
create policy "office_product_datas_insert_demo" on public.office_product_datas for insert to anon, authenticated with check (true);
create policy "office_product_datas_update_demo" on public.office_product_datas for update to anon, authenticated using (true) with check (true);
```

### Task 4: Full Verification

**Files:**
- Modify: `react-app/src/features/auth/services/authService.js`
- Test: `react-app/src/features/auth/services/authService.test.js`
- Test: `react-app/src/features/excel-extract/__tests__/officeProductDataService.test.js`
- Test: `react-app/src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`

- [ ] **Step 1: Run focused tests**

Run: `cd react-app && npm run test:run -- src/features/auth/services/authService.test.js src/features/excel-extract/__tests__/officeProductDataService.test.js src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx src/features/excel-extract/__tests__/workbookAiRecommendations.test.js src/features/excel-extract/__tests__/workbookAiReviewPanel.test.jsx`
Expected: PASS

- [ ] **Step 2: Run build verification**

Run: `cd react-app && npm run build`
Expected: build succeeds with exit code 0
