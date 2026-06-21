import { describe, expect, it } from 'vitest';

import {
  buildCategoryConfigRow,
  buildStorefrontSavePayload,
  CARD_TEMPLATE_OPTIONS,
  resolveCategoryDraft,
  TITLE_TEXT_COLOR_OPTIONS,
  TYPOGRAPHY_TONE_OPTIONS,
  TYPOGRAPHY_TONE_VALUES,
  normalizeCategoryConfig,
  normalizePageConfig,
  resolveTitleTextColor,
} from '../model/storefrontBuilderModel';
import { DEFAULT_PAGE_STYLE } from '../model/pageStyleModel';

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
      pageConfig: { ...DEFAULT_PAGE_STYLE && {}, pageStyle: { ...DEFAULT_PAGE_STYLE, palette: { ...DEFAULT_PAGE_STYLE.palette, accentHex: '#7c3aed' } } },
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
