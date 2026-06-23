import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/officeProductDataService';
import StorefrontBuilderPage from '../pages/StorefrontBuilderPage';
import { fetchStorefrontConfig, upsertStorefrontConfig } from '../services/storefrontConfigService';

vi.mock('../../office-product-editor/services/officeProductDataService', () => ({
  fetchOfficeProductDataEntries: vi.fn(),
}));

vi.mock('../services/storefrontConfigService', () => ({
  fetchStorefrontConfig: vi.fn(),
  upsertStorefrontConfig: vi.fn(),
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
  vi.unstubAllGlobals();
});

async function reachCardDesignStep(user) {
  await user.click(await screen.findByTestId('start-storefront-builder'));
  await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
  await user.click(screen.getByTestId('builder-go-next'));
  await user.click(screen.getByTestId('builder-go-next'));
  await user.click(screen.getByTestId('confirm-data-selection'));
  await screen.findByTestId('save-storefront-draft');
}

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

  it('shows the grouped data-selection table and reflects a toggle in the live preview immediately, even before confirming', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));
    await user.click(screen.getByTestId('builder-go-next'));

    const table = screen.getByTestId('data-field-table-description');
    const designPreview = screen.getByTestId('mobile-preview-device');

    expect(within(table).getByTestId('data-field-example-product_name')).toHaveTextContent('Alpha');
    expect(within(designPreview).queryByText('18-18-18')).not.toBeInTheDocument();

    await user.click(within(table).getByTestId('data-field-toggle-nutrient'));

    await waitFor(() => {
      expect(within(designPreview).getByText('18-18-18')).toBeInTheDocument();
    });
    expect(screen.getByTestId('data-selection-unconfirmed-hint')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-data-selection')).toHaveTextContent('확인하고 다음 단계로');

    await user.click(screen.getByTestId('confirm-data-selection'));

    expect(await screen.findByRole('heading', { name: '카드 디자인' })).toBeInTheDocument();
    await waitFor(() => {
      expect(within(screen.getByTestId('mobile-preview-device')).getByText('18-18-18')).toBeInTheDocument();
    });
  });

  it('runs the four-step flow and saves the resolved cardStyle without touching page-wide nav settings', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', '');
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(await screen.findByRole('button', { name: '시작하기' })).toBeInTheDocument();

    await user.click(screen.getByTestId('start-storefront-builder'));

    expect(screen.getByRole('heading', { name: '상품 카테고리 선택' })).toBeInTheDocument();
    expect(screen.getByTestId('mobile-preview-device')).toBeInTheDocument();
    expect(screen.queryByTestId('page-design-editor')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));

    expect(screen.getByRole('heading', { name: '페이지 디자인 설정' })).toBeInTheDocument();
    expect(screen.getByTestId('page-design-editor')).toBeInTheDocument();
    await user.click(screen.getByTestId('builder-go-next'));

    expect(screen.getByTestId('data-field-table-description')).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-data-selection'));

    expect(screen.getByRole('heading', { name: '카드 디자인' })).toBeInTheDocument();
    expect(screen.queryByTestId('data-field-table-description')).not.toBeInTheDocument();
    expect(screen.queryByTestId('page-design-editor')).not.toBeInTheDocument();

    await user.click(within(screen.getByTestId('card-design-cards-per-row')).getByText('1개'));
    await user.type(screen.getByTestId('card-design-prompt'), '이미지 왼쪽으로 보여줘');
    await user.click(screen.getByTestId('apply-ai-suggestion'));

    await waitFor(() => {
      const sectionEl = screen.getByTestId('mobile-preview-device').querySelector('section[data-structural-preset]');
      expect(sectionEl.dataset.structuralPreset).toBe('image-left');
    });
    expect(screen.getByPlaceholderText('Search products')).toBeInTheDocument();

    await user.click(screen.getByTestId('save-storefront-draft'));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);

    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(savedPayload.categoryConfigs[0].categoryConfig.cardDesign.cardStyle.structuralPreset).toBe('image-left');
    expect(savedPayload.categoryConfigs[0].categoryConfig.cardDesign.cardStyle.cardsPerRow).toBe(1);
    expect(savedPayload.navConfig.searchPlaceholder).toBe('Search products');
  }, 10000);

  it('applies a field-override AI prompt, previews the styled field, saves it, and undoes it', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', '');
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));
    await user.click(screen.getByTestId('builder-go-next'));
    await user.click(screen.getByTestId('confirm-data-selection'));

    await user.click(screen.getByTestId('card-design-scope-field'));
    await user.type(screen.getByTestId('card-design-prompt'), '과세가격을 빨간색으로 강조해줘');
    await user.click(screen.getByTestId('apply-ai-suggestion'));

    let taxPriceValueEl;

    await waitFor(() => {
      const card = within(screen.getByTestId('mobile-preview-device')).getAllByRole('article')[0];
      taxPriceValueEl = within(card).getByText('1,000원');
      expect(taxPriceValueEl.style.getPropertyValue('--field-text-color')).toBe('#dc2626');
    });

    await user.click(screen.getByTestId('save-storefront-draft'));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);
    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    const savedTaxPriceSlot = savedPayload.categoryConfigs[0].categoryConfig.cardDesign.bodySlots.find(
      (slot) => slot.field === 'tax_price',
    );
    expect(savedTaxPriceSlot.style).toEqual({
      field: 'tax_price',
      colorRole: 'red',
      fontWeight: 'bold',
      fontSize: 'medium',
      emphasis: 'strong',
    });

    await user.click(screen.getByTestId('undo-ai-changes'));

    await waitFor(() => {
      const card = within(screen.getByTestId('mobile-preview-device')).getAllByRole('article')[0];
      const restoredTaxPriceValueEl = within(card).getByText('1,000원');
      expect(restoredTaxPriceValueEl.style.getPropertyValue('--field-text-color')).not.toBe('#dc2626');
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

    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));

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
    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));

    const previewPageEl = screen.getByTestId('storefront-page');
    const brandColorBeforeApply = previewPageEl.style.getPropertyValue('--brand-color');

    await user.click(screen.getByTestId('apply-page-ai-design'));

    expect(await screen.findByText('페이지 분위기를 먼저 입력해 주세요.')).toBeInTheDocument();
    expect(previewPageEl.style.getPropertyValue('--brand-color')).toBe(brandColorBeforeApply);
  });

  it('reconfirming data selection resets only card-design output, not basic page settings', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', '');
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));

    await user.type(screen.getByLabelText('페이지 스타일 요청'), 'cool trustworthy blue');
    await user.click(screen.getByTestId('apply-page-ai-design'));
    await waitFor(() => {
      expect(screen.getByTestId('storefront-page').style.getPropertyValue('--brand-color')).toBe('#2563eb');
    });

    await user.click(screen.getByTestId('builder-go-next'));
    await user.click(screen.getByTestId('confirm-data-selection'));

    await user.click(within(screen.getByTestId('card-design-cards-per-row')).getByText('1개'));

    await user.click(screen.getByTestId('builder-go-previous'));
    await user.click(within(screen.getByTestId('data-field-table-description')).getByTestId('data-field-toggle-nutrient'));
    await user.click(screen.getByTestId('confirm-data-selection'));

    await waitFor(() => {
      const sectionEl = screen.getByTestId('mobile-preview-device').querySelector('section[data-structural-preset]');
      expect(sectionEl.dataset.structuralPreset).toBe('header-top');
    });
    expect(screen.getByTestId('storefront-page').style.getPropertyValue('--brand-color')).toBe('#2563eb');
  });

  it('never lets a card-design AI prompt change which fields are saved', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', '');
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));
    await user.click(screen.getByTestId('builder-go-next'));
    await user.click(screen.getByTestId('confirm-data-selection'));

    await user.click(screen.getByTestId('card-design-scope-field'));
    await user.type(screen.getByTestId('card-design-prompt'), '링크도 보여줘');
    await user.click(screen.getByTestId('apply-ai-suggestion'));
    await user.click(screen.getByTestId('save-storefront-draft'));

    await waitFor(() => expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1));
    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(savedPayload.categoryConfigs[0].categoryConfig.cardDesign.visibleFields).toEqual([
      'product_name',
      'spec',
      'tax_price',
    ]);
  });

  it('keeps QR export disabled until the storefront has been saved at least once', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(null);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachCardDesignStep(user);

    expect(screen.getByTestId('storefront-qr-export-card')).toBeInTheDocument();
    expect(screen.getByTestId('open-storefront-qr-export')).toBeDisabled();
  });

  it('shows the saved storefront QR and opens export actions in step 4', async () => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://public.example.com/');
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const printWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
    };
    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(printWindow);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachCardDesignStep(user);

    expect(screen.getByTestId('storefront-qr-export-card')).toHaveTextContent('Demo Office');
    expect(screen.getByTestId('storefront-qr-export-card')).toHaveTextContent('OFF-1');
    expect(screen.getByRole('link', { name: '공개 링크 열기' })).toHaveAttribute(
      'href',
      'https://public.example.com/?tool=store&office=OFF-1',
    );
    expect(screen.getByTestId('open-storefront-qr-export')).toBeEnabled();

    await user.click(screen.getByTestId('open-storefront-qr-export'));

    expect(await screen.findByRole('dialog', { name: '스토어 QR 내보내기' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PNG 다운로드' })).toHaveAttribute('download');
    expect(screen.getByRole('link', { name: 'SVG 다운로드' })).toHaveAttribute('download');
    expect(screen.getByRole('button', { name: '링크 복사' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '출력' }));
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
  });
});
