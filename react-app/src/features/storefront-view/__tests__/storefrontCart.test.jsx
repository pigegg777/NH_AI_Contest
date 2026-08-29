import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import StorefrontView from '../components/storefront-page/StorefrontView';

const PRODUCT_ROWS = [
  {
    product_category_name: '농약',
    product_code: 'P-100',
    product_name: '프레바톤',
    spec: '500ml',
    large_category: '농약',
    medium_category: '살충제',
    tax_price: 32000,
  },
  {
    product_category_name: '농약',
    product_code: 'P-200',
    product_name: '리도밀',
    spec: '1L',
    large_category: '농약',
    medium_category: '살균제',
    zero_tax_price: 18000,
  },
];

const CONFIG = {
  pageConfig: { nav: { title: '농협 상품안내' } },
  navConfig: { title: '농협 상품안내' },
  categoryConfigs: [],
  hiddenProducts: [],
};

function renderStorefront(props = {}) {
  return render(<StorefrontView config={CONFIG} productRows={PRODUCT_ROWS} {...props} />);
}

function cartProps(overrides = {}) {
  return {
    cartItemRefs: [],
    onAddToCart: vi.fn(),
    onRemoveCartItems: vi.fn(),
    ...overrides,
  };
}

describe('storefront cart — off by default', () => {
  it('renders no cart affordance when no cart handlers are passed', () => {
    renderStorefront();

    expect(screen.queryByTestId('storefront-cart-open')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /장바구니에 담기/ })).not.toBeInTheDocument();
  });

  it('keeps the builder preview free of the cart — the builder passes no handlers', () => {
    // 빌더는 PublicStorefrontScreen 을 통해 같은 화면을 그리지만 장바구니
    // prop 을 넘기지 않는다. 그 상태를 그대로 재현한다.
    renderStorefront({ selectedSectionName: '농약' });

    expect(screen.queryByTestId('storefront-cart-open')).not.toBeInTheDocument();
  });
});

describe('storefront cart — builder preview (isCartPreview)', () => {
  it('shows the buttons so the merchant sees what the shopper sees', () => {
    renderStorefront({ isCartPreview: true });

    expect(screen.getByTestId('storefront-cart-open')).toBeInTheDocument();
    // 카드 우하단이 가려지는 것을 사장님이 볼 수 있어야 한다
    expect(screen.getAllByTestId('storefront-cart-add')).toHaveLength(PRODUCT_ROWS.length);
  });

  it('does not gray the buttons out — the preview must look like the real page', () => {
    renderStorefront({ isCartPreview: true });

    // disabled 로 막으면 회색이 되어 실제와 다른 모습을 보여주게 된다
    screen.getAllByTestId('storefront-cart-add').forEach((button) => {
      expect(button).toBeEnabled();
    });
  });

  it('takes the buttons out of the tab order and hides them from screen readers', () => {
    renderStorefront({ isCartPreview: true });

    const openButton = screen.getByTestId('storefront-cart-open');

    expect(openButton).toHaveAttribute('tabindex', '-1');
    expect(openButton).toHaveAttribute('aria-hidden', 'true');
  });

  it('never opens the panel, so no shopper cart can build up in the builder', async () => {
    const user = userEvent.setup();
    renderStorefront({ isCartPreview: true });

    await user.click(screen.getByTestId('storefront-cart-open'), { pointerEventsCheck: 0 });

    expect(screen.queryByRole('dialog', { name: '장바구니' })).not.toBeInTheDocument();
  });
});

describe('storefront cart — adding', () => {
  it('shows an add button per product once handlers are passed', () => {
    renderStorefront(cartProps());

    expect(
      screen.getByRole('button', { name: '프레바톤 장바구니에 담기' }),
    ).toBeInTheDocument();
  });

  it('puts the add button last in the card, spanning its width', () => {
    renderStorefront(cartProps());

    const addButton = screen.getByRole('button', { name: '프레바톤 장바구니에 담기' });
    const card = addButton.closest('article');

    expect(card).not.toBeNull();
    // 상품명 줄에 있지 않다 — 이름 폭을 뺏지 않는다
    expect(screen.getByText('프레바톤').parentElement).not.toContainElement(addButton);
    // <article> 직속 마지막이라 sectionOrder / titleMode 와 무관하게 항상 있다
    expect(card.lastElementChild).toBe(addButton);
  });

  it('hands the whole product row to onAddToCart', async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();
    renderStorefront(cartProps({ onAddToCart }));

    await user.click(screen.getByRole('button', { name: '프레바톤 장바구니에 담기' }));

    expect(onAddToCart).toHaveBeenCalledTimes(1);
    expect(onAddToCart.mock.calls[0][0]).toMatchObject({ product_code: 'P-100' });
  });

  it('labels the button 담기, and 담김 once the product is in the cart', () => {
    renderStorefront(
      cartProps({ cartItemRefs: [{ product_code: 'P-100', product_name: '프레바톤', spec: '500ml' }] }),
    );

    expect(screen.getByRole('button', { name: '프레바톤 담김' })).toHaveTextContent(
      '장바구니에 담김',
    );
    expect(
      screen.getByRole('button', { name: '리도밀 장바구니에 담기' }),
    ).toHaveTextContent('장바구니 담기');
  });

  it('disables the button for a product already in the cart', () => {
    renderStorefront(
      cartProps({ cartItemRefs: [{ product_code: 'P-100', product_name: '프레바톤', spec: '500ml' }] }),
    );

    expect(screen.getByRole('button', { name: '프레바톤 담김' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '리도밀 장바구니에 담기' })).toBeEnabled();
  });
});

