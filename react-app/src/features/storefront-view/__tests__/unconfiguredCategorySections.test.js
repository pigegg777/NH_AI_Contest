import { describe, expect, it } from 'vitest';

import { buildSections } from '../model/storefront-config/sectionMatching';

const FERTILIZER_ROW = {
  product_category_name: '비료',
  product_name: '알파 비료',
  spec: '20kg',
  medium_category: '무기질비료',
  tax_price: 1000,
};

const NEW_CATEGORY_ROW = {
  product_category_name: '신규자재',
  product_name: '베타 자재',
  spec: '10kg',
  medium_category: '관수자재',
  zero_tax_price: 2000,
};

const FERTILIZER_CONFIG = {
  productCategoryName: '비료',
  categoryConfig: {
    displayName: '비료',
    sourceCategoryName: '비료',
    cardDesign: { visibleFields: ['product_name', 'tax_price'] },
  },
};

describe('buildSections with unconfigured categories', () => {
  it('still renders a category nobody has configured yet', () => {
    const sections = buildSections([FERTILIZER_CONFIG], [FERTILIZER_ROW, NEW_CATEGORY_ROW]);

    expect(sections.map((section) => section.productCategoryName)).toEqual([
      '비료',
      '신규자재',
    ]);
  });

  it('puts unconfigured categories after the configured ones', () => {
    const sections = buildSections([FERTILIZER_CONFIG], [NEW_CATEGORY_ROW, FERTILIZER_ROW]);

    // Row order does not decide it: configured categories keep their place so
    // saving a storefront never reshuffles what shoppers already know.
    expect(sections[0].productCategoryName).toBe('비료');
    expect(sections[1].productCategoryName).toBe('신규자재');
  });

  it('gives an unconfigured category every field its rows actually carry', () => {
    const [, newSection] = buildSections([FERTILIZER_CONFIG], [FERTILIZER_ROW, NEW_CATEGORY_ROW]);

    expect(newSection.fields).toContain('product_name');
    expect(newSection.fields).toContain('spec');
    expect(newSection.fields).toContain('zero_tax_price');
  });

  it('leaves a configured category on exactly the fields it was given', () => {
    const [fertilizer] = buildSections([FERTILIZER_CONFIG], [FERTILIZER_ROW, NEW_CATEGORY_ROW]);

    expect(fertilizer.fields).toEqual(['product_name', 'tax_price']);
  });

  it('titles an unconfigured category after the category name', () => {
    const [, newSection] = buildSections([FERTILIZER_CONFIG], [FERTILIZER_ROW, NEW_CATEGORY_ROW]);

    expect(newSection.title).toBe('신규자재');
    expect(newSection.cardStyle).toBeUndefined();
    expect(newSection.bodySlots).toBeUndefined();
  });

  it('renders every category when nothing is configured at all', () => {
    const sections = buildSections([], [FERTILIZER_ROW, NEW_CATEGORY_ROW]);

    expect(sections.map((section) => section.productCategoryName)).toEqual([
      '비료',
      '신규자재',
    ]);
  });

  it('lists a category once however many rows it has', () => {
    const sections = buildSections(
      [],
      [NEW_CATEGORY_ROW, { ...NEW_CATEGORY_ROW, product_name: '감마 자재' }],
    );

    expect(sections).toHaveLength(1);
    expect(sections[0].products).toHaveLength(2);
  });

  it('skips rows with no category name rather than making a blank section', () => {
    const sections = buildSections([], [{ product_name: '이름만 있는 행' }]);

    expect(sections).toEqual([]);
  });

  it('does not duplicate a category that is already configured', () => {
    const sections = buildSections([FERTILIZER_CONFIG], [FERTILIZER_ROW]);

    expect(sections).toHaveLength(1);
    expect(sections[0].fields).toEqual(['product_name', 'tax_price']);
  });

  it('drops a configured category once its products are all hidden', () => {
    // buildSections receives rows that already had hidden products filtered out,
    // so an emptied category should disappear rather than render an empty grid.
    const sections = buildSections([FERTILIZER_CONFIG], [NEW_CATEGORY_ROW]);

    expect(sections.map((section) => section.productCategoryName)).toEqual(['신규자재']);
  });
});
