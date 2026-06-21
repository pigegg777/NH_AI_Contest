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
  vi.unstubAllEnvs();
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

  it('runs the three-step flow, keeps preview visible, and saves without category-nav blocks', async () => {
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
    expect(screen.getByText('페이지의 전반적인 디자인 분위기를 먼저 설정해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('1-1')).toBeInTheDocument();
    expect(screen.getByText('1-2')).toBeInTheDocument();
    expect(screen.getByText('수정 가능 영역')).toBeInTheDocument();
    expect(screen.getByText('페이지를 추가하거나 수정할 대상을 고르세요.')).toBeInTheDocument();
    expect(screen.getByText('전체 색감')).toBeInTheDocument();
    expect(screen.getByText('헤더 텍스트 스타일')).toBeInTheDocument();
    expect(screen.getByText('카테고리 칩')).toBeInTheDocument();
    expect(screen.getByText('검색창')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-preview-device')).toBeInTheDocument();
    expect(screen.getByTestId('page-design-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('toggle-page-design-settings')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));

    expect(screen.getByTestId('data-field-table-description')).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-data-selection'));

    expect(screen.getByRole('heading', { name: '카드 디자인' })).toBeInTheDocument();
    expect(screen.queryByTestId('data-field-table-description')).not.toBeInTheDocument();
    expect(screen.queryByTestId('page-design-editor')).not.toBeInTheDocument();

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
    await user.click(screen.getByTestId('confirm-data-selection'));

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

    await user.click(screen.getByTestId('undo-ai-changes'));

    await waitFor(() => {
      const restoredSectionEl = screen
        .getByTestId('mobile-preview-device')
        .querySelector('section[data-card-template]');
      expect(restoredSectionEl.dataset.cardTemplate).toBe('card-grid');
    });
  }, 10000);

  it('shows AI change summary and lets users undo the AI update in step 3', async () => {
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
    await user.click(screen.getByTestId('confirm-data-selection'));

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

  it('applies one page-style prompt, previews immediately, and saves only the compiled pageStyle', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', '');
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));

    const previewPageEl = screen.getByTestId('storefront-page');

    await user.type(
      screen.getByLabelText('페이지 스타일 요청'),
      'cool trustworthy blue, make the title bolder and the search box larger with a stronger border',
    );
    await user.click(screen.getByTestId('apply-page-ai-design'));

    await waitFor(() => {
      expect(previewPageEl.style.getPropertyValue('--brand-color')).toBe('#2563eb');
      expect(previewPageEl.style.getPropertyValue('--typography-heading-weight')).toBe('800');
      expect(previewPageEl.style.getPropertyValue('--page-search-border-width')).toBe('2.5px');
    });

    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));
    await user.click(screen.getByTestId('confirm-data-selection'));
    await user.click(screen.getByTestId('save-storefront-draft'));

    await waitFor(() => expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1));

    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(savedPayload.pageConfig.pageStyle.palette.accentHex).toBe('#2563eb');
    expect(savedPayload.pageConfig.pageStyle.header.fontWeight).toBe(800);
    expect(savedPayload.pageConfig.pageStyle.search.sizeToken).toBe('lg');
    expect(savedPayload.pageConfig.pageStyle.search.borderStrengthToken).toBe('strong');
    expect(savedPayload.pageConfig.pageAiDesign).toBeUndefined();
    expect(JSON.stringify(savedPayload)).not.toContain('cool trustworthy blue');
    expect(JSON.stringify(savedPayload)).not.toContain('make the title bolder');
  }, 10000);

  it('keeps the last valid pageStyle and shows an error when no main prompt has been entered', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));

    const previewPageEl = screen.getByTestId('storefront-page');
    const brandColorBeforeApply = previewPageEl.style.getPropertyValue('--brand-color');

    await user.click(screen.getByTestId('apply-page-ai-design'));

    expect(await screen.findByText('페이지 분위기를 먼저 입력해 주세요.')).toBeInTheDocument();
    expect(previewPageEl.style.getPropertyValue('--brand-color')).toBe(brandColorBeforeApply);
  });

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
});
