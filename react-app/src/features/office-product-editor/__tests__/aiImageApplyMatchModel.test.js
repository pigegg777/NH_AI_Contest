import { describe, expect, it } from 'vitest';

import { sanitizeAiImageApplyMatches } from '../model/ai-image-apply/aiImageApplyMatchModel';

describe('sanitizeAiImageApplyMatches', () => {
  it('normalizes row_ids that were actually sent', () => {
    const result = sanitizeAiImageApplyMatches(
      { row_ids: ['A100__01', 'B200__01'], unmatched_reason: null },
      ['A100__01', 'B200__01'],
    );

    expect(result).toEqual({
      rowIds: ['A100__01', 'B200__01'],
      unmatchedReason: null,
    });
  });

  it('drops a row_id not among the rows actually sent', () => {
    const result = sanitizeAiImageApplyMatches(
      { row_ids: ['A100__01', 'HALLUCINATED__99'], unmatched_reason: null },
      ['A100__01'],
    );

    expect(result.rowIds).toEqual(['A100__01']);
  });

  it('drops empty row_id entries', () => {
    const result = sanitizeAiImageApplyMatches(
      { row_ids: ['', 'A100__01'], unmatched_reason: null },
      ['A100__01'],
    );

    expect(result.rowIds).toEqual(['A100__01']);
  });

  it('dedupes duplicate row_ids', () => {
    const result = sanitizeAiImageApplyMatches(
      { row_ids: ['A100__01', 'A100__01'], unmatched_reason: null },
      ['A100__01'],
    );

    expect(result.rowIds).toEqual(['A100__01']);
  });

  it('defaults missing fields to safe empty values and carries through a Korean unmatched_reason', () => {
    expect(sanitizeAiImageApplyMatches({}, ['A100__01'])).toEqual({
      rowIds: [],
      unmatchedReason: null,
    });

    expect(
      sanitizeAiImageApplyMatches(
        { row_ids: [], unmatched_reason: '조건에 맞는 상품을 찾지 못했습니다.' },
        [],
      ),
    ).toEqual({
      rowIds: [],
      unmatchedReason: '조건에 맞는 상품을 찾지 못했습니다.',
    });
  });
});
