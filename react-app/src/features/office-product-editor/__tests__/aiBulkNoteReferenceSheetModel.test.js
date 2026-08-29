import { describe, expect, it } from 'vitest';

import {
  extractRecognizedReferenceSheetRows,
  isReferenceSheetAppendInstruction,
  requiresAiPriceColumnMapping,
} from '../model/ai-bulk-note/aiBulkNoteReferenceSheetModel';

const inventorySheet = {
  sheetName: 'Sheet0',
  rows: [
    ['31-6151 재고조사표(과세구분별상품조회내역)'],
    ['기준일자 : 2025-11-14 | 사업장코드 : 8808990141848'],
    [
      '번호', '상품코드', '상품명', '상품구분', '규격', '위치번호',
      '대분류', '중분류', '소분류', '세분류', '입고수량', '입고금액',
      '출고수량', '출고금액', '현재고수량', '조합원정상가',
    ],
    [
      1, '8809925743298', '3발괭이/미니쇠스랑', '중본-과세-매취매취', '24', '24',
      '[305] 시설원예자재', '[031] 온라인자재', '[001] 소농기구', '[002] 괭이류',
      22, 58200, 8, 17460, 14, 4500,
    ],
    [
      2, '미상', '코드 없는 상품', '자체-과세-매취', null, '24',
      '[305] 시설원예자재', null, null, null, 1, 1000, 0, 0, 1, 1000,
    ],
  ],
};

describe('aiBulkNoteReferenceSheetModel', () => {
  it('detects a header below report title rows and maps only recognized columns', () => {
    expect(extractRecognizedReferenceSheetRows(inventorySheet)).toEqual([
      expect.objectContaining({
        product_code: '8809925743298',
        product_name: '3발괭이/미니쇠스랑',
        spec: '24',
        large_category: '시설원예자재',
        medium_category: '온라인자재',
        small_category: '소농기구',
        detail_category: '괭이류',
        sale_price_type_name: '중본-과세-매취매취',
        tax_price: 4500,
        zero_tax_price: null,
        exempt_tax_price: null,
      }),
    ]);
  });

  it('returns no rows when product-code and product-name headers cannot be found', () => {
    expect(extractRecognizedReferenceSheetRows({ rows: [['제목'], ['값']] })).toEqual([]);
  });

  it('uses local extraction only for clear add or register instructions', () => {
    expect(isReferenceSheetAppendInstruction('이 엑셀 상품을 전부 추가해줘')).toBe(true);
    expect(isReferenceSheetAppendInstruction('엑셀 데이터를 신규 등록해줘')).toBe(true);
    expect(isReferenceSheetAppendInstruction('기존 상품 가격만 수정해줘')).toBe(false);
  });

  it('uses AI mapping only when multiple sale-price-like headers remain ambiguous', () => {
    expect(requiresAiPriceColumnMapping({
      rows: [
        ['상품코드', '상품명', '상품구분', '조합원공급액', '특판단가'],
        ['P-001', '테스트비료', '중본-과세-매취', 4500, 4000],
      ],
    })).toBe(true);

    expect(requiresAiPriceColumnMapping(inventorySheet)).toBe(false);
    expect(
      requiresAiPriceColumnMapping(
        inventorySheet,
        '조합원 정상가를 가격으로 인식하고 데이터를 추가해줘',
      ),
    ).toBe(false);
  });

  it('uses an explicitly named price-like header without making it a fixed alias', () => {
    expect(
      extractRecognizedReferenceSheetRows(
        inventorySheet,
        '조합원 정상가를 가격으로 인식하고 데이터를 추가해줘',
      ),
    ).toEqual([
      expect.objectContaining({
        product_code: '8809925743298',
        tax_price: 4500,
      }),
    ]);
  });

  it('selects one unambiguous sale-price-like header while ignoring inventory amounts', () => {
    expect(extractRecognizedReferenceSheetRows(inventorySheet)).toEqual([
      expect.objectContaining({
        product_code: '8809925743298',
        tax_price: 4500,
      }),
    ]);
    expect(requiresAiPriceColumnMapping(inventorySheet)).toBe(false);
  });
});
