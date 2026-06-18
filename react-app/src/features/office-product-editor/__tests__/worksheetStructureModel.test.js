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
      product_code: 3,
      product_name: 4,
      product_type: 5,
      sale_price: 7,
      sale_price_type_code: 1,
      sale_price_type_name: 2,
    });
    expect(result.warnings).toEqual([]);
  });
});

