import { describe, expect, it } from 'vitest';

import { extractSalesPriceSheetData } from '../model/workbook-review/extraction/workbookExtractionModel';

describe('workbook extraction model', () => {
  it('extracts aggregated workbook rows from plain sheet rows', () => {
    const result = extractSalesPriceSheetData([
      ['판매가격조회출력'],
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
        '대분류',
        '중분류',
        '소분류',
        '세분류',
        '상품제조업체코드',
        '상품제조업체명',
      ],
      [
        1,
        '01',
        '조합원정상가',
        'P-001',
        '테스트비료',
        '중본-과세-수탁매취',
        '20kg',
        1000,
        '비료',
        '중분류A',
        '소분류A',
        '세분류A',
        'M-1',
        '제조사A',
      ],
      [
        2,
        '01',
        '조합원정상가',
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
    ]);

    expect(result.headerRowIndex).toBe(2);
    expect(result.dataStartRowIndex).toBe(3);
    expect(result.dataEndRowIndex).toBe(4);
    expect(result.warnings).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        row_id: 'P-001__01',
        product_code: 'P-001',
        product_name: '테스트비료',
        tax_price: 1000,
        zero_tax_price: 900,
        manufacturer_list: [
          { manufacturer_code: 'M-1', manufacturer_name: '제조사A' },
        ],
      }),
    ]);
  });
});
