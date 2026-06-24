# Storefront AI Presentation Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep source product data immutable while expanding AI-controlled storefront presentation options for card/image sizing and search/chip styling.

**Architecture:** Extend the existing config-driven storefront flow instead of introducing raw HTML/CSS persistence. Card-level presentation stays in `cardStyle`, page-level search/chip variants ride through `navConfig` and are copied into `pageConfig` for public rendering, while the original product rows remain read-only inputs all the way through preview and save.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, CSS Modules

---

## File Structure

### Modify

- `react-app/src/features/storefront/model/cardStyleModel.js`
  - Expand normalized card/image presentation options.
- `react-app/src/features/storefront/model/storefrontBuilderModel.js`
  - Extend `DEFAULT_NAV_CONFIG`, `normalizeNavConfig`, `normalizePageConfig`, and save-payload mapping for search/chip variants.
- `react-app/src/features/storefront/services/storefrontAiService.js`
  - Expand AI schema + normalization boundary so AI can patch richer presentation fields without touching source data.
- `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
  - Hydrate new global presentation fields from saved config into builder state and keep AI apply/save behavior config-only.
- `react-app/src/features/storefront/components/PageDesignEditor.jsx`
  - Expose new presentation controls.
- `react-app/src/features/storefront/components/CardGridSection.jsx`
  - Apply expanded card/image style vars and data attributes.
- `react-app/src/features/storefront/components/CardGridSection.module.css`
  - Render image sizing, radius, shadow, spacing variants.
- `react-app/src/features/storefront/components/StorefrontView.jsx`
  - Read search/chip variants from config, render with stable data attributes, keep medium-category chips derived from current rows.
- `react-app/src/features/storefront/components/StorefrontView.module.css`
  - Add search box and chip variants.
- `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`
  - Verify public rendering uses new variants and still scopes chips/data correctly.
- `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
  - Verify AI/save path accepts richer style patch and does not mutate source product rows.

### Create

- `react-app/src/features/storefront/__tests__/cardStyleModel.test.js`
  - Unit coverage for new `normalizeCardStyle` boundary.
- `react-app/src/features/storefront/__tests__/storefrontAiService.test.js`
  - Unit coverage for AI normalization and allowed-category filtering.

## Shared Naming To Use In Code

- `cardStyle.imageSize`: `'hidden' | 'sm' | 'md' | 'lg'`
- `cardStyle.imageFit`: `'cover' | 'contain'`
- `cardStyle.cardRadius`: `'md' | 'lg' | 'xl'`
- `cardStyle.cardShadow`: `'none' | 'soft' | 'strong'`
- `cardStyle.cardSpacing`: `'tight' | 'normal' | 'relaxed'`
- `navConfig.searchVariant`: `'pill' | 'outlined' | 'soft'`
- `navConfig.categoryChipVariant`: `'filled' | 'outline' | 'soft'`

These names must stay consistent across tests, models, AI schema, hooks, and components.

### Task 1: Lock Down Normalization Boundaries With Failing Tests

**Files:**
- Create: `react-app/src/features/storefront/__tests__/cardStyleModel.test.js`
- Create: `react-app/src/features/storefront/__tests__/storefrontAiService.test.js`
- Modify later in task: `react-app/src/features/storefront/model/cardStyleModel.js`
- Modify later in task: `react-app/src/features/storefront/services/storefrontAiService.js`

- [ ] **Step 1: Write the failing card-style normalization test**

