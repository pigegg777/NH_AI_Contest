import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/officeProductDataService';
import StorefrontBuilderPage from '../pages/StorefrontBuilderPage';
import { fetchStorefrontConfig, upsertStorefrontConfig } from '../services/storefrontConfigService';
import { requestStorefrontAiSuggestion } from '../services/storefrontAiService';

vi.mock('../../office-product-editor/services/officeProductDataService', () => ({
  fetchOfficeProductDataEntries: vi.fn(),
}));

vi.mock('../services/storefrontConfigService', () => ({
  fetchStorefrontConfig: vi.fn(),
  upsertStorefrontConfig: vi.fn(),
}));

vi.mock('../services/storefrontAiService', () => ({
  requestStorefrontAiSuggestion: vi.fn(),
}));

const PRODUCT_ENTRIES = [
  {
    id: 11,
    officeCode: 'OFF-1',
    officeName: 'Demo Office',
    categoryName: 'Fertilizer Upload',
    rowCount: 2,
    sourceFileName: 'fertilizer.xlsx',
    updatedAt: '2026-06-15T00:00:00Z',
    rows: [
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Alpha',
        spec: '20kg',
        large_category: 'Fertilizer',
        medium_category: 'Premium',
        tax_price: 1000,
        nutrient: '18-18-18',
      },
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Beta',
        spec: '20kg',
        large_category: 'Fertilizer',
        medium_category: 'Starter',
        tax_price: 2000,
        nutrient: '15-15-15',
      },
    ],
  },
  {
    id: 12,
    officeCode: 'OFF-1',
    officeName: 'Demo Office',
    categoryName: 'Pesticide Upload',
    rowCount: 1,
    sourceFileName: 'pesticide.xlsx',
    updatedAt: '2026-06-15T00:00:00Z',
    rows: [
      {
        product_category_name: 'Pesticide Upload',
        product_name: 'Gamma',
        spec: '500ml',
        large_category: 'Pesticide',
        medium_category: 'Leaf',
        tax_price: 3000,
      },
    ],
  },
];

