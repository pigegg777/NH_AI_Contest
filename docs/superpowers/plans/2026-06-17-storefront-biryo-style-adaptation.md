# Storefront Biryo-Style Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt `storefront` public/preview UI to use biryo-style search, category chips, and card hierarchy while keeping current storefront data/config behavior intact.

**Architecture:** Keep `StorefrontView` and `CardGridSection` as the only rendering units. Add medium-category chip state and combined filtering inside `StorefrontView`, then restyle and reorder card markup inside `CardGridSection` without changing save schema or section matching rules.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, CSS Modules

---

### Task 1: Add failing storefront interaction tests

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

- [ ] **Step 1: Write the failing test for medium-category chips**

Add this test after the existing section-render test:

```jsx
  it('renders medium-category chips from visible storefront rows', async () => {
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: {
        nav: {},
        searchSection: { placeholder: 'Search products' },
        categoryChips: { enabled: true, sticky: true },
      },
      navConfig: {},
      categoryConfigs: [
        {
          officeCode: 'OFF-1',
          productCategoryName: 'Fertilizer Upload',
          sortOrder: 0,
          categoryConfig: {
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
            selectedMediumCategories: ['Premium', 'Starter'],
            representativeMediumCategory: 'Premium',
            layoutStyle: { variant: 'card-grid' },
            cardDesign: {
              visibleFields: ['product_name'],
              style: { layout: 'grid', accentColor: '#1d4a2e', fontSize: 'medium', cardsPerRow: 2 },
            },
          },
        },
      ],
      hiddenProducts: [],
      updatedAt: '2026-06-15T00:00:00Z',
    });
    fetchAllOfficeProductRows.mockResolvedValue([
      { product_category_name: 'Fertilizer Upload', product_name: 'Alpha', medium_category: 'Premium' },
      { product_category_name: 'Fertilizer Upload', product_name: 'Beta', medium_category: 'Starter' },
      { product_category_name: 'Fertilizer Upload', product_name: 'Gamma', medium_category: 'Premium' },
    ]);

    render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(await screen.findByRole('button', { name: '전체' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Premium' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Starter' })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Write the failing test for chip filtering and search combination**

Add this test after the chip-render test:

```jsx
  it('filters rows by medium-category chip and keeps search filtering combined', async () => {
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: {
        nav: {},
        searchSection: { placeholder: 'Search products' },
        categoryChips: { enabled: true, sticky: true },
      },
      navConfig: {},
      categoryConfigs: [
        {
          officeCode: 'OFF-1',
          productCategoryName: 'Fertilizer Upload',
          sortOrder: 0,
          categoryConfig: {
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
            selectedMediumCategories: ['Premium', 'Starter'],
            representativeMediumCategory: 'Premium',
            layoutStyle: { variant: 'card-grid' },
            cardDesign: {
              visibleFields: ['product_name', 'tax_price'],
              style: { layout: 'grid', accentColor: '#1d4a2e', fontSize: 'medium', cardsPerRow: 2 },
            },
          },
        },
      ],
      hiddenProducts: [],
      updatedAt: '2026-06-15T00:00:00Z',
    });
    fetchAllOfficeProductRows.mockResolvedValue([
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Alpha Premium',
        medium_category: 'Premium',
        tax_price: 1000,
      },
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Beta Starter',
        medium_category: 'Starter',
        tax_price: 2000,
      },
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Gamma Premium',
        medium_category: 'Premium',
        tax_price: 3000,
      },
    ]);

    const user = userEvent.setup();
    render(<PublicStorefrontPage officeCode="OFF-1" />);

    await screen.findByText('Alpha Premium');

    await user.click(screen.getByRole('button', { name: 'Premium' }));

    await waitFor(() => {
      expect(screen.getByText('Alpha Premium')).toBeInTheDocument();
      expect(screen.getByText('Gamma Premium')).toBeInTheDocument();
      expect(screen.queryByText('Beta Starter')).not.toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Search products'), 'Gamma');

    await waitFor(() => {
      expect(screen.queryByText('Alpha Premium')).not.toBeInTheDocument();
      expect(screen.getByText('Gamma Premium')).toBeInTheDocument();
      expect(screen.queryByText('Beta Starter')).not.toBeInTheDocument();
    });
  });
```

- [ ] **Step 3: Run tests to verify RED**

Run: `npm run test:run -- src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

Expected: FAIL because `전체` / medium-category chips do not exist yet.

- [ ] **Step 4: Commit test-only red state**

```bash
git add react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
git commit -m "test: cover storefront medium-category filtering"
```

### Task 2: Implement medium-category chips and biryo-style search shell

**Files:**
- Modify: `react-app/src/features/storefront/components/StorefrontView.jsx`
- Modify: `react-app/src/features/storefront/components/StorefrontView.module.css`
- Test: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

- [ ] **Step 1: Add minimal filtering implementation in `StorefrontView.jsx`**

