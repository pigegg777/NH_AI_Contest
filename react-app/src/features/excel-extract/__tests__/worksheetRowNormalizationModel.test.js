import { describe, expect, it } from 'vitest';

import { normalizeWorksheetRows } from '../model/extraction/worksheetRowNormalizationModel';

describe('worksheet row normalization model', () => {
  it('normalizes workbook rows using the detected column map', () => {
    const rows = normalizeWorksheetRows(
      [
        ['헤더'],
        [],
        [
          '번호',
          '매출단가유형',
          '매출단가유형',
          '상품코드',
          '상품명',
          '상품구분',
          '규격',
          '매출단가',
          '상품제조업체코드',
          '상품제조업체명',
        ],
        [1, '01', '조합원정상가', ' P-001 ', ' 테스트비료 ', '중본-과세-수탁매취', '20kg', '1,000', 'M-1', '제조사A'],
        [2, '01', '조합원정상가', null, null, '', '', '', null, null],
      ],
      {
        product_code: 3,
        product_name: 4,
        product_type: 5,
        spec: 6,
        sale_price: 7,
        manufacturer_code: 8,
        manufacturer_name: 9,
        sale_price_type_code: 1,
        sale_price_type_name: 2,
      },
      3,
      4,
    );

    expect(rows).toEqual([
      expect.objectContaining({
        source_row_index: 3,
        product_code: 'P-001',
        product_name: '테스트비료',
        sale_price: 1000,
        manufacturer_code: 'M-1',
        manufacturer_name: '제조사A',
      }),
    ]);
  });
});

