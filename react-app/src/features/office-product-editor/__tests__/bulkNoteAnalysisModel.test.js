import { afterEach, describe, expect, it, vi } from 'vitest';

import { analyzeBulkNoteMatches } from '../model/bulk-note/bulkNoteAnalysisModel';
import { requestBulkNoteMatches } from '../services/bulk-note/bulkNoteClient';

vi.mock('../services/bulk-note/bulkNoteClient', () => ({
  requestBulkNoteMatches: vi.fn(),
}));

const sampleRows = [{ row_id: 'A100__01', product_name: '유기질비료', spec: '20kg' }];

afterEach(() => {
  vi.clearAllMocks();
});

describe('analyzeBulkNoteMatches', () => {
  it('serializes rows and returns the client result on success', async () => {
    requestBulkNoteMatches.mockResolvedValue({
      matches: [{ rowId: 'A100__01', note: '보조 1500원' }],
      unmatchedReason: null,
    });

    const result = await analyzeBulkNoteMatches(sampleRows, {
      officeCode: 'OFF-1',
      tableNameMode: 'fertilizer',
      instruction: "소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘",
    });

    expect(requestBulkNoteMatches).toHaveBeenCalledWith({
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
          tax_price: null,
          zero_tax_price: null,
          exempt_tax_price: null,
        },
      ],
    });
    expect(result.mode).toBe('openai');
    expect(result.matches).toEqual([{ rowId: 'A100__01', note: '보조 1500원' }]);
  });

  it('returns an idle result when instruction is empty', async () => {
    const result = await analyzeBulkNoteMatches(sampleRows, { officeCode: 'OFF-1', instruction: '' });

    expect(result.mode).toBe('idle');
    expect(result.matches).toEqual([]);
    expect(requestBulkNoteMatches).not.toHaveBeenCalled();
  });

  it('returns an idle result when there are no rows', async () => {
    const result = await analyzeBulkNoteMatches([], { officeCode: 'OFF-1', instruction: '조건' });

    expect(result.mode).toBe('idle');
    expect(requestBulkNoteMatches).not.toHaveBeenCalled();
  });

  it('returns an unavailable result when officeCode is empty', async () => {
    const result = await analyzeBulkNoteMatches(sampleRows, { officeCode: '', instruction: '조건' });

    expect(result.mode).toBe('unavailable');
    expect(requestBulkNoteMatches).not.toHaveBeenCalled();
  });

  it('returns an error result when the client fails', async () => {
    requestBulkNoteMatches.mockRejectedValue(new Error('일괄비고 작성 요청에 실패했습니다.'));

    const result = await analyzeBulkNoteMatches(sampleRows, { officeCode: 'OFF-1', instruction: '조건' });

    expect(result.mode).toBe('error');
    expect(result.matches).toEqual([]);
    expect(result.message).toBe('일괄비고 작성 요청에 실패했습니다.');
  });
});