```js
import { describe, expect, it } from 'vitest';

import { DEFAULT_CARD_STYLE, normalizeCardStyle } from '../model/cardStyleModel';

describe('normalizeCardStyle', () => {
  it('keeps only allowed presentation values and falls back for invalid ones', () => {
    expect(
      normalizeCardStyle({
        layout: 'compact',
        accentColor: '#2563eb',
        fontSize: 'large',
        cardsPerRow: 3,
        imageSize: 'lg',
        imageFit: 'contain',
        cardRadius: 'xl',
        cardShadow: 'strong',
        cardSpacing: 'relaxed',
      }),
    ).toEqual({
      ...DEFAULT_CARD_STYLE,
      layout: 'compact',
      accentColor: '#2563eb',
      fontSize: 'large',
      cardsPerRow: 3,
      imageSize: 'lg',
      imageFit: 'contain',
      cardRadius: 'xl',
      cardShadow: 'strong',
      cardSpacing: 'relaxed',
    });

    expect(
      normalizeCardStyle({
        imageSize: 'giant',
        imageFit: 'stretch',
        cardRadius: 'rounder',
        cardShadow: 'heavy',
        cardSpacing: 'loose',
      }),
    ).toEqual(DEFAULT_CARD_STYLE);
  });
});
```

- [ ] **Step 2: Run the card-style test to verify it fails**

Run: `npm run test:run -- src/features/storefront/__tests__/cardStyleModel.test.js`

Expected: FAIL because `normalizeCardStyle` does not yet return the new properties.

- [ ] **Step 3: Write the failing AI-normalization test**

```js
import { describe, expect, it } from 'vitest';

import { normalizeStorefrontAiSuggestion } from '../services/storefrontAiService';

describe('normalizeStorefrontAiSuggestion', () => {
  it('drops unknown medium categories and normalizes richer presentation fields', () => {
    expect(
      normalizeStorefrontAiSuggestion(
        {
          summary: 'updated',
          patch: {
            designDirection: 'warm',
            selectedMediumCategories: ['Premium', 'Fake'],
            representativeMediumCategory: 'Fake',
            cardFields: ['product_name', 'tax_price'],
            cardStyle: {
              layout: 'compact',
              accentColor: '#2563eb',
              fontSize: 'large',
              cardsPerRow: 1,
              imageSize: 'lg',
              imageFit: 'contain',
              cardRadius: 'xl',
              cardShadow: 'strong',
              cardSpacing: 'relaxed',
            },
            navConfig: {
              title: 'Premium Fertilizer Guide',
              subtitle: 'Fast answers',
              brandColor: '#2563eb',
              searchPlaceholder: 'Search fertilizer',
              logoUrl: '',
              searchVariant: 'outlined',
              categoryChipVariant: 'filled',
            },
          },
        },
        ['Premium', 'Starter'],
      ),
    ).toEqual({
      summary: 'updated',
      patch: {
        designDirection: 'warm',
        selectedMediumCategories: ['Premium'],
        representativeMediumCategory: 'Premium',
        cardFields: ['product_name', 'tax_price'],
        cardStyle: {
          layout: 'compact',
          accentColor: '#2563eb',
          fontSize: 'large',
          cardsPerRow: 1,
          imageSize: 'lg',
          imageFit: 'contain',
          cardRadius: 'xl',
          cardShadow: 'strong',
          cardSpacing: 'relaxed',
        },
        navConfig: {
          title: 'Premium Fertilizer Guide',
          subtitle: 'Fast answers',
          brandColor: '#2563eb',
          searchPlaceholder: 'Search fertilizer',
          logoUrl: '',
          searchVariant: 'outlined',
          categoryChipVariant: 'filled',
        },
      },
    });
  });
});
```

- [ ] **Step 4: Run the AI-normalization test to verify it fails**

Run: `npm run test:run -- src/features/storefront/__tests__/storefrontAiService.test.js`

Expected: FAIL because `normalizeStorefrontAiSuggestion` is not exported yet and nav/style fields are not normalized yet.

- [ ] **Step 5: Write the minimal normalization implementation**

