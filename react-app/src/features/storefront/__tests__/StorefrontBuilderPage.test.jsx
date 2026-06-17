import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/officeProductDataService';
import { fetchStorefrontConfig, upsertStorefrontConfig } from '../services/storefrontConfigService';
import { requestStorefrontAiSuggestion } from '../services/storefrontAiService';
import StorefrontBuilderPage from '../pages/StorefrontBuilderPage';

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
    id: 11,
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
    categoryChips: { enabled: true, sticky: true },
  },
  navConfig: {
    title: 'Existing guide',
    subtitle: 'Existing subtitle',
    brandColor: '#1d4a2e',
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

  it('runs the two-step AI studio flow, keeps a phone preview visible, and saves the AI-updated draft', async () => {
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
        cardStyle: { layout: 'compact', accentColor: '#2563eb', fontSize: 'large', cardsPerRow: 1 },
        selectedMediumCategories: ['Premium', 'Starter'],
        representativeMediumCategory: 'Premium',
      },
    });
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(await screen.findByText('AI로 스토어프론트 만들기')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '제작 시작' }));

    expect(screen.getByRole('heading', { name: '상품 카테고리 페이지 선택' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Page title')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Page subtitle')).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-preview-device')).toBeInTheDocument();

    const fertilizerCard = screen.getByTestId('product-category-card-Fertilizer Upload');
    const pesticideCard = screen.getByTestId('product-category-card-Pesticide Upload');

    expect(within(fertilizerCard).getByRole('button', { name: '페이지 수정' })).toBeInTheDocument();
    expect(within(pesticideCard).getByRole('button', { name: '페이지 추가' })).toBeInTheDocument();

    await user.click(within(fertilizerCard).getByRole('button', { name: '페이지 수정' }));
    await user.click(screen.getByRole('button', { name: '다음' }));

    expect(screen.getByRole('heading', { name: 'AI 추천으로 다듬기' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Choose medium categories' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pick the first representative card' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Page title')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Page subtitle')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '따뜻한 모바일 톤' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '가격 강조' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '한 줄에 카드 1개' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '한 줄에 카드 1개' }));
    expect(screen.getByLabelText('AI로 다듬기')).toHaveValue('한 줄에 카드 1개씩 배치하고 페이지를 쉽게 훑어볼 수 있게 해줘.');

    await user.type(
      screen.getByLabelText('AI로 다듬기'),
      ' Make the fertilizer page warmer and highlight price',
    );
    await user.click(screen.getByRole('button', { name: 'AI 초안 적용' }));

    expect(await screen.findByText('Warm fertilizer draft applied.')).toBeInTheDocument();
    expect(screen.getByText('Premium Fertilizer Guide')).toBeInTheDocument();
    expect(screen.getByText('Fast answers for customers')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search fertilizer')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '초안 저장' }));

    expect(upsertStorefrontConfig).toHaveBeenCalledWith({
      officeCode: 'OFF-1',
      navConfig: {
        title: 'Premium Fertilizer Guide',
        subtitle: 'Fast answers for customers',
        brandColor: '#2563eb',
        searchPlaceholder: 'Search fertilizer',
        logoUrl: '',
        searchVariant: 'outlined',
        categoryChipVariant: 'filled',
      },
      pageConfig: {
        schemaVersion: 1,
        designDirection: 'warm',
        theme: { brandColor: '#2563eb', backgroundTone: 'apricot' },
        nav: {
          title: 'Premium Fertilizer Guide',
          subtitle: 'Fast answers for customers',
          logoUrl: '',
        },
        searchSection: {
          enabled: true,
          placeholder: 'Search fertilizer',
          variant: 'outlined',
        },
        categoryChips: {
          enabled: true,
          sticky: true,
          variant: 'filled',
        },
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
            layoutStyle: { variant: 'card-grid' },
            cardDesign: {
              visibleFields: ['product_name', 'nutrient', 'tax_price'],
              style: {
                layout: 'compact',
                accentColor: '#2563eb',
                fontSize: 'large',
                cardsPerRow: 1,
                imageSize: 'md',
                imageFit: 'cover',
                cardRadius: 'lg',
                cardShadow: 'soft',
                cardSpacing: 'normal',
              },
            },
          },
        },
      ],
      hiddenProducts: [],
    });
    expect(PRODUCT_ENTRIES[0].rows[0].product_name).toBe('Alpha');
    expect(PRODUCT_ENTRIES[0].rows[0].medium_category).toBe('Premium');
  }, 10000);
});
