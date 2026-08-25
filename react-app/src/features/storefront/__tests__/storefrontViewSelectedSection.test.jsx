import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import StorefrontView from '../components/storefront-page/StorefrontView';

const PRODUCT_ROWS = [
  {
    product_category_name: 'Fertilizer Upload',
    product_name: '알파 비료',
    medium_category: 'Premium',
    tax_price: 1000,
  },
  {
    product_category_name: 'Pesticide Upload',
    product_name: '베타 농약',
    medium_category: 'Leaf',
    zero_tax_price: 2000,
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
    {
      productCategoryName: 'Pesticide Upload',
      categoryConfig: {
        displayName: 'Pesticide Upload',
        sourceCategoryName: 'Pesticide Upload',
        cardDesign: { visibleFields: ['product_name', 'zero_tax_price'] },
      },
    },
  ],
  hiddenProducts: [],
};

function renderView(selectedSectionName) {
  return render(
    <StorefrontView
      config={CONFIG}
      productRows={PRODUCT_ROWS}
      officeName="테스트농협"
      nhName="테스트"
      selectedSectionName={selectedSectionName}
    />,
  );
}

function pressedCategoryChip() {
  const chips = screen.getByTestId('storefront-product-category-chips');

  return within(chips)
    .getAllByRole('button')
    .find((button) => button.getAttribute('aria-pressed') === 'true')?.textContent;
}

describe('StorefrontView selectedSectionName', () => {
  it('falls back to the first category when nothing is selected from outside', () => {
    renderView(undefined);

    expect(pressedCategoryChip()).toBe('Fertilizer Upload');
  });

  it('starts on the category the builder tab points at', () => {
    renderView('Pesticide Upload');

    expect(pressedCategoryChip()).toBe('Pesticide Upload');
  });

  it('follows the builder tab when it changes', () => {
    const { rerender } = renderView('Fertilizer Upload');

    expect(pressedCategoryChip()).toBe('Fertilizer Upload');

    rerender(
      <StorefrontView
        config={CONFIG}
        productRows={PRODUCT_ROWS}
        officeName="테스트농협"
        nhName="테스트"
        selectedSectionName="Pesticide Upload"
      />,
    );

    expect(pressedCategoryChip()).toBe('Pesticide Upload');
  });

  it('leaves the selection alone for the 공통 요소 tab, which sends an empty name', () => {
    const { rerender } = renderView('Pesticide Upload');

    expect(pressedCategoryChip()).toBe('Pesticide Upload');

    rerender(
      <StorefrontView
        config={CONFIG}
        productRows={PRODUCT_ROWS}
        officeName="테스트농협"
        nhName="테스트"
        selectedSectionName=""
      />,
    );

    expect(pressedCategoryChip()).toBe('Pesticide Upload');
  });

  it('still lets the shopper pick a category inside the preview', async () => {
    const user = userEvent.setup();

    renderView('Fertilizer Upload');

    const chips = screen.getByTestId('storefront-product-category-chips');
    await user.click(within(chips).getByRole('button', { name: 'Pesticide Upload' }));

    expect(pressedCategoryChip()).toBe('Pesticide Upload');
  });

  it('does not fight the shopper when the builder tab has not moved', async () => {
    const user = userEvent.setup();
    const { rerender } = renderView('Fertilizer Upload');

    const chips = screen.getByTestId('storefront-product-category-chips');
    await user.click(within(chips).getByRole('button', { name: 'Pesticide Upload' }));

    // Same tab still selected in the builder — a re-render must not snap the
    // preview back to it.
    rerender(
      <StorefrontView
        config={CONFIG}
        productRows={PRODUCT_ROWS}
        officeName="테스트농협"
        nhName="테스트"
        selectedSectionName="Fertilizer Upload"
      />,
    );

    expect(pressedCategoryChip()).toBe('Pesticide Upload');
  });
});
