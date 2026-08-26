import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import StorefrontView from '../components/storefront-page/StorefrontView';

const PRODUCT_ROWS = [
  { product_category_name: '비료', product_name: '알파', medium_category: '밑거름', tax_price: 1000 },
  { product_category_name: '농약', product_name: '베타', medium_category: '살균제', tax_price: 2000 },
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
  it('opens information with office and category child navigation', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    await user.click(screen.getByRole('button', { name: '안내' }));
    expect(screen.getByRole('button', { name: '사무소 안내' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '비료 안내' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('등록자 구매가격')).toBeInTheDocument();
    expect(screen.queryByText('3월부터')).not.toBeInTheDocument();
  });

  it('uses the configured mid-category chip design for information children', async () => {
    const user = userEvent.setup();
    const config = buildConfig({
      officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
      fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
    });
    config.pageConfig.pageStyle = { categoryChips: { variant: 'filled' } };

    render(<StorefrontView config={config} productRows={PRODUCT_ROWS} />);
    await user.click(screen.getByRole('button', { name: '안내' }));

    expect(screen.getByTestId('storefront-information-category-chips')).toHaveAttribute(
      'data-chip-variant',
      'filled',
    );
  });

  it('renders only the category panel selected from the information children', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    await user.click(screen.getByRole('button', { name: '안내' }));
    await user.click(screen.getByRole('button', { name: '비료 안내' }));

    expect(screen.getByText('3월부터')).toBeInTheDocument();
    expect(screen.queryByText('등록자 구매가격')).not.toBeInTheDocument();
  });

  it('returns to the product category with its all filter selected', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    await user.click(screen.getByRole('button', { name: '안내' }));
    await user.click(screen.getByRole('button', { name: '비료 안내' }));
    await user.click(
      within(screen.getByTestId('storefront-product-category-chips')).getByRole(
        'button',
        { name: '비료' },
      ),
    );

    expect(screen.queryByRole('button', { name: '비료 안내' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '전체' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('알파')).toBeInTheDocument();
  });

  it('keeps the selected information child when the shopper returns to the guide', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    await user.click(screen.getByRole('button', { name: '안내' }));
    await user.click(screen.getByRole('button', { name: '비료 안내' }));
    await user.click(
      within(screen.getByTestId('storefront-product-category-chips')).getByRole(
        'button',
        { name: '비료' },
      ),
    );
    await user.click(screen.getByRole('button', { name: '안내' }));

    expect(screen.getByRole('button', { name: '비료 안내' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('3월부터')).toBeInTheDocument();
  });

  it('defaults category-only information to its category child', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    await user.click(screen.getByRole('button', { name: '안내' }));

    expect(screen.getByRole('button', { name: '비료 안내' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('3월부터')).toBeInTheDocument();
  });

  it('exits information rendering when the shopper searches', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    await user.click(screen.getByRole('button', { name: '안내' }));
    await user.type(screen.getByRole('searchbox'), '알파');

    expect(screen.queryByRole('navigation', { name: '안내 분류' })).not.toBeInTheDocument();
    expect(await screen.findByText('알파')).toBeInTheDocument();
  });

  it('omits the top guide when there is no information', () => {
    render(<StorefrontView config={buildConfig()} productRows={PRODUCT_ROWS} />);

    expect(screen.queryByRole('button', { name: '안내' })).not.toBeInTheDocument();
  });

  it('offers the top guide for office information without catalog sections', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={{
        ...buildConfig({
          officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        }),
        categoryConfigs: [],
      }}
      productRows={[]}
    />);

    await user.click(screen.getByRole('button', { name: '안내' }));

    expect(screen.getByText('등록자 구매가격')).toBeInTheDocument();
  });
});
