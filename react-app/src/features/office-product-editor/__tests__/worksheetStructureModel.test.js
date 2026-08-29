import { describe, expect, it } from 'vitest';

import { analyzeWorksheetStructure } from '../model/excel-extranction/worksheetStructureModel';

describe('worksheet structure model', () => {
  it('detects header row, column map, data range, and warnings', () => {
    const result = analyzeWorksheetStructure([
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
      ],
      [1, '조합원정상가', 'P-001', '테스트비료', '중본-과세-수탁매취', '20kg', 1000],
      [2, '조합원정상가', 'P-001', '테스트비료', '중본-영세-수탁매취', '20kg', 900],
      [],
      [],
    ]);

    expect(result.headerRowIndex).toBe(2);
    expect(result.dataStartRowIndex).toBe(3);
    expect(result.dataEndRowIndex).toBe(4);
    expect(result.columnMap).toMatchObject({
      product_code: 2,
      product_name: 3,
      product_type: 4,
      sale_price: 6,
      sale_price_type_name: 1,
    });
    expect(result).not.toHaveProperty('headerScore');
    expect(result.warnings).toEqual([]);
  });

  it('prefers the actual worksheet header over a guide row that only lists known labels', () => {
    const result = analyzeWorksheetStructure([
      ['판매가격조회출력'],
      [
        '상품코드',
        '상품명',
        '상품구분',
        '매출단가',
        '규격',
        '대분류',
        '중분류',
        '소분류',
        '세분류',
        '상품제조업체코드',
        '상품제조업체명',
        '매출단가유형',
      ],
      [
        '번호',
        '매출단가유형',
        '상품코드',
        '상품명',
        '상품구분',
        '규격',
        '매출단가',
      ],
      [1, '조합원정상가', 'P-001', '테스트비료', '중본-과세-수탁매취', '20kg', 1000],
      [2, '조합원정상가', 'P-002', '테스트비료2', '중본-영세-수탁매취', '10kg', 900],
      [],
      [],
    ]);

    expect(result.headerRowIndex).toBe(2);
    expect(result.dataStartRowIndex).toBe(3);
    expect(result.dataEndRowIndex).toBe(4);
    expect(result.columnMap).toMatchObject({
      product_code: 2,
      product_name: 3,
      product_type: 4,
      sale_price: 6,
      sale_price_type_name: 1,
    });
  });

  it('detects the header row even when the worksheet intro is longer than ten rows', () => {
    const result = analyzeWorksheetStructure([
      ['판매가격조회출력'],
      ['출력일시', '2026-06-27'],
      ['조회조건'],
      ['조합', '본점'],
      ['단가유형', '전체'],
      ['상품구분', '전체'],
      ['대분류', '전체'],
      ['중분류', '전체'],
      ['소분류', '전체'],
      ['세분류', '전체'],
      ['비고', '없음'],
      [
        '번호',
        '매출단가유형',
        '상품코드',
        '상품명',
        '상품구분',
        '규격',
        '매출단가',
      ],
      [1, '조합원정상가', 'P-001', '테스트비료', '중본-과세-수탁매취', '20kg', 1000],
      [2, '조합원정상가', 'P-002', '테스트비료2', '중본-영세-수탁매취', '10kg', 900],
      [],
      [],
    ]);

    expect(result.headerRowIndex).toBe(11);
    expect(result.dataStartRowIndex).toBe(12);
    expect(result.dataEndRowIndex).toBe(13);
    expect(result.columnMap).toMatchObject({
      product_code: 2,
      product_name: 3,
      product_type: 4,
      sale_price: 6,
      sale_price_type_name: 1,
    });
    expect(result.warnings).toEqual([]);
  });

  it('maps duplicate 매출단가유형 headers to code first and name second', () => {
    const result = analyzeWorksheetStructure([
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
      ],
      [1, '01', '조합원정상가', 'P-001', '테스트비료', '중본-과세-수탁매취', '20kg', 1000],
      [2, '01', '조합원정상가', 'P-001', '테스트비료', '중본-영세-수탁매취', '20kg', 900],
      [],
      [],
    ]);

    expect(result.headerRowIndex).toBe(2);
    expect(result.dataStartRowIndex).toBe(3);
    expect(result.dataEndRowIndex).toBe(4);
    expect(result.columnMap).toMatchObject({
      sale_price_type_code: 1,
      sale_price_type_name: 2,
      product_code: 3,
      product_name: 4,
      product_type: 5,
      sale_price: 7,
    });
    expect(result.warnings).toEqual([]);
  });

  it('does not hard-code 조합원정상가 as the sale price column', () => {
    const result = analyzeWorksheetStructure([
      ['시설원예자재 재고조사표'],
      [],
      ['상품코드', '상품명', '상품구분', '규격', '조합원정상가'],
      ['8809925743298', '시설원예자재', '중본-과세-매취매취', null, 4500],
      [],
      [],
    ]);

    expect(result.headerRowIndex).toBe(2);
    expect(result.columnMap.sale_price).toBeUndefined();
    expect(result.warnings).toContain('필수 컬럼이 누락되었습니다: sale_price');
  });
});

