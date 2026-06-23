# Storefront AI UI Block Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-editable mobile UI blocks and card element controls to the storefront builder without allowing edits to source product data.

**Architecture:** Introduce a normalized storefront presentation model for `mobileUiTree` and `cardElementConfig`, thread it through AI normalization and save payloads, then render the public storefront from that model while exposing a manual mobile-friendly editor and AI undo flow in the builder.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, CSS Modules

---

### Task 1: Add a normalized storefront presentation model

**Files:**
- Create: `react-app/src/features/storefront/model/storefrontUiModel.js`
- Create: `react-app/src/features/storefront/__tests__/storefrontUiModel.test.js`
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- Test: `react-app/src/features/storefront/__tests__/storefrontUiModel.test.js`

- [ ] **Step 1: Write the failing presentation-model test**

```js
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CARD_ELEMENT_CONFIG,
  DEFAULT_MOBILE_UI_TREE,
  normalizeCardElementConfig,
  normalizeMobileUiTree,
} from '../model/storefrontUiModel';

describe('normalizeMobileUiTree', () => {
  it('keeps only supported blocks and restores required productSections', () => {
    expect(
      normalizeMobileUiTree([
        { id: 'hero-1', type: 'hero', slot: 'top', enabled: true, props: {} },
        { id: 'bad-block', type: 'scriptTag', slot: 'top', enabled: true, props: {} },
        { id: 'cta-1', type: 'ctaButton', slot: 'beforeProducts', enabled: true, props: { label: 'Call now' } },
      ]),
    ).toEqual([
      { id: 'hero-1', type: 'hero', slot: 'top', enabled: true, props: {} },
      { id: 'cta-1', type: 'ctaButton', slot: 'beforeProducts', enabled: true, props: { label: 'Call now' } },
      expect.objectContaining({ type: 'productSections', enabled: true }),
      expect.objectContaining({ type: 'emptyState', enabled: true }),
    ]);
  });
});

describe('normalizeCardElementConfig', () => {
  it('falls back to bounded defaults for unsupported values', () => {
    expect(
      normalizeCardElementConfig({
        showImage: false,
        imageSize: 'huge',
        imageFit: 'stretch',
        metaDensity: 'dense',
      }),
    ).toEqual({
      ...DEFAULT_CARD_ELEMENT_CONFIG,
      showImage: false,
    });
  });
});
```

- [ ] **Step 2: Run the model test to verify RED**

Run: `npm run test:run -- src/features/storefront/__tests__/storefrontUiModel.test.js`

Expected: FAIL because `storefrontUiModel.js` does not exist yet.

- [ ] **Step 3: Write the minimal presentation model**

```js
export const MOBILE_UI_BLOCK_TYPES = [
  'hero',
  'productCategoryNav',
  'mobileCategoryBar',
  'searchBox',
  'categoryChips',
  'noticeBanner',
  'highlightBox',
  'ctaButton',
  'divider',
  'productSections',
  'emptyState',
];

export const MOBILE_UI_SLOTS = [
  'top',
  'afterSearch',
  'beforeChips',
  'afterChips',
  'beforeProducts',
  'sectionHeaderBelow',
  'bottom',
];

export const DEFAULT_CARD_ELEMENT_CONFIG = {
  showImage: true,
  showProductName: true,
  showSpec: true,
  showNutrient: true,
  showPrice: true,
  showBadge: true,
  imageSize: 'md',
  imageFit: 'cover',
  metaDensity: 'comfortable',
};

export function normalizeCardElementConfig(config) {
  const source = config ?? {};

  return {
    showImage: source.showImage ?? DEFAULT_CARD_ELEMENT_CONFIG.showImage,
    showProductName: source.showProductName ?? DEFAULT_CARD_ELEMENT_CONFIG.showProductName,
    showSpec: source.showSpec ?? DEFAULT_CARD_ELEMENT_CONFIG.showSpec,
    showNutrient: source.showNutrient ?? DEFAULT_CARD_ELEMENT_CONFIG.showNutrient,
    showPrice: source.showPrice ?? DEFAULT_CARD_ELEMENT_CONFIG.showPrice,
    showBadge: source.showBadge ?? DEFAULT_CARD_ELEMENT_CONFIG.showBadge,
    imageSize: ['hidden', 'sm', 'md', 'lg'].includes(source.imageSize) ? source.imageSize : DEFAULT_CARD_ELEMENT_CONFIG.imageSize,
    imageFit: ['cover', 'contain'].includes(source.imageFit) ? source.imageFit : DEFAULT_CARD_ELEMENT_CONFIG.imageFit,
    metaDensity: ['compact', 'comfortable'].includes(source.metaDensity) ? source.metaDensity : DEFAULT_CARD_ELEMENT_CONFIG.metaDensity,
  };
}
```