```js
export const DEFAULT_CARD_STYLE = {
  layout: 'grid',
  accentColor: '#1d4a2e',
  fontSize: 'medium',
  cardsPerRow: 2,
  imageSize: 'md',
  imageFit: 'cover',
  cardRadius: 'lg',
  cardShadow: 'soft',
  cardSpacing: 'normal',
};

export const CARD_STYLE_IMAGE_SIZE_OPTIONS = ['hidden', 'sm', 'md', 'lg'];
export const CARD_STYLE_IMAGE_FIT_OPTIONS = ['cover', 'contain'];
export const CARD_STYLE_RADIUS_OPTIONS = ['md', 'lg', 'xl'];
export const CARD_STYLE_SHADOW_OPTIONS = ['none', 'soft', 'strong'];
export const CARD_STYLE_SPACING_OPTIONS = ['tight', 'normal', 'relaxed'];

export function normalizeCardStyle(style) {
  const source = style ?? {};
  const cardsPerRow = Number(source.cardsPerRow);

  return {
    layout: CARD_STYLE_LAYOUT_OPTIONS.includes(source.layout) ? source.layout : DEFAULT_CARD_STYLE.layout,
    accentColor: CARD_STYLE_ACCENT_COLOR_OPTIONS.includes(source.accentColor)
      ? source.accentColor
      : DEFAULT_CARD_STYLE.accentColor,
    fontSize: CARD_STYLE_FONT_SIZE_OPTIONS.includes(source.fontSize) ? source.fontSize : DEFAULT_CARD_STYLE.fontSize,
    cardsPerRow: CARD_STYLE_CARDS_PER_ROW_OPTIONS.includes(cardsPerRow) ? cardsPerRow : DEFAULT_CARD_STYLE.cardsPerRow,
    imageSize: CARD_STYLE_IMAGE_SIZE_OPTIONS.includes(source.imageSize) ? source.imageSize : DEFAULT_CARD_STYLE.imageSize,
    imageFit: CARD_STYLE_IMAGE_FIT_OPTIONS.includes(source.imageFit) ? source.imageFit : DEFAULT_CARD_STYLE.imageFit,
    cardRadius: CARD_STYLE_RADIUS_OPTIONS.includes(source.cardRadius) ? source.cardRadius : DEFAULT_CARD_STYLE.cardRadius,
    cardShadow: CARD_STYLE_SHADOW_OPTIONS.includes(source.cardShadow) ? source.cardShadow : DEFAULT_CARD_STYLE.cardShadow,
    cardSpacing: CARD_STYLE_SPACING_OPTIONS.includes(source.cardSpacing) ? source.cardSpacing : DEFAULT_CARD_STYLE.cardSpacing,
  };
}
```

```js
export function normalizeStorefrontAiSuggestion(payload, mediumCategoryOptions) {
  const patch = payload?.patch ?? {};

  return {
    summary: toTrimmedString(payload?.summary) || 'AI draft applied.',
    patch: {
      designDirection: toTrimmedString(patch.designDirection) || 'friendly',
      selectedMediumCategories: normalizeSelectedMediumCategories(
        patch.selectedMediumCategories,
        mediumCategoryOptions,
      ),
      representativeMediumCategory:
        toTrimmedString(patch.representativeMediumCategory) || mediumCategoryOptions[0] || '',
      cardFields: normalizeCardFields(patch.cardFields),
      cardStyle: normalizeCardStyle(patch.cardStyle),
      navConfig: normalizeNavConfig(patch.navConfig),
    },
  };
}
```

- [ ] **Step 6: Run both new tests to verify they pass**

Run: `npm run test:run -- src/features/storefront/__tests__/cardStyleModel.test.js src/features/storefront/__tests__/storefrontAiService.test.js`

Expected: PASS

- [ ] **Step 7: Commit the normalization boundary**

```bash
git add src/features/storefront/model/cardStyleModel.js src/features/storefront/services/storefrontAiService.js src/features/storefront/__tests__/cardStyleModel.test.js src/features/storefront/__tests__/storefrontAiService.test.js
git commit -m "feat: expand storefront AI presentation normalization"
```

### Task 2: Persist Global Search/Chip Variants Without Touching Source Data

**Files:**
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify later in task: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Write the failing builder-flow regression test**

Add this assertion block inside `runs the two-step AI studio flow...` in `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`:

