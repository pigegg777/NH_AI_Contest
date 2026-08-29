import { describe, expect, it } from 'vitest';

import {
  addCartItemRef,
  buildCartDisplayItems,
  buildCartItemKey,
  isProductInCart,
  normalizeCartItemRefs,
  removeCartItemKeys,
} from '../model/cart/cartItemModel';

const PREVATON = {
  product_code: 'P-100',
  product_name: '프레바톤',
  spec: '500ml',
  large_category: '농약',
  medium_category: '살충제',
  tax_price: 32000,
};

const NO_CODE_ROW = {
  product_name: '복합비료',
  spec: '20kg',
  large_category: '비료',
  medium_category: '복합',
  zero_tax_price: 18000,
};

describe('buildCartItemKey', () => {
  it('uses product_code when the row has one', () => {
    expect(buildCartItemKey(PREVATON)).toBe('code:P-100');
  });

  it('falls back to product_name + spec when there is no code', () => {
    expect(buildCartItemKey(NO_CODE_ROW)).toBe('name:복합비료|20kg');
  });

  it('treats a missing spec as an empty spec so it stays matchable', () => {
    expect(buildCartItemKey({ product_name: '요소' })).toBe('name:요소|');
  });

  it('returns an empty key for a row it cannot identify', () => {
    expect(buildCartItemKey({})).toBe('');
    expect(buildCartItemKey(null)).toBe('');
  });

  it('trims surrounding whitespace so the same product is one key', () => {
    expect(buildCartItemKey({ product_code: '  P-100  ' })).toBe('code:P-100');
  });
});

describe('normalizeCartItemRefs', () => {
  it('keeps only identifiable refs', () => {
    expect(
      normalizeCartItemRefs([
        { product_code: 'P-1', product_name: '가', spec: '1' },
        { nonsense: true },
        null,
        '문자열',
      ]),
    ).toEqual([{ product_code: 'P-1', product_name: '가', spec: '1' }]);
  });

  it('drops duplicates that resolve to the same key', () => {
    expect(
      normalizeCartItemRefs([
        { product_code: 'P-1', product_name: '가', spec: '1' },
        { product_code: 'P-1', product_name: '가(이름만 다름)', spec: '1' },
      ]),
    ).toHaveLength(1);
  });

  it('returns an empty array for anything that is not an array', () => {
    expect(normalizeCartItemRefs(null)).toEqual([]);
    expect(normalizeCartItemRefs({})).toEqual([]);
  });
});

describe('addCartItemRef', () => {
  it('appends the minimum a ref needs to be found again', () => {
    expect(addCartItemRef([], PREVATON)).toEqual([
      { product_code: 'P-100', product_name: '프레바톤', spec: '500ml' },
    ]);
  });

  it('does not store price or category — those are read back from the rows', () => {
    const [ref] = addCartItemRef([], PREVATON);
    expect(ref).not.toHaveProperty('tax_price');
    expect(ref).not.toHaveProperty('large_category');
  });

  it('ignores a product already in the cart', () => {
    const refs = addCartItemRef([], PREVATON);
    expect(addCartItemRef(refs, PREVATON)).toBe(refs);
  });

  it('ignores a product it cannot identify', () => {
    expect(addCartItemRef([], {})).toEqual([]);
  });
});

describe('isProductInCart', () => {
  it('matches by the same key the ref was stored under', () => {
    const refs = addCartItemRef([], PREVATON);
    expect(isProductInCart(refs, PREVATON)).toBe(true);
    expect(isProductInCart(refs, NO_CODE_ROW)).toBe(false);
  });
});

describe('removeCartItemKeys', () => {
  it('removes every selected key at once', () => {
    const refs = addCartItemRef(addCartItemRef([], PREVATON), NO_CODE_ROW);
    expect(removeCartItemKeys(refs, [buildCartItemKey(PREVATON)])).toEqual([
      { product_name: '복합비료', spec: '20kg' },
    ]);
  });

  it('leaves the list alone when nothing is selected', () => {
    const refs = addCartItemRef([], PREVATON);
    expect(removeCartItemKeys(refs, [])).toBe(refs);
  });
});

describe('buildCartDisplayItems', () => {
  it('reads price and category back from the current rows, not from the ref', () => {
    const refs = addCartItemRef([], PREVATON);
    const [item] = buildCartDisplayItems(refs, [{ ...PREVATON, tax_price: 41000 }]);

    expect(item.isUnavailable).toBe(false);
    expect(item.productName).toBe('프레바톤');
    expect(item.spec).toBe('500ml');
    expect(item.largeCategory).toBe('농약');
    expect(item.mediumCategory).toBe('살충제');
    // 담을 때가 아니라 지금 행의 가격이 나온다
    expect(item.prices).toEqual([{ field: 'tax_price', label: '과세가격', value: '41,000원' }]);
  });

  it('lists every price the row carries, skipping empty ones', () => {
    const row = {
      ...PREVATON,
      tax_price: 32000,
      zero_tax_price: 30000,
      exempt_tax_price: null,
      price_subsidy: '',
    };
    const refs = addCartItemRef([], row);

    expect(buildCartDisplayItems(refs, [row]).at(0).prices.map((price) => price.field)).toEqual([
      'zero_tax_price',
      'tax_price',
    ]);
  });

  it('marks a ref whose product is gone as unavailable and keeps what it knows', () => {
    const refs = addCartItemRef([], PREVATON);
    const [item] = buildCartDisplayItems(refs, []);

    expect(item.isUnavailable).toBe(true);
    expect(item.productName).toBe('프레바톤');
    expect(item.spec).toBe('500ml');
    expect(item.prices).toEqual([]);
    expect(item.largeCategory).toBe('');
  });

  it('keeps the order the products were added in', () => {
    const refs = addCartItemRef(addCartItemRef([], PREVATON), NO_CODE_ROW);

    expect(
      buildCartDisplayItems(refs, [NO_CODE_ROW, PREVATON]).map((item) => item.productName),
    ).toEqual(['프레바톤', '복합비료']);
  });

  it('carries the key so the caller can select and remove', () => {
    const refs = addCartItemRef([], PREVATON);
    expect(buildCartDisplayItems(refs, [PREVATON]).at(0).key).toBe('code:P-100');
  });
});