- [ ] **Step 4: Thread the model into builder normalization**

```js
import {
  DEFAULT_CARD_ELEMENT_CONFIG,
  DEFAULT_MOBILE_UI_TREE,
  normalizeCardElementConfig,
  normalizeMobileUiTree,
} from './storefrontUiModel';

export const DEFAULT_PAGE_CONFIG = {
  schemaVersion: 1,
  designDirection: 'friendly',
  theme: {
    brandColor: DEFAULT_CARD_STYLE.accentColor,
    backgroundTone: STOREFRONT_BACKGROUND_TONES.friendly,
  },
  nav: {
    title: '',
    subtitle: '',
    logoUrl: '',
  },
  searchSection: {
    enabled: true,
    placeholder: DEFAULT_NAV_CONFIG.searchPlaceholder,
    variant: DEFAULT_NAV_CONFIG.searchVariant,
  },
  categoryChips: {
    enabled: true,
    sticky: true,
    variant: DEFAULT_NAV_CONFIG.categoryChipVariant,
  },
  mobileUiTree: DEFAULT_MOBILE_UI_TREE,
};
```

- [ ] **Step 5: Run the model test to verify GREEN**

Run: `npm run test:run -- src/features/storefront/__tests__/storefrontUiModel.test.js`

Expected: PASS

- [ ] **Step 6: Commit the model slice**

```bash
git add react-app/src/features/storefront/model/storefrontUiModel.js react-app/src/features/storefront/model/storefrontBuilderModel.js react-app/src/features/storefront/__tests__/storefrontUiModel.test.js
git commit -m "feat: add storefront presentation model"
```

### Task 2: Extend AI normalization and save payloads

**Files:**
- Modify: `react-app/src/features/storefront/services/storefrontAiService.js`
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- Modify: `react-app/src/features/storefront/__tests__/storefrontAiService.test.js`
- Test: `react-app/src/features/storefront/__tests__/storefrontAiService.test.js`

- [ ] **Step 1: Write the failing AI normalization test**

```js
it('normalizes ui blocks, card element config, and change summary', () => {
  expect(
    normalizeStorefrontAiSuggestion(
      {
        summary: 'updated',
        patch: {
          designDirection: 'warm',
          selectedMediumCategories: ['Premium', 'Fake'],
          representativeMediumCategory: 'Premium',
          cardFields: ['product_name', 'tax_price'],
          cardStyle: { layout: 'compact', accentColor: '#2563eb', fontSize: 'large', cardsPerRow: 1 },
          navConfig: {
            title: 'Premium Guide',
            subtitle: 'Fast answers',
            brandColor: '#2563eb',
            searchPlaceholder: 'Search fertilizer',
            logoUrl: '',
            searchVariant: 'outlined',
            categoryChipVariant: 'filled',
          },
          mobileUiTree: [
            { id: 'search-box', type: 'searchBox', slot: 'top', enabled: false, props: {} },
            { id: 'promo', type: 'noticeBanner', slot: 'beforeProducts', enabled: true, props: { title: 'Promo', text: 'Today only' } },
            { id: 'hack', type: 'iframe', slot: 'top', enabled: true, props: {} },
          ],
          cardElementConfig: {
            showImage: false,
            showPrice: true,
            imageSize: 'lg',
            imageFit: 'contain',
            metaDensity: 'comfortable',
          },
          uiChangeSummary: ['Hide search box', 'Add notice banner above product list'],
        },
      },
      ['Premium', 'Starter'],
    ),
  ).toEqual(
    expect.objectContaining({
      patch: expect.objectContaining({
        mobileUiTree: expect.arrayContaining([
          expect.objectContaining({ type: 'searchBox', enabled: false }),
          expect.objectContaining({ type: 'noticeBanner' }),
        ]),
        cardElementConfig: expect.objectContaining({ showImage: false, imageFit: 'contain' }),
        uiChangeSummary: ['Hide search box', 'Add notice banner above product list'],
      }),
    }),
  );
});
```

- [ ] **Step 2: Run the AI service test to verify RED**

Run: `npm run test:run -- src/features/storefront/__tests__/storefrontAiService.test.js`

