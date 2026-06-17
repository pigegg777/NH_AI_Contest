# Storefront Mobile Category Bar And Korean UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile category info bar for the first visible storefront section, shrink the filter chips, and translate fixed storefront UI copy to Korean.

**Architecture:** Keep this as a render-layer change only. `StorefrontView` derives the first visible section and its unique `medium_category` values from existing `buildSections(...)` output, while Korean fallback copy comes from the same storefront model/view files already responsible for defaults and labels.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, CSS Modules

---

## File Structure

### Modify

- `react-app/src/features/storefront/components/StorefrontView.jsx`
  - Derive first visible section metadata and render the mobile info bar.
- `react-app/src/features/storefront/components/StorefrontView.module.css`
  - Style the compact mobile info bar and smaller category chips.
- `react-app/src/features/storefront/model/storefrontBuilderModel.js`
  - Translate fixed storefront field labels and fallback placeholder copy to Korean.
- `react-app/src/features/storefront/pages/PublicStorefrontPage.jsx`
  - Ensure loading/error/placeholder copy is explicit Korean.
- `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`
  - Cover the new info bar and Korean fallback copy.

### Task 1: Add Failing Public Page Regression Tests

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

- [ ] **Step 1: Write the failing test for the mobile category info bar and Korean fallback copy**

Add this test:

```jsx
it('renders a mobile category info bar from the first visible section and uses Korean fallback copy', async () => {
  fetchStorefrontConfig.mockResolvedValue({
    officeCode: 'OFF-1',
    pageConfig: {
      schemaVersion: 1,
      designDirection: 'trust',
      theme: { brandColor: '#2563eb', backgroundTone: 'sky' },
      nav: { title: '', subtitle: '', logoUrl: '' },
      searchSection: { enabled: true, placeholder: '', variant: 'pill' },
      categoryChips: { enabled: true, sticky: true, variant: 'soft' },
    },
    navConfig: {
      title: '',
      subtitle: '',
      brandColor: '#2563eb',
      searchPlaceholder: '',
      logoUrl: '',
      searchVariant: 'pill',
      categoryChipVariant: 'soft',
    },
    categoryConfigs: [
      {
        officeCode: 'OFF-1',
        productCategoryName: '비료',
        sortOrder: 0,
        categoryConfig: {
          displayName: '비료',
          sourceCategoryName: '비료',
          selectedMediumCategories: ['복합비료', '유기질비료'],
          representativeMediumCategory: '복합비료',
          layoutStyle: { variant: 'card-grid' },
          cardDesign: {
            visibleFields: ['product_name', 'tax_price'],
            style: { layout: 'grid', accentColor: '#2563eb', fontSize: 'medium', cardsPerRow: 2 },
          },
        },
      },
    ],
    hiddenProducts: [],
  });
  fetchAllOfficeProductRows.mockResolvedValue([
    { product_category_name: '비료', product_name: '알파', medium_category: '복합비료', tax_price: 1000 },
    { product_category_name: '비료', product_name: '베타', medium_category: '유기질비료', tax_price: 2000 },
  ]);

  render(<PublicStorefrontPage officeCode="OFF-1" />);

  expect(await screen.findByText('상품 안내')).toBeInTheDocument();
  expect(screen.getByText('고객에게 안내할 상품을 살펴보세요.')).toBeInTheDocument();
  expect(screen.getByTestId('storefront-mobile-category-bar')).toBeInTheDocument();
  expect(screen.getByText('비료')).toBeInTheDocument();
  expect(screen.getByText('복합비료')).toBeInTheDocument();
  expect(screen.getByText('유기질비료')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('상품 검색')).toBeInTheDocument();
  expect(screen.getByTestId('storefront-category-chips')).toHaveAttribute('data-chip-size', 'compact');
});
```

- [ ] **Step 2: Run the public page test to verify it fails**

