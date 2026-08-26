import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import StorefrontView from '../components/storefront-page/StorefrontView';
import CardGridSection from '../components/storefront-page/product-cards/CardGridSection';
import CategoryChipsBlock from '../components/storefront-page/category-nav/CategoryChipsBlock';

const SECTION = {
  products: [{ product_name: '알파 비료', tax_price: 1000 }],
};

function renderStorefront(
  description,
  { categoryChipsEnabled = true, cardStyle } = {},
) {
  render(
    <StorefrontView
      config={{
        pageConfig: {
          categoryChips: { enabled: true },
          mobileUiTree: [
            ...(categoryChipsEnabled
              ? [{ id: 'category-chips', type: 'categoryChips', slot: 'afterSearch', enabled: true, props: {} }]
              : []),
            { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
            { id: 'empty-state', type: 'emptyState', slot: 'bottom', enabled: true, props: {} },
          ],
        },
        categoryConfigs: [
          {
            productCategoryName: '비료',
            categoryConfig: {
              displayName: '비료',
              sourceCategoryName: '비료',
              description,
              cardDesign: {
                visibleFields: ['product_name', 'tax_price'],
                cardStyle,
              },
            },
          },
        ],
      }}
      productRows={[
        {
          product_category_name: '비료',
          product_name: '알파 비료',
          medium_category: '밑거름',
          tax_price: 1000,
        },
      ]}
    />,
  );
}

describe('category description', () => {
  it('renders the information chip from description data, independently of medium-category items', () => {
    render(
      <CategoryChipsBlock
        elementKey="category-chips"
        view={{
          activeCategoryDescription: '봄철 밑거름 모음',
          activeSectionTitle: '비료',
          activeMediumCategory: '밑거름',
          categoryInformationItemId: '__category_information__',
          mediumCategoryItems: ['전체', '밑거름'],
          pageStyle: { categoryChips: { variant: 'soft' } },
          handleMediumCategorySelect: vi.fn(),
        }}
      />,
    );

    expect(
      screen.getByRole('button', { name: '비료 정보' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('opens a category information screen by default when a description exists', () => {
    renderStorefront('봄철 밑거름 모음');

    const chips = screen.getByTestId('storefront-category-chips');
    expect(
      within(chips).getByRole('button', { name: '비료 정보' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: '비료 안내' })).toBeInTheDocument();
    expect(screen.getByText('봄철 밑거름 모음')).toBeInTheDocument();
    expect(screen.queryByText('알파 비료')).not.toBeInTheDocument();
  });

  it('shows products after the shopper selects a product-bearing chip', async () => {
    const user = userEvent.setup();
    renderStorefront('봄철 밑거름 모음');

    await user.click(screen.getByRole('button', { name: '밑거름' }));

    expect(screen.queryByRole('heading', { name: '비료 안내' })).not.toBeInTheDocument();
    expect(screen.getByText('알파 비료')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('storefront-category-chips')).getByRole(
        'button',
        { name: '비료 정보' },
      ),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the existing product screen when no description exists', () => {
    renderStorefront('');

    expect(
      screen.queryByRole('button', { name: '비료 정보' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '비료 안내' })).not.toBeInTheDocument();
    expect(screen.getByText('알파 비료')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '전체' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('keeps products accessible when the medium-category navigation is disabled', () => {
    renderStorefront('봄철 밑거름 모음', { categoryChipsEnabled: false });

    expect(screen.queryByTestId('storefront-category-information')).not.toBeInTheDocument();
    expect(screen.getByText('알파 비료')).toBeInTheDocument();
  });

  it('keeps the configured AI description typography on the information panel', () => {
    renderStorefront('봄철 밑거름 모음', {
      cardStyle: {
        description: {
          colorHex: '#224433',
          fontSizeToken: 'lg',
          fontWeight: 600,
          letterSpacing: '0.02em',
        },
      },
    });

    const panel = screen.getByTestId('storefront-category-information');
    expect(panel.style.getPropertyValue('--category-description-color')).toBe('#224433');
    expect(panel.style.getPropertyValue('--category-description-weight')).toBe('600');
  });
});

describe('section header content', () => {
  // The caller maps over its enabled blocks, so "none" arrives as an empty
  // array. An empty array is truthy, and the wrapper it used to render carried
  // a bottom margin that pushed every grid down.
  it('renders no wrapper when the caller has no blocks to show', () => {
    const { container } = render(
      <CardGridSection
        sectionId="s1"
        section={SECTION}
        fields={['product_name']}
        sectionHeaderContent={[]}
      />,
    );

    const grid = screen.getByTestId('storefront-card-grid-section');

    expect(grid.firstElementChild).toBe(
      container.querySelector('[class*="grid"]'),
    );
  });

  it('renders the wrapper once there is a block to show', () => {
    render(
      <CardGridSection
        sectionId="s1"
        section={SECTION}
        fields={['product_name']}
        sectionHeaderContent={[<span key="a">안내 문구</span>]}
      />,
    );

    expect(screen.getByText('안내 문구')).toBeInTheDocument();
  });
});
