import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import StorefrontView from '../components/storefront-page/StorefrontView';

// 빌더 미리보기는 이 신호로 '적용된 디자인'을 화면과 맞춘다. 이것이 끊기면
// 폰 안에서 대분류를 눌러도 요약이 그대로 남는다 — 실제로 그런 상태였다.
function buildConfig() {
  const buildCategory = (name, sortOrder) => ({
    officeCode: 'OFF-1',
    productCategoryName: name,
    sortOrder,
    categoryConfig: {
      displayName: name,
      sourceCategoryName: name,
      selectedMediumCategories: ['기본'],
      representativeMediumCategory: '기본',
      layoutStyle: { variant: 'card-grid' },
      cardDesign: { visibleFields: ['product_name', 'tax_price'] },
    },
  });

  return {
    pageConfig: {
      nav: { title: '남해농협' },
      officeInfo: [{ id: 'i1', label: '문의', description: '031-000-0000' }],
      mobileUiTree: [
        { id: 'hero', type: 'hero', slot: 'top', enabled: true, props: {} },
        {
          id: 'product-sections',
          type: 'productSections',
          slot: 'beforeProducts',
          enabled: true,
          props: {},
        },
      ],
    },
    navConfig: { title: '남해농협' },
    officeInfo: [{ id: 'i1', label: '문의', description: '031-000-0000' }],
    categoryConfigs: [buildCategory('비료', 0), buildCategory('농약', 1)],
    hiddenProducts: [],
  };
}

const PRODUCT_ROWS = [
  {
    product_category_name: '비료',
    product_name: '알파',
    office_name: '본점',
    medium_category: '기본',
    tax_price: 1000,
  },
  {
    product_category_name: '농약',
    product_name: '베타',
    office_name: '본점',
    medium_category: '기본',
    tax_price: 2000,
  },
];

describe('StorefrontView 가 지금 보여주는 대분류를 알려준다', () => {
  it('reports the category the shopper switches to', async () => {
    const onActiveCategoryChange = vi.fn();
    const user = userEvent.setup();

    render(
      <StorefrontView
        config={buildConfig()}
        productRows={PRODUCT_ROWS}
        onActiveCategoryChange={onActiveCategoryChange}
      />,
    );

    const chips = screen.getByTestId('storefront-product-category-chips');
    onActiveCategoryChange.mockClear();

    await user.click(within(chips).getByRole('button', { name: '농약' }));

    await waitFor(() =>
      expect(onActiveCategoryChange).toHaveBeenCalledWith('농약'),
    );
  });

  it('reports no category while the guide screen is showing', async () => {
    // 안내를 띄우면 카드가 한 장도 그려지지 않는다. 그때 분류 이름이 계속
    // 올라가면 빌더가 화면에 없는 카드의 디자인을 보여준다.
    const onActiveCategoryChange = vi.fn();
    const user = userEvent.setup();

    render(
      <StorefrontView
        config={buildConfig()}
        productRows={PRODUCT_ROWS}
        onActiveCategoryChange={onActiveCategoryChange}
      />,
    );

    // 안내가 있으면 화면은 안내로 열린다. 분류를 먼저 골라 놓아야 아래
    // 단언이 '안내로 돌아가면 비워진다'를 실제로 증명한다.
    const chips = screen.getByTestId('storefront-product-category-chips');
    await user.click(within(chips).getByRole('button', { name: '비료' }));
    await waitFor(() =>
      expect(onActiveCategoryChange).toHaveBeenLastCalledWith('비료'),
    );

    await user.click(screen.getByRole('button', { name: '안내' }));

    await waitFor(() => expect(onActiveCategoryChange).toHaveBeenLastCalledWith(''));
  });

  it('renders fine for shoppers, where nobody is listening', () => {
    expect(() =>
      render(<StorefrontView config={buildConfig()} productRows={PRODUCT_ROWS} />),
    ).not.toThrow();
  });
});
