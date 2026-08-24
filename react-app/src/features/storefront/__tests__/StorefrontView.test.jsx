import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import StorefrontView from '../components/storefront-page/StorefrontView';
import { DEFAULT_CARD_STYLE } from '../model/card-design/style/cardStyleModel';

describe('StorefrontView', () => {
  it('renders the co-op name in the brand row and keeps the main title focused on office only', () => {
    render(
      <StorefrontView
        config={{
          pageConfig: {
            nav: { title: '남해농협' },
            searchSection: {
              enabled: true,
              placeholder: 'Search products',
            },
            categoryChips: { enabled: true, sticky: true, variant: 'soft' },
            mobileUiTree: [
              { id: 'hero', type: 'hero', slot: 'top', enabled: true, props: {} },
              { id: 'search-box', type: 'searchBox', slot: 'top', enabled: true, props: {} },
              { id: 'category-chips', type: 'categoryChips', slot: 'afterSearch', enabled: true, props: {} },
              { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
              { id: 'empty-state', type: 'emptyState', slot: 'bottom', enabled: true, props: {} },
            ],
          },
          navConfig: { title: '남해농협' },
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
                  style: {
                    layout: 'grid',
                    accentColor: '#1d4a2e',
                    fontSize: 'medium',
                    cardsPerRow: 2,
                  },
                },
              },
            },
            {
              officeCode: 'OFF-1',
              productCategoryName: 'Pesticide Upload',
              sortOrder: 1,
              categoryConfig: {
                displayName: 'Pesticide Upload',
                sourceCategoryName: 'Pesticide Upload',
                selectedMediumCategories: ['Control'],
                representativeMediumCategory: 'Control',
                layoutStyle: { variant: 'card-grid' },
                cardDesign: {
                  visibleFields: ['product_name', 'tax_price'],
                  style: {
                    layout: 'grid',
                    accentColor: '#2563eb',
                    fontSize: 'medium',
                    cardsPerRow: 2,
                  },
                },
              },
            },
          ],
          hiddenProducts: [],
        }}
        productRows={[
          {
            product_category_name: 'Fertilizer Upload',
            product_name: 'Alpha Premium',
            office_name: '본점',
            medium_category: 'Premium',
            tax_price: 1000,
          },
          {
            product_category_name: 'Pesticide Upload',
            product_name: 'Shield Control',
            office_name: '본점',
            medium_category: 'Control',
            tax_price: 3000,
          },
        ]}
      />,
    );

    const productCategoryChips = screen.getByTestId(
      'storefront-product-category-chips',
    );
    const searchBox = screen.getByTestId('storefront-search');
    const midCategoryChips = screen.getByTestId('storefront-category-chips');

    expect(screen.getByText('남해농협')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: '본점 농자재 정보' }),
    ).toBeInTheDocument();
    expect(productCategoryChips).toBeInTheDocument();
    expect(midCategoryChips).toBeInTheDocument();
    expect(
      within(productCategoryChips).getByRole('button', {
        name: 'Fertilizer Upload',
      }),
    ).toBeInTheDocument();
    expect(
      within(productCategoryChips).getByRole('button', {
        name: 'Pesticide Upload',
      }),
    ).toBeInTheDocument();
    expect(
      searchBox.compareDocumentPosition(productCategoryChips) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      productCategoryChips.compareDocumentPosition(midCategoryChips) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });

  it('still renders the brand logo when no office/co-op name can be derived', () => {
    render(
      <StorefrontView
        config={{
          pageConfig: {
            nav: { title: '' },
            searchSection: { enabled: true, placeholder: 'Search products' },
            categoryChips: { enabled: true, sticky: true, variant: 'soft' },
            mobileUiTree: [
              { id: 'hero', type: 'hero', slot: 'top', enabled: true, props: {} },
              { id: 'search-box', type: 'searchBox', slot: 'top', enabled: true, props: {} },
              { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
              { id: 'empty-state', type: 'emptyState', slot: 'bottom', enabled: true, props: {} },
            ],
          },
          navConfig: { title: '' },
          categoryConfigs: [],
        }}
        productRows={[]}
      />,
    );

    expect(screen.getByTestId('storefront-brand-logo')).toBeInTheDocument();
    expect(screen.queryByText('남해농협')).not.toBeInTheDocument();
  });

  it('renders compiled layoutPlan values such as image-right and one-line titles', () => {
    render(
      <StorefrontView
        config={{
          pageConfig: {
            nav: { title: '농협 상품안내' },
            searchSection: { enabled: true, placeholder: 'Search products' },
            categoryChips: { enabled: true, sticky: true, variant: 'soft' },
            mobileUiTree: [
              { id: 'hero', type: 'hero', slot: 'top', enabled: true, props: {} },
              { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
            ],
          },
          navConfig: { title: '농협 상품안내' },
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
                  visibleFields: ['product_name', 'img_url', 'tax_price'],
                  cardStyle: {
                    ...DEFAULT_CARD_STYLE,
                    cardsPerRow: 1,
                    layoutPlan: {
                      ...DEFAULT_CARD_STYLE.layoutPlan,
                      cardsPerRow: 1,
                      sectionOrder: ['header', 'info', 'image'],
                      imagePlacement: 'right',
                      titleClamp: 1,
                    },
                  },
                },
              },
            },
          ],
          hiddenProducts: [],
        }}
        productRows={[
          {
            product_category_name: 'Fertilizer Upload',
            product_name: 'Alpha Premium',
            office_name: '본점',
            medium_category: 'Premium',
            img_url: 'https://example.com/alpha.png',
            tax_price: 1000,
          },
        ]}
      />,
    );

    const section = screen.getByTestId('storefront-card-grid-section');
    const title = screen.getByText('Alpha Premium');
    const article = title.closest('article');

    expect(section).toHaveAttribute('data-content-density', 'comfortable');
    expect(article).toHaveAttribute('data-image-placement', 'right');
    expect(title.style.WebkitLineClamp).toBe('1');
  });
});
