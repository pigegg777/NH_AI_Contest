import { describe, expect, it } from 'vitest';

import { buildAggregatedWorksheetRows } from '../model/excel-extraction/worksheetRowsModel';

const COLUMN_MAP = {
  sale_price_type_name: 0,
  sale_price_type_code: 1,
  product_code: 2,
  product_name: 3,
  product_type: 4,
  spec: 5,
  sale_price: 6,
  large_category: 7,
  medium_category: 8,
  small_category: 9,
  detail_category: 10,
  manufacturer_code: 11,
  manufacturer_name: 12,
};

describe('worksheet rows model', () => {
  it('normalizes and aggregates workbook rows from the detected columns', () => {
    const rows = buildAggregatedWorksheetRows(
      [
        [
          '조합원정상가',
          null,
          ' P-001 ',
          ' 테스트비료 ',
          '중본-과세-수탁매취',
          '20kg',
          '1,000',
          '비료',
          '중분류A',
          '소분류A',
          '세분류A',
          'M-1',
          '제조사A',
        ],
        ['조합원정상가', null, null, null, '', '', '', null, null, null, null, null, null],
        [
          '조합원정상가',
          null,
          'P-001',
          '테스트비료',
          '중본-영세-수탁매취',
          '20kg',
          900,
          '비료',
          '중분류A',
          '소분류A',
          '세분류A',
          'M-1',
          '제조사A',
        ],
      ],
      { columnMap: COLUMN_MAP, dataStartRowIndex: 0, dataEndRowIndex: 2 },
    );

    expect(rows).toEqual([
      expect.objectContaining({
        row_id: 'P-001__조합원정상가',
        product_code: 'P-001',
        product_name: '테스트비료',
        sale_price_type_name: '조합원정상가',
        tax_price: 1000,
        zero_tax_price: 900,
        manufacturer_list: [{ manufacturer_name: '제조사A' }],
      }),
    ]);
  });

  it('flags conflicting price candidates with the actual values', () => {
    const rows = buildAggregatedWorksheetRows(
      [
        ['조합원정상가', '02', 'P-002', '테스트농약', '기본-과세-출하매출', '10kg', 1000],
        ['조합원정상가', '02', 'P-002', '테스트농약', '기본-과세-출하매출', '10kg', 1100],
      ],
      { columnMap: COLUMN_MAP, dataStartRowIndex: 0, dataEndRowIndex: 1 },
    );

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

  it('aggregates 면세 price candidates into exempt_tax_price', () => {
    const rows = buildAggregatedWorksheetRows(
      [
        [
          '조합원정상가',
          '01',
          'P-003',
          '테스트비료',
          '중본-면세-수탁매취',
          '20kg',
          800,
          '비료',
          '중분류A',
          '소분류A',
          '세분류A',
        ],
      ],
      { columnMap: COLUMN_MAP, dataStartRowIndex: 0, dataEndRowIndex: 0 },
    );

    expect(rows).toEqual([
      expect.objectContaining({
        row_id: 'P-003__01',
        product_code: 'P-003',
        exempt_tax_price: 800,
        tax_price: null,
        zero_tax_price: null,
      }),
    ]);
  });
});
