import { afterEach, describe, expect, it, vi } from 'vitest';

import supabase from '../../../lib/supabaseClient';
import { DEFAULT_CARD_STYLE, normalizeCardStyle } from '../model/card-design/style/cardStyleModel';
import { DEFAULT_PAGE_STYLE } from '../model/page-design/style/pageStyleModel';
import { fetchStorefrontConfig, upsertStorefrontConfig } from '../model/storefront-config/storefrontConfigOrchestrator';

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    from: vi.fn(),
  },
}));

function mockOfficeConfigSelect(data) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));

  supabase.from.mockImplementation((tableName) => {
    if (tableName === 'office_page_config') {
      return { select };
    }

    throw new Error(`Unexpected table: ${tableName}`);
  });

  return select;
}

describe('storefrontConfigOrchestrator.fetchStorefrontConfig', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null without querying when officeCode is empty', async () => {
    const result = await fetchStorefrontConfig({ officeCode: '  ' });

    expect(result).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns null when no office config row exists', async () => {
    const select = mockOfficeConfigSelect(null);

    const result = await fetchStorefrontConfig({ officeCode: 'OFF-1' });

    expect(result).toBeNull();
    expect(select).toHaveBeenCalledWith('office_code, page_config, hidden_products, category_detail_config, updated_at');
  });

  it('normalizes the office page config and category_detail_config into the product-category builder shape', async () => {
    mockOfficeConfigSelect({
      office_code: 'OFF-1',
      page_config: {
        schemaVersion: 1,
        theme: { brandColor: '#1d4a2e' },
        nav: { title: 'Demo', subtitle: 'Subtitle', logoUrl: 'https://example.com/logo.png' },
        searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
        categoryChips: { enabled: true, sticky: true },
      },
      hidden_products: [{ product_name: 'Hidden', spec: '20kg' }],
      category_detail_config: [
        {
          product_category_name: 'Fertilizer Upload',
          updated_at: '2026-06-15T00:00:00Z',
          category_config: {
            schemaVersion: 1,
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
            selectedMediumCategories: ['Premium', 'Starter'],
            representativeMediumCategory: 'Premium',
            layoutStyle: { variant: 'card-grid' },
            cardDesign: {
              visibleFields: ['product_name', 'tax_price'],
              style: { layout: 'compact', accentColor: '#2563eb', fontSize: 'large', cardsPerRow: 2 },
            },
          },
        },
      ],
      updated_at: '2026-06-15T00:00:00Z',
    });

    const result = await fetchStorefrontConfig({ officeCode: ' OFF-1 ' });

    expect(result).toEqual({
      officeCode: 'OFF-1',
      pageConfig: {
        schemaVersion: 1,
        theme: { brandColor: '#1d4a2e' },
        nav: { title: 'Demo', subtitle: 'Subtitle', logoUrl: 'https://example.com/logo.png' },
        officeInfo: [{ id: expect.any(String), label: '', description: 'Subtitle' }],
        searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
        categoryChips: { enabled: true, sticky: true },
        mobileUiTree: [
          { id: 'hero', type: 'hero', slot: 'top', enabled: true, props: {} },
          { id: 'product-category-nav', type: 'productCategoryNav', slot: 'top', enabled: true, props: {} },
          { id: 'mobile-category-bar', type: 'mobileCategoryBar', slot: 'top', enabled: true, props: {} },
          { id: 'search-box', type: 'searchBox', slot: 'top', enabled: true, props: {} },
          { id: 'category-chips', type: 'categoryChips', slot: 'afterSearch', enabled: true, props: {} },
          { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
          { id: 'empty-state', type: 'emptyState', slot: 'bottom', enabled: true, props: {} },
        ],
        pageStyle: {
          schemaVersion: 1,
          palette: { backgroundHex: '#f1f4f2', accentHex: '#1d4a2e' },
          header: { titleColorHex: '#173223', letterSpacing: 'normal', fontWeight: 800, titleFontSizeToken: 'md' },
          description: { colorHex: '#51635a', letterSpacing: 'normal', fontWeight: 400, fontSizeToken: 'md' },
          search: { sizeToken: 'md', borderStrengthToken: 'soft', backgroundHex: '#ffffff', borderColorHex: '#bbc9c0', focusBorderColorHex: '#1d4a2e' },
          categoryChips: {
            backgroundHex: '#e4e9e6',
            textHex: '#173223',
            borderColorHex: '#bbc9c0',
            activeBackgroundHex: '#1d4a2e',
            activeTextHex: '#ffffff',
            activeBorderHex: '#1d4a2e',
            hoverBackgroundHex: '#d6ded9',
            hoverTextHex: '#173223',
            hoverBorderHex: '#99aea1',
            variant: 'soft',
            sizeToken: 'md',
            radiusToken: 'pill',
            gapToken: 'relaxed',
            borderStrengthToken: 'soft',
            borderSides: 'all',
            fontWeight: 600,
          },
          productCategoryChips: {
            backgroundHex: '#e4e9e6',
            textHex: '#173223',
            borderColorHex: '#bbc9c0',
            activeBackgroundHex: '#1d4a2e',
            activeTextHex: '#ffffff',
            activeBorderHex: '#1d4a2e',
            hoverBackgroundHex: '#d6ded9',
            hoverTextHex: '#173223',
            hoverBorderHex: '#99aea1',
            variant: 'soft',
            sizeToken: 'md',
            radiusToken: 'pill',
            gapToken: 'normal',
            borderStrengthToken: 'soft',
            borderSides: 'all',
            fontWeight: 700,
          },
        },
      },
      navConfig: {
        title: 'Demo',
        subtitle: 'Subtitle',
        logoUrl: 'https://example.com/logo.png',
        brandColor: '#1d4a2e',
        searchPlaceholder: 'Search products',
        searchVariant: 'pill',
      },
      categoryConfigs: [
        {
          productCategoryName: 'Fertilizer Upload',
          categoryConfig: {
            schemaVersion: 1,
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
            description: '',
            info: [],
            selectedMediumCategories: ['Premium', 'Starter'],
            representativeMediumCategory: 'Premium',
            cardDesign: {
              visibleFields: ['product_name', 'tax_price'],
              cardStyle: normalizeCardStyle({
                ...DEFAULT_CARD_STYLE,
                info: { ...DEFAULT_CARD_STYLE.info, padding: 'tight', fieldGap: 'tight' },
                field: { ...DEFAULT_CARD_STYLE.field, defaultFontSize: 'large', priceColorRole: 'red' },
              }),
              bodySlots: [],
            },
          },
          updatedAt: '2026-06-15T00:00:00Z',
        },
      ],
      hiddenProducts: [{ product_name: 'Hidden', spec: '20kg' }],
      updatedAt: '2026-06-15T00:00:00Z',
    });
  });

  it('normalizes a legacy pre-design-tokens row without throwing, defaulting the new tokens', async () => {
    mockOfficeConfigSelect({
      office_code: 'OFF-1',
      page_config: {
        schemaVersion: 1,
        theme: { brandColor: '#1d4a2e' },
        nav: { title: 'Legacy guide', subtitle: '', logoUrl: '' },
        searchSection: { enabled: true, placeholder: 'Search products' },
        categoryChips: { enabled: true, sticky: true },
      },
      hidden_products: [],
      category_detail_config: [
        {
          product_category_name: 'Fertilizer Upload',
          updated_at: '2026-01-01T00:00:00Z',
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
        },
      ],
      updated_at: '2026-01-01T00:00:00Z',
    });

    const config = await fetchStorefrontConfig({ officeCode: 'OFF-1' });

    expect(config.categoryConfigs[0].categoryConfig.cardDesign.cardStyle.structuralPreset).toBe('header-top');
    expect(config.categoryConfigs[0].categoryConfig.cardDesign.cardStyle.field.priceColorRole).toBe('red');
  });

  it('migrates a legacy page_config with no pageStyle into a resolved pageStyle on read', async () => {
    mockOfficeConfigSelect({
      office_code: 'OFF-1',
      page_config: {
        schemaVersion: 1,
        designDirection: 'trust',
        theme: { brandColor: '#2563eb', backgroundTone: 'sky', titleTextColor: 'ink', typographyTone: 'bold' },
        nav: { title: 'Demo', subtitle: '', logoUrl: '' },
        searchSection: { enabled: true, placeholder: 'Search products', variant: 'outlined' },
        categoryChips: { enabled: true, sticky: true },
      },
      hidden_products: [],
      category_detail_config: [],
      updated_at: '2026-06-15T00:00:00Z',
    });

    const result = await fetchStorefrontConfig({ officeCode: 'OFF-1' });

    expect(result.pageConfig.pageStyle.palette.accentHex).toBe('#2563eb');
    expect(result.pageConfig.pageStyle.search.borderStrengthToken).toBe('strong');
    expect(result.pageConfig.pageStyle.schemaVersion).toBe(1);
  });
});

