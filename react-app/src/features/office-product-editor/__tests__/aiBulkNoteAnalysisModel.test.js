import { afterEach, describe, expect, it, vi } from 'vitest';

import { analyzeAiBulkNoteMatches } from '../model/ai-bulk-note/aiBulkNoteAnalysisModel';
import { requestAiBulkNoteMatches } from '../services/ai-bulk-note/aiBulkNoteClient';

vi.mock('../services/ai-bulk-note/aiBulkNoteClient', () => ({
  requestAiBulkNoteMatches: vi.fn(),
}));

const sampleRows = [{ row_id: 'A100__01', product_name: '유기질비료', spec: '20kg' }];

afterEach(() => {
  vi.clearAllMocks();
});

describe('analyzeAiBulkNoteMatches', () => {
  it('serializes rows and returns the client result on success', async () => {
    requestAiBulkNoteMatches.mockResolvedValue({
      matches: [{ rowId: 'A100__01', note: '보조 1500원' }],
      unmatchedReason: null,
    });

    const result = await analyzeAiBulkNoteMatches(sampleRows, {
      officeCode: 'OFF-1',
      tableNameMode: 'fertilizer',
      instruction: "소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘",
    });

    expect(requestAiBulkNoteMatches).toHaveBeenCalledWith({
      officeCode: 'OFF-1',
      tableNameMode: 'fertilizer',
      instruction: "소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘",
      rows: [
        {
          row_id: 'A100__01',
          product_name: '유기질비료',
          spec: '20kg',
          medium_category: '',
          small_category: '',
          detail_category: '',
          product_category: '',
          note: '',
          shadow: false,
          tax_price: null,
          zero_tax_price: null,
          exempt_tax_price: null,
        },
      ],
      referenceSheet: null,
    });
    expect(result.mode).toBe('openai');
    expect(result.matches).toEqual([{ rowId: 'A100__01', note: '보조 1500원' }]);
  });

  it('forwards the reference sheet to the client when provided', async () => {
    requestAiBulkNoteMatches.mockResolvedValue({ matches: [], unmatchedReason: null });
    const referenceSheet = { sheetName: 'Sheet1', rows: [['product_name'], ['유기질비료']] };

    await analyzeAiBulkNoteMatches(sampleRows, {
      officeCode: 'OFF-1',
      tableNameMode: 'fertilizer',
      instruction: '조건',
      referenceSheet,
    });

    expect(requestAiBulkNoteMatches).toHaveBeenCalledWith(
      expect.objectContaining({ referenceSheet }),
    );
  });

  it('extracts a non-standard reference sheet locally for a clear add instruction', async () => {
    const result = await analyzeAiBulkNoteMatches([], {
      officeCode: 'OFF-1',
      tableNameMode: 'custom',
      instruction: '이 엑셀 상품을 전부 추가해줘',
      referenceSheet: {
        sheetName: 'Sheet0',
        rows: [
          ['재고조사표'],
          ['기준일자 : 2025-11-14'],
          ['상품코드', '상품명', '규격'],
          ['8809925743298', '3발괭이', '24'],
        ],
      },
    });

    expect(result).toMatchObject({
      mode: 'local',
      action: 'append_rows',
      newRows: [
        expect.objectContaining({
          product_code: '8809925743298',
          product_name: '3발괭이',
          spec: '24',
        }),
      ],
    });
    expect(requestAiBulkNoteMatches).not.toHaveBeenCalled();
  });

  it('maps an explicitly requested 조합원정상가 column locally to avoid a large AI response', async () => {
    requestAiBulkNoteMatches.mockResolvedValue({
      action: 'append_rows',
      matches: [],
      newRows: [],
      unmatchedReason: null,
    });
    const referenceSheet = {
      sheetName: 'Sheet0',
      rows: [
        ['상품코드', '상품명', '상품구분', '조합원정상가'],
        ['P-001', '테스트비료', '중본-과세-매취', 4500],
      ],
    };

    const result = await analyzeAiBulkNoteMatches([], {
      officeCode: 'OFF-1',
      tableNameMode: 'fertilizer',
      instruction: '엑셀 상품을 추가하고 조합원정상가를 가격으로 사용해줘',
      referenceSheet,
    });

    expect(result).toMatchObject({
      mode: 'local',
      action: 'append_rows',
      newRows: [expect.objectContaining({ product_code: 'P-001', tax_price: 4500 })],
    });
    expect(requestAiBulkNoteMatches).not.toHaveBeenCalled();
  });

  it('maps the only sale-price-like column locally for a generic AI registration request', async () => {
    const result = await analyzeAiBulkNoteMatches([], {
      officeCode: 'OFF-1',
      tableNameMode: 'custom',
      instruction: '이 엑셀 데이터 AI 등록해줘',
      referenceSheet: {
        sheetName: 'Sheet0',
        rows: [
          ['상품코드', '상품명', '상품구분', '입고금액', '출고금액', '조합원정상가'],
          ['P-001', '테스트비료', '중본-과세-매취', 10000, 5000, 4500],
        ],
      },
    });

    expect(result).toMatchObject({
      mode: 'local',
      action: 'append_rows',
      newRows: [expect.objectContaining({ product_code: 'P-001', tax_price: 4500 })],
    });
    expect(requestAiBulkNoteMatches).not.toHaveBeenCalled();
  });

  it('returns an idle result when instruction is empty', async () => {
    const result = await analyzeAiBulkNoteMatches(sampleRows, { officeCode: 'OFF-1', instruction: '' });

    expect(result.mode).toBe('idle');
    expect(result.matches).toEqual([]);
    expect(requestAiBulkNoteMatches).not.toHaveBeenCalled();
  });

  it('returns an idle result when there are no rows', async () => {
    const result = await analyzeAiBulkNoteMatches([], { officeCode: 'OFF-1', instruction: '조건' });

    expect(result.mode).toBe('idle');
    expect(requestAiBulkNoteMatches).not.toHaveBeenCalled();
  });

  it('returns an unavailable result when officeCode is empty', async () => {
    const result = await analyzeAiBulkNoteMatches(sampleRows, { officeCode: '', instruction: '조건' });

    expect(result.mode).toBe('unavailable');
    expect(requestAiBulkNoteMatches).not.toHaveBeenCalled();
  });

  it('returns an error result when the client fails', async () => {
    requestAiBulkNoteMatches.mockRejectedValue(new Error('일괄비고 작성 요청에 실패했습니다.'));

    const result = await analyzeAiBulkNoteMatches(sampleRows, { officeCode: 'OFF-1', instruction: '조건' });

    expect(result.mode).toBe('error');
    expect(result.matches).toEqual([]);
    expect(result.message).toBe('일괄비고 작성 요청에 실패했습니다.');
  });
});
