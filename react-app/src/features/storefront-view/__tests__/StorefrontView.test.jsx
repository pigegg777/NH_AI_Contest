import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import StorefrontView from '../components/storefront-page/StorefrontView';
import { DEFAULT_CARD_STYLE } from '../model/card-style/cardStyleModel';

describe('StorefrontView', () => {
  it('renders the merchant-set title as the main heading', () => {
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

    expect(
      screen.getByRole('heading', { level: 1, name: '남해농협' }),
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

  it('links only pesticide products to the official pesticide safety search', () => {
    render(
      <StorefrontView
        config={{
          pageConfig: {
            nav: { title: '농협 상품안내' },
            searchSection: { enabled: true, placeholder: '상품 검색' },
            categoryChips: { enabled: true, sticky: true },
            mobileUiTree: [
              { id: 'hero', type: 'hero', slot: 'top', enabled: true, props: {} },
              { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
            ],
          },
          navConfig: { title: '농협 상품안내' },
          categoryConfigs: [
            {
              productCategoryName: '상품',
              categoryConfig: {
                displayName: '상품',
                sourceCategoryName: '상품',
                cardDesign: {
                  visibleFields: ['product_name', 'pesticide_info_link'],
                  cardStyle: DEFAULT_CARD_STYLE,
                },
              },
            },
          ],
          hiddenProducts: [],
        }}
        productRows={[
          {
            row_id: 'pesticide-1',
            product_category_name: '상품',
            product_name: '프레바톤',
            large_category: '농약',
          },
          {
            row_id: 'fertilizer-1',
            product_category_name: '상품',
            product_name: '복합비료',
            large_category: '비료',
          },
        ]}
      />,
    );

    const links = screen.getAllByRole('link', { name: '농약상세정보' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute(
      'href',
      'https://psis.rda.go.kr/psis/agc/res/agchmRegistStusLst.ps?sAgBrandNm=%ED%94%84%EB%A0%88%EB%B0%94%ED%86%A4&sType=A&pageIndex=1',
    );
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(screen.getByText('복합비료').closest('article')).not.toContainElement(links[0]);
  });

  it('orders large-category chips with 비료 and 농약 first, then Korean alphabetical order', () => {
    render(
      <StorefrontView
        config={{
          pageConfig: { nav: { title: '농협 상품안내' } },
          navConfig: { title: '농협 상품안내' },
          categoryConfigs: [],
          hiddenProducts: [],
        }}
        productRows={[
          { product_category_name: '원예자재', product_name: '원예 상품' },
          { product_category_name: '농약', product_name: '농약 상품' },
          { product_category_name: '가축자재', product_name: '가축 상품' },
          { product_category_name: '비료', product_name: '비료 상품' },
          { product_category_name: '농기계', product_name: '농기계 상품' },
        ]}
      />,
    );

    const chipLabels = within(screen.getByTestId('storefront-product-category-chips'))
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(chipLabels).toEqual(['비료', '농약', '가축자재', '농기계', '원예자재']);
  });

  it('filters the 농약 tab by medium_category, listing 농약 large-category ones first', async () => {
    const user = userEvent.setup();

    render(
      <StorefrontView
        config={{
          pageConfig: { nav: { title: '농협 상품안내' } },
          navConfig: { title: '농협 상품안내' },
          categoryConfigs: [],
          hiddenProducts: [],
        }}
        productRows={[
          {
            product_category_name: '농약',
            product_name: '유기농업자재 상품',
            large_category: '유기농업자재',
            medium_category: '유기농업자재',
          },
          {
            product_category_name: '농약',
            product_name: '4종복비 상품',
            large_category: '4종복비',
            medium_category: '4종복비',
          },
          {
            product_category_name: '농약',
            product_name: '농약 상품',
            large_category: '농약',
            medium_category: '살충제',
          },
        ]}
      />,
    );

    const chipLabels = within(screen.getByTestId('storefront-category-chips'))
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(chipLabels).toEqual(['전체', '살충제', '4종복비', '유기농업자재']);

    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();

    try {
      await user.click(
        within(screen.getByTestId('storefront-category-chips')).getByRole('button', {
          name: '4종복비',
        }),
      );

      expect(screen.getByText('4종복비 상품')).toBeInTheDocument();
      expect(screen.queryByText('농약 상품')).not.toBeInTheDocument();
      expect(screen.queryByText('유기농업자재 상품')).not.toBeInTheDocument();
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });
});