```js
expect(upsertStorefrontConfig).toHaveBeenCalledWith({
  officeCode: 'OFF-1',
  navConfig: {
    title: 'Premium Fertilizer Guide',
    subtitle: 'Fast answers for customers',
    brandColor: '#2563eb',
    searchPlaceholder: 'Search fertilizer',
    logoUrl: '',
    searchVariant: 'outlined',
    categoryChipVariant: 'filled',
  },
  pageConfig: {
    schemaVersion: 1,
    designDirection: 'warm',
    theme: { brandColor: '#2563eb', backgroundTone: 'apricot' },
    nav: {
      title: 'Premium Fertilizer Guide',
      subtitle: 'Fast answers for customers',
      logoUrl: '',
    },
    searchSection: {
      enabled: true,
      placeholder: 'Search fertilizer',
      variant: 'outlined',
    },
    categoryChips: {
      enabled: true,
      sticky: true,
      variant: 'filled',
    },
  },
  // keep existing categoryConfigs + hiddenProducts assertions here
});

expect(PRODUCT_ENTRIES[0].rows[0].product_name).toBe('Alpha');
expect(PRODUCT_ENTRIES[0].rows[0].medium_category).toBe('Premium');
```

Also update mocked AI response:

```js
navConfig: {
  title: 'Premium Fertilizer Guide',
  subtitle: 'Fast answers for customers',
  brandColor: '#2563eb',
  searchPlaceholder: 'Search fertilizer',
  logoUrl: '',
  searchVariant: 'outlined',
  categoryChipVariant: 'filled',
},
```

- [ ] **Step 2: Run the builder-flow test to verify it fails**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

Expected: FAIL because `navConfig` and `pageConfig` do not yet include the new variant fields.

- [ ] **Step 3: Write the minimal builder/save implementation**

```js
export const DEFAULT_NAV_CONFIG = {
  title: '',
  subtitle: '',
  brandColor: DEFAULT_CARD_STYLE.accentColor,
  searchPlaceholder: 'Search products',
  logoUrl: '',
  searchVariant: 'pill',
  categoryChipVariant: 'soft',
};

export function normalizeNavConfig(navConfig) {
  const source = navConfig ?? {};

  return {
    title: toTrimmedString(source.title),
    subtitle: toTrimmedString(source.subtitle),
    brandColor: toTrimmedString(source.brandColor) || DEFAULT_NAV_CONFIG.brandColor,
    searchPlaceholder: toTrimmedString(source.searchPlaceholder) || DEFAULT_NAV_CONFIG.searchPlaceholder,
    logoUrl: toTrimmedString(source.logoUrl),
    searchVariant: ['pill', 'outlined', 'soft'].includes(source.searchVariant)
      ? source.searchVariant
      : DEFAULT_NAV_CONFIG.searchVariant,
    categoryChipVariant: ['filled', 'outline', 'soft'].includes(source.categoryChipVariant)
      ? source.categoryChipVariant
      : DEFAULT_NAV_CONFIG.categoryChipVariant,
  };
}
```

```js
searchSection: {
  enabled: sourceSearchSection.enabled ?? true,
  placeholder: toTrimmedString(sourceSearchSection.placeholder) || DEFAULT_PAGE_CONFIG.searchSection.placeholder,
  variant: ['pill', 'outlined', 'soft'].includes(sourceSearchSection.variant)
    ? sourceSearchSection.variant
    : DEFAULT_PAGE_CONFIG.searchSection.variant,
},
categoryChips: {
  enabled: sourceCategoryChips.enabled ?? true,
  sticky: sourceCategoryChips.sticky ?? true,
  variant: ['filled', 'outline', 'soft'].includes(sourceCategoryChips.variant)
    ? sourceCategoryChips.variant
    : 'soft',
},
```

```js
setNavConfig(
  normalizeNavConfig({
    title: config?.navConfig?.title ?? normalizedPageConfig.nav.title,
    subtitle: config?.navConfig?.subtitle ?? normalizedPageConfig.nav.subtitle,
    brandColor: config?.navConfig?.brandColor ?? normalizedPageConfig.theme.brandColor,
    searchPlaceholder:
      config?.navConfig?.searchPlaceholder ?? normalizedPageConfig.searchSection.placeholder,
    logoUrl: config?.navConfig?.logoUrl ?? normalizedPageConfig.nav.logoUrl,
    searchVariant:
      config?.navConfig?.searchVariant ?? normalizedPageConfig.searchSection.variant,
    categoryChipVariant:
      config?.navConfig?.categoryChipVariant ?? normalizedPageConfig.categoryChips.variant,
  }),
);
```

