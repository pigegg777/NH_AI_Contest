import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import StorefrontView from '../components/storefront-page/StorefrontView';

const PRODUCT_ROWS = [
  { product_category_name: '비료', product_name: '알파 비료', tax_price: 1000 },
];

const CONFIG = {
  pageConfig: { schemaVersion: 1 },
  navConfig: { title: '', subtitle: '' },
  categoryConfigs: [
    {
      productCategoryName: '비료',
      categoryConfig: {
        displayName: '비료',
        sourceCategoryName: '비료',
        cardDesign: { visibleFields: ['product_name', 'tax_price'] },
      },
    },
  ],
  hiddenProducts: [],
};

function renderView(navConfig) {
  render(
    <StorefrontView
      config={{ ...CONFIG, navConfig: { ...CONFIG.navConfig, ...navConfig } }}
      productRows={PRODUCT_ROWS}
      officeName="영농센터"
      nhName="발안농협"
    />,
  );
}

describe('hero page title', () => {
  it('falls back to the derived org line when no title is set', () => {
    renderView({});

    expect(
      screen.getByRole('heading', { name: '발안농협 영농센터 농자재 정보' }),
    ).toBeInTheDocument();
  });

  it('keeps the 농자재 정보 suffix in the fallback', () => {
    renderView({});

    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/농자재 정보$/);
  });

  it('uses the merchant title when one is set', () => {
    renderView({ title: '발안농협 봄맞이 자재전' });

    expect(
      screen.getByRole('heading', { name: '발안농협 봄맞이 자재전' }),
    ).toBeInTheDocument();
  });

  it('no longer renders the unused eyebrow line', () => {
    renderView({ title: '발안농협 봄맞이 자재전' });

    // The eyebrow used to show navConfig.title above the h1. The title now IS
    // the h1, so the same text must appear exactly once.
    expect(screen.getAllByText('발안농협 봄맞이 자재전')).toHaveLength(1);
  });
});
