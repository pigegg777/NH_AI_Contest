# Storefront Design Tokens (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an office user type a natural-language design request (e.g. "make the title darker, use a cleaner font, focus on price, move the image to the left") and have the storefront builder apply, preview, and save that as structured, validated design tokens — no raw HTML/CSS.

**Architecture:** Extend the existing token-based models (`cardStyleModel.js`, `storefrontBuilderModel.js`) with four new approved-enum tokens (`titleTextColor`, `typographyTone` at page level; `cardTemplate`, `priceTextColor` at card level), extend the OpenAI strict-schema AI suggestion seam to normalize natural language into those tokens, thread them through the existing builder hook and persistence payload, and render them via CSS custom properties / `data-*` attributes following the exact pattern already used for `accentColor`/`cardRadius`/`cardShadow`.

**Tech Stack:** React 18, Vite, Vitest + React Testing Library, Supabase (`office_page_config` / `office_page_category_configs` tables), OpenAI Responses API (strict structured outputs).

## Global Constraints

- No raw HTML or raw CSS persistence — every new design value must be an approved enum token, never a free-form string or arbitrary hex from the AI.
- The save model stays JSON-based through the existing `office_page_config` (page-wide) and `office_page_category_configs` (per `product_category_name`) tables — no new tables.
- Page-wide shared tokens (`titleTextColor`, `typographyTone`) live in `pageConfig.theme`. Card-specific tokens (`cardTemplate`, `priceTextColor`) live in `categoryConfig` (`layoutStyle.variant` and `cardDesign.style`).
- AI must never rewrite `office_product_datas.product_data` — only styling/copy/emphasis.
- Older saved drafts without these fields must still normalize to sensible defaults and render identically to today (backward compatible).
- The OpenAI `STOREFRONT_AI_SCHEMA` must stay strict-mode compliant: every object node needs `additionalProperties: false` and `required` listing every property (see `react-app/src/features/storefront/__tests__/storefrontAiService.test.js`'s `STOREFRONT_AI_SCHEMA` test, which already enforces this recursively).
- Stay aligned with existing project vocabulary: `storefront`, `office product data`, `product_category_name`, `medium category`, `office_page_config`, `office_page_category_configs`.
- This is "Slice 1" only: text color tokens, typography tokens, card templates (slot composition via template selection), and AI normalization for those fields. General per-field emphasis (nutrient/spec emphasis), background/surface color tokens, and manual (non-AI) controls for these new fields are explicitly out of scope for this plan — they are listed in the PRD's "Implementation Decisions" as later expansion, not in the PRD's "first implementation slice."

---

## File Structure

| File | Change |
|---|---|
| `react-app/src/features/storefront/model/cardStyleModel.js` | Add `priceTextColor` token + `resolveCardPriceTextColor` |
| `react-app/src/features/storefront/__tests__/cardStyleModel.test.js` | Test `priceTextColor` normalization + resolver |
| `react-app/src/features/storefront/model/storefrontBuilderModel.js` | Add `titleTextColor`/`typographyTone` page theme tokens, validate `cardTemplate` (`layoutStyle.variant`), thread `cardTemplate` through `buildCategoryConfigRow`/`resolveCategoryDraft`/`buildStorefrontSavePayload` |
| `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js` (new) | Direct normalization tests for the new tokens + backward compatibility |
| `react-app/src/features/storefront/model/sectionMatching.js` | Rename `displayVariant` → `cardTemplate` in `buildSections()` |
| `react-app/src/features/storefront/services/storefrontAiService.js` | Extend `STOREFRONT_AI_SCHEMA`, `normalizeStorefrontAiSuggestion`, `buildHeuristicSuggestion` (export it) for the 4 new fields |
| `react-app/src/features/storefront/__tests__/storefrontAiService.test.js` | Extend normalization test + new heuristic detection tests |
| `react-app/src/features/storefront/hooks/useStorefrontBuilder.js` | Add `titleTextColor`/`typographyTone` (page-level) and `cardTemplate` (category-level) state; thread through load, AI apply, undo, save, preview |
| `react-app/src/features/storefront/hooks/useStorefrontView.js` | Resolve `titleTextColorValue` and `typographyToneValue` for rendering |
| `react-app/src/features/storefront/components/StorefrontView.jsx` | Apply `--title-text-color`/`--typography-*` CSS vars on the page root |
| `react-app/src/features/storefront/components/StorefrontView.module.css` | Consume the new CSS vars on `.title` |
| `react-app/src/features/storefront/components/CardGridSection.jsx` | Consume `priceTextColor`, render per-`cardTemplate` slot order, pass `data-card-template` |
| `react-app/src/features/storefront/components/CardGridSection.module.css` | Consume `--title-text-color`/`--typography-*`/`--price-text-color`, add per-template layout rules |
| `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx` | New rendering tests: card templates, price/title color, typography weight, backward compatibility |
| `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx` | Extend the AI-apply/save/undo test with the 4 new fields |

---

### Task 1: `priceTextColor` token in `cardStyleModel.js`

**Files:**
- Modify: `react-app/src/features/storefront/model/cardStyleModel.js`
- Test: `react-app/src/features/storefront/__tests__/cardStyleModel.test.js`

**Interfaces:**
- Produces: `CARD_STYLE_PRICE_TEXT_COLOR_OPTIONS: string[]`, `resolveCardPriceTextColor(priceTextColor: string, accentColor: string): string`, `normalizeCardStyle(...)` now also returns `priceTextColor`.

- [ ] **Step 1: Write the failing test**

Add to `react-app/src/features/storefront/__tests__/cardStyleModel.test.js`:

```js
import {
  CARD_STYLE_FONT_SIZE_REM,
  normalizeCardStyle,
  resolveCardPriceTextColor,
} from '../model/cardStyleModel';

describe('priceTextColor', () => {
  it('defaults to "default" and falls back on invalid tokens', () => {
    expect(normalizeCardStyle({ priceTextColor: 'neon' }).priceTextColor).toBe('default');
    expect(normalizeCardStyle({ priceTextColor: 'muted' }).priceTextColor).toBe('muted');
    expect(normalizeCardStyle().priceTextColor).toBe('default');
  });

  it('resolves tokens to hex, with brand passing through the accent color', () => {
    expect(resolveCardPriceTextColor('default', '#2563eb')).toBe('#d32f2f');
    expect(resolveCardPriceTextColor('muted', '#2563eb')).toBe('#6b7280');
    expect(resolveCardPriceTextColor('brand', '#2563eb')).toBe('#2563eb');
    expect(resolveCardPriceTextColor('brand', undefined)).toBe('#1d4a2e');
  });
});
```

(Add `resolveCardPriceTextColor` to the existing top-of-file import statement from `'../model/cardStyleModel'` — merge with whatever is already imported there.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/cardStyleModel.test.js`
Expected: FAIL — `resolveCardPriceTextColor is not a function` / `priceTextColor` is `undefined`.

- [ ] **Step 3: Implement**

In `react-app/src/features/storefront/model/cardStyleModel.js`, change `DEFAULT_CARD_STYLE` to:

```js
export const DEFAULT_CARD_STYLE = {
  layout: 'grid',
  accentColor: '#1d4a2e',
  fontSize: 'medium',
  cardsPerRow: 2,
  imageSize: 'sm',
  imageFit: 'contain',
  cardRadius: 'lg',
  cardShadow: 'soft',
  cardSpacing: 'relaxed',
  priceTextColor: 'default',
};
```

After `export const CARD_STYLE_SPACING_OPTIONS = ['tight', 'normal', 'relaxed'];`, add:

```js
export const CARD_STYLE_PRICE_TEXT_COLOR_OPTIONS = ['default', 'brand', 'muted'];

export const CARD_STYLE_PRICE_TEXT_COLOR_VALUES = {
  default: '#d32f2f',
  muted: '#6b7280',
};

export function resolveCardPriceTextColor(priceTextColor, accentColor) {
  if (priceTextColor === 'brand') {
    return accentColor || DEFAULT_CARD_STYLE.accentColor;
  }

  return CARD_STYLE_PRICE_TEXT_COLOR_VALUES[priceTextColor] || CARD_STYLE_PRICE_TEXT_COLOR_VALUES.default;
}
```

In `normalizeCardStyle()`, add a line to the returned object (after `cardSpacing`):

```js
    cardSpacing: CARD_STYLE_SPACING_OPTIONS.includes(source.cardSpacing) ? source.cardSpacing : DEFAULT_CARD_STYLE.cardSpacing,
    priceTextColor: CARD_STYLE_PRICE_TEXT_COLOR_OPTIONS.includes(source.priceTextColor)
      ? source.priceTextColor
      : DEFAULT_CARD_STYLE.priceTextColor,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/cardStyleModel.test.js`
Expected: PASS (all tests in the file, including the pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/model/cardStyleModel.js react-app/src/features/storefront/__tests__/cardStyleModel.test.js
git commit -m "feat: add priceTextColor card style token"
```

---

### Task 2: Page theme tokens `titleTextColor` / `typographyTone` in `storefrontBuilderModel.js`

**Files:**
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- Test (new): `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `TITLE_TEXT_COLOR_OPTIONS: string[]`, `resolveTitleTextColor(titleTextColor: string, brandColor: string): string`, `TYPOGRAPHY_TONE_OPTIONS: string[]`, `TYPOGRAPHY_TONE_VALUES: Record<string, {headingWeight:number, bodyWeight:number, letterSpacing:string}>`, `CARD_TEMPLATE_OPTIONS: string[]`. `normalizePageConfig(...).theme` now also has `titleTextColor`, `typographyTone`.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js`:

```js
import { describe, expect, it } from 'vitest';

import {
  CARD_TEMPLATE_OPTIONS,
  TITLE_TEXT_COLOR_OPTIONS,
  TYPOGRAPHY_TONE_OPTIONS,
  TYPOGRAPHY_TONE_VALUES,
  normalizeCategoryConfig,
  normalizePageConfig,
  resolveTitleTextColor,
} from '../model/storefrontBuilderModel';

describe('page theme tokens', () => {
  it('defaults titleTextColor and typographyTone, and falls back on invalid values', () => {
    const config = normalizePageConfig({ theme: { titleTextColor: 'neon', typographyTone: 'screamy' } });

    expect(config.theme.titleTextColor).toBe('default');
    expect(config.theme.typographyTone).toBe('standard');
  });

  it('keeps a valid titleTextColor and typographyTone', () => {
    const config = normalizePageConfig({ theme: { titleTextColor: 'ink', typographyTone: 'bold' } });

    expect(config.theme.titleTextColor).toBe('ink');
    expect(config.theme.typographyTone).toBe('bold');
  });

  it('backward-compat: missing theme fields default without throwing', () => {
    const config = normalizePageConfig({});

    expect(config.theme.titleTextColor).toBe('default');
    expect(config.theme.typographyTone).toBe('standard');
  });

  it('resolves titleTextColor tokens to hex, with brand passing through brandColor', () => {
    expect(resolveTitleTextColor('default', '#2563eb')).toBe('#173223');
    expect(resolveTitleTextColor('ink', '#2563eb')).toBe('#0f172a');
    expect(resolveTitleTextColor('brand', '#2563eb')).toBe('#2563eb');
  });

  it('exposes a weight/letter-spacing pair for every typography tone', () => {
    TYPOGRAPHY_TONE_OPTIONS.forEach((tone) => {
      expect(TYPOGRAPHY_TONE_VALUES[tone]).toMatchObject({
        headingWeight: expect.any(Number),
        bodyWeight: expect.any(Number),
        letterSpacing: expect.any(String),
      });
    });
  });
});

describe('categoryConfig cardTemplate', () => {
  it('defaults to card-grid and rejects unapproved templates', () => {
    expect(normalizeCategoryConfig({ layoutStyle: { variant: 'image-left' } }).layoutStyle.variant).toBe('image-left');
    expect(normalizeCategoryConfig({ layoutStyle: { variant: 'totally-custom' } }).layoutStyle.variant).toBe('card-grid');
    expect(normalizeCategoryConfig({}).layoutStyle.variant).toBe('card-grid');
  });

  it('lists exactly the five approved templates', () => {
    expect(CARD_TEMPLATE_OPTIONS).toEqual(['card-grid', 'image-left', 'price-focus', 'compact-list', 'detail-first']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontBuilderModel.test.js`
Expected: FAIL — `resolveTitleTextColor is not a function`, `TYPOGRAPHY_TONE_VALUES is undefined`, and the `image-left` template gets coerced to `'card-grid'` because the enum isn't validated yet.

- [ ] **Step 3: Implement**

In `react-app/src/features/storefront/model/storefrontBuilderModel.js`, after the `STOREFRONT_DESIGN_ACCENT_COLORS` block (right before `export const DEFAULT_PAGE_CONFIG`), add:

```js
export const TITLE_TEXT_COLOR_OPTIONS = ['default', 'ink', 'charcoal', 'brand'];

export const TITLE_TEXT_COLOR_VALUES = {
  default: '#173223',
  ink: '#0f172a',
  charcoal: '#27272a',
};

export function resolveTitleTextColor(titleTextColor, brandColor) {
  if (titleTextColor === 'brand') {
    return brandColor || TITLE_TEXT_COLOR_VALUES.default;
  }

  return TITLE_TEXT_COLOR_VALUES[titleTextColor] || TITLE_TEXT_COLOR_VALUES.default;
}

export const TYPOGRAPHY_TONE_OPTIONS = ['standard', 'clean', 'soft', 'bold', 'official'];

export const TYPOGRAPHY_TONE_VALUES = {
  standard: { headingWeight: 800, bodyWeight: 600, letterSpacing: 'normal' },
  clean: { headingWeight: 700, bodyWeight: 500, letterSpacing: '0.01em' },
  soft: { headingWeight: 600, bodyWeight: 500, letterSpacing: 'normal' },
  bold: { headingWeight: 800, bodyWeight: 700, letterSpacing: '-0.01em' },
  official: { headingWeight: 700, bodyWeight: 600, letterSpacing: '0.02em' },
};

export const CARD_TEMPLATE_OPTIONS = ['card-grid', 'image-left', 'price-focus', 'compact-list', 'detail-first'];
```

Change `DEFAULT_PAGE_CONFIG.theme` to:

```js
  theme: {
    brandColor: DEFAULT_CARD_STYLE.accentColor,
    backgroundTone: STOREFRONT_BACKGROUND_TONES.friendly,
    titleTextColor: 'default',
    typographyTone: 'standard',
  },
```

In `normalizePageConfig()`, change the `theme:` block to:

```js
    theme: {
      brandColor: toTrimmedString(sourceTheme.brandColor) || DEFAULT_PAGE_CONFIG.theme.brandColor,
      backgroundTone:
        toTrimmedString(sourceTheme.backgroundTone) || STOREFRONT_BACKGROUND_TONES[designDirection],
      titleTextColor: TITLE_TEXT_COLOR_OPTIONS.includes(sourceTheme.titleTextColor)
        ? sourceTheme.titleTextColor
        : DEFAULT_PAGE_CONFIG.theme.titleTextColor,
      typographyTone: TYPOGRAPHY_TONE_OPTIONS.includes(sourceTheme.typographyTone)
        ? sourceTheme.typographyTone
        : DEFAULT_PAGE_CONFIG.theme.typographyTone,
    },
```

In `normalizeCategoryConfig()`, change the `layoutStyle:` block from:

```js
    layoutStyle: {
      variant: toTrimmedString(source.layoutStyle?.variant) || 'card-grid',
    },
```

to:

```js
    layoutStyle: {
      variant: CARD_TEMPLATE_OPTIONS.includes(source.layoutStyle?.variant) ? source.layoutStyle.variant : 'card-grid',
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontBuilderModel.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full storefront suite to check for regressions**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: PASS — `normalizeCategoryConfigRow`/`PublicStorefrontPage` tests already pass `layoutStyle: { variant: 'card-grid' }`, which is still valid under the new enum.

- [ ] **Step 6: Commit**

```bash
git add react-app/src/features/storefront/model/storefrontBuilderModel.js react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js
git commit -m "feat: add page-level titleTextColor/typographyTone tokens and validate cardTemplate enum"
```

---

### Task 3: Thread `cardTemplate` through the write path (`buildCategoryConfigRow`, `resolveCategoryDraft`, `buildStorefrontSavePayload`)

**Files:**
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- Test: `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js`

**Interfaces:**
- Consumes: `CARD_TEMPLATE_OPTIONS` (Task 2).
- Produces: `buildCategoryConfigRow({..., cardTemplate})`, `resolveCategoryDraft(...)` return value now includes `cardTemplate`, `buildStorefrontSavePayload({..., cardTemplate})`.

Today `layoutStyle.variant` is computed but there is no parameter on `buildCategoryConfigRow` to ever set it to anything other than whatever was already saved (or `'card-grid'`) — this task adds the missing write path.

- [ ] **Step 1: Write the failing test**

Add to `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js`:

```js
import { buildCategoryConfigRow, buildStorefrontSavePayload, resolveCategoryDraft } from '../model/storefrontBuilderModel';

describe('cardTemplate write path', () => {
  it('buildCategoryConfigRow accepts an explicit cardTemplate', () => {
    const row = buildCategoryConfigRow({
      productCategoryName: 'Fertilizer Upload',
      existingConfig: null,
      selectedMediumCategories: ['Premium'],
      representativeMediumCategory: 'Premium',
      cardFields: ['product_name'],
      cardStyle: {},
      cardElementConfig: {},
      cardTemplate: 'price-focus',
    });

    expect(row.categoryConfig.layoutStyle.variant).toBe('price-focus');
  });

  it('buildCategoryConfigRow falls back to the existing saved template when none is passed', () => {
    const existingConfig = {
      categoryConfigs: [
        {
          productCategoryName: 'Fertilizer Upload',
          categoryConfig: { layoutStyle: { variant: 'image-left' } },
        },
      ],
    };
    const row = buildCategoryConfigRow({
      productCategoryName: 'Fertilizer Upload',
      existingConfig,
      selectedMediumCategories: ['Premium'],
      representativeMediumCategory: 'Premium',
      cardFields: ['product_name'],
      cardStyle: {},
      cardElementConfig: {},
    });

    expect(row.categoryConfig.layoutStyle.variant).toBe('image-left');
  });

  it('resolveCategoryDraft surfaces the saved cardTemplate', () => {
    const draft = resolveCategoryDraft({
      productCategoryName: 'Fertilizer Upload',
      productEntries: [{ categoryName: 'Fertilizer Upload', rows: [{ medium_category: 'Premium' }] }],
      existingConfig: {
        categoryConfigs: [
          {
            productCategoryName: 'Fertilizer Upload',
            categoryConfig: { layoutStyle: { variant: 'compact-list' } },
          },
        ],
      },
    });

    expect(draft.cardTemplate).toBe('compact-list');
  });

  it('buildStorefrontSavePayload threads cardTemplate into the saved category row', () => {
    const payload = buildStorefrontSavePayload({
      officeCode: 'OFF-1',
      existingConfig: null,
      hiddenProducts: [],
      selectedProductCategoryName: 'Fertilizer Upload',
      selectedMediumCategories: ['Premium'],
      representativeMediumCategory: 'Premium',
      cardStyle: {},
      cardFields: ['product_name'],
      cardElementConfig: {},
      navConfig: {},
      designDirection: 'friendly',
      mobileUiTree: [],
      cardTemplate: 'detail-first',
    });

    expect(payload.categoryConfigs[0].categoryConfig.layoutStyle.variant).toBe('detail-first');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontBuilderModel.test.js`
Expected: FAIL — `row.categoryConfig.layoutStyle.variant` stays `'card-grid'` because `cardTemplate` is silently dropped, and `draft.cardTemplate` is `undefined`.

- [ ] **Step 3: Implement**

In `buildCategoryConfigRow()`, add `cardTemplate` to the destructured params and use it in the `layoutStyle` block:

```js
export function buildCategoryConfigRow({
  productCategoryName,
  existingConfig,
  selectedMediumCategories,
  representativeMediumCategory,
  cardFields,
  cardStyle,
  cardElementConfig,
  cardTemplate,
  allowedScalarKeys,
}) {
  const normalizedProductCategoryName = toTrimmedString(productCategoryName);
  const existingRow = findCategoryConfigRow(existingConfig?.categoryConfigs, normalizedProductCategoryName);
  const nextCategoryConfig = normalizeCategoryConfig(
    {
      ...(existingRow?.categoryConfig ?? {}),
      displayName: normalizedProductCategoryName,
      sourceCategoryName: normalizedProductCategoryName,
      selectedMediumCategories,
      representativeMediumCategory,
      layoutStyle: {
        variant: CARD_TEMPLATE_OPTIONS.includes(cardTemplate)
          ? cardTemplate
          : existingRow?.categoryConfig?.layoutStyle?.variant || 'card-grid',
      },
      cardDesign: {
        visibleFields: cardFields,
        style: cardStyle,
        elementConfig: cardElementConfig,
      },
    },
    normalizedProductCategoryName,
    allowedScalarKeys,
  );

  return {
    productCategoryName: normalizedProductCategoryName,
    sortOrder:
      existingRow?.sortOrder ??
      (Array.isArray(existingConfig?.categoryConfigs) ? existingConfig.categoryConfigs.length : 0),
    categoryConfig: nextCategoryConfig,
  };
}
```

In `resolveCategoryDraft()`, add `cardTemplate` to the returned object (right after `cardElementConfig`):

```js
  return {
    entry: entry ?? null,
    mediumCategoryOptions,
    selectedMediumCategories,
    representativeMediumCategory,
    cardFields: normalizeCardFields(existingCategoryConfig.cardDesign.visibleFields, effectiveScalarKeys),
    cardStyle: normalizeCardStyle(existingCategoryConfig.cardDesign.style),
    cardElementConfig: normalizeCardElementConfig(existingCategoryConfig.cardDesign.elementConfig),
    cardTemplate: existingCategoryConfig.layoutStyle.variant,
  };
```

In `buildStorefrontSavePayload()`, add `cardTemplate` to the destructured params and forward it into the `buildCategoryConfigRow({...})` call:

```js
export function buildStorefrontSavePayload({
  officeCode,
  existingConfig,
  hiddenProducts,
  selectedProductCategoryName,
  selectedMediumCategories,
  representativeMediumCategory,
  cardStyle,
  cardFields,
  cardElementConfig,
  navConfig,
  designDirection,
  mobileUiTree,
  cardTemplate,
  allowedScalarKeys,
}) {
```

...and in the `buildCategoryConfigRow({...})` call inside it, add `cardTemplate,` to the passed object (right after `cardElementConfig: normalizeCardElementConfig(cardElementConfig),`).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontBuilderModel.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full storefront suite**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: PASS — existing callers of `buildCategoryConfigRow`/`buildStorefrontSavePayload` that don't pass `cardTemplate` keep their old behavior (falls back to existing/`'card-grid'`).

- [ ] **Step 6: Commit**

```bash
git add react-app/src/features/storefront/model/storefrontBuilderModel.js react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js
git commit -m "feat: thread cardTemplate through the storefront save/draft-resolve path"
```

---

### Task 4: Rename `displayVariant` → `cardTemplate` in `sectionMatching.js`

**Files:**
- Modify: `react-app/src/features/storefront/model/sectionMatching.js`

**Interfaces:**
- Produces: `buildSections(...)` section objects now have a `cardTemplate` key instead of `displayVariant`.

- [ ] **Step 1: Implement the rename**

In `react-app/src/features/storefront/model/sectionMatching.js`, in `buildSections()`, change:

```js
        displayVariant: categoryConfig.layoutStyle?.variant || 'card-grid',
```

to:

```js
        cardTemplate: categoryConfig.layoutStyle?.variant || 'card-grid',
```

- [ ] **Step 2: Run the full storefront suite to confirm nothing references the old key**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: PASS — `displayVariant` was never consumed anywhere (verified earlier via repo-wide grep), so this is a pure rename with no behavior change yet.

- [ ] **Step 3: Commit**

```bash
git add react-app/src/features/storefront/model/sectionMatching.js
git commit -m "refactor: rename section displayVariant to cardTemplate"
```

---

### Task 5: Extend the AI suggestion seam (`storefrontAiService.js`)

**Files:**
- Modify: `react-app/src/features/storefront/services/storefrontAiService.js`
- Test: `react-app/src/features/storefront/__tests__/storefrontAiService.test.js`

**Interfaces:**
- Consumes: `TITLE_TEXT_COLOR_OPTIONS`, `TYPOGRAPHY_TONE_OPTIONS`, `CARD_TEMPLATE_OPTIONS` (Task 2), `CARD_STYLE_PRICE_TEXT_COLOR_OPTIONS` (Task 1, via `normalizeCardStyle`).
- Produces: `normalizeStorefrontAiSuggestion(...)` patch now includes `titleTextColor`, `typographyTone`, `cardTemplate` (and `cardStyle.priceTextColor` via the existing `normalizeCardStyle` call). `buildHeuristicSuggestion` is now exported.

- [ ] **Step 1: Write the failing test**

Add to `react-app/src/features/storefront/__tests__/storefrontAiService.test.js`:

```js
import { buildHeuristicSuggestion, normalizeStorefrontAiSuggestion, STOREFRONT_AI_SCHEMA } from '../services/storefrontAiService';

describe('normalizeStorefrontAiSuggestion new tokens', () => {
  it('normalizes titleTextColor, typographyTone, cardTemplate, and cardStyle.priceTextColor', () => {
    const result = normalizeStorefrontAiSuggestion(
      {
        summary: 'updated',
        patch: {
          designDirection: 'warm',
          selectedMediumCategories: ['Premium'],
          representativeMediumCategory: 'Premium',
          cardFields: ['product_name'],
          cardStyle: { priceTextColor: 'muted' },
          navConfig: {},
          mobileUiTree: [],
          cardElementConfig: {},
          uiChangeSummary: [],
          titleTextColor: 'ink',
          typographyTone: 'bold',
          cardTemplate: 'price-focus',
        },
      },
      ['Premium'],
    );

    expect(result.patch.titleTextColor).toBe('ink');
    expect(result.patch.typographyTone).toBe('bold');
    expect(result.patch.cardTemplate).toBe('price-focus');
    expect(result.patch.cardStyle.priceTextColor).toBe('muted');
  });

  it('falls back to defaults for unapproved values', () => {
    const result = normalizeStorefrontAiSuggestion(
      {
        summary: 'updated',
        patch: {
          titleTextColor: 'neon-pink',
          typographyTone: 'screamy',
          cardTemplate: 'free-form-html',
          cardStyle: {},
          selectedMediumCategories: [],
          cardFields: [],
          navConfig: {},
          mobileUiTree: [],
          cardElementConfig: {},
          uiChangeSummary: [],
        },
      },
      ['Premium'],
    );

    expect(result.patch.titleTextColor).toBe('default');
    expect(result.patch.typographyTone).toBe('standard');
    expect(result.patch.cardTemplate).toBe('card-grid');
  });
});

describe('STOREFRONT_AI_SCHEMA new fields', () => {
  it('declares titleTextColor, typographyTone, and cardTemplate as required enums on patch', () => {
    expect(STOREFRONT_AI_SCHEMA.properties.patch.properties.titleTextColor.enum).toContain('ink');
    expect(STOREFRONT_AI_SCHEMA.properties.patch.properties.typographyTone.enum).toContain('bold');
    expect(STOREFRONT_AI_SCHEMA.properties.patch.properties.cardTemplate.enum).toContain('price-focus');
    expect(STOREFRONT_AI_SCHEMA.properties.patch.required).toEqual(
      expect.arrayContaining(['titleTextColor', 'typographyTone', 'cardTemplate']),
    );
    expect(STOREFRONT_AI_SCHEMA.properties.patch.properties.cardStyle.properties.priceTextColor.enum).toContain('brand');
  });
});

describe('buildHeuristicSuggestion new tokens', () => {
  it('detects darker title text, a cleaner font, and an image-left template from the prompt', () => {
    const result = buildHeuristicSuggestion({
      prompt: 'make the title darker, use a cleaner font, and put the image on the left',
      mediumCategoryOptions: ['Premium'],
      currentDraft: {},
      allowedScalarKeys: undefined,
    });

    expect(result.patch.titleTextColor).toBe('ink');
    expect(result.patch.typographyTone).toBe('clean');
    expect(result.patch.cardTemplate).toBe('image-left');
  });

  it('detects bold/official typography and a price-focus template', () => {
    const result = buildHeuristicSuggestion({
      prompt: 'make it bolder and more official-looking, focus on price first',
      mediumCategoryOptions: ['Premium'],
      currentDraft: {},
      allowedScalarKeys: undefined,
    });

    expect(result.patch.typographyTone).toBe('bold');
    expect(result.patch.cardTemplate).toBe('price-focus');
  });

  it('defaults to standard/card-grid/default when nothing matches', () => {
    const result = buildHeuristicSuggestion({
      prompt: 'just refresh the page',
      mediumCategoryOptions: ['Premium'],
      currentDraft: {},
      allowedScalarKeys: undefined,
    });

    expect(result.patch.titleTextColor).toBe('default');
    expect(result.patch.typographyTone).toBe('standard');
    expect(result.patch.cardTemplate).toBe('card-grid');
    expect(result.patch.cardStyle.priceTextColor).toBe('default');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontAiService.test.js`
Expected: FAIL — `buildHeuristicSuggestion` isn't exported, the new schema properties don't exist, and `normalizeStorefrontAiSuggestion` drops the new fields.

- [ ] **Step 3: Implement — imports and schema**

In `react-app/src/features/storefront/services/storefrontAiService.js`, change the imports from `storefrontBuilderModel`:

```js
import {
  CARD_TEMPLATE_OPTIONS,
  DEFAULT_CARD_FIELDS,
  DEFAULT_NAV_CONFIG,
  STOREFRONT_DESIGN_DIRECTIONS,
  STOREFRONT_FIELD_OPTIONS,
  TITLE_TEXT_COLOR_OPTIONS,
  TYPOGRAPHY_TONE_OPTIONS,
  normalizeCardFields,
  normalizeNavConfig,
} from '../model/storefrontBuilderModel';
```

In `STOREFRONT_AI_SCHEMA.properties.patch.properties`, add three new properties (place them right after `designDirection`):

```js
        designDirection: {
          type: 'string',
          enum: STOREFRONT_DESIGN_DIRECTIONS.map((option) => option.id),
        },
        titleTextColor: { type: 'string', enum: TITLE_TEXT_COLOR_OPTIONS },
        typographyTone: { type: 'string', enum: TYPOGRAPHY_TONE_OPTIONS },
        cardTemplate: { type: 'string', enum: CARD_TEMPLATE_OPTIONS },
```

In the nested `cardStyle` schema's `properties`, add `priceTextColor` (after `cardSpacing`):

```js
            cardSpacing: { type: 'string', enum: ['tight', 'normal', 'relaxed'] },
            priceTextColor: { type: 'string', enum: ['default', 'brand', 'muted'] },
```

and add `'priceTextColor'` to that same `cardStyle` schema's `required` array (after `'cardSpacing'`).

Update `patch`'s top-level `required` array to:

```js
      required: [
        'designDirection',
        'titleTextColor',
        'typographyTone',
        'selectedMediumCategories',
        'representativeMediumCategory',
        'cardFields',
        'cardStyle',
        'navConfig',
        'mobileUiTree',
        'cardElementConfig',
        'cardTemplate',
        'uiChangeSummary',
      ],
```

- [ ] **Step 4: Implement — normalization**

In `normalizeStorefrontAiSuggestion()`, add to the returned `patch` object (right after `designDirection: toTrimmedString(patch.designDirection) || 'friendly',`):

```js
      titleTextColor: TITLE_TEXT_COLOR_OPTIONS.includes(patch.titleTextColor) ? patch.titleTextColor : 'default',
      typographyTone: TYPOGRAPHY_TONE_OPTIONS.includes(patch.typographyTone) ? patch.typographyTone : 'standard',
```

and after `cardFields: normalizeCardFields(patch.cardFields, allowedScalarKeys),`:

```js
      cardTemplate: CARD_TEMPLATE_OPTIONS.includes(patch.cardTemplate) ? patch.cardTemplate : 'card-grid',
```

(`cardStyle: normalizeCardStyle(patch.cardStyle)` is unchanged — Task 1 already made it validate `priceTextColor`.)

- [ ] **Step 5: Implement — heuristic fallback**

Export `buildHeuristicSuggestion` (change `function buildHeuristicSuggestion` to `export function buildHeuristicSuggestion`).

Add four new detector functions near the other `detectXxx` helpers (after `detectCardSpacing`):

```js
function detectTitleTextColor(prompt) {
  const text = prompt.toLowerCase();

  if (text.includes('darker') || text.includes('진하게') || text.includes('어둡게')) {
    return 'ink';
  }

  if (text.includes('official') || text.includes('공식적') || text.includes('단정')) {
    return 'charcoal';
  }

  if (text.includes('brand color') || text.includes('브랜드 색') || text.includes('브랜드색')) {
    return 'brand';
  }

  return 'default';
}

function detectTypographyTone(prompt) {
  const text = prompt.toLowerCase();

  if (text.includes('bold') || text.includes('굵게') || text.includes('강하게')) {
    return 'bold';
  }

  if (text.includes('official') || text.includes('공식적') || text.includes('격식')) {
    return 'official';
  }

  if (text.includes('soft') || text.includes('부드럽')) {
    return 'soft';
  }

  if (text.includes('clean') || text.includes('깔끔')) {
    return 'clean';
  }

  return 'standard';
}

function detectCardTemplate(prompt) {
  const text = prompt.toLowerCase();

  if (text.includes('image left') || text.includes('image on the left') || text.includes('이미지 왼쪽')) {
    return 'image-left';
  }

  if (text.includes('price first') || text.includes('price focus') || text.includes('가격 우선') || text.includes('가격 강조')) {
    return 'price-focus';
  }

  if (text.includes('compact list') || text.includes('list layout') || text.includes('목록형') || text.includes('리스트형')) {
    return 'compact-list';
  }

  if (text.includes('detail first') || text.includes('details first') || text.includes('정보 먼저')) {
    return 'detail-first';
  }

  return 'card-grid';
}

function detectPriceTextColor(prompt) {
  const text = prompt.toLowerCase();

  if (text.includes('muted price') || text.includes('가격 흐리게') || text.includes('가격 톤다운')) {
    return 'muted';
  }

  if (text.includes('brand price') || text.includes('price brand') || text.includes('가격 브랜드')) {
    return 'brand';
  }

  return 'default';
}
```

In `buildHeuristicSuggestion()`, add `titleTextColor`/`typographyTone`/`cardTemplate` to the returned `patch` object (after `designDirection,`):

```js
    patch: {
      designDirection,
      titleTextColor: detectTitleTextColor(prompt),
      typographyTone: detectTypographyTone(prompt),
```

and add `cardTemplate: detectCardTemplate(prompt),` right after the `cardFields: detectFields(prompt, allowedScalarKeys),` line.

In the `cardStyle: normalizeCardStyle({...})` call inside `buildHeuristicSuggestion()`, add `priceTextColor: detectPriceTextColor(prompt),` as a new property (after `cardSpacing: detectCardSpacing(prompt),`).

- [ ] **Step 6: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontAiService.test.js`
Expected: PASS — including the pre-existing `STOREFRONT_AI_SCHEMA satisfies OpenAI strict structured-output rules` test, which re-validates the expanded schema is still strict-mode compliant.

- [ ] **Step 7: Commit**

```bash
git add react-app/src/features/storefront/services/storefrontAiService.js react-app/src/features/storefront/__tests__/storefrontAiService.test.js
git commit -m "feat: normalize titleTextColor/typographyTone/cardTemplate/priceTextColor in the AI suggestion seam"
```

---

### Task 6: Thread the new fields through `useStorefrontBuilder.js`

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`

**Interfaces:**
- Consumes: `resolveCategoryDraft(...).cardTemplate` (Task 3), `normalizePageConfig(...).theme.{titleTextColor,typographyTone}` (Task 2), `suggestion.patch.{titleTextColor,typographyTone,cardTemplate}` (Task 5), `buildStorefrontSavePayload({...cardTemplate})` (Task 3).
- Produces: no new public return fields (per Global Constraints, these fields are AI-applied/persisted only in this slice — no manual setters). `saveDraft`/`previewConfig`/`applyAiSuggestion`/`undoAiChanges` now carry the 3 new values end-to-end.

This task has no isolated unit test of its own — `useStorefrontBuilder` has no dedicated test file today (it's exercised through `StorefrontBuilderPage.test.jsx`, extended in Task 9). Verify this task by re-running that suite after Task 9's edits; for now just confirm the existing suite still passes.

- [ ] **Step 1: Add page-level state and load it**

In `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`, add two new `useState` lines (right after `const [designDirection, setDesignDirectionState] = useState(DEFAULT_PAGE_CONFIG.designDirection);`):

```js
  const [titleTextColor, setTitleTextColor] = useState(DEFAULT_PAGE_CONFIG.theme.titleTextColor);
  const [typographyTone, setTypographyTone] = useState(DEFAULT_PAGE_CONFIG.theme.typographyTone);
```

In the initial-load `useEffect`, right after `setDesignDirectionState(normalizedPageConfig.designDirection);`, add:

```js
        setTitleTextColor(normalizedPageConfig.theme.titleTextColor);
        setTypographyTone(normalizedPageConfig.theme.typographyTone);
```

- [ ] **Step 2: Add category-level `cardTemplate` state and load it**

Add a new `useState` line next to `cardElementConfig`:

```js
  const [cardTemplate, setCardTemplateState] = useState('card-grid');
```

In `hydrateCategoryDraft()`, add a line after `setCardElementConfig(resolvedDraft.cardElementConfig);`:

```js
    setCardTemplateState(resolvedDraft.cardTemplate);
```

- [ ] **Step 3: Thread through `applyAiSuggestion`**

In the `currentDraft` object passed to `requestStorefrontAiSuggestion`, add the three current values (after `designDirection,`):

```js
        currentDraft: {
          productCategoryName: selectedProductCategoryName,
          selectedMediumCategories,
          representativeMediumCategory,
          designDirection,
          titleTextColor,
          typographyTone,
          cardFields,
          cardStyle,
          cardElementConfig,
          cardTemplate,
          navConfig,
          mobileUiTree,
        },
```

In the `snapshot` object (used for undo), add the same three fields:

```js
      const snapshot = {
        selectedMediumCategories,
        representativeMediumCategory,
        designDirection,
        titleTextColor,
        typographyTone,
        cardFields,
        cardStyle,
        cardElementConfig,
        cardTemplate,
        navConfig,
        mobileUiTree,
        aiSummary,
        aiChangeSummary,
      };
```

Inside the `startTransition(() => { ... })` block, add three lines after `setDesignDirectionState(suggestion.patch.designDirection || designDirection);`:

```js
        setTitleTextColor(suggestion.patch.titleTextColor);
        setTypographyTone(suggestion.patch.typographyTone);
```

and one line after `setCardFields(normalizeCardFields(suggestion.patch.cardFields, effectiveScalarKeys));`:

```js
        setCardTemplateState(suggestion.patch.cardTemplate);
```

- [ ] **Step 4: Thread through `undoAiChanges`**

Add to `undoAiChanges()` (after `setDesignDirectionState(lastAiSnapshot.designDirection);`):

```js
    setTitleTextColor(lastAiSnapshot.titleTextColor);
    setTypographyTone(lastAiSnapshot.typographyTone);
```

and after `setCardFields(lastAiSnapshot.cardFields);`:

```js
    setCardTemplateState(lastAiSnapshot.cardTemplate);
```

- [ ] **Step 5: Thread through save/preview**

`buildStorefrontSavePayload` doesn't yet receive `titleTextColor`/`typographyTone` — those live in `pageConfig.theme`, which is built from `navConfig`/`designDirection` today. The cleanest seam is `navConfig`, since `buildStorefrontSavePayload` already folds `navConfig.brandColor` into `nextPageConfig.theme.brandColor`. Instead of overloading `navConfig`, pass them as their own params and fold them into `nextPageConfig` directly.

In `storefrontBuilderModel.js`'s `buildStorefrontSavePayload()` (Task 3 already added `cardTemplate` to its params — extend the same destructure):

```js
export function buildStorefrontSavePayload({
  officeCode,
  existingConfig,
  hiddenProducts,
  selectedProductCategoryName,
  selectedMediumCategories,
  representativeMediumCategory,
  cardStyle,
  cardFields,
  cardElementConfig,
  navConfig,
  designDirection,
  titleTextColor,
  typographyTone,
  mobileUiTree,
  cardTemplate,
  allowedScalarKeys,
}) {
```

In the `nextPageConfig = normalizePageConfig({...})` call inside it, change the `theme:` block to:

```js
    theme: {
      ...basePageConfig.theme,
      brandColor: resolvedNavConfig.brandColor,
      backgroundTone: STOREFRONT_BACKGROUND_TONES[nextDesignDirection],
      titleTextColor: TITLE_TEXT_COLOR_OPTIONS.includes(titleTextColor) ? titleTextColor : basePageConfig.theme.titleTextColor,
      typographyTone: TYPOGRAPHY_TONE_OPTIONS.includes(typographyTone) ? typographyTone : basePageConfig.theme.typographyTone,
    },
```

Now back in `useStorefrontBuilder.js`: in both `saveDraft()`'s `buildStorefrontSavePayload({...})` call and the `previewConfig` computation's `buildStorefrontSavePayload({...})` call, add two lines (after `designDirection,`):

```js
        titleTextColor,
        typographyTone,
```

and one line (after `mobileUiTree,`):

```js
        cardTemplate,
```

(both calls need the same three additions — `saveDraft` and `previewConfig` already call `buildStorefrontSavePayload` with near-identical argument objects).

- [ ] **Step 6: Run the full storefront suite**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: PASS — no behavior change yet for existing tests since `titleTextColor`/`typographyTone`/`cardTemplate` default to `'default'`/`'standard'`/`'card-grid'`, matching today's hardcoded behavior.

- [ ] **Step 7: Commit**

```bash
git add react-app/src/features/storefront/hooks/useStorefrontBuilder.js react-app/src/features/storefront/model/storefrontBuilderModel.js
git commit -m "feat: thread titleTextColor/typographyTone/cardTemplate through useStorefrontBuilder"
```

---

### Task 7: Resolve and render page-level typography/title color (`useStorefrontView.js`, `StorefrontView.jsx`, `StorefrontView.module.css`)

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontView.js`
- Modify: `react-app/src/features/storefront/components/StorefrontView.jsx`
- Modify: `react-app/src/features/storefront/components/StorefrontView.module.css`

**Interfaces:**
- Consumes: `resolveTitleTextColor`, `TYPOGRAPHY_TONE_VALUES` (Task 2).
- Produces: `useStorefrontView(...)` return value gains `titleTextColorValue: string` and `typographyToneValue: {headingWeight, bodyWeight, letterSpacing}`.

- [ ] **Step 1: Implement in `useStorefrontView.js`**

Change the import from `storefrontBuilderModel`:

```js
import { normalizePageConfig, STOREFRONT_DESIGN_ACCENT_COLORS, TYPOGRAPHY_TONE_VALUES, resolveTitleTextColor } from '../model/storefrontBuilderModel';
```

After the line `const chipAccentColor = STOREFRONT_DESIGN_ACCENT_COLORS[designDirection] || brandColor;`, add:

```js
  const titleTextColorValue = resolveTitleTextColor(resolvedPageConfig.theme.titleTextColor, brandColor);
  const typographyToneValue = TYPOGRAPHY_TONE_VALUES[resolvedPageConfig.theme.typographyTone] || TYPOGRAPHY_TONE_VALUES.standard;
```

In the returned object, add both (after `chipAccentColor,`):

```js
    titleTextColorValue,
    typographyToneValue,
```

- [ ] **Step 2: Implement in `StorefrontView.jsx`**

Change the root `<div>`'s `style` prop from:

```jsx
      style={{ '--brand-color': view.brandColor, '--chip-accent': view.chipAccentColor }}
```

to:

```jsx
      style={{
        '--brand-color': view.brandColor,
        '--chip-accent': view.chipAccentColor,
        '--title-text-color': view.titleTextColorValue,
        '--typography-heading-weight': view.typographyToneValue.headingWeight,
        '--typography-body-weight': view.typographyToneValue.bodyWeight,
        '--typography-letter-spacing': view.typographyToneValue.letterSpacing,
      }}
```

- [ ] **Step 3: Implement in `StorefrontView.module.css`**

Change `.title` from:

```css
.title {
  margin: 4px 0 0;
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.12;
  color: #173223;
}
```

to:

```css
.title {
  margin: 4px 0 0;
  font-size: 1.6rem;
  font-weight: var(--typography-heading-weight, 800);
  letter-spacing: var(--typography-letter-spacing, normal);
  line-height: 1.12;
  color: var(--title-text-color, #173223);
}
```

- [ ] **Step 4: Run the full storefront suite**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: PASS — `'default'`/`'standard'` resolve to `#173223`/`800`/`normal`, identical to the previous hardcoded values, so no existing assertion changes.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/hooks/useStorefrontView.js react-app/src/features/storefront/components/StorefrontView.jsx react-app/src/features/storefront/components/StorefrontView.module.css
git commit -m "feat: render page-level title color and typography tone as CSS custom properties"
```

---

### Task 8: Render card templates and price color in `CardGridSection.jsx` / `.module.css`

**Files:**
- Modify: `react-app/src/features/storefront/components/CardGridSection.jsx`
- Modify: `react-app/src/features/storefront/components/CardGridSection.module.css`

**Interfaces:**
- Consumes: `resolveCardPriceTextColor` (Task 1), `cardTemplate` prop (wired in Task 9 from `section.cardTemplate`, Task 4's rename).
- Produces: `CardGridSection` accepts a new `cardTemplate` prop (default `'card-grid'`); renders `data-card-template={cardTemplate}` on the section root; reorders the header/image/body slots per template; section/card titles and field values consume `--title-text-color`/`--typography-*`; price values consume `--price-text-color`.

- [ ] **Step 1: Implement in `CardGridSection.jsx`**

Change the import line to add `resolveCardPriceTextColor`:

```js
import { CARD_STYLE_FONT_SIZE_REM, normalizeCardStyle, resolveCardPriceTextColor } from '../model/cardStyleModel';
```

Change the component signature and the `cssVars` block:

```js
export default function CardGridSection({
  section,
  fields,
  style,
  sectionId,
  cardTemplate = 'card-grid',
  sectionHeaderContent = null,
}) {
  const products = Array.isArray(section?.products) ? section.products : [];
  const displayFields = Array.isArray(fields) && fields.length > 0 ? fields : ['product_name'];
  const title = section?.title || section?.productCategoryName || '상품';
  const elementConfig = deriveCardElementConfig(displayFields, style, section?.elementConfig);
  const resolvedStyle = normalizeCardStyle({
    ...(style ?? {}),
    imageSize: elementConfig.showImage ? elementConfig.imageSize : 'hidden',
    imageFit: elementConfig.imageFit,
  });
  const priceTextColor = resolveCardPriceTextColor(resolvedStyle.priceTextColor, resolvedStyle.accentColor);
  const cssVars = {
    '--card-accent': resolvedStyle.accentColor,
    '--card-font-size': CARD_STYLE_FONT_SIZE_REM[resolvedStyle.fontSize],
    '--card-columns': resolvedStyle.cardsPerRow,
    '--price-text-color': priceTextColor,
  };
```

Add `data-card-template={cardTemplate}` to the `<section>` element's attributes (alongside the existing `data-image-size`, `data-card-radius`, etc.):

```jsx
    <section
      id={sectionId}
      className={styles.section}
      style={cssVars}
      data-image-size={resolvedStyle.imageSize}
      data-image-fit={resolvedStyle.imageFit}
      data-card-radius={resolvedStyle.cardRadius}
      data-card-shadow={resolvedStyle.cardShadow}
      data-card-spacing={resolvedStyle.cardSpacing}
      data-meta-density={elementConfig.metaDensity}
      data-card-template={cardTemplate}
    >
```

Replace the `<h2 className={styles.title}>{title}</h2>` heading's class is unchanged — its color/weight come from CSS in Step 2.

Replace the per-product `<article>` body. Today it always renders `cardHeader` → `cardImageWrap` → `cardBody` in that fixed JSX order. Change the `.map()` callback to build each slot once, then assemble them per `cardTemplate`:

```jsx
        {products.map((product, index) => {
          const headerSlot = elementConfig.showProductName ? (
            <div className={styles.cardHeader} key="header">
              <strong className={styles.cardName} title={product?.product_name || '-'}>
                {product?.product_name || '-'}
              </strong>
            </div>
          ) : null;

          const imageSlot =
            product?.img_url && elementConfig.showImage && resolvedStyle.imageSize !== 'hidden' ? (
              <div className={styles.cardImageWrap} key="image">
                <img className={styles.cardImage} src={product.img_url} alt={product?.product_name || ''} />
              </div>
            ) : null;

          const orderedFields = sortFieldKeysByDisplayOrder(
            displayFields
              .filter((field) => field !== 'img_url' && field !== 'product_name' && field !== 'medium_category')
              .filter((field) => {
                if (field === 'spec') return elementConfig.showSpec;
                if (field === 'nutrient') return elementConfig.showNutrient;
                if (PRICE_FIELD_SET.has(field)) return elementConfig.showPrice;
                return true;
              })
              .filter((field) => {
                if (PRICE_FIELD_SET.has(field)) return renderFieldValue(field, product?.[field]) !== '';
                return true;
              }),
          );
          const sortedFields =
            cardTemplate === 'price-focus'
              ? [...orderedFields].sort((a, b) => Number(PRICE_FIELD_SET.has(b)) - Number(PRICE_FIELD_SET.has(a)))
              : orderedFields;

          const bodySlot = (
            <div className={styles.cardBody} key="body">
              {sortedFields.map((field) => (
                <div key={field} className={PRICE_FIELD_SET.has(field) ? styles.priceField : styles.field}>
                  <span className={styles.fieldLabel}>{STOREFRONT_FIELD_LABELS[field] || field}</span>
                  <span className={styles.fieldValue}>{renderFieldValue(field, product?.[field])}</span>
                </div>
              ))}
            </div>
          );

          const cardKey = product?.row_id || product?.product_code || `${product?.product_name ?? 'product'}-${product?.spec ?? index}`;

          if (cardTemplate === 'image-left') {
            return (
              <article key={cardKey} className={`${styles.card} ${styles.cardImageLeft}`}>
                {imageSlot}
                <div className={styles.cardMain}>
                  {headerSlot}
                  {bodySlot}
                </div>
              </article>
            );
          }

          if (cardTemplate === 'compact-list') {
            return (
              <article key={cardKey} className={styles.card}>
                {headerSlot}
                {bodySlot}
              </article>
            );
          }

          if (cardTemplate === 'detail-first') {
            return (
              <article key={cardKey} className={styles.card}>
                {bodySlot}
                {headerSlot}
                {imageSlot}
              </article>
            );
          }

          return (
            <article key={cardKey} className={styles.card}>
              {headerSlot}
              {imageSlot}
              {bodySlot}
            </article>
          );
        })}
```

(`'card-grid'` and `'price-focus'` both fall through to the final `return` — `price-focus` only changes field order inside `bodySlot`, not slot order, while `compact-list` structurally omits `imageSlot` regardless of `elementConfig.showImage`.)

- [ ] **Step 2: Implement in `CardGridSection.module.css`**

Change `.title` to consume the shared typography vars:

```css
.title {
  margin: 0 0 14px;
  font-size: 1.02rem;
  font-weight: var(--typography-heading-weight, 700);
  letter-spacing: var(--typography-letter-spacing, normal);
  color: var(--title-text-color, #16311b);
}
```

Change `.priceField .fieldValue` to consume `--price-text-color`:

```css
.priceField .fieldValue {
  color: var(--price-text-color, #d32f2f);
  font-size: calc(var(--card-font-size, 0.85rem) + 0.02rem);
  font-weight: 700;
}
```

Change `.fieldValue` to consume `--typography-body-weight`:

```css
.fieldValue {
  font-size: var(--card-font-size, 0.85rem);
  color: var(--corp-text);
  font-weight: var(--typography-body-weight, 600);
  line-height: 1.45;
  word-break: break-word;
}
```

Add new rules for the `image-left` template (place near the other `.layout-*`/`.section[data-*]` rules):

```css
.cardImageLeft {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.cardImageLeft .cardImageWrap {
  flex: 0 0 96px;
  padding: 12px 0 12px 12px;
}

.cardImageLeft .cardImage {
  height: 100%;
  aspect-ratio: 1 / 1;
}

.cardMain {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.section[data-card-template='compact-list'] .cardImageWrap {
  display: none;
}

.section[data-card-template='compact-list'] .grid {
  grid-template-columns: 1fr;
}

.section[data-card-template='compact-list'] .card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
}

.section[data-card-template='compact-list'] .cardHeader {
  flex: 0 0 auto;
  padding: 0;
  background: none;
  border-bottom: none;
}

.section[data-card-template='compact-list'] .cardBody {
  flex-direction: row;
  flex-wrap: wrap;
  padding: 0;
}
```

- [ ] **Step 3: Run the full storefront suite**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: PASS — `CardGridSection` isn't called with `cardTemplate` anywhere yet (Task 9 wires it), so it always uses the default `'card-grid'` value, producing the exact same DOM order as before this task.

- [ ] **Step 4: Commit**

```bash
git add react-app/src/features/storefront/components/CardGridSection.jsx react-app/src/features/storefront/components/CardGridSection.module.css
git commit -m "feat: render approved card templates and price/title color tokens in CardGridSection"
```

---

### Task 9: Wire `cardTemplate` from `StorefrontView` into `CardGridSection`, and add rendering tests

**Files:**
- Modify: `react-app/src/features/storefront/components/StorefrontView.jsx`
- Modify: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

**Interfaces:**
- Consumes: `section.cardTemplate` (Task 4), `CardGridSection`'s new `cardTemplate` prop (Task 8).

- [ ] **Step 1: Wire the prop**

In `react-app/src/features/storefront/components/StorefrontView.jsx`, change the `<CardGridSection ... />` call to pass `cardTemplate`:

```jsx
            ? view.sectionEntries.map(({ section, sectionId }) => (
                <CardGridSection
                  key={sectionId}
                  sectionId={sectionId}
                  section={section}
                  fields={section?.fields}
                  style={section?.style}
                  cardTemplate={section?.cardTemplate}
                  sectionHeaderContent={view.sectionHeaderBlocks.map((block) => (
                    <HelperBlock key={`${sectionId}-${block.id}`} block={block} />
                  ))}
                />
              ))
```

- [ ] **Step 2: Write the failing test**

Add to `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`. Use the same `fetchStorefrontConfig`/`fetchAllOfficeProductRows` mocking pattern as the existing `'renders product-category sections...'` test, but set `layoutStyle: { variant: 'image-left' }`, `style: { ...DEFAULT_CARD_STYLE-ish fields, priceTextColor: 'muted' }`, and `theme: { titleTextColor: 'ink', typographyTone: 'bold' }`:

```js
import { CARD_STYLE_PRICE_TEXT_COLOR_VALUES } from '../model/cardStyleModel';
import { TITLE_TEXT_COLOR_VALUES, TYPOGRAPHY_TONE_VALUES } from '../model/storefrontBuilderModel';

// ...inside describe('PublicStorefrontPage', ...):

  it('renders an image-left card template with muted price color and bold typography', async () => {
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: {
        schemaVersion: 2,
        designDirection: 'trust',
        theme: { brandColor: '#2563eb', backgroundTone: 'sky', titleTextColor: 'ink', typographyTone: 'bold' },
        nav: { title: 'NH Demo Storefront', subtitle: 'Seasonal products', logoUrl: '' },
        searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
        categoryChips: { enabled: true, sticky: true },
      },
      navConfig: { title: 'NH Demo Storefront', subtitle: 'Seasonal products', brandColor: '#2563eb', searchPlaceholder: 'Search products', logoUrl: '' },
      categoryConfigs: [
        {
          officeCode: 'OFF-1',
          productCategoryName: 'Fertilizer Upload',
          sortOrder: 0,
          categoryConfig: {
            schemaVersion: 2,
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
            selectedMediumCategories: ['Premium'],
            representativeMediumCategory: 'Premium',
            layoutStyle: { variant: 'image-left' },
            cardDesign: {
              visibleFields: ['product_name', 'tax_price'],
              style: { layout: 'grid', accentColor: '#2563eb', fontSize: 'medium', cardsPerRow: 2, priceTextColor: 'muted' },
            },
          },
          updatedAt: '2026-06-18T00:00:00Z',
        },
      ],
      hiddenProducts: [],
      updatedAt: '2026-06-18T00:00:00Z',
    });
    fetchAllOfficeProductRows.mockResolvedValue([
      { product_category_name: 'Fertilizer Upload', product_name: 'Alpha', img_url: 'https://example.com/a.png', medium_category: 'Premium', tax_price: 1000 },
    ]);

    const { container } = render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(await screen.findByText('Alpha')).toBeInTheDocument();

    const sectionEl = container.querySelector('section[id]');
    expect(sectionEl.dataset.cardTemplate).toBe('image-left');
    expect(sectionEl.style.getPropertyValue('--price-text-color')).toBe(CARD_STYLE_PRICE_TEXT_COLOR_VALUES.muted);

    const cardEl = screen.getByRole('article');
    expect(cardEl.className).toMatch(/cardImageLeft/);

    const pageEl = container.querySelector('[data-design-direction]');
    expect(pageEl.style.getPropertyValue('--title-text-color')).toBe(TITLE_TEXT_COLOR_VALUES.ink);
    expect(pageEl.style.getPropertyValue('--typography-heading-weight')).toBe(String(TYPOGRAPHY_TONE_VALUES.bold.headingWeight));
  });

  it('reorders fields price-first under the price-focus template', async () => {
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: { nav: {}, searchSection: { placeholder: 'Search products' }, categoryChips: { enabled: true, sticky: true } },
      navConfig: {},
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
            layoutStyle: { variant: 'price-focus' },
            cardDesign: { visibleFields: ['product_name', 'spec', 'tax_price'], style: { layout: 'grid', accentColor: '#1d4a2e', fontSize: 'medium', cardsPerRow: 2 } },
          },
        },
      ],
      hiddenProducts: [],
      updatedAt: '2026-06-18T00:00:00Z',
    });
    fetchAllOfficeProductRows.mockResolvedValue([
      { product_category_name: 'Fertilizer Upload', product_name: 'Alpha', spec: '20kg', medium_category: 'Premium', tax_price: 1000 },
    ]);

    render(<PublicStorefrontPage officeCode="OFF-1" />);

    const card = await screen.findByRole('article');
    const labels = within(card).getAllByText(/규격|과세가격/).map((el) => el.textContent);
    expect(labels[0]).toBe('과세가격');
  });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`
Expected: FAIL — `sectionEl.dataset.cardTemplate` is `undefined` because `CardGridSection` doesn't receive the prop yet (before Step 1's edit lands; if you've already applied Step 1, this confirms Task 8's implementation instead).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`
Expected: PASS — all tests in the file, including the two new ones.

- [ ] **Step 5: Run the full storefront suite**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add react-app/src/features/storefront/components/StorefrontView.jsx react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
git commit -m "feat: wire cardTemplate from the public storefront into CardGridSection, add rendering tests"
```

---

### Task 10: End-to-end builder test — AI apply, preview, save, undo

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

**Interfaces:**
- Consumes: everything from Tasks 1–9.

- [ ] **Step 1: Write the failing test**

Add a new test to the `describe('StorefrontBuilderPage', ...)` block, mirroring the existing `'runs the simplified two-step flow...'` test but asserting on the new fields:

```js
  it('applies AI titleTextColor/typographyTone/cardTemplate/priceTextColor, previews, saves, and undoes them', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestStorefrontAiSuggestion.mockResolvedValue({
      summary: 'Bold price-focus draft applied.',
      patch: {
        designDirection: 'warm',
        titleTextColor: 'ink',
        typographyTone: 'bold',
        navConfig: {
          title: 'Premium Fertilizer Guide',
          subtitle: 'Fast answers for customers',
          brandColor: '#2563eb',
          searchPlaceholder: 'Search fertilizer',
          logoUrl: '',
          searchVariant: 'outlined',
          categoryChipVariant: 'filled',
        },
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
          priceTextColor: 'muted',
        },
        cardTemplate: 'price-focus',
        selectedMediumCategories: ['Premium'],
        representativeMediumCategory: 'Premium',
        mobileUiTree: [
          { id: 'hero', type: 'hero', slot: 'top', enabled: true, props: {} },
          { id: 'search-box', type: 'searchBox', slot: 'top', enabled: true, props: {} },
          { id: 'category-chips', type: 'categoryChips', slot: 'afterSearch', enabled: true, props: {} },
          { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
          { id: 'empty-state', type: 'emptyState', slot: 'bottom', enabled: true, props: {} },
        ],
        cardElementConfig: {
          showImage: true,
          showProductName: true,
          showSpec: false,
          showNutrient: true,
          showPrice: true,
          showBadge: true,
          imageSize: 'lg',
          imageFit: 'contain',
          metaDensity: 'comfortable',
        },
        uiChangeSummary: ['Switch to a price-focus card template', 'Mute the price color', 'Use bold, dark titles'],
      },
    });
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(
      within(screen.getByTestId('product-category-card-Fertilizer Upload')).getByRole('button', { name: '페이지 수정' }),
    );
    await user.click(screen.getByTestId('builder-go-next'));

    await user.type(screen.getByLabelText('AI로 다듬기'), '가격 중심으로, 진하고 굵게 보여줘.');
    await user.click(screen.getByTestId('apply-ai-suggestion'));

    expect(await screen.findByText('Bold price-focus draft applied.')).toBeInTheDocument();

    const previewDevice = screen.getByTestId('mobile-preview-device');
    const sectionEl = within(previewDevice).getByRole('heading', { level: 2 }).closest('section');
    expect(sectionEl.dataset.cardTemplate).toBe('price-focus');

    await user.click(screen.getByTestId('save-storefront-draft'));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);
    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(savedPayload.categoryConfigs[0].categoryConfig.layoutStyle.variant).toBe('price-focus');
    expect(savedPayload.categoryConfigs[0].categoryConfig.cardDesign.style.priceTextColor).toBe('muted');
    expect(savedPayload.pageConfig.theme.titleTextColor).toBe('ink');
    expect(savedPayload.pageConfig.theme.typographyTone).toBe('bold');

    await user.click(screen.getByTestId('undo-ai-changes'));

    await waitFor(() => {
      const restoredSectionEl = within(screen.getByTestId('mobile-preview-device'))
        .getByRole('heading', { level: 2 })
        .closest('section');
      expect(restoredSectionEl.dataset.cardTemplate).toBe('card-grid');
    });
  }, 10000);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: FAIL if any of Tasks 1–9 are incomplete (e.g. `savedPayload.pageConfig.theme.titleTextColor` is `undefined`, or `sectionEl.dataset.cardTemplate` is `undefined`).

- [ ] **Step 3: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS — confirms the full AI-apply → preview → save → undo loop carries all four new tokens end-to-end.

- [ ] **Step 4: Run the full storefront suite one more time**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: PASS, all files.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
git commit -m "test: cover AI apply/preview/save/undo for the new design tokens end-to-end"
```

---

### Task 11: Backward compatibility regression test for legacy drafts

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/storefrontConfigService.test.js`

**Interfaces:**
- Consumes: `normalizePageConfig`/`normalizeCategoryConfigRow` (Tasks 2–3) via `fetchStorefrontConfig`.

- [ ] **Step 1: Write the failing test**

Add to `react-app/src/features/storefront/__tests__/storefrontConfigService.test.js`, inside the `fetchStorefrontConfig` describe block — mock a Supabase row shaped exactly like data saved *before* this slice (no `titleTextColor`, `typographyTone`, or `priceTextColor` keys anywhere, and `layoutStyle: { variant: 'card-grid' }`):

```js
  it('normalizes a legacy pre-design-tokens row without throwing, defaulting the new tokens', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'office_page_config') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    office_code: 'OFF-1',
                    page_config: {
                      schemaVersion: 1,
                      designDirection: 'friendly',
                      theme: { brandColor: '#1d4a2e', backgroundTone: 'mint' },
                      nav: { title: 'Legacy guide', subtitle: '', logoUrl: '' },
                      searchSection: { enabled: true, placeholder: 'Search products' },
                      categoryChips: { enabled: true, sticky: true },
                    },
                    hidden_products: [],
                    updated_at: '2026-01-01T00:00:00Z',
                  },
                  error: null,
                }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    office_code: 'OFF-1',
                    product_category_name: 'Fertilizer Upload',
                    sort_order: 0,
                    category_config: {
                      schemaVersion: 1,
                      displayName: 'Fertilizer Upload',
                      sourceCategoryName: 'Fertilizer Upload',
                      selectedMediumCategories: ['Premium'],
                      representativeMediumCategory: 'Premium',
                      layoutStyle: { variant: 'card-grid' },
                      cardDesign: {
                        visibleFields: ['product_name', 'tax_price'],
                        style: { layout: 'grid', accentColor: '#1d4a2e', fontSize: 'medium', cardsPerRow: 2 },
                      },
                    },
                    updated_at: '2026-01-01T00:00:00Z',
                  },
                ],
                error: null,
              }),
          }),
        }),
      };
    });

    const config = await fetchStorefrontConfig({ officeCode: 'OFF-1' });

    expect(config.pageConfig.theme.titleTextColor).toBe('default');
    expect(config.pageConfig.theme.typographyTone).toBe('standard');
    expect(config.categoryConfigs[0].categoryConfig.layoutStyle.variant).toBe('card-grid');
    expect(config.categoryConfigs[0].categoryConfig.cardDesign.style.priceTextColor).toBe('default');
  });
```

Check the existing tests in this file first for the exact `supabase.from` mocking shape already in use (the test file already mocks `supabase` — match its established pattern rather than introducing a new one; adjust the snippet above if the existing mock shape differs).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontConfigService.test.js`
Expected: FAIL only if any earlier task is incomplete — otherwise this should already PASS once Tasks 1–3 are done, since `normalizePageConfig`/`normalizeCategoryConfig` already default missing fields. Confirm it would have failed before Task 2/3 by checking it asserts a field that didn't exist before (`titleTextColor`, `priceTextColor`).

- [ ] **Step 3: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontConfigService.test.js`
Expected: PASS.

- [ ] **Step 4: Run the entire app test suite as a final regression check**

Run: `cd react-app && npx vitest run`
Expected: PASS, no regressions anywhere in the app.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/__tests__/storefrontConfigService.test.js
git commit -m "test: verify legacy storefront drafts without design tokens still normalize to safe defaults"
```

---

## Self-Review

**Spec coverage:**
- Text color tokens (page-level `titleTextColor`) — Tasks 2, 7.
- Typography tokens (page-level `typographyTone`) — Tasks 2, 7, 8.
- 3–5 approved card templates with slot-based composition — Tasks 2, 3, 4, 8, 9 (`card-grid`, `image-left`, `price-focus`, `compact-list`, `detail-first` = 5 templates).
- AI patch normalization for all new fields, strict-schema-safe — Task 5 (regression-guarded by the existing recursive strict-mode test).
- Card-level "text styling override" (`priceTextColor`) — Tasks 1, 8.
- Backward compatibility for legacy drafts — Task 11 (plus every normalize function defaults missing fields by construction).
- Preview updates immediately, save persists, undo restores — Task 10.
- Out-of-scope items (manual controls beyond AI, raw HTML/CSS, general field-emphasis rules for nutrient/spec, background/surface tokens) are explicitly deferred per Global Constraints — not built here.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N" language — every step has literal, complete code.

**Type/name consistency:** `cardTemplate` is used identically as the prop name on `CardGridSection`, the field name from `sectionMatching.js`, and the AI patch field name throughout. `priceTextColor` is consistently nested under `cardStyle`/`cardDesign.style` everywhere (never top-level). `titleTextColor`/`typographyTone` are consistently nested under `pageConfig.theme` everywhere (never per-category).
