import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/office-product-data/officeProductDataReadService';
import StorefrontBuilderPage from '../pages/StorefrontBuilderPage';
import { requestPageStyleAiIntent } from '../services/page-design/pageStyleAiGateway';
import { fetchStorefrontConfig, upsertStorefrontConfig } from '../services/storefront-config/storefrontConfigService';

vi.mock('../../office-product-editor/services/office-product-data/officeProductDataReadService', () => ({
  fetchOfficeProductDataEntries: vi.fn(),
}));

vi.mock('../services/storefront-config/storefrontConfigService', () => ({
  fetchStorefrontConfig: vi.fn(),
  upsertStorefrontConfig: vi.fn(),
}));

vi.mock('../services/page-design/pageStyleAiGateway', () => ({
  requestPageStyleAiIntent: vi.fn(),
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

async function reachUnifiedDesignStep(user) {
  await user.click(await screen.findByTestId('start-storefront-builder'));
  await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
  await user.click(screen.getByTestId('builder-go-next'));
  await user.click(screen.getByTestId('builder-go-next'));
  await screen.findByTestId('save-storefront-draft');
}

function mockPageAiResponse({
  palette = null,
  header = null,
  categoryChips = null,
  search = null,
  explanation = '페이지 스타일을 반영했습니다.',
  suggestion = null,
} = {}) {
  requestPageStyleAiIntent.mockResolvedValue({
    intent: {
      palette,
      header,
      categoryChips,
      search,
    },
    explanation,
    suggestion,
  });
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

    const table = screen.getByTestId('data-field-table-description');
    const designPreview = screen.getByTestId('mobile-preview-device');

    expect(within(table).getByTestId('data-field-example-product_name')).toHaveTextContent('Alpha');
    expect(within(designPreview).queryByText('18-18-18')).not.toBeInTheDocument();

    await user.click(within(table).getByTestId('data-field-toggle-nutrient'));

    await waitFor(() => {
      expect(within(designPreview).getByText('18-18-18')).toBeInTheDocument();
    });
    expect(screen.getByTestId('data-selection-unconfirmed-hint')).toBeInTheDocument();
    expect(screen.getByTestId('builder-go-next')).toBeEnabled();

    await user.click(screen.getByTestId('builder-go-next'));

    expect(await screen.findByTestId('unified-design-editor')).toBeInTheDocument();
    await waitFor(() => {
      expect(within(screen.getByTestId('mobile-preview-device')).getByText('18-18-18')).toBeInTheDocument();
    });
  });

  it('uses the three-step flow and lands on one unified design step', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));

    expect(screen.getByTestId('data-field-table-description')).toBeInTheDocument();
    expect(screen.queryByTestId('page-design-editor')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('builder-go-next'));

    expect(await screen.findByTestId('unified-design-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('page-design-editor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('card-design-editor')).not.toBeInTheDocument();
  });

  it('defaults to page target and keeps one shared prompt draft when switching targets', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    expect(screen.getByTestId('unified-design-target-page')).toHaveAttribute('aria-pressed', 'true');

    await user.type(screen.getByTestId('unified-design-prompt'), 'same draft across targets');
    await user.click(screen.getByTestId('unified-design-target-card'));

    expect(screen.getByTestId('unified-design-target-card')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('unified-design-prompt')).toHaveValue('same draft across targets');
  });

  it('runs the three-step flow and saves the resolved cardStyle without touching page-wide nav settings', async () => {
    vi.stubEnv('VITE_STOREFRONT_AI_LOCAL_HEURISTIC', 'true');
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(await screen.findByTestId('start-storefront-builder')).toBeInTheDocument();

    await reachUnifiedDesignStep(user);

    expect(screen.getByTestId('unified-design-editor')).toBeInTheDocument();
    await user.click(screen.getByTestId('unified-design-target-card'));
    await user.click(within(screen.getByTestId('card-design-cards-per-row')).getAllByRole('button')[0]);
    await user.type(screen.getByTestId('unified-design-prompt'), 'show the image on the left');
    await user.click(screen.getByTestId('apply-unified-ai-design'));

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

  it('applies only the selected page target and records a page badge in shared history', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    mockPageAiResponse({
      palette: {
        backgroundHex: '#eef3fd',
        surfaceHex: '#ffffff',
        accentHex: '#2563eb',
        textHex: '#111827',
      },
      header: { fontWeight: 800 },
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.type(
      screen.getByTestId('unified-design-prompt'),
      'cool trustworthy blue, make the title bolder',
    );
    await user.click(screen.getByTestId('apply-unified-ai-design'));

    await waitFor(() => {
      expect(screen.getByTestId('storefront-page').style.getPropertyValue('--brand-color')).toBe('#2563eb');
    });

    const sectionEl = screen
      .getByTestId('mobile-preview-device')
      .querySelector('section[data-structural-preset]');
    expect(sectionEl.dataset.structuralPreset).toBe('header-top');
    expect(screen.getAllByTestId('chat-message-target-badge').some((badge) => badge.dataset.target === 'page')).toBe(true);
  }, 10000);

  it('applies a field-override card prompt, previews the styled field, saves it, and undoes it', async () => {
    vi.stubEnv('VITE_STOREFRONT_AI_LOCAL_HEURISTIC', 'true');
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.click(screen.getByTestId('unified-design-target-card'));
    await user.click(screen.getByTestId('unified-design-scope-field'));
    await user.type(screen.getByTestId('unified-design-prompt'), 'make the tax price red and bold');
    await user.click(screen.getByTestId('apply-unified-ai-design'));

    let taxPriceValueEl;

    await waitFor(() => {
      const card = within(screen.getByTestId('mobile-preview-device')).getAllByRole('article')[0];
      taxPriceValueEl = within(card).getByText(/1,000/);
      expect(taxPriceValueEl.style.getPropertyValue('--field-text-color')).toBe('#dc2626');
    });
    expect(screen.getAllByTestId('chat-message-target-badge').some((badge) => badge.dataset.target === 'card')).toBe(true);

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
      const restoredTaxPriceValueEl = within(card).getByText(/1,000/);
      expect(restoredTaxPriceValueEl.style.getPropertyValue('--field-text-color')).not.toBe('#dc2626');
    });
  }, 10000);

  it('applies one page-style prompt, previews immediately, and saves only the compiled pageStyle', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);
    mockPageAiResponse({
      palette: {
        backgroundHex: '#eef3fd',
        surfaceHex: '#ffffff',
        accentHex: '#2563eb',
        textHex: '#111827',
      },
      header: { fontWeight: 800 },
      search: { sizeToken: 'lg', borderStrengthToken: 'strong' },
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    const previewPageEl = screen.getByTestId('storefront-page');

    await user.type(
      screen.getByTestId('unified-design-prompt'),
      'cool trustworthy blue, make the title bolder and the search box larger with a stronger border',
    );
    await user.click(screen.getByTestId('apply-unified-ai-design'));

    await waitFor(() => {
      expect(previewPageEl.style.getPropertyValue('--brand-color')).toBe('#2563eb');
      expect(previewPageEl.style.getPropertyValue('--typography-heading-weight')).toBe('800');
      expect(previewPageEl.style.getPropertyValue('--page-search-border-width')).toBe('2.5px');
    });

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

    await reachUnifiedDesignStep(user);

    const previewPageEl = screen.getByTestId('storefront-page');
    const brandColorBeforeApply = previewPageEl.style.getPropertyValue('--brand-color');

    await user.click(screen.getByTestId('apply-unified-ai-design'));

    await waitFor(() => {
      expect(screen.getByTestId('unified-design-prompt-panel').textContent).toContain('입력');
    });
    expect(previewPageEl.style.getPropertyValue('--brand-color')).toBe(brandColorBeforeApply);
  });

  it('retains unified design state when going back to data selection and returning', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.click(screen.getByTestId('unified-design-target-card'));
    await user.type(screen.getByTestId('unified-design-prompt'), 'keep this draft');

    await user.click(screen.getByTestId('builder-go-previous'));
    await user.click(screen.getByTestId('builder-go-next'));

    expect(await screen.findByTestId('unified-design-target-card')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('unified-design-prompt')).toHaveValue('keep this draft');
  });

  it('reconfirming data selection resets only card-design output, not basic page settings', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    mockPageAiResponse({
      palette: {
        backgroundHex: '#eef3fd',
        surfaceHex: '#ffffff',
        accentHex: '#2563eb',
        textHex: '#111827',
      },
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.type(screen.getByTestId('unified-design-prompt'), 'cool trustworthy blue');
    await user.click(screen.getByTestId('apply-unified-ai-design'));
    await waitFor(() => {
      expect(screen.getByTestId('storefront-page').style.getPropertyValue('--brand-color')).toBe('#2563eb');
    });

    await user.click(screen.getByTestId('unified-design-target-card'));
    await user.click(within(screen.getByTestId('card-design-cards-per-row')).getAllByRole('button')[0]);

    await user.click(screen.getByTestId('builder-go-previous'));
    await user.click(within(screen.getByTestId('data-field-table-description')).getByTestId('data-field-toggle-nutrient'));
    await user.click(screen.getByTestId('builder-go-next'));

    await waitFor(() => {
      const sectionEl = screen.getByTestId('mobile-preview-device').querySelector('section[data-structural-preset]');
      expect(sectionEl.dataset.structuralPreset).toBe('header-top');
    });
    expect(screen.getByTestId('storefront-page').style.getPropertyValue('--brand-color')).toBe('#2563eb');
  });

  it('never lets a card-design AI prompt change which fields are saved', async () => {
    vi.stubEnv('VITE_STOREFRONT_AI_LOCAL_HEURISTIC', 'true');
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.click(screen.getByTestId('unified-design-target-card'));
    await user.click(screen.getByTestId('unified-design-scope-field'));
    await user.type(screen.getByTestId('unified-design-prompt'), 'show the link more clearly');
    await user.click(screen.getByTestId('apply-unified-ai-design'));
    await user.click(screen.getByTestId('save-storefront-draft'));

    await waitFor(() => expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1));
    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(savedPayload.categoryConfigs[0].categoryConfig.cardDesign.visibleFields).toEqual([
      'product_name',
      'spec',
      'tax_price',
    ]);
  });

  it('resets unified design state when changing category', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    mockPageAiResponse();

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.type(screen.getByTestId('unified-design-prompt'), 'page context');
    await user.click(screen.getByTestId('apply-unified-ai-design'));
    await waitFor(() => {
      expect(screen.getAllByTestId('chat-message-target-badge').length).toBeGreaterThan(0);
    });

    await user.click(screen.getByTestId('builder-go-previous'));
    await user.click(screen.getByTestId('builder-go-previous'));
    await user.click(screen.getByTestId('select-product-category-Pesticide Upload'));
    await user.click(screen.getByTestId('builder-go-next'));
    await user.click(screen.getByTestId('builder-go-next'));

    expect(await screen.findByTestId('unified-design-target-page')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('unified-design-prompt')).toHaveValue('');
    expect(screen.queryAllByTestId('chat-message-target-badge')).toHaveLength(0);
  }, 10000);

  it('keeps the unified design step focused on saving and dashboard guidance instead of QR export', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    expect(screen.queryByTestId('storefront-qr-export-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('open-storefront-qr-export')).not.toBeInTheDocument();
    expect(screen.getByTestId('save-storefront-draft')).toBeInTheDocument();
    expect(screen.getByText(/QR/)).toBeInTheDocument();
  });
});