Expected: FAIL because `mobileUiTree`, `cardElementConfig`, and `uiChangeSummary` are not part of the normalized patch yet.

- [ ] **Step 3: Expand the AI schema and normalizer**

```js
import {
  DEFAULT_CARD_ELEMENT_CONFIG,
  MOBILE_UI_BLOCK_TYPES,
  MOBILE_UI_SLOTS,
  normalizeCardElementConfig,
  normalizeMobileUiTree,
} from '../model/storefrontUiModel';

const STOREFRONT_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    patch: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mobileUiTree: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: MOBILE_UI_BLOCK_TYPES },
              slot: { type: 'string', enum: MOBILE_UI_SLOTS },
              enabled: { type: 'boolean' },
              props: { type: 'object' },
            },
            required: ['id', 'type', 'slot', 'enabled', 'props'],
          },
        },
        cardElementConfig: {
          type: 'object',
          additionalProperties: false,
          properties: {
            showImage: { type: 'boolean' },
            showProductName: { type: 'boolean' },
            showSpec: { type: 'boolean' },
            showNutrient: { type: 'boolean' },
            showPrice: { type: 'boolean' },
            showBadge: { type: 'boolean' },
            imageSize: { type: 'string', enum: ['hidden', 'sm', 'md', 'lg'] },
            imageFit: { type: 'string', enum: ['cover', 'contain'] },
            metaDensity: { type: 'string', enum: ['compact', 'comfortable'] },
          },
          required: Object.keys(DEFAULT_CARD_ELEMENT_CONFIG),
        },
        uiChangeSummary: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
};
```

- [ ] **Step 4: Persist the new fields in storefront payload builders**

```js
const nextCategoryConfig = normalizeCategoryConfig(
  {
    ...(existingRow?.categoryConfig ?? {}),
    cardDesign: {
      visibleFields: cardFields,
      style: cardStyle,
      elementConfig: cardElementConfig,
    },
  },
  normalizedProductCategoryName,
);

const nextPageConfig = normalizePageConfig({
  ...basePageConfig,
  mobileUiTree,
});
```

- [ ] **Step 5: Run the AI service test to verify GREEN**

Run: `npm run test:run -- src/features/storefront/__tests__/storefrontAiService.test.js`

Expected: PASS

- [ ] **Step 6: Commit the AI/persistence slice**

```bash
git add react-app/src/features/storefront/services/storefrontAiService.js react-app/src/features/storefront/model/storefrontBuilderModel.js react-app/src/features/storefront/__tests__/storefrontAiService.test.js
git commit -m "feat: extend storefront AI block patching"
```

### Task 3: Render the public storefront from the mobile UI tree

**Files:**
- Modify: `react-app/src/features/storefront/components/StorefrontView.jsx`
- Modify: `react-app/src/features/storefront/components/StorefrontView.module.css`
- Modify: `react-app/src/features/storefront/components/CardGridSection.jsx`
- Modify: `react-app/src/features/storefront/components/CardGridSection.module.css`
- Modify: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

- [ ] **Step 1: Write the failing public-page rendering test**

```jsx
it('renders helper blocks from mobileUiTree and respects card element visibility', async () => {
  fetchStorefrontConfig.mockResolvedValue({
    officeCode: 'OFF-1',
    pageConfig: {
      nav: {},
      searchSection: { placeholder: 'Search products' },
      categoryChips: { enabled: true, sticky: true, variant: 'soft' },
      mobileUiTree: [
        { id: 'hero', type: 'hero', slot: 'top', enabled: true, props: {} },
        { id: 'notice-1', type: 'noticeBanner', slot: 'beforeProducts', enabled: true, props: { title: '공지', text: '모바일 전용 혜택' } },
        { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
        { id: 'empty-state', type: 'emptyState', slot: 'bottom', enabled: true, props: {} },
      ],
    },
    navConfig: {},
    categoryConfigs: [
      {
        productCategoryName: 'Fertilizer Upload',
        sortOrder: 0,
        categoryConfig: {
          displayName: 'Fertilizer Upload',
          sourceCategoryName: 'Fertilizer Upload',
          selectedMediumCategories: ['Premium'],
          representativeMediumCategory: 'Premium',
          layoutStyle: { variant: 'card-grid' },
          cardDesign: {
            visibleFields: ['product_name', 'spec', 'tax_price'],
            style: { layout: 'grid', accentColor: '#1d4a2e', fontSize: 'medium', cardsPerRow: 2 },
            elementConfig: { showImage: false, showSpec: true, showPrice: false, showBadge: true },
          },
        },
      },
    ],
    hiddenProducts: [],
  });

  fetchAllOfficeProductRows.mockResolvedValue([
    { product_category_name: 'Fertilizer Upload', product_name: 'Alpha', medium_category: 'Premium', spec: '20kg', img_url: 'https://example.com/a.png', tax_price: 1000 },
  ]);

  render(<PublicStorefrontPage officeCode="OFF-1" />);

  expect(await screen.findByText('모바일 전용 혜택')).toBeInTheDocument();
  expect(screen.queryByRole('img', { name: 'Alpha' })).not.toBeInTheDocument();
  expect(screen.getByText('20kg')).toBeInTheDocument();
  expect(screen.queryByText('1,000원')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the public-page test to verify RED**

Run: `npm run test:run -- src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