```js
searchSection: {
  ...basePageConfig.searchSection,
  placeholder: resolvedNavConfig.searchPlaceholder,
  variant: resolvedNavConfig.searchVariant,
},
categoryChips: {
  ...basePageConfig.categoryChips,
  variant: resolvedNavConfig.categoryChipVariant,
},
```

- [ ] **Step 4: Run the builder-flow test to verify it passes**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

Expected: PASS

- [ ] **Step 5: Commit the builder persistence changes**

```bash
git add src/features/storefront/model/storefrontBuilderModel.js src/features/storefront/hooks/useStorefrontBuilder.js src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
git commit -m "feat: persist storefront presentation variants"
```

### Task 3: Render Richer Presentation Controls In Builder And Public View

**Files:**
- Modify: `react-app/src/features/storefront/components/PageDesignEditor.jsx`
- Modify: `react-app/src/features/storefront/components/CardGridSection.jsx`
- Modify: `react-app/src/features/storefront/components/CardGridSection.module.css`
- Modify: `react-app/src/features/storefront/components/StorefrontView.jsx`
- Modify: `react-app/src/features/storefront/components/StorefrontView.module.css`
- Modify later in task: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

- [ ] **Step 1: Write the failing public-view test**

Add this case to `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`:

```js
it('renders search/chip variants and expanded card image styles from config only', async () => {
  fetchStorefrontConfig.mockResolvedValue({
    officeCode: 'OFF-1',
    pageConfig: {
      schemaVersion: 1,
      designDirection: 'trust',
      theme: { brandColor: '#2563eb', backgroundTone: 'sky' },
      nav: { title: 'NH Demo Storefront', subtitle: 'Seasonal products', logoUrl: '' },
      searchSection: { enabled: true, placeholder: 'Search products', variant: 'outlined' },
      categoryChips: { enabled: true, sticky: true, variant: 'filled' },
    },
    navConfig: {
      title: 'NH Demo Storefront',
      subtitle: 'Seasonal products',
      brandColor: '#2563eb',
      searchPlaceholder: 'Search products',
      logoUrl: '',
      searchVariant: 'outlined',
      categoryChipVariant: 'filled',
    },
    categoryConfigs: [
      {
        officeCode: 'OFF-1',
        productCategoryName: 'Fertilizer Upload',
        sortOrder: 0,
        categoryConfig: {
          displayName: 'Fertilizer Upload',
          sourceCategoryName: 'Fertilizer Upload',
          selectedMediumCategories: ['Premium'],
          representativeMediumCategory: 'Premium',
          layoutStyle: { variant: 'card-grid' },
          cardDesign: {
            visibleFields: ['product_name', 'tax_price'],
            style: {
              layout: 'compact',
              accentColor: '#2563eb',
              fontSize: 'large',
              cardsPerRow: 1,
              imageSize: 'lg',
              imageFit: 'contain',
              cardRadius: 'xl',
              cardShadow: 'strong',
              cardSpacing: 'relaxed',
            },
          },
        },
      },
    ],
    hiddenProducts: [],
  });
  fetchAllOfficeProductRows.mockResolvedValue([
    {
      product_category_name: 'Fertilizer Upload',
      product_name: 'Alpha',
      medium_category: 'Premium',
      img_url: 'https://example.com/a.png',
      tax_price: 1000,
    },
  ]);

  const { container } = render(<PublicStorefrontPage officeCode="OFF-1" />);

  expect(await screen.findByText('NH Demo Storefront')).toBeInTheDocument();
  expect(screen.getByTestId('storefront-search')).toHaveAttribute('data-search-variant', 'outlined');
  expect(screen.getByTestId('storefront-category-chips')).toHaveAttribute('data-chip-variant', 'filled');

  const sectionEl = container.querySelector('section');
  expect(sectionEl.style.getPropertyValue('--card-image-size')).toBe('lg');
  expect(sectionEl.style.getPropertyValue('--card-image-fit')).toBe('contain');
  expect(sectionEl.style.getPropertyValue('--card-radius')).toBe('xl');
  expect(sectionEl.style.getPropertyValue('--card-shadow')).toBe('strong');
  expect(sectionEl.style.getPropertyValue('--card-spacing')).toBe('relaxed');
});
```

