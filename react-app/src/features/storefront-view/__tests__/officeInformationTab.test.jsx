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

describe('information intro rendering', () => {
  it('shows office information and guide children on first render', () => {
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    expect(screen.getByText('등록자 구매가격')).toBeInTheDocument();
    expect(screen.queryByText('3월부터')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '안내' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const informationNav = screen.getByRole('navigation', { name: '안내 분류' });
    expect(within(informationNav).getByRole('button', { name: '사무소 안내' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(within(informationNav).getByRole('button', { name: '비료 안내' }))
      .toBeInTheDocument();
  });

  it('switches between office and category information from the guide children', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    const informationNav = screen.getByRole('navigation', { name: '안내 분류' });
    await user.click(
      within(informationNav).getByRole('button', { name: '비료 안내' }),
    );

    expect(screen.getByText('3월부터')).toBeInTheDocument();
    expect(screen.queryByText('등록자 구매가격')).toBeNull();
    expect(
      screen.queryByRole('group', { name: '세부 분류' }),
    ).not.toBeInTheDocument();

    await user.click(
      within(informationNav).getByRole('button', { name: '사무소 안내' }),
    );
    expect(screen.getByText('등록자 구매가격')).toBeInTheDocument();
  });

  it('shows category information first when its category tab is clicked', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    await user.click(
      within(screen.getByTestId('storefront-product-category-chips')).getByRole(
        'button',
        { name: '비료' },
      ),
    );

    expect(screen.getByText('3월부터')).toBeInTheDocument();
    expect(screen.queryByText('등록자 구매가격')).toBeNull();
    expect(screen.queryByRole('button', { name: '비료 안내' })).toBeNull();
    expect(screen.queryByText('알파')).toBeNull();
  });

  it('uses the same intro flow from the desktop category rail', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    const rail = screen.getByTestId('storefront-category-rail');
    await user.click(within(rail).getByRole('button', { name: '비료' }));

    expect(screen.getByText('3월부터')).toBeInTheDocument();
    expect(screen.queryByText('알파')).toBeNull();

    await user.click(within(rail).getByRole('button', { name: '밑거름' }));

    expect(screen.getByText('알파')).toBeInTheDocument();
    expect(screen.queryByText('3월부터')).toBeNull();
  });

  it('shows products only after a medium-category choice is made', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    await user.click(
      within(screen.getByTestId('storefront-product-category-chips')).getByRole(
        'button',
        { name: '비료' },
      ),
    );

    const mediumTabs = screen.getByRole('group', { name: '세부 분류' });
    expect(within(mediumTabs).getByRole('button', { name: '전체' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByText('알파')).toBeNull();

    await user.click(within(mediumTabs).getByRole('button', { name: '전체' }));

    expect(screen.getByText('알파')).toBeInTheDocument();
    expect(screen.queryByText('3월부터')).toBeNull();
    expect(within(mediumTabs).getByRole('button', { name: '전체' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows all products immediately when the clicked category has no information', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    await user.click(
      within(screen.getByTestId('storefront-product-category-chips')).getByRole(
        'button',
        { name: '농약' },
      ),
    );

    expect(screen.getByRole('button', { name: '전체' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('베타')).toBeInTheDocument();
    expect(screen.queryByText('알파')).toBeNull();
  });

  it('returns to category information when its category tab is clicked again', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    const fertilizerTab = within(
      screen.getByTestId('storefront-product-category-chips'),
    ).getByRole('button', { name: '비료' });

    await user.click(fertilizerTab);
    await user.click(screen.getByRole('button', { name: '전체' }));
    expect(screen.getByText('알파')).toBeInTheDocument();

    await user.click(fertilizerTab);

    expect(screen.getByText('3월부터')).toBeInTheDocument();
    expect(screen.queryByText('알파')).toBeNull();
  });

  it('starts with products when office information is absent, then opens category information on click', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    expect(screen.getByText('알파')).toBeInTheDocument();

    await user.click(
      within(screen.getByTestId('storefront-product-category-chips')).getByRole(
        'button',
        { name: '비료' },
      ),
    );

    expect(screen.getByText('3월부터')).toBeInTheDocument();
    expect(screen.queryByText('알파')).toBeNull();
  });

  it('exits information rendering when the shopper searches', async () => {
    const user = userEvent.setup();
    render(<StorefrontView
      config={buildConfig({
        officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
      })}
      productRows={PRODUCT_ROWS}
    />);

    expect(screen.getByText('등록자 구매가격')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), '알파');

    expect(screen.queryByText('등록자 구매가격')).toBeNull();
    expect(await screen.findByText('알파')).toBeInTheDocument();
  });

  it('omits the top guide when there is no information', () => {
    render(<StorefrontView config={buildConfig()} productRows={PRODUCT_ROWS} />);

    expect(screen.queryByRole('button', { name: '안내' })).not.toBeInTheDocument();
  });

  it('shows office information on first render even without catalog sections', () => {
    render(<StorefrontView
      config={{
        ...buildConfig({
          officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
        }),
        categoryConfigs: [],
      }}
      productRows={[]}
    />);

    expect(screen.getByText('등록자 구매가격')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '안내' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