Run: `npm run test:run -- src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

Expected: FAIL because the mobile category bar, Korean fallback copy, and chip-size marker do not exist yet.

- [ ] **Step 3: Write the failing test for explicit Korean loading and placeholder states**

Update existing assertions in `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx` to these literal strings:

```jsx
expect(screen.getByText('페이지 준비 중입니다.')).toBeInTheDocument();
expect(screen.getByText('불러오는 중...')).toBeInTheDocument();
expect(await screen.findByText('페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument();
```

- [ ] **Step 4: Run the same test file to verify the Korean copy assertions fail correctly**

Run: `npm run test:run -- src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

Expected: FAIL on the new Korean copy expectations if they are not already rendered exactly.

### Task 2: Implement The Mobile Bar, Smaller Chips, And Korean UI Copy

**Files:**
- Modify: `react-app/src/features/storefront/components/StorefrontView.jsx`
- Modify: `react-app/src/features/storefront/components/StorefrontView.module.css`
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- Modify: `react-app/src/features/storefront/pages/PublicStorefrontPage.jsx`

- [ ] **Step 1: Implement first-visible-section helpers and mobile category bar**

Add these helpers to `react-app/src/features/storefront/components/StorefrontView.jsx`:

```jsx
function buildUniqueMediumCategories(products) {
  const seen = new Set();
  const values = [];

  for (const product of Array.isArray(products) ? products : []) {
    const value = typeof product?.medium_category === 'string' ? product.medium_category.trim() : '';

    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    values.push(value);
  }

  return values;
}
```

```jsx
const primarySection = sectionEntries[0]?.section ?? null;
const primarySectionTitle = primarySection?.productCategoryName || primarySection?.title || '';
const primarySectionMediumCategories = buildUniqueMediumCategories(primarySection?.products);
```

Render this block under the hero title/subtitle area:

```jsx
{primarySectionTitle ? (
  <div className={styles.mobileCategoryBar} data-testid="storefront-mobile-category-bar">
    <p className={styles.mobileCategoryLabel}>현재 상품 분류</p>
    <strong className={styles.mobileCategoryTitle}>{primarySectionTitle}</strong>
    {primarySectionMediumCategories.length > 0 ? (
      <div className={styles.mobileCategoryMeta}>
        {primarySectionMediumCategories.map((item) => (
          <span key={item} className={styles.mobileCategoryMetaItem}>
            {item}
          </span>
        ))}
      </div>
    ) : null}
  </div>
) : null}
```

- [ ] **Step 2: Translate fixed fallback copy to Korean**

Apply these literal replacements:

```js
export const STOREFRONT_FIELD_LABELS = {
  product_name: '상품명',
  spec: '규격',
  large_category: '대분류',
  medium_category: '중분류',
  small_category: '소분류',
  detail_category: '세부 분류',
  nutrient: '주요 성분',
  product_url: '상품 링크',
  tax_price: '가격',
};
```

```js
export const DEFAULT_NAV_CONFIG = {
  title: '',
  subtitle: '',
  brandColor: DEFAULT_CARD_STYLE.accentColor,
  searchPlaceholder: '상품 검색',
  logoUrl: '',
  searchVariant: 'pill',
  categoryChipVariant: 'soft',
};
```

```jsx
const title = config?.navConfig?.title || resolvedPageConfig.nav.title || '상품 안내';
const subtitle =
  config?.navConfig?.subtitle || resolvedPageConfig.nav.subtitle || '고객에게 안내할 상품을 살펴보세요.';
```

```jsx
<p className={styles.eyebrow}>스토어프론트</p>
...
<span className={styles.searchHint}>검색어와 중분류를 기준으로 상품을 빠르게 찾아보세요.</span>
...
<div className={styles.emptyState}>표시할 상품이 없습니다. 검색어나 중분류를 다시 확인해 주세요.</div>
```

In `react-app/src/features/storefront/pages/PublicStorefrontPage.jsx`:

```jsx
<div className={panelStyles.statusMessage}>불러오는 중...</div>
<div className={panelStyles.errorBox}>페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
<div className={panelStyles.statusMessage}>페이지 준비 중입니다.</div>
```

- [ ] **Step 3: Shrink the chips in CSS and expose a stable test marker**

In `react-app/src/features/storefront/components/StorefrontView.jsx`, update the chip container:

```jsx
<div
  className={`${styles.categoryWrap} ${CHIP_VARIANT_CLASS_NAMES[categoryChipVariant] || ''}`}
  data-testid="storefront-category-chips"
  data-chip-variant={categoryChipVariant}
  data-chip-size="compact"
>
```

In `react-app/src/features/storefront/components/StorefrontView.module.css`, add compact mobile bar styling and reduce chip size:

```css
.mobileCategoryBar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid rgba(29, 74, 46, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
}

.mobileCategoryLabel {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 700;
  color: #6a7c70;
}

.mobileCategoryTitle {
  font-size: 0.94rem;
  color: #173223;
}

.mobileCategoryMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mobileCategoryMetaItem {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(29, 74, 46, 0.08);
  font-size: 0.72rem;
  color: #355a30;
}

.categoryWrap {
  gap: 6px;
}

.categoryChip {
  min-height: 28px;
  padding: 0 10px;
  font-size: 0.76rem;
}
```

- [ ] **Step 4: Run the public page test to verify it passes**

Run: `npm run test:run -- src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

Expected: PASS

### Task 3: Final Verification

**Files:**
- Review only: `docs/superpowers/specs/2026-06-17-storefront-mobile-category-bar-korean-design.md`

- [ ] **Step 1: Run the full storefront suite**

Run: `npm run test:run -- src/features/storefront`

Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 3: Inspect the storefront diff**

Run: `git diff -- src/features/storefront`

Expected: only the mobile category bar, Korean copy, and chip-size refinement changes appear