Update imports and state:

```jsx
import { useDeferredValue, useId, useState } from 'react';
```

Add helpers above component:

```jsx
function buildMediumCategoryItems(products) {
  const seen = new Set();
  const items = ['전체'];

  for (const product of Array.isArray(products) ? products : []) {
    const value = typeof product?.medium_category === 'string' ? product.medium_category.trim() : '';

    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    items.push(value);
  }

  return items;
}

function matchesMediumCategory(product, activeMediumCategory) {
  if (!activeMediumCategory || activeMediumCategory === '전체') {
    return true;
  }

  return (product?.medium_category ?? '') === activeMediumCategory;
}
```

Inside component, replace current product/section derivation with:

```jsx
  const [activeMediumCategory, setActiveMediumCategory] = useState('전체');
  const baseVisibleProducts = filterHiddenProducts(productRows, config?.hiddenProducts);
  const mediumCategoryItems = buildMediumCategoryItems(baseVisibleProducts);
  const visibleProducts = baseVisibleProducts.filter(
    (product) => matchesSearch(product, searchQuery) && matchesMediumCategory(product, activeMediumCategory),
  );
  const sections = buildSections(config?.categoryConfigs, visibleProducts);
```

Replace old section nav with chip UI and boxed search shell:

```jsx
        <div className={styles.searchRow}>
          <label className={styles.searchBox}>
            <input
              type="search"
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <span className={styles.searchIcon} aria-hidden="true">
              검색
            </span>
          </label>
          <span className={styles.searchHint}>
            검색창과 중분류 탭은 고정되고, AI는 문구와 카드 분위기를 조정합니다.
          </span>
        </div>

        <div className={styles.categoryWrap}>
          {mediumCategoryItems.map((item) => (
            <button
              key={item}
              type="button"
              className={`${styles.categoryChip} ${activeMediumCategory === item ? styles.categoryChipActive : ''}`}
              onClick={() => setActiveMediumCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
```

- [ ] **Step 2: Add chip navigation behavior in `StorefrontView.jsx`**

After `sections` derivation, add section lookup:

```jsx
  const sectionIds = sections.map((section, index) => ({
    section,
    sectionId: `${sectionIdPrefix}-${index}`,
  }));
```

Add click handler inside component:

```jsx
  function handleMediumCategorySelect(item) {
    setActiveMediumCategory(item);

    if (item === '전체') {
      return;
    }

    const target = sectionIds.find(({ section }) =>
      Array.isArray(section?.products) && section.products.some((product) => (product?.medium_category ?? '') === item),
    );

    if (target) {
      scrollToSection(target.sectionId);
    }
  }
```

Wire buttons:

```jsx
              onClick={() => handleMediumCategorySelect(item)}
```

Render sections from `sectionIds`:

```jsx
        sectionIds.map(({ section, sectionId }) => (
          <CardGridSection
            key={sectionId}
            sectionId={sectionId}
            section={section}
            fields={section?.fields}
            style={section?.style}
          />
        ))
```

- [ ] **Step 3: Add biryo-style search and chip CSS**

Replace obsolete nav styles in `StorefrontView.module.css` with:

```css
.searchRow {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.searchBox {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid rgba(29, 74, 46, 0.2);
  border-radius: var(--corp-radius);
  background: var(--corp-panel);
  transition: border-color var(--corp-transition), box-shadow var(--corp-transition);
}

.searchBox:focus-within {
  border-color: var(--brand-color, var(--corp-primary));
  box-shadow: var(--corp-focus-ring);
}

.searchInput {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: #173223;
}

.searchIcon {
  flex: 0 0 auto;
  font-size: 0.78rem;
  font-weight: 700;
  color: #6b7b70;
}

.categoryWrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.categoryChip {
  min-height: 40px;
  padding: 0 8px 6px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #5f6d5b;
  font-weight: 500;
  cursor: pointer;
  transition: color var(--corp-transition), border-color var(--corp-transition);
}

.categoryChip:hover {
  color: #355a30;
  border-bottom-color: rgba(29, 74, 46, 0.24);
}

.categoryChipActive {
  color: #355a30;
  border-bottom-color: var(--brand-color, var(--corp-primary));
  font-weight: 700;
}
```

- [ ] **Step 4: Run storefront test to verify GREEN**

Run: `npm run test:run -- src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

Expected: PASS for the new chip/search interaction tests.

- [ ] **Step 5: Commit chip/search implementation**

```bash
git add react-app/src/features/storefront/components/StorefrontView.jsx react-app/src/features/storefront/components/StorefrontView.module.css react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
git commit -m "feat: add storefront medium-category chips"
```

### Task 3: Adapt storefront cards to biryo-style hierarchy

**Files:**
- Modify: `react-app/src/features/storefront/components/CardGridSection.jsx`
- Modify: `react-app/src/features/storefront/components/CardGridSection.module.css`
- Test: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

- [ ] **Step 1: Write failing assertion for card badge/price hierarchy**

Extend the existing section-render test with:

```jsx
    expect(screen.getAllByText('Premium')[0]).toBeInTheDocument();
    expect(screen.getByText('1,000 won')).toBeInTheDocument();