describe('storefrontConfigOrchestrator.upsertStorefrontConfig', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('throws without calling supabase when officeCode is empty', async () => {
    await expect(
      upsertStorefrontConfig({
        officeCode: '  ',
        categoryConfigs: [],
        navConfig: {},
        pageConfig: {},
        hiddenProducts: [],
      }),
    ).rejects.toThrow(/officeCode/i);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('writes page config, hidden products, and category_detail_config in a single office_page_config upsert', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-17T00:00:00Z'));

    const upsert = vi.fn().mockResolvedValue({ error: null });

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') {
        return { upsert };
      }

      throw new Error(`Unexpected table: ${tableName}`);
    });

    await upsertStorefrontConfig({
      officeCode: ' OFF-1 ',
      navConfig: {
        title: 'Demo',
        subtitle: 'Subtitle',
        logoUrl: 'https://example.com/logo.png',
        brandColor: '#1d4a2e',
        searchPlaceholder: 'Search products',
      },
      pageConfig: {
        schemaVersion: 1,
        theme: { brandColor: '#1d4a2e' },
        nav: { title: 'Demo', subtitle: 'Subtitle', logoUrl: 'https://example.com/logo.png' },
        searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
        categoryChips: { enabled: true, sticky: true },
      },
      categoryConfigs: [
        {
          productCategoryName: 'Fertilizer Upload',
          categoryConfig: {
            schemaVersion: 1,
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
            selectedMediumCategories: ['Premium', 'Starter'],
            representativeMediumCategory: 'Premium',
            cardDesign: {
              visibleFields: ['product_name', 'nutrient', 'tax_price'],
              cardStyle: normalizeCardStyle({ ...DEFAULT_CARD_STYLE, cardsPerRow: 1, structuralPreset: 'image-left' }),
              bodySlots: [],
            },
          },
        },
      ],
      hiddenProducts: [{ product_name: 'Hidden', spec: '20kg' }],
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        office_code: 'OFF-1',
        page_config: {
          schemaVersion: 1,
          theme: { brandColor: '#1d4a2e' },
          nav: { title: 'Demo', subtitle: 'Subtitle', logoUrl: 'https://example.com/logo.png' },
          officeInfo: [{ id: expect.any(String), label: '', description: 'Subtitle' }],
          searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
          categoryChips: { enabled: true, sticky: true },
          mobileUiTree: [
            { id: 'hero', type: 'hero', slot: 'top', enabled: true, props: {} },
            { id: 'product-category-nav', type: 'productCategoryNav', slot: 'top', enabled: true, props: {} },
            { id: 'mobile-category-bar', type: 'mobileCategoryBar', slot: 'top', enabled: true, props: {} },
            { id: 'search-box', type: 'searchBox', slot: 'top', enabled: true, props: {} },
            { id: 'category-chips', type: 'categoryChips', slot: 'afterSearch', enabled: true, props: {} },
            { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
            { id: 'empty-state', type: 'emptyState', slot: 'bottom', enabled: true, props: {} },
          ],
          pageStyle: DEFAULT_PAGE_STYLE,
        },
        hidden_products: [{ product_name: 'Hidden', spec: '20kg' }],
        category_detail_config: [
          {
            product_category_name: 'Fertilizer Upload',
            updated_at: '2026-08-17T00:00:00.000Z',
            category_config: {
              schemaVersion: 1,
              displayName: 'Fertilizer Upload',
              sourceCategoryName: 'Fertilizer Upload',
              description: '',
              info: [],
              selectedMediumCategories: ['Premium', 'Starter'],
              representativeMediumCategory: 'Premium',
              cardDesign: {
                visibleFields: ['product_name', 'tax_price', 'nutrient'],
                cardStyle: normalizeCardStyle({ ...DEFAULT_CARD_STYLE, cardsPerRow: 1, structuralPreset: 'image-left' }),
                bodySlots: [],
              },
            },
          },
        ],
      },
      { onConflict: 'office_code' },
    );
  });
});