describe('storefront cart — where the open button sits', () => {
  it('keeps the open button outside the merchant-configurable header', () => {
    renderStorefront(cartProps());

    const openButton = screen.getByTestId('storefront-cart-open');

    expect(openButton.closest('header')).toBeNull();
    expect(screen.getByTestId('storefront-search')).not.toContainElement(openButton);
  });

  it('stays reachable when the merchant turned the search box off', () => {
    render(
      <StorefrontView
        config={{
          ...CONFIG,
          pageConfig: { ...CONFIG.pageConfig, searchSection: { enabled: false } },
        }}
        productRows={PRODUCT_ROWS}
        {...cartProps()}
      />,
    );

    expect(screen.queryByTestId('storefront-search')).not.toBeInTheDocument();
    // 헤더 구성과 무관하게 자리를 지킨다
    expect(screen.getByTestId('storefront-cart-open')).toBeInTheDocument();
  });
});

describe('storefront cart — panel', () => {
  it('shows the count on the open button and lists what was added', async () => {
    const user = userEvent.setup();
    renderStorefront(
      cartProps({ cartItemRefs: [{ product_code: 'P-100', product_name: '프레바톤', spec: '500ml' }] }),
    );

    const openButton = screen.getByTestId('storefront-cart-open');
    expect(openButton).toHaveTextContent('1');

    await user.click(openButton);

    const dialog = screen.getByRole('dialog', { name: '장바구니' });
    expect(within(dialog).getByText('프레바톤')).toBeInTheDocument();
    expect(within(dialog).getByText('500ml')).toBeInTheDocument();
    expect(within(dialog).getByText('농약 · 살충제')).toBeInTheDocument();
    expect(within(dialog).getByText('32,000원')).toBeInTheDocument();
    expect(within(dialog).getByText('과세가격')).toBeInTheDocument();
  });

  it('reads the current price back, not the price at the time it was added', async () => {
    const user = userEvent.setup();
    render(
      <StorefrontView
        config={CONFIG}
        productRows={[{ ...PRODUCT_ROWS[0], tax_price: 41000 }, PRODUCT_ROWS[1]]}
        {...cartProps({
          cartItemRefs: [{ product_code: 'P-100', product_name: '프레바톤', spec: '500ml' }],
        })}
      />,
    );

    await user.click(screen.getByTestId('storefront-cart-open'));

    expect(
      within(screen.getByRole('dialog', { name: '장바구니' })).getByText('41,000원'),
    ).toBeInTheDocument();
  });

  it('keeps a product that is gone, dimmed and marked 판매 종료', async () => {
    const user = userEvent.setup();
    renderStorefront(
      cartProps({
        cartItemRefs: [{ product_code: 'P-999', product_name: '단종된 약', spec: '2L' }],
      }),
    );

    await user.click(screen.getByTestId('storefront-cart-open'));

    const dialog = screen.getByRole('dialog', { name: '장바구니' });
    expect(within(dialog).getByText('단종된 약')).toBeInTheDocument();
    expect(within(dialog).getByText('판매 종료')).toBeInTheDocument();
    expect(within(dialog).getByRole('listitem')).toHaveAttribute('data-unavailable', 'true');
  });

  it('shows an empty message when nothing is in the cart', async () => {
    const user = userEvent.setup();
    renderStorefront(cartProps());

    await user.click(screen.getByTestId('storefront-cart-open'));

    expect(screen.getByTestId('storefront-cart-empty')).toBeInTheDocument();
  });
});

describe('storefront cart — 선택 삭제', () => {
  it('removes only the checked items and nothing else', async () => {
    const user = userEvent.setup();
    const onRemoveCartItems = vi.fn();
    renderStorefront(
      cartProps({
        onRemoveCartItems,
        cartItemRefs: [
          { product_code: 'P-100', product_name: '프레바톤', spec: '500ml' },
          { product_code: 'P-200', product_name: '리도밀', spec: '1L' },
        ],
      }),
    );

    await user.click(screen.getByTestId('storefront-cart-open'));

    const dialog = screen.getByRole('dialog', { name: '장바구니' });
    await user.click(within(dialog).getAllByRole('checkbox')[0]);
    await user.click(within(dialog).getByRole('button', { name: /선택 삭제/ }));

    expect(onRemoveCartItems).toHaveBeenCalledWith(['code:P-100']);
  });

  it('keeps the remove button disabled until something is checked', async () => {
    const user = userEvent.setup();
    renderStorefront(
      cartProps({ cartItemRefs: [{ product_code: 'P-100', product_name: '프레바톤', spec: '500ml' }] }),
    );

    await user.click(screen.getByTestId('storefront-cart-open'));

    const dialog = screen.getByRole('dialog', { name: '장바구니' });
    expect(within(dialog).getByRole('button', { name: /선택 삭제/ })).toBeDisabled();

    await user.click(within(dialog).getByRole('checkbox'));
    expect(within(dialog).getByRole('button', { name: /선택 삭제/ })).toBeEnabled();
  });
});