Expected: FAIL because `StorefrontView` does not render helper blocks or `cardDesign.elementConfig` yet.

- [ ] **Step 3: Implement tree-driven rendering and helper blocks**

```jsx
function renderHelperBlock(block) {
  if (block.type === 'noticeBanner') {
    return (
      <div key={block.id} className={styles.noticeBanner}>
        {block.props.title ? <strong>{block.props.title}</strong> : null}
        {block.props.text ? <p>{block.props.text}</p> : null}
      </div>
    );
  }

  if (block.type === 'divider') {
    return <div key={block.id} className={styles.divider} aria-hidden="true" />;
  }

  if (block.type === 'ctaButton') {
    return (
      <button key={block.id} type="button" className={styles.ctaButton}>
        {block.props.label || '자세히 보기'}
      </button>
    );
  }

  return null;
}
```

- [ ] **Step 4: Respect `cardElementConfig` in card rendering**

```jsx
const elementConfig = normalizeCardElementConfig(section?.elementConfig);

{product?.img_url && elementConfig.showImage && resolvedStyle.imageSize !== 'hidden' ? (
  <div className={styles.cardImageWrap}>
    <img className={styles.cardImage} src={product.img_url} alt={product?.product_name || ''} />
  </div>
) : null}

{elementConfig.showPrice ? (
  <div className={styles.priceField}>
    <span className={styles.fieldLabel}>{STOREFRONT_FIELD_LABELS.tax_price}</span>
    <span className={styles.fieldValue}>{formatFieldValue('tax_price', product?.tax_price)}</span>
  </div>
) : null}
```

- [ ] **Step 5: Run the public-page test to verify GREEN**

Run: `npm run test:run -- src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

Expected: PASS

- [ ] **Step 6: Commit the rendering slice**

```bash
git add react-app/src/features/storefront/components/StorefrontView.jsx react-app/src/features/storefront/components/StorefrontView.module.css react-app/src/features/storefront/components/CardGridSection.jsx react-app/src/features/storefront/components/CardGridSection.module.css react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
git commit -m "feat: render storefront mobile ui blocks"
```

### Task 4: Add manual editor controls, AI change summary, and undo

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/components/PageDesignEditor.jsx`
- Modify: `react-app/src/features/storefront/components/PageDesignEditor.module.css`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Write the failing builder-page test**

