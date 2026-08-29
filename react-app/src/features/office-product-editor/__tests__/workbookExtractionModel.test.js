import { describe, expect, it } from 'vitest';

import { extractSalesPriceSheetData } from '../model/excel-extraction/workbookExtractionModel';

describe('workbook extraction model', () => {
  it('extracts aggregated workbook rows from plain sheet rows', () => {
    const result = extractSalesPriceSheetData([
      ['판매가격조회출력'],
      [],
      [
        '번호',
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

  it('extracts duplicate 매출단가유형 columns as code and name separately', () => {
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

    expect(result.rows).toEqual([
      expect.objectContaining({
        row_id: 'P-001__01',
        product_code: 'P-001',
        product_name: '테스트비료',
        sale_price_type_code: '01',
        sale_price_type_name: '조합원정상가',
        tax_price: 1000,
        zero_tax_price: 900,
        manufacturer_list: [{ manufacturer_name: '제조사A' }],
      }),
    ]);
  });

  it('does not use 조합원정상가 as a hard-coded taxable price', () => {
    const result = extractSalesPriceSheetData([
      ['시설원예자재 재고조사표'],
      [],
      ['상품코드', '상품명', '상품구분', '규격', '조합원정상가'],
      ['8809925743298', '시설원예자재', '중본-과세-매취매취', null, '4,500'],
    ]);

    expect(result.warnings).toContain('필수 컬럼이 누락되었습니다: sale_price');
    expect(result.rows).toEqual([
      expect.objectContaining({
        product_code: '8809925743298',
        tax_price: null,
        warnings: ['매출단가를 숫자로 해석할 수 없는 행이 있습니다.'],
      }),
    ]);
  });
});

