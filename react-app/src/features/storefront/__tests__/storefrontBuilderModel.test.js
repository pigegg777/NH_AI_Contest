import { describe, expect, it } from 'vitest';

import {
  buildCategoryConfigRow,
  buildStorefrontSavePayload,
  resolveCategoryDraft,
  normalizeCategoryConfig,
  normalizePageConfig,
  normalizeCardFields,
  deriveAvailableCategoryFields,
  STOREFRONT_FIELD_DISPLAY_ORDER,
} from '../model/storefront-config/storefrontBuilderModel';
import { DEFAULT_CARD_STYLE } from '../model/card-design/cardStyleModel';
import { DEFAULT_PAGE_STYLE } from '../model/page-design/pageStyleModel';

describe('categoryConfig cardStyle', () => {
  it('normalizes a missing cardDesign to the default cardStyle', () => {
    expect(normalizeCategoryConfig({}).cardDesign.cardStyle).toEqual(DEFAULT_CARD_STYLE);
  });

  it('keeps an already-migrated cardStyle as-is', () => {
    const cardStyle = { ...DEFAULT_CARD_STYLE, cardsPerRow: 1, structuralPreset: 'image-left' };

    expect(
      normalizeCategoryConfig({ cardDesign: { cardStyle } }).cardDesign.cardStyle.structuralPreset,
    ).toBe('image-left');
  });

  it('migrates a legacy layoutStyle/style/elementConfig shape deterministically', () => {
    const legacyCategoryConfig = {
      layoutStyle: { variant: 'compact-list' },
      cardDesign: {
        visibleFields: ['product_name'],
        style: { cardsPerRow: 2, cardRadius: 'xl' },
        elementConfig: { showImage: true },
      },
    };

    const normalized = normalizeCategoryConfig(legacyCategoryConfig);

    expect(normalized.cardDesign.cardStyle.structuralPreset).toBe('compact-list');
    expect(normalized.cardDesign.cardStyle.shell.radius).toBe('xl');
  });
});

describe('cardStyle write path', () => {
  it('buildCategoryConfigRow persists an explicit cardStyle and bodySlots', () => {
    const cardStyle = { ...DEFAULT_CARD_STYLE, cardsPerRow: 1, structuralPreset: 'image-left' };
    const bodySlots = [{ id: 'field-0-spec', kind: 'field', field: 'spec', label: '규격' }];
    const row = buildCategoryConfigRow({
      productCategoryName: 'Fertilizer Upload',
      existingConfig: null,
      selectedMediumCategories: ['Premium'],
      representativeMediumCategory: 'Premium',
      cardFields: ['product_name'],
      cardStyle,
      bodySlots,
    });

    expect(row.categoryConfig.cardDesign.cardStyle.structuralPreset).toBe('image-left');
    expect(row.categoryConfig.cardDesign.bodySlots).toEqual(bodySlots);
  });

  it('resolveCategoryDraft surfaces the saved cardStyle and bodySlots', () => {
    const draft = resolveCategoryDraft({
      productCategoryName: 'Fertilizer Upload',
      productEntries: [{ categoryName: 'Fertilizer Upload', rows: [{ medium_category: 'Premium' }] }],
      existingConfig: {
        categoryConfigs: [
          {
            productCategoryName: 'Fertilizer Upload',
            categoryConfig: {
              cardDesign: {
                cardStyle: { ...DEFAULT_CARD_STYLE, cardsPerRow: 1, structuralPreset: 'compact-list' },
                bodySlots: [{ id: 'field-0-spec', kind: 'field', field: 'spec', label: '규격' }],
              },
            },
          },
        ],
      },
    });

    expect(draft.cardStyle.structuralPreset).toBe('compact-list');
    expect(draft.bodySlots).toEqual([{ id: 'field-0-spec', kind: 'field', field: 'spec', label: '규격' }]);
  });

  it('buildStorefrontSavePayload threads cardStyle into the saved category row', () => {
    const cardStyle = { ...DEFAULT_CARD_STYLE, cardsPerRow: 1, structuralPreset: 'detail-first' };
    const payload = buildStorefrontSavePayload({
      officeCode: 'OFF-1',
      existingConfig: null,
      hiddenProducts: [],
      selectedProductCategoryName: 'Fertilizer Upload',
      selectedMediumCategories: ['Premium'],
      representativeMediumCategory: 'Premium',
      cardStyle,
      cardFields: ['product_name'],
      navConfig: {},
      mobileUiTree: [],
    });

    expect(payload.categoryConfigs[0].categoryConfig.cardDesign.cardStyle.structuralPreset).toBe('detail-first');
  });
});