```

Expected red reason: card markup does not yet expose biryo-style badge hierarchy reliably.

- [ ] **Step 2: Run targeted test to verify RED**

Run: `npm run test:run -- src/features/storefront/__tests__/PublicStorefrontPage.test.jsx -t "renders product-category sections"`

Expected: FAIL if badge/price hierarchy text is not rendered as expected after markup change setup.

- [ ] **Step 3: Rework `CardGridSection.jsx` markup minimally**

Add helper:

```jsx
function buildBadgeText(product) {
  return product?.medium_category || product?.large_category || product?.small_category || '';
}
```

Replace card body with:

```jsx
          <article
            key={product?.row_id || product?.product_code || `${product?.product_name ?? 'product'}-${product?.spec ?? index}`}
            className={styles.card}
          >
            <div className={styles.cardHeader}>
              <strong className={styles.cardName}>{product?.product_name || '-'}</strong>
              {buildBadgeText(product) ? <span className={styles.cardBadge}>{buildBadgeText(product)}</span> : null}
            </div>

            {product?.img_url ? (
              <div className={styles.cardImageWrap}>
                <img className={styles.cardImage} src={product.img_url} alt={product?.product_name || ''} />
              </div>
            ) : null}

            <div className={styles.cardBody}>
              {displayFields
                .filter((field) => field !== 'img_url' && field !== 'product_name' && field !== 'medium_category')
                .map((field) => (
                  <div key={field} className={field === 'tax_price' ? styles.priceField : styles.field}>
                    <span className={styles.fieldLabel}>{STOREFRONT_FIELD_LABELS[field] || field}</span>
                    <span className={styles.fieldValue}>{formatFieldValue(field, product?.[field])}</span>
                  </div>
                ))}
            </div>
          </article>
```

- [ ] **Step 4: Apply biryo-style card CSS**

Update `CardGridSection.module.css` card styles to:

```css
.card {
  overflow: hidden;
  border: 1px solid var(--corp-line);
  border-radius: 14px;
  background: var(--corp-panel);
  box-shadow: 0 2px 8px rgba(17, 24, 39, 0.05);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(17, 24, 39, 0.08);
}

.cardHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 10px;
  background: color-mix(in srgb, var(--card-accent, var(--corp-primary)) 8%, #ffffff);
  border-bottom: 1px solid rgba(17, 24, 39, 0.06);
}

.cardName {
  flex: 1;
  min-width: 0;
  font-size: var(--card-font-size, 0.85rem);
  font-weight: 700;
  color: var(--corp-text);
}

.cardBadge {
  flex: 0 0 auto;
  padding: 3px 9px;
  border-radius: var(--corp-radius-pill);
  border: 1px solid color-mix(in srgb, var(--card-accent, var(--corp-primary)) 25%, #d5e3cf);
  background: #eef6ea;
  color: #46603f;
  font-size: 0.68rem;
  font-weight: 700;
}

.cardImageWrap {
  padding: 14px;
}

.cardImage {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid #eef0f2;
  background: var(--corp-panel);
}

.cardBody {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px 14px;
}

.priceField .fieldValue {
  color: #d32f2f;
  font-size: calc(var(--card-font-size, 0.85rem) + 0.02rem);
  font-weight: 700;
}
```

- [ ] **Step 5: Run storefront tests to verify GREEN**

Run: `npm run test:run -- src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

Expected: PASS with card text assertions still green.

- [ ] **Step 6: Commit card adaptation**

```bash
git add react-app/src/features/storefront/components/CardGridSection.jsx react-app/src/features/storefront/components/CardGridSection.module.css react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
git commit -m "feat: adapt storefront cards to biryo style"
```

### Task 4: Full verification

**Files:**
- Verify only

- [ ] **Step 1: Run storefront tests**

Run: `npm run test:run -- src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

Expected: all tests pass

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: Vite build succeeds

- [ ] **Step 3: Review diff for touched storefront files**

Run:

```bash
git diff -- react-app/src/features/storefront/components/StorefrontView.jsx react-app/src/features/storefront/components/StorefrontView.module.css react-app/src/features/storefront/components/CardGridSection.jsx react-app/src/features/storefront/components/CardGridSection.module.css react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
```

Expected: only approved storefront design/filtering changes

- [ ] **Step 4: Commit verification-ready state**

```bash
git add react-app/src/features/storefront/components/StorefrontView.jsx react-app/src/features/storefront/components/StorefrontView.module.css react-app/src/features/storefront/components/CardGridSection.jsx react-app/src/features/storefront/components/CardGridSection.module.css react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
git commit -m "feat: refresh storefront browsing experience"
```
