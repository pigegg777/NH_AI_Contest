import { describe, expect, it } from 'vitest';

import { findMatchingProducts } from '../model/market-research/marketResearchProductMatchModel';

const rows = [
  { product_code: 'A100', product_name: '사과 부사', spec: '5kg', tax_price: 20000, zero_tax_price: 18000 },
  { product_code: 'B200', product_name: '배 신고', spec: '10kg', tax_price: 30000 },
  { product_code: 'C300', product_name: '사과 홍로', spec: '3kg', tax_price: null, zero_tax_price: 12000 },
];

describe('findMatchingProducts', () => {
  it('ranks rows whose product_name/spec overlap the query tokens highest', () => {
    const matches = findMatchingProducts(rows, '사과 부사 5kg');

    expect(matches[0]).toEqual({ productName: '사과 부사', spec: '5kg', priceKrw: 20000 });
  });

  it('falls back to zero_tax_price when tax_price is missing', () => {
    const matches = findMatchingProducts(rows, '사과 홍로');

    expect(matches[0]).toEqual({ productName: '사과 홍로', spec: '3kg', priceKrw: 12000 });
  });

  it('excludes rows with no token overlap', () => {
    const matches = findMatchingProducts(rows, '사과 부사 5kg');

    expect(matches.map((match) => match.productName)).not.toContain('배 신고');
  });

  it('returns an empty array for a blank query or missing rows', () => {
    expect(findMatchingProducts(rows, '')).toEqual([]);
    expect(findMatchingProducts(null, '사과')).toEqual([]);
  });

  it('caps results at the given limit', () => {
    const manyRows = Array.from({ length: 5 }, (_, i) => ({
      product_code: `X${i}`,
      product_name: '사과',
      spec: `${i}kg`,
      tax_price: 1000 + i,
    }));

    expect(findMatchingProducts(manyRows, '사과', { limit: 2 })).toHaveLength(2);
  });
});
