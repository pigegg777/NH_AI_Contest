import { describe, expect, it } from 'vitest';

import { aggregateWorksheetRows } from '../model/extraction/worksheetAggregationModel';

describe('worksheet aggregation model', () => {
  it('aggregates normalized rows into workbook review rows', () => {
    const rows = aggregateWorksheetRows([
      {
        product_code: 'P-001',
        product_name: '테스트비료',
        sale_price_type_code: '01',
        sale_price_type_name: '조합원정상가',
        product_type: '중본-과세-수탁매취',
        sale_price: 1000,
        spec: '20kg',
        large_category: '비료',
        medium_category: '중분류A',
        small_category: '소분류A',
        detail_category: '세분류A',
        manufacturer_code: 'M-1',
        manufacturer_name: '제조사A',
      },
      {
        product_code: 'P-001',
        product_name: '테스트비료',
        sale_price_type_code: '01',
        sale_price_type_name: '조합원정상가',
        product_type: '중본-영세-수탁매취',
        sale_price: 900,
        spec: '20kg',
        large_category: '비료',
        medium_category: '중분류A',
        small_category: '소분류A',
        detail_category: '세분류A',
        manufacturer_code: 'M-1',
        manufacturer_name: '제조사A',
      },
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        row_id: 'P-001__01',
        product_code: 'P-001',
        sale_price_type_code: '01',
        tax_price: 1000,
        zero_tax_price: 900,
        manufacturer_list: [{ manufacturer_code: 'M-1', manufacturer_name: '제조사A' }],
      }),
    ]);
  });

  it('flags conflicting price candidates with the actual values', () => {
    const rows = aggregateWorksheetRows([
      {
        product_code: 'P-002',
        product_name: '테스트농약',
        sale_price_type_code: '02',
        sale_price_type_name: '조합원정상가',
        product_type: '기본-과세-출하매출',
        sale_price: 1000,
        spec: '10kg',
      },
      {
        product_code: 'P-002',
        product_name: '테스트농약',
        sale_price_type_code: '02',
        sale_price_type_name: '조합원정상가',
        product_type: '기본-과세-출하매출',
        sale_price: 1100,
        spec: '10kg',
      },
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        row_id: 'P-002__02',
        product_code: 'P-002',
        tax_price: null,
        warnings: expect.arrayContaining([
          '과세 매출단가가 1000원, 1100원으로 서로 달라 어떤 값이 맞는지 확인이 필요합니다.',
        ]),
      }),
    ]);
  });
});

