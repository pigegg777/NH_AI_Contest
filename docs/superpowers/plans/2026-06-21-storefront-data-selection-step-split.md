# Storefront Data Selection Step Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the storefront builder's current 2-step flow (Basic Settings → AI Studio) into 3 steps (Basic Settings → Data Selection → Card Design), with an explicit `draftDataSelection`/`committedDataSelection` boundary so card design can never silently change which fields appear on a card.

**Architecture:** `useStorefrontBuilder` composes a new `useDataSelectionDraft` sub-hook that owns the draft/committed split. `AiStudioStep.jsx` is deleted; its field-table UI moves into a new `DataSelectionStep` (with field-grouping/render-rule pure models behind it), and its AI-prompt UI becomes `CardDesignStep` (presentation-only). The AI service is pinned so it can read but never write the committed field selection.

**Tech Stack:** React 19, Vitest + @testing-library/react, no new dependencies.

## Global Constraints

- Persisted shape stays a single flat `visibleFields` array (`cardDesign.visibleFields`) — no new grouped persistence schema.
- `product_name` is always present in `visibleFields` and cannot be deselected.
- `visibleFields` is normalized into canonical order (`STOREFRONT_FIELD_DISPLAY_ORDER`), never click order.
- Card-design AI (`requestStorefrontAiSuggestion` / `applyAiSuggestion`) must never change `visibleFields`/`cardFields` or `selectedMediumCategories`/`representativeMediumCategory` — it may only change presentation (style, template, nav, mobileUiTree, aiDesign renderSpec).
- Save stays available only from the Card Design (final) step.
- All new files live under `react-app/src/features/storefront/`.

## Deferred to a follow-up plan (out of scope here)

Per the PRD's per-card render rules (`note` truncation, `manufacturer_list` flattening, `product_url` as a link button), this plan only ships the minimal empty-value-hiding + basic value formatting needed for the new neutral Data Selection preview (`model/cardFieldRenderModel.js`). Truncation/flattening/link-button rendering and wiring those same rules into the public `CardGridSection.jsx` are intentionally deferred — they're presentation polish layered on top of the seam this plan establishes, not required to land the 3-step structural split. Flag this to the user before starting a "Plan 2".

---

### Task 1: Canonical field order + mandatory `product_name` in `storefrontBuilderModel.js`

