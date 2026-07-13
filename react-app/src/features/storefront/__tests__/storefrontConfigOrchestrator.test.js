import { afterEach, describe, expect, it, vi } from 'vitest';

import supabase from '../../../lib/supabaseClient';
import { DEFAULT_CARD_STYLE, normalizeCardStyle } from '../model/card-design/cardStyleModel';
import { DEFAULT_PAGE_STYLE } from '../model/page-design/pageStyleModel';
import { fetchStorefrontConfig, upsertStorefrontConfig } from '../model/storefront-config/storefrontConfigOrchestrator';

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    from: vi.fn(),
  },
}));

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
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') {
        return { select };
      }

      throw new Error(`Unexpected table: ${tableName}`);
    });

    const result = await fetchStorefrontConfig({ officeCode: 'OFF-1' });

    expect(result).toBeNull();
    expect(select).toHaveBeenCalledWith('office_code, page_config, hidden_products, updated_at');
  });

  it('normalizes the office page config and category rows into the new product-category builder shape', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        office_code: 'OFF-1',
        page_config: {
          schemaVersion: 1,
          theme: { brandColor: '#1d4a2e' },
          nav: { title: 'Demo', subtitle: 'Subtitle', logoUrl: 'https://example.com/logo.png' },
          searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
          categoryChips: { enabled: true, sticky: true },
        },
        hidden_products: [{ product_name: 'Hidden', spec: '20kg' }],
        updated_at: '2026-06-15T00:00:00Z',
      },
      error: null,
    });
    const officeEq = vi.fn(() => ({ maybeSingle }));
    const officeSelect = vi.fn(() => ({ eq: officeEq }));

    const categoryOrder = vi.fn().mockResolvedValue({
      data: [
        {
          office_code: 'OFF-1',
          product_category_name: 'Fertilizer Upload',
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
          sort_order: 0,
          updated_at: '2026-06-15T00:00:00Z',
        },
      ],
      error: null,
    });
    const categoryEq = vi.fn(() => ({ order: categoryOrder }));
    const categorySelect = vi.fn(() => ({ eq: categoryEq }));

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') {
        return { select: officeSelect };
      }

      if (tableName === 'office_page_category_configs') {
        return { select: categorySelect };
      }

      throw new Error(`Unexpected table: ${tableName}`);
    });

    const result = await fetchStorefrontConfig({ officeCode: ' OFF-1 ' });

    expect(result).toEqual({
      officeCode: 'OFF-1',
      pageConfig: {
        schemaVersion: 1,
        theme: { brandColor: '#1d4a2e' },
        nav: { title: 'Demo', subtitle: 'Subtitle', logoUrl: 'https://example.com/logo.png' },
        searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
        categoryChips: { enabled: true, sticky: true, variant: 'soft' },
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
          search: { sizeToken: 'md', borderStrengthToken: 'soft', borderColorHex: '#bbc9c0', focusBorderColorHex: '#1d4a2e' },
          categoryChips: {
            backgroundHex: '#e4e9e6',
            textHex: '#173223',
            borderColorHex: '#bbc9c0',
            activeBackgroundHex: '#1d4a2e',
            activeTextHex: '#ffffff',
          },
          productCategoryChips: {
            backgroundHex: '#e4e9e6',
            textHex: '#173223',
            borderColorHex: '#bbc9c0',
            activeBackgroundHex: '#1d4a2e',
            activeTextHex: '#ffffff',
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
        categoryChipVariant: 'soft',
      },
      categoryConfigs: [
        {
          officeCode: 'OFF-1',
          productCategoryName: 'Fertilizer Upload',
          sortOrder: 0,
          categoryConfig: {
            schemaVersion: 1,
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
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
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        office_code: 'OFF-1',
        page_config: {
          schemaVersion: 1,
          theme: { brandColor: '#1d4a2e' },
          nav: { title: 'Legacy guide', subtitle: '', logoUrl: '' },
          searchSection: { enabled: true, placeholder: 'Search products' },
          categoryChips: { enabled: true, sticky: true },
        },
        hidden_products: [],
        updated_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    });
    const officeEq = vi.fn(() => ({ maybeSingle }));
    const officeSelect = vi.fn(() => ({ eq: officeEq }));

    const categoryOrder = vi.fn().mockResolvedValue({
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
    });
    const categoryEq = vi.fn(() => ({ order: categoryOrder }));
    const categorySelect = vi.fn(() => ({ eq: categoryEq }));

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') {
        return { select: officeSelect };
      }

      if (tableName === 'office_page_category_configs') {
        return { select: categorySelect };
      }

      throw new Error(`Unexpected table: ${tableName}`);
    });

    const config = await fetchStorefrontConfig({ officeCode: 'OFF-1' });

    expect(config.categoryConfigs[0].categoryConfig.cardDesign.cardStyle.structuralPreset).toBe('header-top');
    expect(config.categoryConfigs[0].categoryConfig.cardDesign.cardStyle.field.priceColorRole).toBe('red');
  });

  it('migrates a legacy page_config with no pageStyle into a resolved pageStyle on read', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
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
        updated_at: '2026-06-15T00:00:00Z',
      },
      error: null,
    });
    const officeEq = vi.fn(() => ({ maybeSingle }));
    const officeSelect = vi.fn(() => ({ eq: officeEq }));
    const categoryOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const categoryEq = vi.fn(() => ({ order: categoryOrder }));
    const categorySelect = vi.fn(() => ({ eq: categoryEq }));

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') return { select: officeSelect };
      if (tableName === 'office_page_category_configs') return { select: categorySelect };
      throw new Error(`Unexpected table: ${tableName}`);
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

  it('writes office page config and per-product-category rows while deleting stale categories', async () => {
    const officeUpsert = vi.fn().mockResolvedValue({ error: null });
    const categorySelectEq = vi.fn().mockResolvedValue({
      data: [
        { product_category_name: 'Obsolete Upload' },
        { product_category_name: 'Fertilizer Upload' },
      ],
      error: null,
    });
    const categorySelect = vi.fn(() => ({ eq: categorySelectEq }));
    const categoryUpsert = vi.fn().mockResolvedValue({ error: null });
    const categoryDeleteIn = vi.fn().mockResolvedValue({ error: null });
    const categoryDeleteEq = vi.fn(() => ({ in: categoryDeleteIn }));
    const categoryDelete = vi.fn(() => ({ eq: categoryDeleteEq }));

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') {
        return { upsert: officeUpsert };
      }

      if (tableName === 'office_page_category_configs') {
        return {
          select: categorySelect,
          upsert: categoryUpsert,
          delete: categoryDelete,
        };
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
          sortOrder: 0,
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

    expect(officeUpsert).toHaveBeenCalledWith(
      {
        office_code: 'OFF-1',
        page_config: {
          schemaVersion: 1,
          theme: { brandColor: '#1d4a2e' },
          nav: { title: 'Demo', subtitle: 'Subtitle', logoUrl: 'https://example.com/logo.png' },
          searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
          categoryChips: { enabled: true, sticky: true, variant: 'soft' },
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
      },
      { onConflict: 'office_code' },
    );
    expect(categoryUpsert).toHaveBeenCalledWith(
      [
        {
          office_code: 'OFF-1',
          product_category_name: 'Fertilizer Upload',
          sort_order: 0,
          category_config: {
            schemaVersion: 1,
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
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
      { onConflict: 'office_code,product_category_name' },
    );
    expect(categoryDeleteIn).toHaveBeenCalledWith('product_category_name', ['Obsolete Upload']);
  });
});
