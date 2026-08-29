import { describe, expect, it } from 'vitest';

import {
  applyAiBulkRowDrafts,
  buildAiBulkRowId,
  createEmptyAiBulkRowDrafts,
  hasAiBulkRowDrafts,
} from '../model/ai-bulk-row-draft/aiBulkRowDraftModel';
import {
  normalizeAppendedRow,
  readStoredAiBulkRowDrafts,
  sanitizeAiBulkRowDrafts,
  writeStoredAiBulkRowDrafts,
} from '../model/ai-bulk-row-draft/aiBulkRowDraftStorageModel';

function createStorage() {
  const store = new Map();

  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    store,
  };
}

describe('buildAiBulkRowId', () => {
  it('prefers the sale price type code, then its name, then a fixed token', () => {
    expect(buildAiBulkRowId({ product_code: 'A100', sale_price_type_code: '01' })).toBe('A100__01');
    expect(buildAiBulkRowId({ product_code: 'A100', sale_price_type_name: '과세' })).toBe('A100__과세');
    expect(buildAiBulkRowId({ product_code: 'A100' })).toBe('A100____missing_sale_price_type__');
  });

  it('returns an empty id without a product_code', () => {
    expect(buildAiBulkRowId({ sale_price_type_code: '01' })).toBe('');
  });
});

describe('applyAiBulkRowDrafts', () => {
  const rows = [
    { row_id: 'A100__01', product_code: 'A100', product_name: '기존', spec: '20kg' },
    { row_id: 'B200__01', product_code: 'B200', product_name: '다른 상품' },
  ];

  it('returns the original array when there are no drafts', () => {
    expect(applyAiBulkRowDrafts(rows, createEmptyAiBulkRowDrafts())).toBe(rows);
  });

  it('merges a patch onto the matching row and leaves the others alone', () => {
    const result = applyAiBulkRowDrafts(rows, {
      appended: {},
      patched: { A100__01: { product_name: '갱신된 이름' } },
    });

    expect(result[0]).toEqual({
      row_id: 'A100__01',
      product_code: 'A100',
      product_name: '갱신된 이름',
      spec: '20kg',
    });
    expect(result[1]).toBe(rows[1]);
  });

  it('appends drafted rows after the workbook rows', () => {
    const appendedRow = normalizeAppendedRow({ row_id: 'Z999__01', product_code: 'Z999' });
    const result = applyAiBulkRowDrafts(rows, {
      appended: { Z999__01: appendedRow },
      patched: {},
    });

    expect(result).toHaveLength(3);
    expect(result[2]).toBe(appendedRow);
  });

  it('lets a real workbook row win over an appended draft with the same row_id', () => {
    const result = applyAiBulkRowDrafts(rows, {
      appended: {
        A100__01: normalizeAppendedRow({ row_id: 'A100__01', product_code: 'A100' }),
      },
      patched: {},
    });

    expect(result).toHaveLength(2);
    expect(result[0].is_ai_appended).toBeUndefined();
  });
});

describe('hasAiBulkRowDrafts', () => {
  it('is false only when both buckets are empty', () => {
    expect(hasAiBulkRowDrafts(createEmptyAiBulkRowDrafts())).toBe(false);
    expect(hasAiBulkRowDrafts({ appended: { a: {} }, patched: {} })).toBe(true);
    expect(hasAiBulkRowDrafts({ appended: {}, patched: { a: {} } })).toBe(true);
  });
});

describe('normalizeAppendedRow', () => {
  it('fills the shape the review table expects', () => {
    const row = normalizeAppendedRow({
      row_id: 'Z999__01',
      product_code: 'Z999',
      product_name: '  새 상품  ',
      tax_price: 12000,
      zero_tax_price: 'nope',
    });

    expect(row).toMatchObject({
      row_id: 'Z999__01',
      product_code: 'Z999',
      product_name: '새 상품',
      is_ai_appended: true,
      note: '',
      tax_price: 12000,
      zero_tax_price: null,
      product_type_variants: [],
      manufacturer_list: null,
      warnings: expect.arrayContaining([
        'AI로 신규 등록한 데이터입니다. 저장 전에 내용을 확인해 주세요.',
        '단가유형이 없어 확인이 필요합니다.',
      ]),
    });
  });

  it('adds actionable warnings when required AI-created row values are missing', () => {
    const row = normalizeAppendedRow({
      row_id: 'Z999____missing_sale_price_type__',
      product_code: 'Z999',
    });

    expect(row.warnings).toEqual([
      'AI로 신규 등록한 데이터입니다. 저장 전에 내용을 확인해 주세요.',
      '상품명이 없어 확인이 필요합니다.',
      '단가유형이 없어 확인이 필요합니다.',
      '판매단가가 없어 확인이 필요합니다.',
    ]);
  });

  it('rejects a row missing either identifier', () => {
    expect(normalizeAppendedRow({ product_code: 'Z999' })).toBeNull();
    expect(normalizeAppendedRow({ row_id: 'Z999__01' })).toBeNull();
  });
});

describe('ai bulk row draft storage', () => {
  it('round-trips drafts through storage', () => {
    const storage = createStorage();
    const drafts = {
      appended: {
        Z999__01: normalizeAppendedRow({ row_id: 'Z999__01', product_code: 'Z999' }),
      },
      patched: { A100__01: { product_name: '갱신' } },
    };

    writeStoredAiBulkRowDrafts(storage, 'fingerprint-1', drafts);

    expect(readStoredAiBulkRowDrafts(storage, 'fingerprint-1')).toEqual(
      sanitizeAiBulkRowDrafts(drafts),
    );
  });

  it('removes the entry instead of storing an empty draft', () => {
    const storage = createStorage();

    writeStoredAiBulkRowDrafts(storage, 'fingerprint-1', { appended: { a: 1 }, patched: {} });
    writeStoredAiBulkRowDrafts(storage, 'fingerprint-1', createEmptyAiBulkRowDrafts());

    expect(storage.store.size).toBe(0);
  });

  it('discards a stored payload from another version or malformed json', () => {
    const storage = createStorage();

    storage.setItem('excel-review:ai-bulk-rows:fingerprint-1', JSON.stringify({ version: 99 }));
    expect(readStoredAiBulkRowDrafts(storage, 'fingerprint-1')).toEqual(
      createEmptyAiBulkRowDrafts(),
    );

    storage.setItem('excel-review:ai-bulk-rows:fingerprint-1', '{not json');
    expect(readStoredAiBulkRowDrafts(storage, 'fingerprint-1')).toEqual(
      createEmptyAiBulkRowDrafts(),
    );
  });

  it('drops a patch whose keys are not patchable fields', () => {
    const sanitized = sanitizeAiBulkRowDrafts({
      appended: {},
      patched: { A100__01: { note: '비고', img_url: 'https://x' } },
    });

    expect(sanitized.patched).toEqual({});
  });
});