const EXISTING_CONFIG = {
  officeCode: 'OFF-1',
  pageConfig: {
    schemaVersion: 1,
    designDirection: 'friendly',
    theme: { brandColor: '#1d4a2e', backgroundTone: 'mint' },
    nav: { title: 'Existing guide', subtitle: 'Existing subtitle', logoUrl: '' },
    searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
    categoryChips: { enabled: true, sticky: true, variant: 'soft' },
  },
  navConfig: {
    title: 'Existing guide',
    subtitle: 'Existing subtitle',
    brandColor: '#1d4a2e',
    searchPlaceholder: 'Search products',
    logoUrl: '',
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
        selectedMediumCategories: ['Premium'],
        representativeMediumCategory: 'Premium',
        layoutStyle: { variant: 'card-grid' },
        cardDesign: {
          visibleFields: ['product_name', 'spec', 'tax_price'],
          style: { layout: 'grid', accentColor: '#1d4a2e', fontSize: 'medium', cardsPerRow: 2 },
        },
      },
      updatedAt: '2026-06-15T00:00:00Z',
    },
  ],
  hiddenProducts: [],
  updatedAt: '2026-06-15T00:00:00Z',
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('StorefrontBuilderPage', () => {
  it('shows a loading state while fetching', () => {
    fetchOfficeProductDataEntries.mockReturnValue(new Promise(() => {}));
    fetchStorefrontConfig.mockReturnValue(new Promise(() => {}));

    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(screen.getByText('스토어프론트 빌더를 불러오는 중...')).toBeInTheDocument();
  });

  it('shows an error message when a fetch rejects', async () => {
    fetchOfficeProductDataEntries.mockRejectedValue(new Error('boom'));
    fetchStorefrontConfig.mockResolvedValue(null);

    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(await screen.findByText('스토어프론트 빌더를 불러오지 못했습니다.')).toBeInTheDocument();
  });

  it('shows the card field table and syncs preview visibility with the selected fields', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));

    const table = screen.getByTestId('card-field-table');
    const preview = screen.getByTestId('mobile-preview-device');

    expect(within(table).getByTestId('card-field-example-product_name')).toHaveTextContent('Alpha');
    expect(within(table).getByTestId('card-field-example-nutrient')).toHaveTextContent('18-18-18');
    expect(within(preview).queryByText('18-18-18')).not.toBeInTheDocument();

    await user.click(within(table).getByTestId('card-field-toggle-nutrient'));

    await waitFor(() => {
      expect(within(preview).getByText('18-18-18')).toBeInTheDocument();
    });

    await user.click(within(table).getByTestId('card-field-toggle-nutrient'));

    await waitFor(() => {
      expect(within(preview).queryByText('18-18-18')).not.toBeInTheDocument();
    });
  });

  it('runs the simplified two-step flow, keeps preview visible, and saves without category-nav blocks', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestStorefrontAiSuggestion.mockResolvedValue({
      summary: 'Warm fertilizer draft applied.',
      patch: {
        designDirection: 'warm',
        navConfig: {
          title: 'Premium Fertilizer Guide',
          subtitle: 'Fast answers for customers',
          brandColor: '#2563eb',
          searchPlaceholder: 'Search fertilizer',
          logoUrl: '',
          searchVariant: 'outlined',
          categoryChipVariant: 'filled',
        },
        cardFields: ['product_name', 'nutrient', 'tax_price'],
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
        selectedMediumCategories: ['Premium', 'Starter'],
        representativeMediumCategory: 'Premium',
        mobileUiTree: [
          { id: 'hero', type: 'hero', slot: 'top', enabled: true, props: {} },
          { id: 'product-category-nav', type: 'productCategoryNav', slot: 'top', enabled: true, props: {} },
          { id: 'mobile-category-bar', type: 'mobileCategoryBar', slot: 'top', enabled: true, props: {} },
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
        uiChangeSummary: ['Emphasize price', 'Use a one-card mobile layout'],
      },
    });
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(await screen.findByRole('button', { name: '시작하기' })).toBeInTheDocument();

    await user.click(screen.getByTestId('start-storefront-builder'));

    expect(screen.getByRole('heading', { name: '페이지 기본 설정' })).toBeInTheDocument();
    expect(screen.getByTestId('mobile-preview-device')).toBeInTheDocument();
    expect(screen.queryByTestId('page-design-editor')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('toggle-page-design-settings'));
    expect(screen.getByTestId('page-design-editor')).toBeInTheDocument();

    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));

    expect(screen.getByRole('heading', { name: 'AI 페이지 초안 생성' })).toBeInTheDocument();
    expect(screen.getByTestId('card-field-table')).toBeInTheDocument();
    expect(screen.queryByTestId('page-design-editor')).not.toBeInTheDocument();
    expect(screen.queryByText('추천 시작 옵션')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('AI로 다듬기'), '가격을 강조하고 모바일에서 읽기 쉽게 정리해줘.');
    await user.click(screen.getByTestId('apply-ai-suggestion'));

    expect(await screen.findByText('Warm fertilizer draft applied.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search fertilizer')).toBeInTheDocument();

    await user.click(screen.getByTestId('save-storefront-draft'));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);

    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(savedPayload.pageConfig.mobileUiTree.map((block) => block.type)).toEqual([
      'hero',
      'searchBox',
      'categoryChips',
      'productSections',
      'emptyState',
    ]);
    expect(savedPayload.categoryConfigs[0].categoryConfig.selectedMediumCategories).toEqual(['Premium', 'Starter']);
  }, 10000);

  it('applies AI cardTemplate/priceTextColor, previews, saves, and undoes them — without touching page-wide theme', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestStorefrontAiSuggestion.mockResolvedValue({
      summary: 'Bold price-focus draft applied.',
      activeSkillIds: ['layout', 'transform'],
      designPlan: {
        designBrief: {
          tone: 'warm',
          goal: 'Compare prices quickly.',
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
          imagePosition: 'top',
          pricePriority: 'high',
        },
        stylePlan: {
          titleTextColor: 'ink',
          typographyTone: 'bold',
          priceTextColor: 'muted',
          accentColor: '#2563eb',
          cardSpacing: 'relaxed',
        },
      },
      renderSpec: {
        version: 1,
        bodySlots: [
          { id: 'title', kind: 'field', field: 'product_name', label: '' },
          {
            id: 'price-row',
            kind: 'inline-group',
            label: '가격',
            items: [
              { id: 'tax', field: 'tax_price', label: '과세' },
              { id: 'zero', field: 'zero_tax_price', label: '영세' },
            ],
          },
        ],
      },
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
        cardFields: ['product_name', 'tax_price', 'zero_tax_price'],
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
    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));

    await user.type(screen.getByLabelText('AI로 다듬기'), '가격 중심으로, 진하고 굵게 보여줘.');
    await user.click(screen.getByTestId('apply-ai-suggestion'));

    expect(await screen.findByText('Bold price-focus draft applied.')).toBeInTheDocument();

    const previewDevice = screen.getByTestId('mobile-preview-device');
    const sectionEl = previewDevice.querySelector('section[data-card-template]');
    expect(sectionEl.dataset.cardTemplate).toBe('price-focus');

    await user.click(screen.getByTestId('save-storefront-draft'));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);
    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(savedPayload.categoryConfigs[0].categoryConfig.layoutStyle.variant).toBe('price-focus');
    expect(savedPayload.categoryConfigs[0].categoryConfig.cardDesign.style.priceTextColor).toBe('muted');
    expect(savedPayload.categoryConfigs[0].categoryConfig.aiDesign.renderSpec.bodySlots[1].kind).toBe('inline-group');
    expect(savedPayload.pageConfig.theme.titleTextColor).toBe('default');
    expect(savedPayload.pageConfig.theme.typographyTone).toBe('standard');

    await user.click(screen.getByTestId('undo-ai-changes'));

    await waitFor(() => {
      const restoredSectionEl = screen
        .getByTestId('mobile-preview-device')
        .querySelector('section[data-card-template]');
      expect(restoredSectionEl.dataset.cardTemplate).toBe('card-grid');
    });
  }, 10000);

  it('shows AI change summary and lets users undo the AI update in step 2', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestStorefrontAiSuggestion.mockResolvedValue({
      summary: 'AI updated the storefront.',
      patch: {
        designDirection: 'warm',
        navConfig: {
          title: 'Premium Fertilizer Guide',
          subtitle: 'Fast answers for customers',
          brandColor: '#2563eb',
          searchPlaceholder: 'Search fertilizer',
          logoUrl: '',
          searchVariant: 'outlined',
          categoryChipVariant: 'filled',
        },
        cardFields: ['product_name', 'spec', 'tax_price'],
        cardStyle: {
          layout: 'compact',
          accentColor: '#2563eb',
          fontSize: 'large',
          cardsPerRow: 1,
          imageSize: 'sm',
          imageFit: 'contain',
          cardRadius: 'lg',
          cardShadow: 'soft',
          cardSpacing: 'normal',
        },
        selectedMediumCategories: ['Premium', 'Starter'],
        representativeMediumCategory: 'Premium',
        mobileUiTree: [
          { id: 'hero', type: 'hero', slot: 'top', enabled: true, props: {} },
          { id: 'product-category-nav', type: 'productCategoryNav', slot: 'top', enabled: true, props: {} },
          { id: 'mobile-category-bar', type: 'mobileCategoryBar', slot: 'top', enabled: true, props: {} },
          { id: 'search-box', type: 'searchBox', slot: 'top', enabled: false, props: {} },
          { id: 'category-chips', type: 'categoryChips', slot: 'afterSearch', enabled: true, props: {} },
          {
            id: 'notice-1',
            type: 'noticeBanner',
            slot: 'beforeProducts',
            enabled: true,
            props: { title: '공지', text: 'AI 추천 안내' },
          },
          { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
          { id: 'empty-state', type: 'emptyState', slot: 'bottom', enabled: true, props: {} },
        ],
        cardElementConfig: {
          showImage: false,
          showProductName: true,
          showSpec: true,
          showNutrient: false,
          showPrice: true,
          showBadge: true,
          imageSize: 'sm',
          imageFit: 'contain',
          metaDensity: 'comfortable',
        },
        uiChangeSummary: ['Hide search box', 'Add notice banner above product list'],
      },
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(await screen.findByRole('button', { name: '시작하기' })).toBeInTheDocument();

    await user.click(screen.getByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));

    expect(screen.queryByTestId('add-block-noticeBanner')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('AI로 다듬기'), '검색창은 숨기고 공지 배너를 추가해줘.');
    await user.click(screen.getByTestId('apply-ai-suggestion'));

    expect(await screen.findByText('AI updated the storefront.')).toBeInTheDocument();
    expect(screen.getByTestId('ai-change-summary')).toBeInTheDocument();
    expect(screen.getByText('AI 추천 안내')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search fertilizer')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('undo-ai-changes'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search products')).toBeInTheDocument();
      expect(screen.queryByText('AI 추천 안내')).not.toBeInTheDocument();
    });
  }, 10000);

  it('applies a page-level AI prompt, previews immediately, and saves only the compiled pageStyle (discarding the prompt session)', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('toggle-page-design-settings'));

    const previewPageEl = screen.getByTestId('storefront-page');

    await user.type(screen.getByLabelText('전체 페이지 분위기'), 'cool trustworthy blue');
    await user.click(screen.getByTestId('apply-page-ai-design'));

    await waitFor(() => {
      expect(previewPageEl.style.getPropertyValue('--brand-color')).toBe('#2563eb');
    });

    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));
    await user.click(screen.getByTestId('save-storefront-draft'));

    await waitFor(() => expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1));

    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(savedPayload.pageConfig.pageStyle.palette.accentHex).toBe('#2563eb');
    expect(savedPayload.pageConfig.pageAiDesign).toBeUndefined();
    expect(JSON.stringify(savedPayload)).not.toContain('cool trustworthy blue');
  }, 10000);

  it('keeps the last valid pageStyle and shows an error when no main prompt has been entered', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('toggle-page-design-settings'));

    const previewPageEl = screen.getByTestId('storefront-page');
    const brandColorBeforeApply = previewPageEl.style.getPropertyValue('--brand-color');

    await user.click(screen.getByTestId('apply-page-ai-design'));

    expect(await screen.findByText('페이지 분위기를 먼저 입력해 주세요.')).toBeInTheDocument();
    expect(previewPageEl.style.getPropertyValue('--brand-color')).toBe(brandColorBeforeApply);
  });
});
