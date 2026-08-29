import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import StorefrontView from '../components/storefront-page/StorefrontView';

const PRODUCT_ROWS = [
  {
    product_category_name: 'Fertilizer Upload',
    product_name: '알파 비료',
    tax_price: 1000,
  },
];

const CONFIG = {
  pageConfig: { schemaVersion: 1 },
  navConfig: { title: '테스트 매장' },
  categoryConfigs: [
    {
      productCategoryName: 'Fertilizer Upload',
      categoryConfig: {
        displayName: 'Fertilizer Upload',
        sourceCategoryName: 'Fertilizer Upload',
        cardDesign: { visibleFields: ['product_name', 'tax_price'] },
      },
    },
  ],
  hiddenProducts: [],
};

function renderView(productUpdatedAt) {
  render(
    <StorefrontView
      config={CONFIG}
      productRows={PRODUCT_ROWS}
      officeName="테스트농협"
      nhName="테스트"
      productUpdatedAt={productUpdatedAt}
    />,
  );
}

describe('StorefrontView product updated at', () => {
  it('shows the upload timestamp in the hero', () => {
    renderView('2026-08-25T06:04:00Z');

    const stamp = screen.getByTestId('storefront-product-updated-at');

    expect(stamp).toBeInTheDocument();
    expect(stamp.textContent).toMatch(/2026/);
  });

  it('labels the date so a shopper knows what it is', () => {
    renderView('2026-08-25T06:04:00Z');

    const stamp = screen.getByTestId('storefront-product-updated-at');

    expect(stamp.textContent).toMatch(/^단가 기준일 : /);
  });

  it('renders nothing when the office has no upload timestamp', () => {
    renderView('');

    expect(
      screen.queryByTestId('storefront-product-updated-at'),
    ).not.toBeInTheDocument();
  });

  it('renders nothing when the prop is missing entirely', () => {
    render(
      <StorefrontView
        config={CONFIG}
        productRows={PRODUCT_ROWS}
        officeName="테스트농협"
        nhName="테스트"
      />,
    );

    expect(
      screen.queryByTestId('storefront-product-updated-at'),
    ).not.toBeInTheDocument();
  });
});
