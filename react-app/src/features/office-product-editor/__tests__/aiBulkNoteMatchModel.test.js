import { describe, expect, it } from 'vitest';

import { sanitizeAiBulkNoteMatches } from '../model/ai-bulk-note/aiBulkNoteMatchModel';

describe('sanitizeAiBulkNoteMatches', () => {
  it('normalizes matches whose row_id was actually sent', () => {
    const result = sanitizeAiBulkNoteMatches(
      { matches: [{ row_id: 'A100__01', note: '보조 1500원' }], unmatched_reason: null },
      ['A100__01', 'B200__01'],
    );

    expect(result).toEqual({
      matches: [{ rowId: 'A100__01', note: '보조 1500원' }],
      unmatchedReason: null,
    });
  });

  it('drops a match whose row_id was not among the rows actually sent', () => {
    const result = sanitizeAiBulkNoteMatches(
      {
        matches: [
          { row_id: 'A100__01', note: '보조 1500원' },
          { row_id: 'HALLUCINATED__99', note: '보조 1500원' },
        ],
        unmatched_reason: null,
      },
      ['A100__01'],
    );

    expect(result.matches).toEqual([{ rowId: 'A100__01', note: '보조 1500원' }]);
  });

  it('drops matches missing a row_id or note', () => {
    const result = sanitizeAiBulkNoteMatches(
      {
        matches: [
          { row_id: '', note: '보조 1500원' },
          { row_id: 'A100__01', note: '' },
        ],
        unmatched_reason: null,
      },
      ['A100__01'],
    );

    expect(result.matches).toEqual([]);
  });

  it('truncates a note longer than 300 characters', () => {
    const longNote = 'x'.repeat(400);

    const result = sanitizeAiBulkNoteMatches(
      { matches: [{ row_id: 'A100__01', note: longNote }], unmatched_reason: null },
      ['A100__01'],
    );

    expect(result.matches[0].note).toHaveLength(300);
  });

  it('includes a price field on its own when the instruction only targets a price', () => {
    const result = sanitizeAiBulkNoteMatches(
      { matches: [{ row_id: 'A100__01', note: null, zero_tax_price: 3000, tax_price: null, exempt_tax_price: null }], unmatched_reason: null },
      ['A100__01'],
    );

    expect(result.matches).toEqual([{ rowId: 'A100__01', zero_tax_price: 3000 }]);
  });

  it('includes note and multiple price fields together when the instruction targets all of them', () => {
    const result = sanitizeAiBulkNoteMatches(
      {
        matches: [
          {
            row_id: 'A100__01',
            note: '가격 인상',
            zero_tax_price: 3000,
            tax_price: 3300,
            exempt_tax_price: null,
          },
        ],
        unmatched_reason: null,
      },
      ['A100__01'],
    );

    expect(result.matches).toEqual([
      { rowId: 'A100__01', note: '가격 인상', zero_tax_price: 3000, tax_price: 3300 },
    ]);
  });

  it('drops a match with a row_id but no note and no price field set', () => {
    const result = sanitizeAiBulkNoteMatches(
      {
        matches: [
          { row_id: 'A100__01', note: null, zero_tax_price: null, tax_price: null, exempt_tax_price: null },
        ],
        unmatched_reason: null,
      },
      ['A100__01'],
    );

    expect(result.matches).toEqual([]);
  });

  it('ignores a non-numeric price value', () => {
    const result = sanitizeAiBulkNoteMatches(
      { matches: [{ row_id: 'A100__01', note: null, zero_tax_price: 'not-a-number' }], unmatched_reason: null },
      ['A100__01'],
    );

    expect(result.matches).toEqual([]);
  });

  it('defaults missing fields to safe empty values and carries through a Korean unmatched_reason', () => {
    expect(sanitizeAiBulkNoteMatches({}, ['A100__01'])).toEqual({
      matches: [],
      unmatchedReason: null,
    });

    expect(
      sanitizeAiBulkNoteMatches(
        { matches: [], unmatched_reason: '조건에 맞는 상품을 찾지 못했습니다.' },
        [],
      ),
    ).toEqual({
      matches: [],
      unmatchedReason: '조건에 맞는 상품을 찾지 못했습니다.',
    });
  });
});
