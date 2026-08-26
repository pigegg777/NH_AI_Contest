import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import StorefrontView from '../components/storefront-page/StorefrontView';

const PRODUCT_ROWS = [
  { product_category_name: '비료', product_name: '알파', tax_price: 1000 },
  { product_category_name: '농약', product_name: '베타', tax_price: 2000 },
];

function buildConfig({ officeInfo, fertilizerInfo } = {}) {
  return {
    officeCode: 'OFF-1',
    pageConfig: { officeInfo },
    navConfig: { title: '발안농협' },
    categoryConfigs: [
      {
        productCategoryName: '비료',
        categoryConfig: { info: fertilizerInfo, cardDesign: { visibleFields: ['product_name'] } },
      },
      {
        productCategoryName: '농약',
        categoryConfig: { cardDesign: { visibleFields: ['product_name'] } },
      },
    ],
    hiddenProducts: [],
  };
}

describe('office information tab', () => {
  it('offers the chip and opens the panel', async () => {
    const user = userEvent.setup();

    render(
      <StorefrontView
        config={buildConfig({
          officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
          fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
        })}
        productRows={PRODUCT_ROWS}
        officeName="영농센터"
        nhName="발안농협"
      />,
    );

    const chips = screen.getByTestId('storefront-product-category-chips');
    const officeChip = screen.getByRole('button', { name: '사무소 정보' });

    expect(chips).toContainElement(officeChip);

    await user.click(officeChip);

    const panel = await screen.findByTestId('storefront-office-information');

    expect(panel).toBeInTheDocument();
    expect(screen.getByText('영세가격')).toBeInTheDocument();
    expect(screen.getByText('봄철 밑거름')).toBeInTheDocument();
  });

  it('hides the product cards while the tab is open', async () => {
    const user = userEvent.setup();

    render(
      <StorefrontView
        config={buildConfig({
          officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자' }],
        })}
        productRows={PRODUCT_ROWS}
        officeName="영농센터"
        nhName="발안농협"
      />,
    );

    expect(screen.getByText('알파')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '사무소 정보' }));

    expect(screen.queryByText('알파')).not.toBeInTheDocument();
  });

  it('goes back to the cards when another category is picked', async () => {
    const user = userEvent.setup();

    render(
      <StorefrontView
        config={buildConfig({
          officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자' }],
        })}
        productRows={PRODUCT_ROWS}
        officeName="영농센터"
        nhName="발안농협"
      />,
    );

    await user.click(screen.getByRole('button', { name: '사무소 정보' }));
    await user.click(screen.getByRole('button', { name: '농약' }));

    expect(
      screen.queryByTestId('storefront-office-information'),
    ).not.toBeInTheDocument();
    expect(await screen.findByText('베타')).toBeInTheDocument();
  });

  it('offers no chip when nobody wrote anything', () => {
    render(
      <StorefrontView
        config={buildConfig({})}
        productRows={PRODUCT_ROWS}
        officeName="영농센터"
        nhName="발안농협"
      />,
    );

    expect(
      screen.queryByRole('button', { name: '사무소 정보' }),
    ).not.toBeInTheDocument();
  });

  it('offers the chip when only a category wrote something', () => {
    render(
      <StorefrontView
        config={buildConfig({
          fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
        })}
        productRows={PRODUCT_ROWS}
        officeName="영농센터"
        nhName="발안농협"
      />,
    );

    expect(
      screen.getByRole('button', { name: '사무소 정보' }),
    ).toBeInTheDocument();
  });
});
