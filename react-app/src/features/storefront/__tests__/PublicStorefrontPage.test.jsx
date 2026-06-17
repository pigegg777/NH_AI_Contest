import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchAllOfficeProductRows } from '../../office-product-editor/services/officeProductDataService';
import { CARD_STYLE_FONT_SIZE_REM } from '../model/cardStyleModel';
import { fetchStorefrontConfig } from '../services/storefrontConfigService';
import PublicStorefrontPage from '../pages/PublicStorefrontPage';

vi.mock('../../office-product-editor/services/officeProductDataService', () => ({
  fetchAllOfficeProductRows: vi.fn(),
}));

vi.mock('../services/storefrontConfigService', () => ({
  fetchStorefrontConfig: vi.fn(),
}));

describe('PublicStorefrontPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the placeholder without fetching when officeCode is missing', () => {
    render(<PublicStorefrontPage officeCode="" />);

    expect(screen.getByText('페이지 준비 중입니다.')).toBeInTheDocument();
    expect(fetchStorefrontConfig).not.toHaveBeenCalled();
    expect(fetchAllOfficeProductRows).not.toHaveBeenCalled();
  });

  it('shows a loading state while fetching', () => {
    fetchStorefrontConfig.mockReturnValue(new Promise(() => {}));
    fetchAllOfficeProductRows.mockReturnValue(new Promise(() => {}));

    render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();
  });

  it('renders the placeholder when no config row exists', async () => {
    fetchStorefrontConfig.mockResolvedValue(null);
    fetchAllOfficeProductRows.mockResolvedValue([{ product_name: 'Alpha', product_category_name: 'Fertilizer Upload' }]);

    render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(await screen.findByText('페이지 준비 중입니다.')).toBeInTheDocument();
  });

  it('shows an error message when a fetch rejects', async () => {
    fetchStorefrontConfig.mockRejectedValue(new Error('boom'));
    fetchAllOfficeProductRows.mockResolvedValue([]);

    render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(await screen.findByText('페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument();
  });

  it('renders product-category sections and keeps rows scoped to the saved source category', async () => {
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: {
        schemaVersion: 1,
        designDirection: 'trust',
        theme: { brandColor: '#2563eb', backgroundTone: 'sky' },
        nav: { title: 'NH Demo Storefront', subtitle: 'Seasonal products', logoUrl: '' },
        searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
        categoryChips: { enabled: true, sticky: true },
      },
      navConfig: {
        title: 'NH Demo Storefront',
        subtitle: 'Seasonal products',
        brandColor: '#2563eb',
        searchPlaceholder: 'Search products',
        logoUrl: '',
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
            layoutStyle: { variant: 'card-grid' },
            cardDesign: {
              visibleFields: ['product_name', 'tax_price'],
              style: { layout: 'compact', accentColor: '#2563eb', fontSize: 'large', cardsPerRow: 2 },
            },
          },
          updatedAt: '2026-06-15T00:00:00Z',
        },
      ],
      hiddenProducts: [],
      updatedAt: '2026-06-15T00:00:00Z',
    });
    fetchAllOfficeProductRows.mockResolvedValue([
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Alpha',
        spec: '20kg',
        large_category: 'Fertilizer',
        medium_category: 'Premium',
        tax_price: 1000,
      },
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Beta',
        spec: '20kg',
        large_category: 'Fertilizer',
        medium_category: 'Starter',
        tax_price: 2000,
      },
      {
        product_category_name: 'Pesticide Upload',
        product_name: 'Gamma',
        spec: '500ml',
        large_category: 'Pesticide',
        medium_category: 'Premium',
        tax_price: 3000,
      },
    ]);

    const user = userEvent.setup();
    const { container } = render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(await screen.findByText('NH Demo Storefront')).toBeInTheDocument();
    expect(screen.getByText('Seasonal products')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fertilizer Upload' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Premium' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Starter' })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();

    const cards = screen.getAllByRole('article');
    expect(within(cards[0]).getByText('Premium')).toBeInTheDocument();
    expect(within(cards[0]).getByText('1,000원')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Search products');
    await user.type(searchInput, 'Beta');

    await waitFor(() => {
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    });

    const sectionEl = container.querySelector('section');
    expect(sectionEl.style.getPropertyValue('--card-accent')).toBe('#2563eb');
    expect(sectionEl.style.getPropertyValue('--card-font-size')).toBe(CARD_STYLE_FONT_SIZE_REM.large);
  });

  it('renders medium-category chips from visible storefront rows', async () => {
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: {
        nav: {},
        searchSection: { placeholder: 'Search products' },
        categoryChips: { enabled: true, sticky: true },
      },
      navConfig: {},
      categoryConfigs: [
        {
          officeCode: 'OFF-1',
          productCategoryName: 'Fertilizer Upload',
          sortOrder: 0,
          categoryConfig: {
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
            selectedMediumCategories: ['Premium', 'Starter'],
            representativeMediumCategory: 'Premium',
            layoutStyle: { variant: 'card-grid' },
            cardDesign: {
              visibleFields: ['product_name'],
              style: { layout: 'grid', accentColor: '#1d4a2e', fontSize: 'medium', cardsPerRow: 2 },
            },
          },
        },
      ],
      hiddenProducts: [],
      updatedAt: '2026-06-15T00:00:00Z',
    });
    fetchAllOfficeProductRows.mockResolvedValue([
      { product_category_name: 'Fertilizer Upload', product_name: 'Alpha', medium_category: 'Premium' },
      { product_category_name: 'Fertilizer Upload', product_name: 'Beta', medium_category: 'Starter' },
      { product_category_name: 'Fertilizer Upload', product_name: 'Gamma', medium_category: 'Premium' },
    ]);

    render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(await screen.findByRole('button', { name: '전체' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Premium' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Starter' })).toBeInTheDocument();
  });

  it('renders search and chip variants plus expanded card presentation styles from config only', async () => {
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: {
        schemaVersion: 1,
        designDirection: 'trust',
        theme: { brandColor: '#2563eb', backgroundTone: 'sky' },
        nav: { title: 'NH Demo Storefront', subtitle: 'Seasonal products', logoUrl: '' },
        searchSection: { enabled: true, placeholder: 'Search products', variant: 'outlined' },
        categoryChips: { enabled: true, sticky: true, variant: 'filled' },
      },
      navConfig: {
        title: 'NH Demo Storefront',
        subtitle: 'Seasonal products',
        brandColor: '#2563eb',
        searchPlaceholder: 'Search products',
        logoUrl: '',
        searchVariant: 'outlined',
        categoryChipVariant: 'filled',
      },
      categoryConfigs: [
        {
          officeCode: 'OFF-1',
          productCategoryName: 'Fertilizer Upload',
          sortOrder: 0,
          categoryConfig: {
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
            selectedMediumCategories: ['Premium'],
            representativeMediumCategory: 'Premium',
            layoutStyle: { variant: 'card-grid' },
            cardDesign: {
              visibleFields: ['product_name', 'tax_price'],
              style: {
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
            },
          },
        },
      ],
      hiddenProducts: [],
    });
    fetchAllOfficeProductRows.mockResolvedValue([
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Alpha',
        medium_category: 'Premium',
        img_url: 'https://example.com/a.png',
        tax_price: 1000,
      },
    ]);

    const { container } = render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(await screen.findByText('NH Demo Storefront')).toBeInTheDocument();
    expect(screen.getByTestId('storefront-search')).toHaveAttribute('data-search-variant', 'outlined');
    expect(screen.getByTestId('storefront-category-chips')).toHaveAttribute('data-chip-variant', 'filled');

    const sectionEl = container.querySelector('section');
    expect(sectionEl).toHaveAttribute('data-image-size', 'lg');
    expect(sectionEl).toHaveAttribute('data-image-fit', 'contain');
    expect(sectionEl).toHaveAttribute('data-card-radius', 'xl');
    expect(sectionEl).toHaveAttribute('data-card-shadow', 'strong');
    expect(sectionEl).toHaveAttribute('data-card-spacing', 'relaxed');
  });

  it('renders a mobile category info bar from the first visible section and uses Korean fallback copy', async () => {
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: {
        schemaVersion: 1,
        designDirection: 'trust',
        theme: { brandColor: '#2563eb', backgroundTone: 'sky' },
        nav: { title: '', subtitle: '', logoUrl: '' },
        searchSection: { enabled: true, placeholder: '', variant: 'pill' },
        categoryChips: { enabled: true, sticky: true, variant: 'soft' },
      },
      navConfig: {
        title: '',
        subtitle: '',
        brandColor: '#2563eb',
        searchPlaceholder: '',
        logoUrl: '',
        searchVariant: 'pill',
        categoryChipVariant: 'soft',
      },
      categoryConfigs: [
        {
          officeCode: 'OFF-1',
          productCategoryName: '비료',
          sortOrder: 0,
          categoryConfig: {
            displayName: '비료',
            sourceCategoryName: '비료',
            selectedMediumCategories: ['복합비료', '유기질비료'],
            representativeMediumCategory: '복합비료',
            layoutStyle: { variant: 'card-grid' },
            cardDesign: {
              visibleFields: ['product_name', 'tax_price'],
              style: { layout: 'grid', accentColor: '#2563eb', fontSize: 'medium', cardsPerRow: 2 },
            },
          },
        },
      ],
      hiddenProducts: [],
    });
    fetchAllOfficeProductRows.mockResolvedValue([
      { product_category_name: '비료', product_name: '알파', medium_category: '복합비료', tax_price: 1000 },
      { product_category_name: '비료', product_name: '베타', medium_category: '유기질비료', tax_price: 2000 },
    ]);

    render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(await screen.findByText('상품 안내')).toBeInTheDocument();
    expect(screen.getByText('고객에게 안내할 상품을 살펴보세요.')).toBeInTheDocument();
    const mobileCategoryBar = screen.getByTestId('storefront-mobile-category-bar');
    expect(mobileCategoryBar).toBeInTheDocument();
    expect(within(mobileCategoryBar).getByText('비료')).toBeInTheDocument();
    expect(within(mobileCategoryBar).getByText('복합비료')).toBeInTheDocument();
    expect(within(mobileCategoryBar).getByText('유기질비료')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('상품 검색')).toBeInTheDocument();
    expect(screen.getByTestId('storefront-category-chips')).toHaveAttribute('data-chip-size', 'compact');
  });

  it('filters rows by medium-category chip and keeps search filtering combined', async () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: {
        nav: {},
        searchSection: { placeholder: 'Search products' },
        categoryChips: { enabled: true, sticky: true },
      },
      navConfig: {},
      categoryConfigs: [
        {
          officeCode: 'OFF-1',
          productCategoryName: 'Fertilizer Upload',
          sortOrder: 0,
          categoryConfig: {
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
            selectedMediumCategories: ['Premium', 'Starter'],
            representativeMediumCategory: 'Premium',
            layoutStyle: { variant: 'card-grid' },
            cardDesign: {
              visibleFields: ['product_name', 'tax_price'],
              style: { layout: 'grid', accentColor: '#1d4a2e', fontSize: 'medium', cardsPerRow: 2 },
            },
          },
        },
      ],
      hiddenProducts: [],
      updatedAt: '2026-06-15T00:00:00Z',
    });
    fetchAllOfficeProductRows.mockResolvedValue([
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Alpha Premium',
        medium_category: 'Premium',
        tax_price: 1000,
      },
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Beta Starter',
        medium_category: 'Starter',
        tax_price: 2000,
      },
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Gamma Premium',
        medium_category: 'Premium',
        tax_price: 3000,
      },
    ]);

    const user = userEvent.setup();
    render(<PublicStorefrontPage officeCode="OFF-1" />);

    await screen.findByText('Alpha Premium');

    await user.click(screen.getByRole('button', { name: 'Premium' }));

    await waitFor(() => {
      expect(screen.getByText('Alpha Premium')).toBeInTheDocument();
      expect(screen.getByText('Gamma Premium')).toBeInTheDocument();
      expect(screen.queryByText('Beta Starter')).not.toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Search products'), 'Gamma');

    await waitFor(() => {
      expect(screen.queryByText('Alpha Premium')).not.toBeInTheDocument();
      expect(screen.getByText('Gamma Premium')).toBeInTheDocument();
      expect(screen.queryByText('Beta Starter')).not.toBeInTheDocument();
    });
  });

  it('excludes hidden products before building sections', async () => {
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: {
        nav: {},
        searchSection: { placeholder: 'Search products' },
      },
      navConfig: {},
      categoryConfigs: [
        {
          officeCode: 'OFF-1',
          productCategoryName: 'Fertilizer Upload',
          sortOrder: 0,
          categoryConfig: {
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
            selectedMediumCategories: ['Premium'],
            representativeMediumCategory: 'Premium',
            layoutStyle: { variant: 'card-grid' },
            cardDesign: {
              visibleFields: ['product_name'],
              style: { layout: 'grid', accentColor: '#1d4a2e', fontSize: 'medium', cardsPerRow: 2 },
            },
          },
        },
      ],
      hiddenProducts: [{ product_name: 'Alpha', spec: '20kg' }],
      updatedAt: '2026-06-15T00:00:00Z',
    });
    fetchAllOfficeProductRows.mockResolvedValue([
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Alpha',
        spec: '20kg',
        large_category: 'Fertilizer',
        medium_category: 'Premium',
      },
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Beta',
        spec: '20kg',
        large_category: 'Fertilizer',
        medium_category: 'Premium',
      },
    ]);

    render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(await screen.findByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });
});
