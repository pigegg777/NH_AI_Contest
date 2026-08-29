import { describe, expect, it } from 'vitest';

import {
  readAiBulkNoteAction,
  sanitizeAiBulkNoteNewRows,
} from '../model/ai-bulk-note/aiBulkNoteNewRowModel';

function buildRawRow(overrides = {}) {
  return {
    product_code: 'A100',
    product_name: '유기질비료',
    spec: '20kg',
    large_category: null,
    medium_category: '비료',
    small_category: '가축분퇴비',
    detail_category: null,
    sale_price_type_code: '01',
    sale_price_type_name: '과세',
    note: null,
    zero_tax_price: null,
    tax_price: 12000,
    exempt_tax_price: null,
    ...overrides,
  };
}

describe('readAiBulkNoteAction', () => {
  it('passes through the three known actions', () => {
    expect(readAiBulkNoteAction({ action: 'edit_rows' })).toBe('edit_rows');
    expect(readAiBulkNoteAction({ action: 'append_rows' })).toBe('append_rows');
    expect(readAiBulkNoteAction({ action: 'none' })).toBe('none');
  });

  it('falls back to none for a missing or unknown action', () => {
    expect(readAiBulkNoteAction(null)).toBe('none');
    expect(readAiBulkNoteAction({})).toBe('none');
    expect(readAiBulkNoteAction({ action: 'delete_everything' })).toBe('none');
  });
});

describe('sanitizeAiBulkNoteNewRows', () => {
  it('returns nothing unless the action is append_rows', () => {
    const payload = { action: 'edit_rows', new_rows: [buildRawRow()] };

    expect(sanitizeAiBulkNoteNewRows(payload)).toEqual([]);
    expect(sanitizeAiBulkNoteNewRows({ ...payload, action: 'none' })).toEqual([]);
  });

  it('normalizes a mapped row and keeps the values the sheet supplied', () => {
    const [row] = sanitizeAiBulkNoteNewRows({
      action: 'append_rows',
      new_rows: [buildRawRow()],
    });

    expect(row).toEqual({
      product_code: 'A100',
      product_name: '유기질비료',
      spec: '20kg',
      large_category: null,
      medium_category: '비료',
      small_category: '가축분퇴비',
      detail_category: null,
      sale_price_type_code: '01',
      sale_price_type_name: '과세',
      note: null,
      zero_tax_price: null,
      tax_price: 12000,
      exempt_tax_price: null,
    });
  });

  it('drops rows without a product_code', () => {
    const rows = sanitizeAiBulkNoteNewRows({
      action: 'append_rows',
      new_rows: [
        buildRawRow({ product_code: null }),
        buildRawRow({ product_code: '   ' }),
        buildRawRow({ product_code: 'B200' }),
      ],
    });

    expect(rows.map((row) => row.product_code)).toEqual(['B200']);
  });

  it('drops rows whose product code is only an unknown label', () => {
    const rows = sanitizeAiBulkNoteNewRows({
      action: 'append_rows',
      new_rows: [
        buildRawRow({ product_code: '미상' }),
        buildRawRow({ product_code: '확인불가' }),
        buildRawRow({ product_code: '-' }),
        buildRawRow({ product_code: '8809144656218' }),
      ],
    });

    expect(rows.map((row) => row.product_code)).toEqual(['8809144656218']);
  });

  it('turns unknown optional text labels into null', () => {
    const [row] = sanitizeAiBulkNoteNewRows({
      action: 'append_rows',
      new_rows: [
        buildRawRow({
          product_name: '확인불가',
          spec: '미상',
          medium_category: 'unknown',
          note: '-',
        }),
      ],
    });

    expect(row).toMatchObject({
      product_name: null,
      spec: null,
      medium_category: null,
      note: null,
    });
  });

  it('keeps the first row when a product_code repeats', () => {
    const rows = sanitizeAiBulkNoteNewRows({
      action: 'append_rows',
      new_rows: [
        buildRawRow({ product_name: '먼저' }),
        buildRawRow({ product_name: '나중' }),
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].product_name).toBe('먼저');
  });

  it('turns non-numeric prices into null and caps the note', () => {
    const [row] = sanitizeAiBulkNoteNewRows({
      action: 'append_rows',
      new_rows: [
        buildRawRow({
          tax_price: '12,000원',
          zero_tax_price: Number.NaN,
          note: 'x'.repeat(400),
        }),
      ],
    });

    expect(row.tax_price).toBeNull();
    expect(row.zero_tax_price).toBeNull();
    expect(row.note).toHaveLength(300);
  });

  it('tolerates a missing or non-array new_rows field', () => {
    expect(sanitizeAiBulkNoteNewRows({ action: 'append_rows' })).toEqual([]);
    expect(sanitizeAiBulkNoteNewRows({ action: 'append_rows', new_rows: 'nope' })).toEqual([]);
  });
});