describe('pageConfig.pageStyle', () => {
  it('defaults to the white DEFAULT_PAGE_STYLE when absent', () => {
    expect(normalizePageConfig({}).pageStyle).toEqual(DEFAULT_PAGE_STYLE);
  });

  it('passes through a valid pageStyle', () => {
    const customPageStyle = {
      ...DEFAULT_PAGE_STYLE,
      palette: { ...DEFAULT_PAGE_STYLE.palette, backgroundHex: '#0f172a' },
    };

    expect(normalizePageConfig({ pageStyle: customPageStyle }).pageStyle.palette.backgroundHex).toBe('#0f172a');
  });
});

describe('buildStorefrontSavePayload pageStyle', () => {
  it('writes an explicitly passed pageStyle into pageConfig', () => {
    const customPageStyle = { ...DEFAULT_PAGE_STYLE, palette: { ...DEFAULT_PAGE_STYLE.palette, accentHex: '#2563eb' } };
    const payload = buildStorefrontSavePayload({
      officeCode: 'OFF-1',
      existingConfig: null,
      hiddenProducts: [],
      selectedProductCategoryName: 'Fertilizer Upload',
      selectedMediumCategories: ['Premium'],
      representativeMediumCategory: 'Premium',
      cardStyle: {},
      cardFields: ['product_name'],
      navConfig: {},
      mobileUiTree: undefined,
      pageStyle: customPageStyle,
    });

    expect(payload.pageConfig.pageStyle.palette.accentHex).toBe('#2563eb');
  });

  it('keeps the existing saved pageStyle when none is passed', () => {
    const existingConfig = {
      pageConfig: { pageStyle: { ...DEFAULT_PAGE_STYLE, palette: { ...DEFAULT_PAGE_STYLE.palette, accentHex: '#7c3aed' } } },
    };
    const payload = buildStorefrontSavePayload({
      officeCode: 'OFF-1',
      existingConfig,
      hiddenProducts: [],
      selectedProductCategoryName: 'Fertilizer Upload',
      selectedMediumCategories: ['Premium'],
      representativeMediumCategory: 'Premium',
      cardStyle: {},
      cardFields: ['product_name'],
      navConfig: {},
      mobileUiTree: undefined,
    });

    expect(payload.pageConfig.pageStyle.palette.accentHex).toBe('#7c3aed');
  });
});

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

  it('defaults to every available field, not a curated subset, when a category has no saved selection yet', () => {
    expect(normalizeCardFields([], ['product_name', 'spec', 'img_url', 'large_category'])).toEqual([
      'product_name',
      'img_url',
      'spec',
      'large_category',
    ]);
  });
});

describe('deriveAvailableCategoryFields', () => {
  it('marks manufacturer_list as selectable even though its raw value is structured, not scalar', () => {
    const fields = deriveAvailableCategoryFields([
      {
        product_name: 'Alpha',
        manufacturer_list: [{ manufacturer_name: '경농' }, { manufacturer_name: '팜한농' }],
      },
    ]);
    const manufacturerField = fields.find((field) => field.key === 'manufacturer_list');

    expect(manufacturerField.isSelectable).toBe(true);
  });

  it('still marks other structured fields as not selectable', () => {
    const fields = deriveAvailableCategoryFields([
      { product_name: 'Alpha', other_structured_field: [{ size: 'L' }] },
    ]);

    expect(fields.find((field) => field.key === 'other_structured_field').isSelectable).toBe(false);
  });
});
