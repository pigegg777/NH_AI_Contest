import { describe, expect, it } from 'vitest';

import {
  buildCategoryConfigRow,
  buildStorefrontSavePayload,
  CARD_TEMPLATE_OPTIONS,
  resolveCategoryDraft,
  normalizeCategoryConfig,
  normalizePageConfig,
  normalizeCardFields,
  STOREFRONT_FIELD_DISPLAY_ORDER,
} from '../model/storefrontBuilderModel';
import { DEFAULT_PAGE_STYLE } from '../model/pageStyleModel';

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

  it('preserves aiDesign metadata through normalize, draft resolution, and save payload', () => {
    const aiDesign = {
      prompt: 'compare tax and zero-tax on one row',
      activeSkillIds: ['layout', 'transform'],
      designPlan: {
        designBrief: {
          tone: 'trust',
          goal: 'Compare prices.',
          audience: 'Customers',
          priority: ['product_name', 'tax_price', 'zero_tax_price'],
        },
        transformPlan: {
          groups: [
            {
              id: 'price-row',
              label: '가격',
              display: 'inline-compare',
              items: [
                { field: 'tax_price', label: '과세' },
                { field: 'zero_tax_price', label: '영세' },
              ],
            },
          ],
          hideIfEmpty: [],
          formatRules: [],
        },
        contentPlan: {
          blocks: [
            { id: 'title', type: 'field', source: 'product_name', label: '' },
            { id: 'price-row', type: 'group', source: 'price-row', label: '가격' },
          ],
        },
        layoutPlan: {
          cardVariant: 'price-focus',
          density: 'compact',
          imagePosition: 'hidden',
          pricePriority: 'high',
        },
        stylePlan: {
          titleTextColor: 'ink',
          typographyTone: 'bold',
          priceTextColor: 'muted',
          accentColor: '#2563eb',
          cardSpacing: 'tight',
        },
      },
    };
    const normalized = normalizeCategoryConfig(
      {
        aiDesign,
        layoutStyle: { variant: 'price-focus' },
        cardDesign: {
          visibleFields: ['product_name', 'tax_price', 'zero_tax_price'],
        },
      },
      'Fertilizer Upload',
      ['product_name', 'tax_price', 'zero_tax_price'],
    );

    expect(normalized.aiDesign.renderSpec.bodySlots[1]).toMatchObject({
      kind: 'inline-group',
      label: '가격',
    });

    const draft = resolveCategoryDraft({
      productCategoryName: 'Fertilizer Upload',
      productEntries: [
        {
          categoryName: 'Fertilizer Upload',
          rows: [{ medium_category: 'Premium', product_name: 'Alpha', tax_price: 1000, zero_tax_price: 900 }],
        },
      ],
      existingConfig: {
        categoryConfigs: [
          {
            productCategoryName: 'Fertilizer Upload',
            categoryConfig: {
              selectedMediumCategories: ['Premium'],
              representativeMediumCategory: 'Premium',
              layoutStyle: { variant: 'price-focus' },
              cardDesign: {
                visibleFields: ['product_name', 'tax_price', 'zero_tax_price'],
              },
              aiDesign,
            },
          },
        ],
      },
    });

    expect(draft.aiDesign.renderSpec.bodySlots[1].kind).toBe('inline-group');

    const payload = buildStorefrontSavePayload({
      officeCode: 'OFF-1',
      existingConfig: null,
      hiddenProducts: [],
      selectedProductCategoryName: 'Fertilizer Upload',
      selectedMediumCategories: ['Premium'],
      representativeMediumCategory: 'Premium',
      cardStyle: {},
      cardFields: ['product_name', 'tax_price', 'zero_tax_price'],
      cardElementConfig: {},
      navConfig: {},
      designDirection: 'friendly',
      mobileUiTree: [],
      cardTemplate: 'price-focus',
      aiDesign,
      allowedScalarKeys: ['product_name', 'tax_price', 'zero_tax_price'],
    });

    expect(payload.categoryConfigs[0].categoryConfig.aiDesign.renderSpec.bodySlots[1].kind).toBe('inline-group');
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
      cardElementConfig: {},
      navConfig: {},
      mobileUiTree: undefined,
      cardTemplate: 'card-grid',
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
      cardElementConfig: {},
      navConfig: {},
      mobileUiTree: undefined,
      cardTemplate: 'card-grid',
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
});