```jsx
it('lets the user toggle visible blocks, add a helper block, apply AI changes, and undo them', async () => {
  requestStorefrontAiSuggestion.mockResolvedValue({
    summary: 'AI updated the storefront.',
    patch: {
      designDirection: 'warm',
      selectedMediumCategories: ['Premium', 'Starter'],
      representativeMediumCategory: 'Premium',
      cardFields: ['product_name', 'spec', 'tax_price'],
      cardStyle: { layout: 'compact', accentColor: '#2563eb', fontSize: 'large', cardsPerRow: 1 },
      navConfig: {
        title: 'Premium Fertilizer Guide',
        subtitle: 'Fast answers for customers',
        brandColor: '#2563eb',
        searchPlaceholder: 'Search fertilizer',
        logoUrl: '',
        searchVariant: 'outlined',
        categoryChipVariant: 'filled',
      },
      mobileUiTree: [
        { id: 'search-box', type: 'searchBox', slot: 'top', enabled: false, props: {} },
        { id: 'notice-1', type: 'noticeBanner', slot: 'beforeProducts', enabled: true, props: { title: '공지', text: 'AI 추천 안내' } },
        { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
        { id: 'empty-state', type: 'emptyState', slot: 'bottom', enabled: true, props: {} },
      ],
      cardElementConfig: { showImage: false, showProductName: true, showSpec: true, showNutrient: false, showPrice: true, showBadge: true, imageSize: 'sm', imageFit: 'contain', metaDensity: 'comfortable' },
      uiChangeSummary: ['Hide search box', 'Add notice banner above product list'],
    },
  });

  // ... existing setup ...
  await user.click(screen.getByRole('button', { name: '추가 블록: 안내 배너' }));
  await user.click(screen.getByRole('button', { name: 'AI 초안 적용' }));

  expect(await screen.findByText('AI 추천 안내')).toBeInTheDocument();
  expect(screen.getByText('Hide search box')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'AI 되돌리기' }));

  expect(screen.getByPlaceholderText('상품 검색')).toBeInTheDocument();
  expect(screen.queryByText('AI 추천 안내')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the builder-page test to verify RED**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

Expected: FAIL because there is no manual block editor, no AI change summary list, and no undo action yet.

- [ ] **Step 3: Add builder state for `mobileUiTree`, `cardElementConfig`, and AI snapshots**

```js
const [mobileUiTree, setMobileUiTree] = useState(DEFAULT_MOBILE_UI_TREE);
const [cardElementConfig, setCardElementConfig] = useState(DEFAULT_CARD_ELEMENT_CONFIG);
const [aiChangeSummary, setAiChangeSummary] = useState([]);
const [lastAiSnapshot, setLastAiSnapshot] = useState(null);

function undoAiChanges() {
  if (!lastAiSnapshot) {
    return;
  }

  setDesignDirectionState(lastAiSnapshot.designDirection);
  setCardStyleState(lastAiSnapshot.cardStyle);
  setCardFields(lastAiSnapshot.cardFields);
  setNavConfig(lastAiSnapshot.navConfig);
  setMobileUiTree(lastAiSnapshot.mobileUiTree);
  setCardElementConfig(lastAiSnapshot.cardElementConfig);
  setAiChangeSummary([]);
  setLastAiSnapshot(null);
}
```

- [ ] **Step 4: Add a manual mobile editor UI**

```jsx
<PageDesignEditor
  designDirection={builder.designDirection}
  cardStyle={builder.cardStyle}
  cardFields={builder.cardFields}
  navConfig={builder.navConfig}
  mobileUiTree={builder.mobileUiTree}
  cardElementConfig={builder.cardElementConfig}
  aiChangeSummary={builder.aiChangeSummary}
  onToggleBlock={builder.toggleMobileUiBlock}
  onAddBlock={builder.addMobileUiBlock}
  onRemoveBlock={builder.removeMobileUiBlock}
  onUpdateBlock={builder.updateMobileUiBlock}
  onToggleCardElement={builder.toggleCardElement}
  onUpdateCardElement={builder.updateCardElement}
  onUndoAiChanges={builder.undoAiChanges}
/>
```

- [ ] **Step 5: Save and preview the new state through `buildStorefrontSavePayload`**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

Expected: PASS and `upsertStorefrontConfig` payload includes `pageConfig.mobileUiTree` plus `categoryConfig.cardDesign.elementConfig`.

- [ ] **Step 6: Commit the builder slice**

```bash
git add react-app/src/features/storefront/hooks/useStorefrontBuilder.js react-app/src/features/storefront/components/PageDesignEditor.jsx react-app/src/features/storefront/components/PageDesignEditor.module.css react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
git commit -m "feat: add storefront ai ui block editor"
```

### Task 5: Run full storefront verification

**Files:**
- Modify: `docs/superpowers/plans/2026-06-17-storefront-ai-ui-block-editing.md`
- Test: `react-app/src/features/storefront/__tests__/storefrontUiModel.test.js`
- Test: `react-app/src/features/storefront/__tests__/storefrontAiService.test.js`
- Test: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Run the focused storefront suite**

Run: `npm run test:run -- src/features/storefront`

Expected: PASS with all storefront tests green.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: PASS with Vite build output and no storefront-specific errors.

- [ ] **Step 3: Update this plan checklist to reflect completed execution**

```md
- [x] Step 1: Run the focused storefront suite
- [x] Step 2: Run the production build
```

- [ ] **Step 4: Commit final verification changes if needed**

```bash
git add docs/superpowers/plans/2026-06-17-storefront-ai-ui-block-editing.md
git commit -m "docs: record storefront ai ui block execution"
```