- [ ] **Step 2: Run the public-view test to verify it fails**

Run: `npm run test:run -- src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

Expected: FAIL because the view does not render data attributes or new card css vars yet.

- [ ] **Step 3: Write the minimal rendering implementation**

```jsx
const searchVariant =
  config?.navConfig?.searchVariant || resolvedPageConfig.searchSection.variant || 'pill';
const categoryChipVariant =
  config?.navConfig?.categoryChipVariant || resolvedPageConfig.categoryChips.variant || 'soft';

<div className={styles.searchRow}>
  <label
    className={`${styles.searchBox} ${styles[`searchBox-${searchVariant}`] || ''}`}
    data-testid="storefront-search"
    data-search-variant={searchVariant}
  >
```

```jsx
<div
  className={styles.categoryWrap}
  data-testid="storefront-category-chips"
  data-chip-variant={categoryChipVariant}
>
```

```jsx
const cssVars = {
  '--card-accent': resolvedStyle.accentColor,
  '--card-font-size': CARD_STYLE_FONT_SIZE_REM[resolvedStyle.fontSize],
  '--card-columns': resolvedStyle.cardsPerRow,
  '--card-image-size': resolvedStyle.imageSize,
  '--card-image-fit': resolvedStyle.imageFit,
  '--card-radius': resolvedStyle.cardRadius,
  '--card-shadow': resolvedStyle.cardShadow,
  '--card-spacing': resolvedStyle.cardSpacing,
};
```

```jsx
<div className={styles.optionGroup}>
  <span className={styles.inlineLabel}>Search box</span>
  <div className={styles.optionRow}>
    {['pill', 'outlined', 'soft'].map((option) => (
      <button
        key={option}
        type="button"
        className={navConfig.searchVariant === option ? styles.optionActive : styles.optionButton}
        onClick={() => onNavFieldChange('searchVariant', option)}
      >
        {option}
      </button>
    ))}
  </div>
</div>
```

```jsx
<div className={styles.optionGroup}>
  <span className={styles.inlineLabel}>Category chips</span>
  <div className={styles.optionRow}>
    {['filled', 'outline', 'soft'].map((option) => (
      <button
        key={option}
        type="button"
        className={navConfig.categoryChipVariant === option ? styles.optionActive : styles.optionButton}
        onClick={() => onNavFieldChange('categoryChipVariant', option)}
      >
        {option}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 4: Run the storefront test suite to verify the richer rendering passes**

Run: `npm run test:run -- src/features/storefront`

Expected: PASS

- [ ] **Step 5: Commit the rendering changes**

```bash
git add src/features/storefront/components/PageDesignEditor.jsx src/features/storefront/components/CardGridSection.jsx src/features/storefront/components/CardGridSection.module.css src/features/storefront/components/StorefrontView.jsx src/features/storefront/components/StorefrontView.module.css src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
git commit -m "feat: render richer storefront presentation styles"
```

### Task 4: Final Verification

**Files:**
- Review only: `docs/superpowers/specs/2026-06-17-storefront-ai-style-boundary-design.md`

- [ ] **Step 1: Re-read the spec and confirm each requirement is implemented**

Checklist:

```md
- Source product data remains immutable
- AI can patch richer presentation fields
- Medium-category choices remain constrained to current data
- Search/chip variants render from config
- Card/image presentation renders from config
```

- [ ] **Step 2: Run the targeted storefront tests**

Run: `npm run test:run -- src/features/storefront`

Expected: PASS with 0 failures

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 4: Inspect git diff before any final claim**

Run: `git diff -- src/features/storefront`

Expected: Only intended storefront presentation-boundary changes appear