**Files:**
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js:26-44` (labels), `:47-61` (display order), `:214-234` (`normalizeCardFields`)
- Test: `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js`

**Interfaces:**
- Produces: `normalizeCardFields(fields, allowedScalarKeys)` now always includes `'product_name'` and returns fields sorted by `STOREFRONT_FIELD_DISPLAY_ORDER`. `STOREFRONT_FIELD_LABELS.img_url` and `STOREFRONT_FIELD_DISPLAY_ORDER` now include `'img_url'`.

- [ ] **Step 1: Write the failing tests**

Add to `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js` (extend the existing import block at the top — add `normalizeCardFields` and `STOREFRONT_FIELD_DISPLAY_ORDER` to the named imports from `'../model/storefrontBuilderModel'`):

```js
describe('normalizeCardFields', () => {
  it('always includes product_name even when omitted from input', () => {
    expect(normalizeCardFields(['spec', 'tax_price'])).toEqual(
      expect.arrayContaining(['product_name', 'spec', 'tax_price']),
    );
  });

  it('sorts into canonical display order regardless of click order', () => {
    expect(normalizeCardFields(['tax_price', 'product_name', 'spec'])).toEqual([
      'product_name',
      'spec',
      'tax_price',
    ]);
  });

  it('keeps product_name mandatory even when allowedScalarKeys restricts the field set', () => {
    expect(normalizeCardFields(['tax_price'], ['product_name', 'tax_price', 'spec'])).toEqual([
      'product_name',
      'tax_price',
    ]);
  });

  it('falls back to DEFAULT_CARD_FIELDS, still canonically sorted, when given nothing usable', () => {
    expect(normalizeCardFields([])).toEqual(['product_name', 'spec', 'tax_price', 'nutrient']);
  });

  it('places img_url right after product_name in canonical order', () => {
    expect(STOREFRONT_FIELD_DISPLAY_ORDER.indexOf('img_url')).toBe(
      STOREFRONT_FIELD_DISPLAY_ORDER.indexOf('product_name') + 1,
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `react-app/`): `npx vitest run src/features/storefront/__tests__/storefrontBuilderModel.test.js`
Expected: FAIL — `normalizeCardFields(['tax_price', 'product_name', 'spec'])` returns `['tax_price', 'product_name', 'spec']` unsorted today, and `img_url` is not in `STOREFRONT_FIELD_DISPLAY_ORDER`.

- [ ] **Step 3: Implement**

In `storefrontBuilderModel.js`, change the labels map (currently `:26-44`):

```js
export const STOREFRONT_FIELD_LABELS = {
  product_name: '상품명',
  img_url: '상품 이미지',
  spec: '규격',
  large_category: '대분류',
  medium_category: '중분류',
  small_category: '소분류',
  detail_category: '세부 분류',
  nutrient: '주요 성분',
  product_url: '상품 링크',
  tax_price: '과세가격',
  zero_tax_price: '영세가격',
  note: '비고',
  sale_price_type_name: '가격 유형',
  exempt_tax_price: '면세가격',
  price_subsidy: '보조금',
  product_nutirent: '성분',
  indict_symbl: '작용기작',
  product_usage: '작물별 용도',
};

// 상품명 -> 이미지 -> 규격 -> 가격(영세/과세/면세/보조금) -> 분류(대/중/소/세) -> 성분 -> 링크
export const STOREFRONT_FIELD_DISPLAY_ORDER = [
  'product_name',
  'img_url',
  'spec',
  'zero_tax_price',
  'tax_price',
  'exempt_tax_price',
  'price_subsidy',
  'large_category',
  'medium_category',
  'small_category',
  'detail_category',
  'nutrient',
  'product_nutirent',
  'product_url',
];
```

Replace `normalizeCardFields` (currently `:214-234`):

```js
export function normalizeCardFields(fields, allowedScalarKeys) {
  const hasAllowedKeys = Array.isArray(allowedScalarKeys) && allowedScalarKeys.length > 0;
  let nextFields;

  if (hasAllowedKeys) {
    nextFields = Array.isArray(fields)
      ? fields.filter((field, index) => allowedScalarKeys.includes(field) && fields.indexOf(field) === index)
      : [];

    if (nextFields.length === 0) {
      const fallback = DEFAULT_CARD_FIELDS.filter((f) => allowedScalarKeys.includes(f));
      nextFields = fallback.length > 0 ? fallback : [allowedScalarKeys[0]];
    }
  } else {
    nextFields = Array.isArray(fields)
      ? fields.filter(
          (field, index) => typeof field === 'string' && field.trim() !== '' && fields.indexOf(field) === index,
        )
      : [];

    if (nextFields.length === 0) {
      nextFields = DEFAULT_CARD_FIELDS;
    }
  }

  const isProductNameAllowed = !hasAllowedKeys || allowedScalarKeys.includes('product_name');
  const withMandatoryField =
    isProductNameAllowed && !nextFields.includes('product_name') ? ['product_name', ...nextFields] : nextFields;

  return sortFieldKeysByDisplayOrder(withMandatoryField);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/storefront/__tests__/storefrontBuilderModel.test.js`
Expected: PASS (all `normalizeCardFields`/display-order tests, plus all pre-existing tests in this file — `sortFieldKeysByDisplayOrder` is unchanged, only consumers of `normalizeCardFields`'s output ordering downstream, which the existing fixtures already happen to satisfy since they were written in canonical order).

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/model/storefrontBuilderModel.js react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js
git commit -m "feat: enforce mandatory product_name and canonical field order in normalizeCardFields"
```

---

### Task 2: Derive legacy card-element toggles from `visibleFields`, not from stored overrides

**Files:**
- Modify: `react-app/src/features/storefront/model/storefrontUiModel.js:228-244` (`deriveCardElementConfig`)
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js:301-308` (`normalizeCategoryConfig` call site)
- Test: `react-app/src/features/storefront/__tests__/storefrontUiModel.test.js`

**Interfaces:**
- Produces: `PRICE_FIELD_KEYS`, `NUTRIENT_FIELD_KEYS` (new exports from `storefrontUiModel.js`). `deriveCardElementConfig(fields, style, elementConfig)` now always derives `showImage`/`showProductName`/`showSpec`/`showNutrient`/`showPrice` from `fields` (ignoring any conflicting value in `elementConfig`), while `showBadge`/`imageSize`/`imageFit`/`metaDensity` still honor an explicit `elementConfig` override.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing tests**

Add to `react-app/src/features/storefront/__tests__/storefrontUiModel.test.js` (extend the top import to add `deriveCardElementConfig` to the named imports from `'../model/storefrontUiModel'`):

```js
describe('deriveCardElementConfig', () => {
  it('derives image/spec/nutrient/price visibility from fields, ignoring a conflicting stored elementConfig', () => {
    const derived = deriveCardElementConfig(['product_name', 'img_url', 'tax_price'], {}, {
      showImage: false,
      showSpec: true,
      showNutrient: true,
      showPrice: false,
    });

    expect(derived.showImage).toBe(true);
    expect(derived.showSpec).toBe(false);
    expect(derived.showNutrient).toBe(false);
    expect(derived.showPrice).toBe(true);
    expect(derived.showProductName).toBe(true);
  });

  it('still lets stored elementConfig control showBadge', () => {
    expect(deriveCardElementConfig(['product_name'], {}, { showBadge: false }).showBadge).toBe(false);
  });

  it('treats img_url membership as the sole image toggle', () => {
    expect(deriveCardElementConfig(['product_name'], { imageSize: 'lg' }, null).showImage).toBe(false);
    expect(deriveCardElementConfig(['product_name', 'img_url'], {}, null).showImage).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/storefront/__tests__/storefrontUiModel.test.js`
Expected: FAIL — today `{...fallback, ...elementConfig}` lets the stored `elementConfig` win over the derived fallback.

- [ ] **Step 3: Implement**

In `storefrontUiModel.js`, add near the top (after the existing `DEFAULT_CARD_ELEMENT_CONFIG` block, `:51`):

```js
export const PRICE_FIELD_KEYS = ['zero_tax_price', 'tax_price', 'exempt_tax_price', 'price_subsidy'];
export const NUTRIENT_FIELD_KEYS = ['nutrient', 'product_nutirent'];
```

Replace `deriveCardElementConfig` (currently `:228-244`):

```js
export function deriveCardElementConfig(fields, style, elementConfig) {
  const visibleFields = Array.isArray(fields) ? fields : [];
  const sourceStyle = style ?? {};
  const source = elementConfig ?? {};
  const styleDefaults = {
    imageSize: sourceStyle.imageSize,
    imageFit: sourceStyle.imageFit,
    metaDensity: sourceStyle.layout === 'compact' || sourceStyle.cardSpacing === 'tight' ? 'compact' : 'comfortable',
    showBadge: true,
  };

  return normalizeCardElementConfig({
    ...styleDefaults,
    ...source,
    showImage: visibleFields.includes('img_url'),
    showProductName: true,
    showSpec: visibleFields.includes('spec'),
    showNutrient: NUTRIENT_FIELD_KEYS.some((field) => visibleFields.includes(field)),
    showPrice: PRICE_FIELD_KEYS.some((field) => visibleFields.includes(field)),
  });
}
```

In `storefrontBuilderModel.js`, in `normalizeCategoryConfig` replace (currently `:301-308`):

```js
    cardDesign: {
      visibleFields: normalizedCardFields,
      style: normalizedCardStyle,
      elementConfig: normalizeCardElementConfig(
        sourceCardDesign.elementConfig ??
          deriveCardElementConfig(normalizedCardFields, normalizedCardStyle, sourceCardDesign.elementConfig),
      ),
    },
```

with:

```js
    cardDesign: {
      visibleFields: normalizedCardFields,
      style: normalizedCardStyle,
      elementConfig: deriveCardElementConfig(normalizedCardFields, normalizedCardStyle, sourceCardDesign.elementConfig),
    },
```

(`deriveCardElementConfig` already calls `normalizeCardElementConfig` internally, so the outer wrap and the dead "use stored elementConfig verbatim" branch both go away.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/storefront/__tests__/storefrontUiModel.test.js src/features/storefront/__tests__/storefrontBuilderModel.test.js src/features/storefront/__tests__/storefrontConfigService.test.js`
Expected: PASS. If any `storefrontConfigService.test.js` fixture asserts a stale `elementConfig.showSpec`/`showPrice` value that contradicts its own `visibleFields`, update that fixture's expected `elementConfig` to match the now-derived value (the fixture's `visibleFields` array is the source of truth).

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/model/storefrontUiModel.js react-app/src/features/storefront/model/storefrontBuilderModel.js react-app/src/features/storefront/__tests__/storefrontUiModel.test.js react-app/src/features/storefront/__tests__/storefrontConfigService.test.js
git commit -m "fix: always derive image/spec/nutrient/price card toggles from visibleFields"
```

---

### Task 3: Field-grouping model for the Data Selection UI

**Files:**
- Create: `react-app/src/features/storefront/model/dataSelectionFieldGroupModel.js`
- Test: `react-app/src/features/storefront/__tests__/dataSelectionFieldGroupModel.test.js`

**Interfaces:**
- Consumes: `NUTRIENT_FIELD_KEYS` from `../model/storefrontUiModel` (Task 2).
- Produces: `PRICE_GROUP_FIELD_KEYS`, `CATEGORY_GROUP_FIELD_KEYS`, `groupAvailableFields(availableFields) => { description, price, category }`, `isMandatoryField(key) => boolean`. Each field entry in the returned groups has the shape `{ key, label, exampleValue, isSelectable }`, with an extra `aliasKeys: string[]` on a synthesized "중요 성분" row when both `nutrient` and `product_nutirent` are present in the input.

- [ ] **Step 1: Write the failing tests**

Create `react-app/src/features/storefront/__tests__/dataSelectionFieldGroupModel.test.js`:

```js
import { describe, expect, it } from 'vitest';

import { groupAvailableFields, isMandatoryField } from '../model/dataSelectionFieldGroupModel';

const AVAILABLE_FIELDS = [
  { key: 'product_name', label: '상품명', exampleValue: 'Alpha', isSelectable: true },
  { key: 'spec', label: '규격', exampleValue: '20kg', isSelectable: true },
  { key: 'tax_price', label: '과세가격', exampleValue: 1000, isSelectable: true },
  { key: 'zero_tax_price', label: '영세가격', exampleValue: 900, isSelectable: true },
  { key: 'large_category', label: '대분류', exampleValue: 'Fertilizer', isSelectable: true },
  { key: 'medium_category', label: '중분류', exampleValue: 'Premium', isSelectable: true },
  { key: 'nutrient', label: '주요 성분', exampleValue: '18-18-18', isSelectable: true },
  { key: 'product_nutirent', label: '성분', exampleValue: 'N-P-K', isSelectable: true },
];

describe('groupAvailableFields', () => {
  it('splits fields into description, price, and category groups', () => {
    const groups = groupAvailableFields(AVAILABLE_FIELDS);

    expect(groups.price.map((f) => f.key)).toEqual(['tax_price', 'zero_tax_price']);
    expect(groups.category.map((f) => f.key)).toEqual(['large_category', 'medium_category']);
    expect(groups.description.map((f) => f.key)).toEqual(['product_name', 'spec', 'nutrient']);
  });

  it('consolidates nutrient and product_nutirent into a single "important ingredient" row when both exist', () => {
    const groups = groupAvailableFields(AVAILABLE_FIELDS);
    const consolidated = groups.description.find((f) => f.key === 'nutrient');

    expect(consolidated.label).toBe('중요 성분');
    expect(consolidated.aliasKeys).toEqual(['nutrient', 'product_nutirent']);
  });

  it('does not consolidate when only one nutrient-like field is available', () => {
    const onlyNutrient = AVAILABLE_FIELDS.filter((f) => f.key !== 'product_nutirent');
    const groups = groupAvailableFields(onlyNutrient);
    const field = groups.description.find((f) => f.key === 'nutrient');

    expect(field.aliasKeys).toBeUndefined();
    expect(field.label).toBe('주요 성분');
  });

  it('returns empty group arrays for an empty input', () => {
    expect(groupAvailableFields([])).toEqual({ description: [], price: [], category: [] });
  });
});

describe('isMandatoryField', () => {
  it('flags only product_name as mandatory', () => {
    expect(isMandatoryField('product_name')).toBe(true);
    expect(isMandatoryField('spec')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/storefront/__tests__/dataSelectionFieldGroupModel.test.js`
Expected: FAIL with "Failed to resolve import" (module doesn't exist yet).

- [ ] **Step 3: Implement**

Create `react-app/src/features/storefront/model/dataSelectionFieldGroupModel.js`:

```js
import { NUTRIENT_FIELD_KEYS } from './storefrontUiModel';

export const PRICE_GROUP_FIELD_KEYS = ['zero_tax_price', 'tax_price', 'exempt_tax_price', 'price_subsidy'];
export const CATEGORY_GROUP_FIELD_KEYS = ['large_category', 'medium_category', 'small_category', 'detail_category'];

export function isMandatoryField(key) {
  return key === 'product_name';
}

export function groupAvailableFields(availableFields) {
  const fields = Array.isArray(availableFields) ? availableFields : [];
  const nutrientFieldsPresent = fields.filter((field) => NUTRIENT_FIELD_KEYS.includes(field.key));
  const shouldConsolidateNutrient = nutrientFieldsPresent.length > 1;
  let nutrientConsolidatedOnce = false;

  const description = [];
  const price = [];
  const category = [];

  fields.forEach((field) => {
    if (shouldConsolidateNutrient && NUTRIENT_FIELD_KEYS.includes(field.key)) {
      if (nutrientConsolidatedOnce) {
        return;
      }

      nutrientConsolidatedOnce = true;
      description.push({
        key: field.key,
        label: '중요 성분',
        exampleValue: field.exampleValue,
        isSelectable: nutrientFieldsPresent.every((nutrientField) => nutrientField.isSelectable),
        aliasKeys: nutrientFieldsPresent.map((nutrientField) => nutrientField.key),
      });
      return;
    }

    if (PRICE_GROUP_FIELD_KEYS.includes(field.key)) {
      price.push(field);
    } else if (CATEGORY_GROUP_FIELD_KEYS.includes(field.key)) {
      category.push(field);
    } else {
      description.push(field);
    }
  });

  return { description, price, category };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/storefront/__tests__/dataSelectionFieldGroupModel.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/model/dataSelectionFieldGroupModel.js react-app/src/features/storefront/__tests__/dataSelectionFieldGroupModel.test.js
git commit -m "feat: add field-grouping model for the data selection step"
```

---

### Task 4: Minimal card-field render model for the neutral preview

**Files:**
- Create: `react-app/src/features/storefront/model/cardFieldRenderModel.js`
- Test: `react-app/src/features/storefront/__tests__/cardFieldRenderModel.test.js`

**Interfaces:**
- Produces: `hasRenderableValue(value) => boolean`, `formatFieldDisplayValue(field, value) => string`.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/cardFieldRenderModel.test.js`:

```js
import { describe, expect, it } from 'vitest';

import { formatFieldDisplayValue, hasRenderableValue } from '../model/cardFieldRenderModel';

describe('hasRenderableValue', () => {
  it('treats null, undefined, empty string, and empty arrays as not renderable', () => {
    expect(hasRenderableValue(null)).toBe(false);
    expect(hasRenderableValue(undefined)).toBe(false);
    expect(hasRenderableValue('')).toBe(false);
    expect(hasRenderableValue([])).toBe(false);
  });

  it('treats 0, non-empty strings, and non-empty arrays as renderable', () => {
    expect(hasRenderableValue(0)).toBe(true);
    expect(hasRenderableValue('Alpha')).toBe(true);
    expect(hasRenderableValue(['a'])).toBe(true);
  });
});

describe('formatFieldDisplayValue', () => {
  it('formats tax-like fields as Korean currency', () => {
    expect(formatFieldDisplayValue('tax_price', 1000)).toBe('1,000원');
    expect(formatFieldDisplayValue('zero_tax_price', 900)).toBe('900원');
  });

  it('returns an empty string for empty values', () => {
    expect(formatFieldDisplayValue('spec', null)).toBe('');
    expect(formatFieldDisplayValue('spec', '')).toBe('');
  });

  it('previews arrays with a truncation marker beyond 3 items', () => {
    expect(formatFieldDisplayValue('manufacturer_list', ['A', 'B', 'C', 'D'])).toBe('[A, B, C, ...]');
  });

  it('stringifies plain scalar values', () => {
    expect(formatFieldDisplayValue('product_name', 'Alpha')).toBe('Alpha');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/storefront/__tests__/cardFieldRenderModel.test.js`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Implement**

Create `react-app/src/features/storefront/model/cardFieldRenderModel.js`:

```js
const CURRENCY_FIELD_KEYS = ['tax_price', 'zero_tax_price', 'exempt_tax_price', 'price_subsidy'];

export function hasRenderableValue(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

export function formatFieldDisplayValue(field, value) {
  if (!hasRenderableValue(value)) {
    return '';
  }

  if (Array.isArray(value)) {
    const preview = value
      .slice(0, 3)
      .map((item) => (item !== null && typeof item === 'object' ? '{...}' : String(item)))
      .join(', ');

    return `[${preview}${value.length > 3 ? ', ...' : ''}]`;
  }

  if (typeof value === 'object') {
    return '상세 정보 보기';
  }

  if (CURRENCY_FIELD_KEYS.includes(field)) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? `${numericValue.toLocaleString()}원` : String(value);
  }

  return String(value);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/storefront/__tests__/cardFieldRenderModel.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/model/cardFieldRenderModel.js react-app/src/features/storefront/__tests__/cardFieldRenderModel.test.js
git commit -m "feat: add minimal card-field render model for the neutral data preview"
```

---

### Task 5: Pin the AI service so it can read but never write data selection

**Files:**
- Modify: `react-app/src/features/storefront/services/storefrontAiService.js:1-49` (imports/consts), `:640-673` (`detectFields`), `:691-729` (`normalizeLegacyPatch`), `:866-942` (`compileLegacyPatchFromDesignPlan`), `:944-1028` (`buildHeuristicSuggestion`), `:1099-1137` (`normalizeStorefrontAiSuggestion`)
- Test: `react-app/src/features/storefront/__tests__/storefrontAiService.test.js`

**Interfaces:**
- Consumes: `PRICE_FIELD_KEYS`, `NUTRIENT_FIELD_KEYS` from `../model/storefrontUiModel` (Task 2).
- Produces: `buildHeuristicSuggestion(...)` and `normalizeStorefrontAiSuggestion(...)` now always return `patch.cardFields === normalizeCardFields(currentDraft.cardFields, allowedScalarKeys)` and `patch.selectedMediumCategories`/`patch.representativeMediumCategory` pinned to `currentDraft`, regardless of what the prompt, the heuristic detector, or the raw AI JSON payload contains.

- [ ] **Step 1: Write the failing tests**

Add to `react-app/src/features/storefront/__tests__/storefrontAiService.test.js` (the file already imports `buildHeuristicSuggestion` and `normalizeStorefrontAiSuggestion`):

```js
describe('data-selection pinning', () => {
  const currentDraft = {
    cardFields: ['product_name', 'spec'],
    selectedMediumCategories: ['Premium'],
    representativeMediumCategory: 'Premium',
  };

  it('buildHeuristicSuggestion never adds fields the prompt asks for', () => {
    const result = buildHeuristicSuggestion({
      prompt: '가격과 성분을 보여주고 링크도 추가해줘',
      mediumCategoryOptions: ['Premium', 'Starter'],
      currentDraft,
      allowedScalarKeys: ['product_name', 'spec', 'tax_price', 'nutrient', 'product_url'],
    });

    expect(result.patch.cardFields).toEqual(['product_name', 'spec']);
  });

  it('buildHeuristicSuggestion never changes medium-category selection', () => {
    const result = buildHeuristicSuggestion({
      prompt: '스타터 제품만 보여줘',
      mediumCategoryOptions: ['Premium', 'Starter'],
      currentDraft,
      allowedScalarKeys: ['product_name', 'spec'],
    });

    expect(result.patch.selectedMediumCategories).toEqual(['Premium']);
    expect(result.patch.representativeMediumCategory).toBe('Premium');
  });

  it('normalizeStorefrontAiSuggestion ignores a raw AI payload that tries to set cardFields/selectedMediumCategories', () => {
    const result = normalizeStorefrontAiSuggestion(
      {
        summary: 'updated',
        patch: {
          cardFields: ['product_name', 'tax_price', 'product_url'],
          selectedMediumCategories: ['Starter'],
          representativeMediumCategory: 'Starter',
        },
      },
      ['Premium', 'Starter'],
      ['product_name', 'spec', 'tax_price', 'product_url'],
      { currentDraft },
    );

    expect(result.patch.cardFields).toEqual(['product_name', 'spec']);
    expect(result.patch.selectedMediumCategories).toEqual(['Premium']);
  });

  it('normalizeStorefrontAiSuggestion ignores a designPlan that references fields outside the committed selection', () => {
    const result = normalizeStorefrontAiSuggestion(
      {
        summary: 'updated',
        designPlan: {
          designBrief: { tone: 'warm', goal: 'g', audience: 'a', priority: ['product_name', 'tax_price'] },
          transformPlan: { groups: [], hideIfEmpty: [], formatRules: [] },
          contentPlan: {
            blocks: [
              { id: 'b1', type: 'field', source: 'product_name', label: '' },
              { id: 'b2', type: 'field', source: 'tax_price', label: '' },
            ],
          },
          layoutPlan: { cardVariant: 'card-grid', density: 'comfortable', imagePosition: 'top', pricePriority: 'default' },
          stylePlan: { priceTextColor: 'default', accentColor: '', cardSpacing: 'relaxed', fieldStyles: [], regionStyles: [] },
        },
      },
      ['Premium'],
      ['product_name', 'spec'],
      { currentDraft: { cardFields: ['product_name', 'spec'], selectedMediumCategories: ['Premium'], representativeMediumCategory: 'Premium' } },
    );

    expect(result.patch.cardFields).toEqual(['product_name', 'spec']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/storefront/__tests__/storefrontAiService.test.js`
Expected: FAIL — today `detectFields`/the raw `patch.cardFields`/`collectStorefrontDesignPlanFieldKeys(designPlan)` all let these inputs override `cardFields`/`selectedMediumCategories`.

- [ ] **Step 3: Implement**

In `storefrontAiService.js`, update the import block (currently `:1-44`) — replace the `storefrontAiDesignModel` import's `collectStorefrontDesignPlanFieldKeys` entry by removing that name from the list, and add an import from `storefrontUiModel`:

```js
import {
  DEFAULT_CARD_ELEMENT_CONFIG,
  DEFAULT_MOBILE_UI_TREE,
  MOBILE_UI_BLOCK_TYPES,
  MOBILE_UI_SLOTS,
  NUTRIENT_FIELD_KEYS,
  PRICE_FIELD_KEYS,
  normalizeCardElementConfig,
  normalizeMobileUiTree,
} from '../model/storefrontUiModel';
```

Delete the local consts (currently `:48-49`):

```js
const PRICE_FIELD_SET = new Set(['zero_tax_price', 'tax_price', 'exempt_tax_price', 'price_subsidy']);
const NUTRIENT_FIELD_SET = new Set(['nutrient', 'product_nutirent']);
```

and replace every remaining `PRICE_FIELD_SET.has(field)` with `PRICE_FIELD_KEYS.includes(field)`, and every `NUTRIENT_FIELD_SET.has(field)` with `NUTRIENT_FIELD_KEYS.includes(field)` (occurrences in `buildSemanticGroups`, `buildDesignPlanFromLegacyPatch`, and `compileLegacyPatchFromDesignPlan`).

Delete `detectFields` entirely (currently `:640-673`).

Replace `normalizeLegacyPatch` (currently `:691-729`):

```js
function normalizeLegacyPatch(patch, mediumCategoryOptions, allowedScalarKeys, currentDraft) {
  const source = patch ?? {};
  const selectedMediumCategories = normalizeSelectedMediumCategories(
    currentDraft?.selectedMediumCategories,
    mediumCategoryOptions,
  );
  const representativeMediumCategory = selectedMediumCategories.includes(currentDraft?.representativeMediumCategory)
    ? currentDraft.representativeMediumCategory
    : selectedMediumCategories[0] || mediumCategoryOptions[0] || '';

  return {
    designDirection: STOREFRONT_AI_PLAN_TONE_OPTIONS.includes(source.designDirection)
      ? source.designDirection
      : currentDraft?.designDirection || 'friendly',
    selectedMediumCategories,
    representativeMediumCategory,
    cardFields: normalizeCardFields(currentDraft?.cardFields, allowedScalarKeys),
    cardTemplate: CARD_TEMPLATE_OPTIONS.includes(source.cardTemplate)
      ? source.cardTemplate
      : currentDraft?.cardTemplate || 'card-grid',
    cardStyle: normalizeCardStyle({
      ...(currentDraft?.cardStyle ?? {}),
      ...(source.cardStyle ?? {}),
    }),
    navConfig: normalizeNavConfig({
      ...(currentDraft?.navConfig ?? {}),
      ...(source.navConfig ?? {}),
    }),
    mobileUiTree: normalizeMobileUiTree(source.mobileUiTree ?? currentDraft?.mobileUiTree ?? DEFAULT_MOBILE_UI_TREE),
    cardElementConfig: normalizeCardElementConfig({
      ...(currentDraft?.cardElementConfig ?? DEFAULT_CARD_ELEMENT_CONFIG),
      ...(source.cardElementConfig ?? {}),
    }),
    uiChangeSummary: normalizeUiChangeSummary(source.uiChangeSummary),
  };
}
```

Replace the start of `compileLegacyPatchFromDesignPlan` (currently `:866-902`, the `visibleFields`/`selectedMediumCategories`/`representativeMediumCategory` lines) — drop the `mediumCategoryOptions` param and the two recompute blocks:

```js
function compileLegacyPatchFromDesignPlan({
  designPlan,
  fallbackPatch,
  currentDraft,
  allowedScalarKeys,
}) {
  const visibleFields = fallbackPatch.cardFields;
  const accentColor =
    toTrimmedString(designPlan.stylePlan.accentColor) ||
    fallbackPatch.cardStyle.accentColor ||
    currentDraft?.cardStyle?.accentColor ||
    STOREFRONT_DESIGN_ACCENT_COLORS[designPlan.designBrief.tone] ||
    DEFAULT_CARD_STYLE.accentColor;
  const baseCardStyle = normalizeCardStyle({
    ...(currentDraft?.cardStyle ?? {}),
    ...(fallbackPatch.cardStyle ?? {}),
    accentColor,
    layout: designPlan.layoutPlan.density === 'compact' ? 'compact' : 'grid',
    imageSize:
      designPlan.layoutPlan.imagePosition === 'hidden'
        ? 'hidden'
        : fallbackPatch.cardStyle.imageSize,
    cardSpacing: designPlan.stylePlan.cardSpacing,
    priceTextColor: designPlan.stylePlan.priceTextColor,
  });
  const selectedMediumCategories = fallbackPatch.selectedMediumCategories;
  const representativeMediumCategory = fallbackPatch.representativeMediumCategory;
```

(the rest of the function, `nextCardElementConfig` through `return compiledPatch;`, is unchanged — it already reads `visibleFields`/`selectedMediumCategories`/`representativeMediumCategory` as local consts).

Update the two call sites of `compileLegacyPatchFromDesignPlan` to drop `mediumCategoryOptions`: in `buildHeuristicSuggestion` (currently `:1013-1019`):

```js
  const patch = compileLegacyPatchFromDesignPlan({
    designPlan,
    fallbackPatch,
    currentDraft,
    allowedScalarKeys,
  });
```

and in `normalizeStorefrontAiSuggestion` (currently `:1122-1128`):

```js
  const patch = compileLegacyPatchFromDesignPlan({
    designPlan,
    fallbackPatch: normalizedFallbackPatch,
    currentDraft,
    allowedScalarKeys,
  });
```

In `buildHeuristicSuggestion`, replace the `cardFields: detectFields(prompt, allowedScalarKeys),` line (currently `:965`) with:

```js
      cardFields: currentDraft?.cardFields,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/storefront/__tests__/storefrontAiService.test.js`
Expected: PASS — including all pre-existing tests in this file (they exercise `designPlan`→`renderSpec`/style normalization paths that are untouched; double-check any pre-existing test that asserted a *specific* `patch.cardFields` value derived from a `designPlan.designBrief.priority` — those now must pass a `currentDraft.cardFields` that matches the expected value, since `cardFields` is pinned. If a pre-existing test's fixture omits `currentDraft.cardFields` and asserted a fields value, add `currentDraft: { cardFields: [...expected fields...] }` to that fixture).

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/services/storefrontAiService.js react-app/src/features/storefront/__tests__/storefrontAiService.test.js
git commit -m "fix: pin storefront AI suggestions to committed data selection (presentation-only)"
```

---

### Task 6: `useDataSelectionDraft` — the draft/committed state machine

**Files:**
- Create: `react-app/src/features/storefront/hooks/useDataSelectionDraft.js`
- Test: `react-app/src/features/storefront/__tests__/useDataSelectionDraft.test.js`

**Interfaces:**
- Consumes: `normalizeCardFields` from `../model/storefrontBuilderModel` (Task 1).
- Produces: `useDataSelectionDraft({ allowedScalarKeys, initialFields }) => { draft, committed, isConfirmed, toggleField(field), confirm(), reset(nextFields) }`.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/useDataSelectionDraft.test.js`:

```js
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDataSelectionDraft } from '../hooks/useDataSelectionDraft';

describe('useDataSelectionDraft', () => {
  it('starts with draft === committed and isConfirmed true', () => {
    const { result } = renderHook(() => useDataSelectionDraft({ initialFields: ['product_name', 'spec'] }));

    expect(result.current.draft).toEqual(['product_name', 'spec']);
    expect(result.current.committed).toEqual(['product_name', 'spec']);
    expect(result.current.isConfirmed).toBe(true);
  });

  it('toggling a field marks the draft unconfirmed without touching committed', () => {
    const { result } = renderHook(() => useDataSelectionDraft({ initialFields: ['product_name', 'spec'] }));

    act(() => result.current.toggleField('tax_price'));

    expect(result.current.draft).toContain('tax_price');
    expect(result.current.committed).toEqual(['product_name', 'spec']);
    expect(result.current.isConfirmed).toBe(false);
  });

  it('cannot remove the mandatory product_name field', () => {
    const { result } = renderHook(() => useDataSelectionDraft({ initialFields: ['product_name', 'spec'] }));

    act(() => result.current.toggleField('product_name'));

    expect(result.current.draft).toContain('product_name');
  });

  it('confirm() promotes draft into committed', () => {
    const { result } = renderHook(() => useDataSelectionDraft({ initialFields: ['product_name'] }));

    act(() => result.current.toggleField('spec'));
    act(() => result.current.confirm());

    expect(result.current.committed).toEqual(result.current.draft);
    expect(result.current.isConfirmed).toBe(true);
  });

  it('reset() replaces both draft and committed with a fresh normalized value', () => {
    const { result } = renderHook(() => useDataSelectionDraft({ initialFields: ['product_name'] }));

    act(() => result.current.toggleField('spec'));
    act(() => result.current.reset(['tax_price']));

    expect(result.current.draft).toEqual(['product_name', 'tax_price']);
    expect(result.current.committed).toEqual(['product_name', 'tax_price']);
    expect(result.current.isConfirmed).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/storefront/__tests__/useDataSelectionDraft.test.js`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Implement**

Create `react-app/src/features/storefront/hooks/useDataSelectionDraft.js`:

```js
import { useState } from 'react';

import { normalizeCardFields } from '../model/storefrontBuilderModel';

export function useDataSelectionDraft({ allowedScalarKeys, initialFields } = {}) {
  const [draft, setDraft] = useState(() => normalizeCardFields(initialFields, allowedScalarKeys));
  const [committed, setCommitted] = useState(() => normalizeCardFields(initialFields, allowedScalarKeys));

  const isConfirmed = draft.length === committed.length && draft.every((field, index) => field === committed[index]);

  function toggleField(field) {
    if (field === 'product_name') {
      return;
    }

    setDraft((current) => {
      const nextRaw = current.includes(field) ? current.filter((value) => value !== field) : [...current, field];
      return normalizeCardFields(nextRaw, allowedScalarKeys);
    });
  }

  function confirm() {
    setCommitted(draft);
  }

  function reset(nextFields) {
    const normalized = normalizeCardFields(nextFields, allowedScalarKeys);
    setDraft(normalized);
    setCommitted(normalized);
  }

  return { draft, committed, isConfirmed, toggleField, confirm, reset };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/storefront/__tests__/useDataSelectionDraft.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/hooks/useDataSelectionDraft.js react-app/src/features/storefront/__tests__/useDataSelectionDraft.test.js
git commit -m "feat: add useDataSelectionDraft hook for the draft/committed data-selection boundary"
```

---

### Task 7: Integrate `useDataSelectionDraft` into `useStorefrontBuilder`, guard the AI path, expose the 3-step API

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js` (whole file — imports, state, `hydrateCategoryDraft`, `toggleCardField` removal, `undoAiChanges`, `goNext`, `applyAiSuggestion`, `saveDraft`, `previewConfig`, return object)
- Test: covered end-to-end in Task 11 (`StorefrontBuilderPage.test.jsx`) — this hook has no dedicated unit test file today (it's tested through the page), so no new standalone hook test is added here.

**Interfaces:**
- Consumes: `useDataSelectionDraft` from `../hooks/useDataSelectionDraft` (Task 6).
- Produces: the hook's returned object drops `cardFields`/`toggleCardField` and instead exposes `draftDataSelection`, `committedDataSelection`, `isDataSelectionConfirmed`, `toggleDraftField(field)`, `confirmDataSelection()`. `currentStep` now ranges `0..2`. `goNext()` refuses to leave the Data Selection step (`index 1`) while `isDataSelectionConfirmed` is `false`.

- [ ] **Step 1: Update imports and remove dead constants**

In `useStorefrontBuilder.js`, replace the import block (currently `:1-28`):

```js
import { startTransition, useEffect, useState } from 'react';

import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/officeProductDataService';
import { normalizeCardStyle } from '../model/cardStyleModel';
import { DEFAULT_STOREFRONT_EDIT_POLICY, normalizeStorefrontAiDesign } from '../model/storefrontAiDesignModel';
import {
  DEFAULT_NAV_CONFIG,
  DEFAULT_PAGE_CONFIG,
  buildStorefrontSavePayload,
  deriveAvailableCategoryFields,
  deriveMediumCategoryOptions,
  deriveProductCategoryOptions,
  findCategoryConfigRow,
  flattenProductEntries,
  normalizeNavConfig,
  normalizePageConfig,
  resolveCategoryDraft,
} from '../model/storefrontBuilderModel';
import { DEFAULT_CARD_ELEMENT_CONFIG, normalizeCardElementConfig, sanitizeMobileUiTree } from '../model/storefrontUiModel';
import { fetchStorefrontConfig, upsertStorefrontConfig } from '../services/storefrontConfigService';
import { requestStorefrontAiSuggestion } from '../services/storefrontAiService';
import { useDataSelectionDraft } from './useDataSelectionDraft';
import { usePageAiDesign } from './usePageAiDesign';

const FETCH_ERROR_MESSAGE = 'We could not load the storefront builder.';
const SAVE_ERROR_MESSAGE = 'We could not save the storefront draft.';
const DATA_SELECTION_STEP_INDEX = 1;
const FINAL_STEP_INDEX = 2;
```

(`DEFAULT_CARD_FIELDS` and `normalizeCardFields` are dropped — they're only needed inside `useDataSelectionDraft` now. `CARD_ELEMENT_FIELD_MAP` is deleted along with `toggleCardField`, in Step 3.)

- [ ] **Step 2: Replace the `cardFields` state with the draft/committed hook**

Replace (currently `:66`):

```js
  const [cardFields, setCardFields] = useState(DEFAULT_CARD_FIELDS);
```

Delete that line. After the `effectiveScalarKeys` derivation (currently `:84-85`, unchanged), add:

```js
  const dataSelection = useDataSelectionDraft({ allowedScalarKeys: effectiveScalarKeys, initialFields: ['product_name'] });
```

- [ ] **Step 3: Update `hydrateCategoryDraft` and delete `toggleCardField`**

Replace `hydrateCategoryDraft` (currently `:91-107`):

```js
  function hydrateCategoryDraft(categoryName, nextProductEntries, nextExistingConfig) {
    const resolvedCategoryName = categoryName || '';
    const resolvedDraft = resolveCategoryDraft({
      productCategoryName: resolvedCategoryName,
      productEntries: nextProductEntries,
      existingConfig: nextExistingConfig,
    });

    setSelectedProductCategoryName(resolvedCategoryName);
    setSelectedMediumCategories(resolvedDraft.selectedMediumCategories);
    setRepresentativeMediumCategory(resolvedDraft.representativeMediumCategory);
    dataSelection.reset(resolvedDraft.cardFields);
    setCardStyleState(resolvedDraft.cardStyle);
    setCardElementConfig(resolvedDraft.cardElementConfig);
    setCardTemplateState(resolvedDraft.cardTemplate);
    setAiDesign(resolvedDraft.aiDesign);
  }
```

Delete `toggleCardField` entirely (currently `:176-195`) and delete the `CARD_ELEMENT_FIELD_MAP` constant (currently `:33-38`) — both are superseded by `dataSelection.toggleField`, which the model layer (`deriveCardElementConfig`, Task 2) now keeps in sync automatically at normalize/save time.

- [ ] **Step 4: Add `confirmDataSelection`, tighten `goNext`**

Replace `goNext` (currently `:217-219`):

```js
  function goNext() {
    setCurrentStep((current) => {
      if (current === DATA_SELECTION_STEP_INDEX && !dataSelection.isConfirmed) {
        return current;
      }

      return Math.min(current + 1, FINAL_STEP_INDEX);
    });
  }

  function confirmDataSelection() {
    markDirty();
    dataSelection.confirm();
    setCardStyleState(normalizeCardStyle());
    setCardElementConfig(DEFAULT_CARD_ELEMENT_CONFIG);
    setCardTemplateState('card-grid');
    setAiDesign(null);
    setAiPrompt('');
    setAiSummary('');
    setAiChangeSummary([]);
    setAiErrorMessage('');
    setLastAiSnapshot(null);
    setCurrentStep(FINAL_STEP_INDEX);
  }
```

- [ ] **Step 5: Guard `applyAiSuggestion` and `undoAiChanges` against touching data selection**

Replace `undoAiChanges` (currently `:197-215`):

```js
  function undoAiChanges() {
    if (!lastAiSnapshot) {
      return;
    }

    markDirty();
    setCardTemplateState(lastAiSnapshot.cardTemplate);
    setCardStyleState(lastAiSnapshot.cardStyle);
    setCardElementConfig(lastAiSnapshot.cardElementConfig);
    setNavConfig(lastAiSnapshot.navConfig);
    setMobileUiTree(lastAiSnapshot.mobileUiTree);
    setAiDesign(lastAiSnapshot.aiDesign);
    setAiSummary(lastAiSnapshot.aiSummary);
    setAiChangeSummary(lastAiSnapshot.aiChangeSummary);
    setLastAiSnapshot(null);
  }
```

Replace `applyAiSuggestion` (currently `:225-302`):

```js
  async function applyAiSuggestion() {
    setIsAiApplying(true);
    setAiErrorMessage('');

    try {
      const suggestion = await requestStorefrontAiSuggestion({
        prompt: aiPrompt,
        mediumCategoryOptions,
        fieldCatalog: availableCategoryFields.filter((field) => dataSelection.committed.includes(field.key)),
        editPolicy: DEFAULT_STOREFRONT_EDIT_POLICY,
        currentDraft: {
          productCategoryName: selectedProductCategoryName,
          selectedMediumCategories,
          representativeMediumCategory,
          cardFields: dataSelection.committed,
          cardStyle,
          cardElementConfig,
          cardTemplate,
          navConfig,
          mobileUiTree,
          aiDesign,
        },
        allowedScalarKeys: dataSelection.committed,
      });

      const nextAiDesign = normalizeStorefrontAiDesign(
        {
          prompt: aiPrompt,
          activeSkillIds: suggestion.activeSkillIds,
          designPlan: suggestion.designPlan,
          renderSpec: suggestion.renderSpec,
        },
        dataSelection.committed,
      );

      const snapshot = {
        cardStyle,
        cardElementConfig,
        cardTemplate,
        navConfig,
        mobileUiTree,
        aiDesign,
        aiSummary,
        aiChangeSummary,
      };

      startTransition(() => {
        setHasStarted(true);
        setCurrentStep(FINAL_STEP_INDEX);
        setLastAiSnapshot(snapshot);
        setCardTemplateState(suggestion.patch.cardTemplate);
        setCardStyleState(normalizeCardStyle(suggestion.patch.cardStyle));
        setCardElementConfig(normalizeCardElementConfig(suggestion.patch.cardElementConfig));
        setNavConfig(normalizeNavConfig({ ...navConfig, ...suggestion.patch.navConfig }));
        setMobileUiTree(sanitizeMobileUiTree(suggestion.patch.mobileUiTree));
        setAiDesign(nextAiDesign);
        setAiSummary(suggestion.summary);
        setAiChangeSummary(suggestion.patch.uiChangeSummary ?? []);
      });
    } catch (error) {
      setAiErrorMessage(error instanceof Error ? error.message : 'We could not apply the AI draft.');
    } finally {
      setIsAiApplying(false);
    }
  }
```

(Note `allowedScalarKeys: dataSelection.committed` — this is what prevents the AI's `designPlan.contentPlan.blocks`/`designBrief.priority`/`stylePlan.fieldStyles` from ever referencing a field outside the committed selection; see Task 5.)

- [ ] **Step 6: Update `saveDraft` and `previewConfig` to read `dataSelection.committed`**

In both `saveDraft` (currently `:304-336`) and the `previewConfig` derivation (currently `:338-363`), replace every `cardFields,` / `cardFields: cardFields,` and `allowedScalarKeys: effectiveScalarKeys,` occurrence inside the two `buildStorefrontSavePayload({...})` call objects with:

```js
          cardFields: dataSelection.committed,
          allowedScalarKeys: effectiveScalarKeys,
```

(`allowedScalarKeys` stays `effectiveScalarKeys` — i.e. "every selectable field in this category" — here, since `buildStorefrontSavePayload`/`normalizeCardFields` use it only as a category-validity safety net, not as the AI's permission boundary.)

- [ ] **Step 7: Update the returned object**

Replace the return statement (currently `:365-399`) — remove `cardFields`, `toggleCardField`; add the new data-selection fields:

```js
  return {
    status,
    errorMessage,
    hasStarted,
    currentStep,
    productCategoryOptions,
    selectedProductCategoryName,
    currentEntry,
    availableCategoryFields,
    selectedMediumCategories,
    representativeMediumCategory,
    draftDataSelection: dataSelection.draft,
    committedDataSelection: dataSelection.committed,
    isDataSelectionConfirmed: dataSelection.isConfirmed,
    toggleDraftField: dataSelection.toggleField,
    confirmDataSelection,
    aiPrompt,
    aiSummary,
    aiChangeSummary,
    aiErrorMessage,
    isAiApplying,
    previewConfig,
    previewProductRows: allProductRows,
    pageStyle: pageAi.pageStyle,
    pageAiDesign: pageAi.pageAiDesign,
    isApplyingPageAiDesign: pageAi.isApplyingPageAiDesign,
    pageAiErrorMessage: pageAi.pageAiErrorMessage,
    setPagePrompt: pageAi.setPrompt,
    applyPageAiDesign: pageAi.applyPageAiDesign,
    setAiPrompt,
    startSession,
    selectProductCategory,
    undoAiChanges,
    goNext,
    goPrevious,
    applyAiSuggestion,
    saveDraft,
  };
```

- [ ] **Step 8: Sanity-check with the existing page test suite**

Run: `npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: multiple FAILs at this point (the page/components haven't been updated yet — `AiStudioStep` still calls `builder.toggleCardField`, which no longer exists). This is expected; Tasks 8–11 fix it. Do not attempt to make this suite pass yet — just confirm the failures are all `toggleCardField is not a function` / missing-testid style errors, not syntax errors in `useStorefrontBuilder.js` itself.

- [ ] **Step 9: Commit**

```bash
git add react-app/src/features/storefront/hooks/useStorefrontBuilder.js
git commit -m "refactor: route storefront builder field selection through draft/committed data selection"
```

---

### Task 8: `DataFieldGroupTable` — extracted, grouped field table

**Files:**
- Create: `react-app/src/features/storefront/components/data-selection/DataFieldGroupTable.jsx`
- Test: covered through `DataSelectionStep` integration in Task 10/11 (this is a small presentational component; no isolated test file).

**Interfaces:**
- Consumes: `isMandatoryField` from `../../model/dataSelectionFieldGroupModel` (Task 3).
- Produces: `<DataFieldGroupTable groupLabel fields draftFields onToggleField testId />` — `fields` entries may carry `aliasKeys` (Task 3); toggling such a row toggles every alias key together.

- [ ] **Step 1: Implement**

Create `react-app/src/features/storefront/components/data-selection/DataFieldGroupTable.jsx`:

```jsx
import { isMandatoryField } from '../../model/dataSelectionFieldGroupModel';
import { formatFieldDisplayValue } from '../../model/cardFieldRenderModel';
import styles from '../../pages/StorefrontBuilderPage.module.css';

function isFieldVisible(draftFields, field) {
  const keys = field.aliasKeys ?? [field.key];
  return keys.some((key) => draftFields.includes(key));
}

export default function DataFieldGroupTable({ groupLabel, fields, draftFields, onToggleField, testId }) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className={styles.fieldTableWrap}>
      <h4 className={styles.sectionTitle}>{groupLabel}</h4>
      <table className={styles.fieldTable} data-testid={testId}>
        <thead>
          <tr>
            <th scope="col">필드</th>
            <th scope="col">예시 값</th>
            <th scope="col">표시 여부</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const isVisible = isFieldVisible(draftFields, field);
            const isLocked = isMandatoryField(field.key);
            const exampleDisplay = formatFieldDisplayValue(field.key, field.exampleValue);

            return (
              <tr key={field.key} data-testid={`data-field-row-${field.key}`}>
                <th scope="row" className={styles.fieldTableHeading}>
                  <div className={styles.fieldNameBlock}>
                    <span>{field.label}</span>
                    <span className={styles.fieldKey}>{field.key}</span>
                  </div>
                </th>
                <td className={styles.fieldTableValueCell}>
                  <span className={styles.fieldTableValue} data-testid={`data-field-example-${field.key}`}>
                    {exampleDisplay || '-'}
                  </span>
                </td>
                <td className={styles.fieldTableToggleCell}>
                  {field.isSelectable ? (
                    <label className={styles.fieldToggle}>
                      <input
                        type="checkbox"
                        checked={isVisible}
                        disabled={isLocked}
                        data-testid={`data-field-toggle-${field.key}`}
                        onChange={() => onToggleField(field)}
                      />
                      <span>{isVisible ? '표시' : '숨김'}</span>
                    </label>
                  ) : (
                    <span className={styles.fieldDisabled} title="배열 또는 객체 값은 카드에 표시할 수 없습니다">
                      선택 불가
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add react-app/src/features/storefront/components/data-selection/DataFieldGroupTable.jsx
git commit -m "feat: extract DataFieldGroupTable from the old combined field table"
```

---

### Task 9: Neutral, full-product-set Data Selection preview

**Files:**
- Create: `react-app/src/features/storefront/components/data-selection/DataSelectionPreviewCard.jsx`
- Create: `react-app/src/features/storefront/components/data-selection/DataSelectionPreviewGrid.jsx`
- Test: covered through Task 11's page-flow test (asserting the neutral preview reflects draft toggles before confirm).

**Interfaces:**
- Consumes: `hasRenderableValue`, `formatFieldDisplayValue` from `../../model/cardFieldRenderModel` (Task 4).
- Produces: `<DataSelectionPreviewGrid productRows fields />`, rendering every row in `productRows` (no sampling/cap), hiding any field whose value is empty for that specific product.

- [ ] **Step 1: Implement**

Create `react-app/src/features/storefront/components/data-selection/DataSelectionPreviewCard.jsx`:

```jsx
import { formatFieldDisplayValue, hasRenderableValue } from '../../model/cardFieldRenderModel';
import styles from '../../pages/StorefrontBuilderPage.module.css';

export default function DataSelectionPreviewCard({ productRow, fields, index }) {
  const visibleFields = fields.filter((field) => hasRenderableValue(productRow?.[field.key]));

  return (
    <article className={styles.dataPreviewCard} data-testid={`data-selection-preview-card-${index}`}>
      {visibleFields.map((field) => (
        <p key={field.key} data-testid={`data-selection-preview-field-${field.key}-${index}`}>
          {formatFieldDisplayValue(field.key, productRow[field.key])}
        </p>
      ))}
    </article>
  );
}
```

Create `react-app/src/features/storefront/components/data-selection/DataSelectionPreviewGrid.jsx`:

```jsx
import DataSelectionPreviewCard from './DataSelectionPreviewCard';
import styles from '../../pages/StorefrontBuilderPage.module.css';

export default function DataSelectionPreviewGrid({ productRows, fields }) {
  const rows = Array.isArray(productRows) ? productRows : [];

  return (
    <div className={styles.dataPreviewGrid} data-testid="data-selection-preview-grid">
      {rows.map((productRow, index) => (
        <DataSelectionPreviewCard key={`${productRow?.product_name ?? 'row'}-${index}`} productRow={productRow} fields={fields} index={index} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add react-app/src/features/storefront/components/data-selection/DataSelectionPreviewCard.jsx react-app/src/features/storefront/components/data-selection/DataSelectionPreviewGrid.jsx
git commit -m "feat: add neutral full-product-set preview for the data selection step"
```

---

### Task 10: `DataSelectionStep` orchestrator + `CardDesignStep` (replaces `AiStudioStep`)

**Files:**
- Create: `react-app/src/features/storefront/components/DataSelectionStep.jsx`
- Create: `react-app/src/features/storefront/components/CardDesignStep.jsx`
- Delete: `react-app/src/features/storefront/components/AiStudioStep.jsx`

**Interfaces:**
- Consumes: `groupAvailableFields` (Task 3), `DataFieldGroupTable` (Task 8), `DataSelectionPreviewGrid` (Task 9), and the `builder` object's new fields from Task 7 (`draftDataSelection`, `isDataSelectionConfirmed`, `toggleDraftField`, `confirmDataSelection`, `currentEntry`, `availableCategoryFields`).
- Produces: `<DataSelectionStep builder />` rendering eyebrow "2단계" / title "데이터 선택"; `<CardDesignStep builder />` rendering eyebrow "3단계" / title "카드 디자인", with no field-table UI.

- [ ] **Step 1: Implement `DataSelectionStep`**

Create `react-app/src/features/storefront/components/DataSelectionStep.jsx`:

```jsx
import DataFieldGroupTable from './data-selection/DataFieldGroupTable';
import DataSelectionPreviewGrid from './data-selection/DataSelectionPreviewGrid';
import StepShell from './StepShell';
import { groupAvailableFields } from '../model/dataSelectionFieldGroupModel';
import styles from '../pages/StorefrontBuilderPage.module.css';

function toggleGroupedField(builder, field) {
  const keys = field.aliasKeys ?? [field.key];
  const isVisible = keys.some((key) => builder.draftDataSelection.includes(key));
  const makeVisible = !isVisible;

  keys.forEach((key) => {
    const isKeyVisible = builder.draftDataSelection.includes(key);

    if (isKeyVisible !== makeVisible) {
      builder.toggleDraftField(key);
    }
  });
}

export default function DataSelectionStep({ builder }) {
  const groups = groupAvailableFields(builder.availableCategoryFields);
  const previewRows = Array.isArray(builder.currentEntry?.rows) ? builder.currentEntry.rows : [];

  function handleForwardClick() {
    if (builder.isDataSelectionConfirmed) {
      builder.goNext();
    } else {
      builder.confirmDataSelection();
    }
  }

  return (
    <StepShell
      eyebrow="2단계"
      title="데이터 선택"
      description="카드에 보여줄 데이터를 먼저 확정해 주세요. 디자인은 다음 단계에서 다듬습니다."
    >
      <section className={styles.controlCard}>
        <DataFieldGroupTable
          groupLabel="설명 정보"
          fields={groups.description}
          draftFields={builder.draftDataSelection}
          onToggleField={(field) => toggleGroupedField(builder, field)}
          testId="data-field-table-description"
        />
        <DataFieldGroupTable
          groupLabel="가격 정보"
          fields={groups.price}
          draftFields={builder.draftDataSelection}
          onToggleField={(field) => toggleGroupedField(builder, field)}
          testId="data-field-table-price"
        />
        <DataFieldGroupTable
          groupLabel="분류 정보"
          fields={groups.category}
          draftFields={builder.draftDataSelection}
          onToggleField={(field) => toggleGroupedField(builder, field)}
          testId="data-field-table-category"
        />
        <p className={styles.tableHelperText}>체크를 바꾸면 아래 미리보기가 바로 업데이트됩니다.</p>
      </section>

      <section className={styles.controlCard}>
        <h3 className={styles.sectionTitle}>전체 상품 미리보기</h3>
        <DataSelectionPreviewGrid productRows={previewRows} fields={builder.availableCategoryFields.filter((f) => builder.draftDataSelection.includes(f.key))} />
      </section>

      {!builder.isDataSelectionConfirmed ? (
        <p className={styles.sectionHint} data-testid="data-selection-unconfirmed-hint">
          변경 사항이 있습니다. 확인을 눌러야 다음 단계로 이동할 수 있어요.
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="confirm-data-selection"
          onClick={handleForwardClick}
        >
          {builder.isDataSelectionConfirmed ? '다음 단계로' : '확인하고 다음 단계로'}
        </button>
      </div>
    </StepShell>
  );
}
```

- [ ] **Step 2: Implement `CardDesignStep`**

Create `react-app/src/features/storefront/components/CardDesignStep.jsx` (this is the old `AiStudioStep.jsx` with the field-table section and its now-unused helpers `renderExampleValue`/`getRepresentativeProductRow` removed):

```jsx
import panelStyles from '../../office-product-editor/components/shared/panel.module.css';
import StepShell from './StepShell';
import styles from '../pages/StorefrontBuilderPage.module.css';

export default function CardDesignStep({ builder }) {
  return (
    <StepShell
      eyebrow="3단계"
      title="카드 디자인"
      description="확정된 데이터를 바탕으로 카드 디자인을 다듬어보세요."
    >
      <label className={styles.inputLabel}>
        <span>AI로 다듬기</span>
        <textarea
          className={styles.textarea}
          value={builder.aiPrompt}
          onChange={(event) => builder.setAiPrompt(event.target.value)}
          placeholder="예시: 고객이 가격을 빠르게 비교할 수 있게 비료 상품을 강조하고, 모바일에서 읽기 쉬운 안내 페이지로 정리해줘."
        />
      </label>

      {builder.aiSummary ? <p className={styles.summary}>{builder.aiSummary}</p> : null}

      {builder.aiChangeSummary.length > 0 ? (
        <section className={styles.controlCard} data-testid="ai-change-summary-panel">
          <div className={styles.controlCardHeader}>
            <div className={styles.sectionStack}>
              <h3 className={styles.sectionTitle}>AI 변경 요약</h3>
              <p className={styles.sectionHint}>AI가 반영한 변경 내용을 바로 확인할 수 있습니다.</p>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="undo-ai-changes"
              onClick={builder.undoAiChanges}
            >
              AI 되돌리기
            </button>
          </div>

          <ul className={styles.summaryList} data-testid="ai-change-summary">
            {builder.aiChangeSummary.map((item) => (
              <li key={item} className={styles.summaryItem}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="apply-ai-suggestion"
          onClick={builder.applyAiSuggestion}
          disabled={builder.isAiApplying}
        >
          {builder.isAiApplying ? '적용 중...' : 'AI 초안 적용'}
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="save-storefront-draft"
          onClick={builder.saveDraft}
          disabled={builder.status === 'saving'}
        >
          {builder.status === 'saving' ? '저장 중...' : '초안 저장'}
        </button>
      </div>

      {builder.aiErrorMessage ? <div className={panelStyles.errorBox}>{builder.aiErrorMessage}</div> : null}
    </StepShell>
  );
}
```

- [ ] **Step 3: Delete the superseded file**

```bash
git rm react-app/src/features/storefront/components/AiStudioStep.jsx
```

- [ ] **Step 4: Add the two new CSS classes used above**

Check `react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css` for existing `.fieldTableWrap`/`.controlCard`/`.actions`/`.sectionHint` classes (all reused as-is). Add two new classes for the preview grid (append to the end of the file):

```css
.dataPreviewGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.dataPreviewCard {
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.8rem;
}
```

(If the file uses different design tokens for borders, match the existing convention instead of inventing `--border-color`.)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/components/DataSelectionStep.jsx react-app/src/features/storefront/components/CardDesignStep.jsx react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css
git commit -m "feat: split AiStudioStep into DataSelectionStep and CardDesignStep"
```

---

### Task 11: Wire the 3-step switch into `StorefrontBuilderPage`, rewrite the page-flow test suite

**Files:**
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

**Interfaces:**
- Consumes: `DataSelectionStep` (Task 10), `CardDesignStep` (Task 10), `builder.currentStep` (0/1/2, Task 7).

- [ ] **Step 1: Update `StorefrontBuilderPage.jsx`**

Replace the imports (currently `:1-6`):

```jsx
import panelStyles from '../../office-product-editor/components/shared/panel.module.css';
import CardDesignStep from '../components/CardDesignStep';
import DataSelectionStep from '../components/DataSelectionStep';
import ProductCategoryStep from '../components/ProductCategoryStep';
import StorefrontView from '../components/StorefrontView';
import { useStorefrontBuilder } from '../hooks/useStorefrontBuilder';
import styles from './StorefrontBuilderPage.module.css';

const STEP_COMPONENTS = [ProductCategoryStep, DataSelectionStep, CardDesignStep];
```

Replace the step-switch + footer-nav block (currently `:62-92`):

```jsx
              {(() => {
                const StepComponent = STEP_COMPONENTS[builder.currentStep];
                return <StepComponent builder={builder} />;
              })()}

              <div className={styles.stepNavActions}>
                {builder.currentStep > 0 ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    data-testid="builder-go-previous"
                    onClick={builder.goPrevious}
                  >
                    이전
                  </button>
                ) : null}
                {builder.currentStep === 0 ? (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    data-testid="builder-go-next"
                    onClick={builder.goNext}
                    disabled={!builder.selectedProductCategoryName}
                  >
                    다음
                  </button>
                ) : null}
                {typeof onGoHome === 'function' ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={onGoHome}
                  >
                    대시보드로 돌아가기
                  </button>
                ) : null}
              </div>
```

(The Data Selection step's own forward action lives inside `DataSelectionStep` — `confirm-data-selection` — so the generic footer "다음" button only ever applies to step 0; the Card Design step is terminal and has no "다음".)

- [ ] **Step 2: Rewrite the field-table test (currently `:141-170`)**

Replace it with a test of the new Data Selection step + neutral preview + confirm-gated right-column preview:

```jsx
  it('shows the grouped data-selection table, updates the neutral preview live, and only updates the design preview after confirming', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));

    const table = screen.getByTestId('data-field-table-description');
    const neutralPreview = screen.getByTestId('data-selection-preview-grid');
    const designPreview = screen.getByTestId('mobile-preview-device');

    expect(within(table).getByTestId('data-field-example-product_name')).toHaveTextContent('Alpha');
    expect(within(designPreview).queryByText('18-18-18')).not.toBeInTheDocument();
    expect(within(neutralPreview).queryByText('18-18-18')).not.toBeInTheDocument();

    await user.click(within(table).getByTestId('data-field-toggle-nutrient'));

    await waitFor(() => {
      expect(within(neutralPreview).getByText('18-18-18')).toBeInTheDocument();
    });
    expect(within(designPreview).queryByText('18-18-18')).not.toBeInTheDocument();
    expect(screen.getByTestId('data-selection-unconfirmed-hint')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-data-selection')).toHaveTextContent('확인하고 다음 단계로');

    await user.click(screen.getByTestId('confirm-data-selection'));

    expect(await screen.findByRole('heading', { name: '카드 디자인' })).toBeInTheDocument();
    await waitFor(() => {
      expect(within(screen.getByTestId('mobile-preview-device')).getByText('18-18-18')).toBeInTheDocument();
    });
  });
```

- [ ] **Step 3: Fix the "three-step flow" test (currently `:172-275`)**

Rename the test (`'runs the simplified two-step flow, ...'` → `'runs the three-step flow, ...'`) and, immediately after the existing `await user.click(screen.getByTestId('builder-go-next'));` (currently `:249`), insert:

```jsx
    expect(screen.getByTestId('data-field-table-description')).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-data-selection'));
```

Then delete the now-stale lines right after (currently `:251-254`):

```jsx
    expect(screen.getByRole('heading', { name: 'AI 페이지 초안 생성' })).toBeInTheDocument();
    expect(screen.getByTestId('card-field-table')).toBeInTheDocument();
    expect(screen.queryByTestId('page-design-editor')).not.toBeInTheDocument();
    expect(screen.queryByText('추천 시작 옵션')).not.toBeInTheDocument();
```

replacing them with:

```jsx
    expect(screen.getByRole('heading', { name: '카드 디자인' })).toBeInTheDocument();
    expect(screen.queryByTestId('data-field-table-description')).not.toBeInTheDocument();
    expect(screen.queryByTestId('page-design-editor')).not.toBeInTheDocument();
```

- [ ] **Step 4: Insert the confirm click into the three remaining AI-driven tests**

In each of the three tests that currently go straight from `builder-go-next` to typing into `AI로 다듬기` or clicking `save-storefront-draft` (currently at `:397`, `:494`, and `:540`), insert `await user.click(screen.getByTestId('confirm-data-selection'));` on the line immediately after `await user.click(screen.getByTestId('builder-go-next'));`. These are: `'applies AI cardTemplate/priceTextColor, ...'`, `'shows AI change summary and lets users undo the AI update in step 2'` (rename to `'... in step 3'`), and `'applies one page-style prompt, ...'`.

- [ ] **Step 5: Add a test for "reconfirm resets only card-design output, not basic settings"**

Append a new test:

```jsx
  it('reconfirming data selection resets only card-design output, not basic page settings', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.type(screen.getByLabelText('페이지 스타일 요청'), 'cool trustworthy blue');
    await user.click(screen.getByTestId('apply-page-ai-design'));
    await waitFor(() => {
      expect(screen.getByTestId('storefront-page').style.getPropertyValue('--brand-color')).toBe('#2563eb');
    });

    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));
    await user.click(screen.getByTestId('confirm-data-selection'));

    await user.type(screen.getByLabelText('AI로 다듬기'), 'irrelevant prompt');
    await user.click(screen.getByTestId('apply-ai-suggestion'));
    await screen.findByText(/draft/i);

    await user.click(screen.getByTestId('builder-go-previous'));
    await user.click(within(screen.getByTestId('data-field-table-description')).getByTestId('data-field-toggle-nutrient'));
    await user.click(screen.getByTestId('confirm-data-selection'));

    expect(screen.queryByTestId('ai-change-summary-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('storefront-page').style.getPropertyValue('--brand-color')).toBe('#2563eb');
  });
```

- [ ] **Step 6: Add a test proving the AI cannot change data selection end-to-end**

Append a new test:

```jsx
  it('never lets an AI suggestion change which fields are saved, even if the AI patch claims otherwise', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestStorefrontAiSuggestion.mockResolvedValue({
      summary: 'Sneaky draft applied.',
      patch: {
        designDirection: 'warm',
        navConfig: EXISTING_CONFIG.navConfig,
        cardFields: ['product_name', 'tax_price', 'product_url'],
        cardStyle: { layout: 'grid', accentColor: '#1d4a2e', fontSize: 'medium', cardsPerRow: 2 },
        selectedMediumCategories: ['Starter'],
        representativeMediumCategory: 'Starter',
        mobileUiTree: EXISTING_CONFIG.pageConfig?.mobileUiTree,
        cardElementConfig: { showImage: true, showProductName: true, showSpec: true, showNutrient: true, showPrice: true, showBadge: true, imageSize: 'md', imageFit: 'contain', metaDensity: 'comfortable' },
        uiChangeSummary: [],
      },
    });
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));
    await user.click(screen.getByTestId('confirm-data-selection'));

    await user.type(screen.getByLabelText('AI로 다듬기'), '링크도 보여줘');
    await user.click(screen.getByTestId('apply-ai-suggestion'));
    await screen.findByText('Sneaky draft applied.');

    await user.click(screen.getByTestId('save-storefront-draft'));

    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(savedPayload.categoryConfigs[0].categoryConfig.cardDesign.visibleFields).toEqual([
      'product_name',
      'spec',
      'tax_price',
    ]);
    expect(savedPayload.categoryConfigs[0].categoryConfig.selectedMediumCategories).toEqual(['Premium', 'Starter']);
  });
```

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS for every test in the file. If `'keeps the last valid pageStyle...'` (the one test that never selects a category) fails, it means a step-0-only regression was introduced elsewhere — investigate before moving on, since that test should be completely unaffected by this plan.

- [ ] **Step 8: Run the entire storefront test directory**

Run: `npx vitest run src/features/storefront/__tests__`
Expected: PASS across the board. Pay particular attention to `PublicStorefrontPage.test.jsx` and `storefrontConfigService.test.js` — neither should need changes, since the public render path and the persisted shape (`visibleFields` flat array) are unchanged; only how the builder produces that array changed.

- [ ] **Step 9: Commit**

```bash
git add react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
git commit -m "feat: wire the three-step storefront builder flow into StorefrontBuilderPage"
```

## Self-Review

- **Spec coverage:** 3-step flow (Task 10/11) · `draftDataSelection`/`committedDataSelection` (Task 6/7) · confirm resets only card-design output (Task 7 Step 4, tested Task 11 Step 5) · canonical field order + mandatory `product_name` (Task 1) · field grouping UI (Task 3/8) · neutral full-product-set preview with empty-value hiding (Task 4/9) · `img_url` as the image toggle + legacy toggles derived from `visibleFields` (Task 2) · AI cannot mutate data selection (Task 5/7, tested Task 11 Step 6) · medium-category builder controls frozen against AI (Task 5/7) · save only from Card Design step (unchanged, Task 10/11) · existing drafts keep their saved fields (Task 1's `normalizeCardFields` is additive-only for `product_name`, never drops a previously-saved field). Deferred: `note`/`manufacturer_list`/`product_url`-as-button render rules (flagged at the top of this plan).
- **Placeholder scan:** none — every step above has real code.
- **Type/name consistency:** `dataSelection.{draft,committed,isConfirmed,toggleField,confirm,reset}` (Task 6) flows unchanged into `useStorefrontBuilder`'s `draftDataSelection`/`committedDataSelection`/`isDataSelectionConfirmed`/`toggleDraftField`/`confirmDataSelection` (Task 7), consumed identically in `DataSelectionStep` (Task 10) and asserted identically in `StorefrontBuilderPage.test.jsx` (Task 11).

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-21-storefront-data-selection-step-split.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
