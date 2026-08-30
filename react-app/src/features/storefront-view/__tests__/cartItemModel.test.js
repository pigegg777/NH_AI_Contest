import { describe, expect, it } from 'vitest';

import {
  addCartItemRef,
  buildCartDisplayItems,
  buildCartItemKey,
  isProductInCart,
  normalizeCartItemRefs,
  removeCartItemKeys,
  buildVisibleFieldsByCartKey,
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
    const currentRow = { ...PREVATON, product_category_name: '농약', tax_price: 41000 };
    const [item] = buildCartDisplayItems(
      refs,
      [currentRow],
      buildVisibleFieldsByCartKey(
        [
          {
            productCategoryName: '농약',
            categoryConfig: {
              displayName: '농약',
              sourceCategoryName: '농약',
              cardDesign: { visibleFields: ['product_name', 'tax_price'] },
            },
          },
        ],
        [currentRow],
      ),
    );

    expect(item.isUnavailable).toBe(false);
    expect(item.productName).toBe('프레바톤');
    expect(item.spec).toBe('500ml');
    expect(item.largeCategory).toBe('농약');
    expect(item.mediumCategory).toBe('살충제');
    // 담을 때가 아니라 지금 행의 가격이 나온다
    expect(item.prices).toEqual([{ field: 'tax_price', label: '과세가격', value: '41,000원' }]);
  });

  it('skips an exposed price whose value is empty', () => {
    const row = {
      ...PREVATON,
      product_category_name: '농약',
      tax_price: 32000,
      zero_tax_price: 30000,
      exempt_tax_price: null,
      price_subsidy: '',
    };
    const refs = addCartItemRef([], row);
    const lookup = buildVisibleFieldsByCartKey(
      [
        {
          productCategoryName: '농약',
          categoryConfig: {
            displayName: '농약',
            sourceCategoryName: '농약',
            cardDesign: {
              visibleFields: ['zero_tax_price', 'tax_price', 'exempt_tax_price', 'price_subsidy'],
            },
          },
        },
      ],
      [row],
    );

    expect(
      buildCartDisplayItems(refs, [row], lookup).at(0).prices.map((price) => price.field),
    ).toEqual(['zero_tax_price', 'tax_price']);
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

describe('노출하지 않기로 한 가격은 장바구니에도 나오지 않는다', () => {
  // 사장님이 카드에서 끈 가격이 장바구니로 새어 나오던 버그. 분류마다 노출
  // 설정이 다르므로, 뷰가 이미 만들어 둔 섹션에서 상품별 노출 필드를 읽는다.
  const categoryConfig = (name, visibleFields) => ({
    productCategoryName: name,
    categoryConfig: {
      displayName: name,
      sourceCategoryName: name,
      cardDesign: { visibleFields },
    },
  });

  const CATEGORY_CONFIGS = [
    categoryConfig('농약', ['product_name', 'spec', 'tax_price']),
    categoryConfig('비료', ['product_name', 'spec', 'zero_tax_price', 'exempt_tax_price']),
  ];
  // buildSections 는 product_category_name 으로 행을 분류에 붙인다.
  const PESTICIDE = { ...PREVATON, product_category_name: '농약' };
  const FERTILIZER = { ...NO_CODE_ROW, product_category_name: '비료' };
  const ALL_ROWS = [PESTICIDE, FERTILIZER];

  const pricesFor = (refs, rows, lookup) =>
    buildCartDisplayItems(refs, rows, lookup).map((item) => item.prices.map((price) => price.field));

  it('keeps a price the merchant chose to show', () => {
    const rows = [{ ...PESTICIDE, exempt_tax_price: 29000 }];
    const lookup = buildVisibleFieldsByCartKey(CATEGORY_CONFIGS, rows);

    expect(pricesFor([{ product_code: 'P-100' }], rows, lookup)).toEqual([['tax_price']]);
  });

  it('drops a price that is present in the data but turned off for that category', () => {
    // 데이터에는 면세가격이 있지만 농약 카드는 과세가격만 켜 두었다.
    const rows = [{ ...PESTICIDE, exempt_tax_price: 29000, price_subsidy: 1500 }];
    const lookup = buildVisibleFieldsByCartKey(CATEGORY_CONFIGS, rows);
    const [prices] = pricesFor([{ product_code: 'P-100' }], rows, lookup);

    expect(prices).not.toContain('exempt_tax_price');
    expect(prices).not.toContain('price_subsidy');
  });

  it('reads each category’s own setting rather than one shared list', () => {
    const rows = [PESTICIDE, { ...FERTILIZER, tax_price: 20000 }];
    const lookup = buildVisibleFieldsByCartKey(CATEGORY_CONFIGS, rows);
    const refs = [{ product_code: 'P-100' }, { product_name: '복합비료', spec: '20kg' }];

    expect(pricesFor(refs, rows, lookup)).toEqual([['tax_price'], ['zero_tax_price']]);
  });

  it('follows the card defaults when a category has no field setting saved', () => {
    // 사장님이 아직 설정하지 않은 분류에서 카드는 데이터에 있는 필드를 전부
    // 그린다(buildDefaultSection). 장바구니도 같아야 화면과 어긋나지 않는다 —
    // 여기서 DEFAULT_CARD_FIELDS 로 좁히면 카드에 보이는 가격이 장바구니에서
    // 사라진다.
    const rows = [{ ...PESTICIDE, zero_tax_price: 30000 }];
    const lookup = buildVisibleFieldsByCartKey([], rows);
    const [prices] = pricesFor([{ product_code: 'P-100' }], rows, lookup);

    expect(prices).toEqual(['zero_tax_price', 'tax_price']);
  });

  it('shows no price for a product that is not in any section', () => {
    // 어느 섹션에도 안 잡히면 손님 화면에 카드 자체가 없다. 노출 여부를 알 수
    // 없을 때 드러내는 쪽으로 기울면 지금 버그를 되풀이하게 된다.
    const lookup = buildVisibleFieldsByCartKey(CATEGORY_CONFIGS, ALL_ROWS);
    const hidden = { product_code: 'P-999', product_name: '숨김상품', tax_price: 5000 };

    expect(pricesFor([{ product_code: 'P-999' }], [hidden], lookup)).toEqual([[]]);
  });

  it('still labels and formats the prices it does keep', () => {
    const lookup = buildVisibleFieldsByCartKey(CATEGORY_CONFIGS, ALL_ROWS);
    const [item] = buildCartDisplayItems([{ product_code: 'P-100' }], [PESTICIDE], lookup);

    expect(item.prices[0].label).toBe('과세가격');
    expect(item.prices[0].value).toBeTruthy();
  });

  it('survives a missing lookup instead of crashing the cart', () => {
    expect(() => buildCartDisplayItems([{ product_code: 'P-100' }], [PREVATON])).not.toThrow();
    expect(() => buildVisibleFieldsByCartKey(null, null)).not.toThrow();
  });

  it('does not depend on which category the shopper is looking at', () => {
    // 이것이 원래 증상이다. 걸러진 목록으로 표를 만들면 지금 보고 있지 않은
    // 분류의 장바구니 항목에서 가격이 사라진다.
    const lookupFromEverything = buildVisibleFieldsByCartKey(CATEGORY_CONFIGS, ALL_ROWS);
    const refs = [{ product_name: '복합비료', spec: '20kg' }];

    expect(pricesFor(refs, ALL_ROWS, lookupFromEverything)).toEqual([['zero_tax_price']]);
    // 손님이 농약만 보고 있어도 비료 항목의 가격은 그대로여야 한다.
    expect(pricesFor(refs, ALL_ROWS, lookupFromEverything)).toEqual(
      pricesFor(refs, ALL_ROWS, buildVisibleFieldsByCartKey(CATEGORY_CONFIGS, [FERTILIZER])),
    );
  });
});
