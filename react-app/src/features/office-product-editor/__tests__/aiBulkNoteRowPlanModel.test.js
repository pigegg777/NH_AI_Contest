import { describe, expect, it, vi } from 'vitest';

import {
  buildAiBulkNoteRowPlan,
  countAiBulkNoteRowPlan,
  markAiBulkNoteRowPlanStaticData,
  splitAiBulkRowUpdate,
} from '../model/ai-bulk-note/aiBulkNoteRowPlanModel';

// Only the pure planning functions are exercised here; the mock keeps the
// supabase-backed lookup out of this suite.
vi.mock('../services/staticProductLookupService', () => ({
  fetchStaticProductLookup: vi.fn(),
}));

function buildNewRow(overrides = {}) {
  return {
    product_code: 'A100',
    product_name: '유기질비료',
    spec: '20kg',
    large_category: null,
    medium_category: null,
    small_category: null,
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

function buildExistingRow(overrides = {}) {
  return {
    row_id: 'A100__01',
    product_code: 'A100',
    product_name: '기존 비료',
    sale_price_type_code: '01',
    sale_price_type_name: '과세',
    tax_price: 9000,
    note: '기존 비고',
    ...overrides,
  };
}

describe('splitAiBulkRowUpdate', () => {
  it('routes note and prices to the annotation layer and the rest to the row patch', () => {
    const { annotationPatch, rowPatch } = splitAiBulkRowUpdate(
      buildNewRow({ note: '보조 1500원', product_name: '새 이름' }),
    );

    expect(annotationPatch).toEqual({ note: '보조 1500원', tax_price: 12000 });
    expect(rowPatch).toEqual({
      product_name: '새 이름',
      spec: '20kg',
      sale_price_type_code: '01',
      sale_price_type_name: '과세',
    });
  });

  it('omits every field the sheet left blank', () => {
    const { annotationPatch, rowPatch } = splitAiBulkRowUpdate({
      product_code: 'A100',
      product_name: null,
      tax_price: null,
      note: null,
    });

    expect(annotationPatch).toEqual({});
    expect(rowPatch).toEqual({});
  });
});

describe('buildAiBulkNoteRowPlan', () => {
  it('treats a product_code absent from the table as a new row', () => {
    const plan = buildAiBulkNoteRowPlan([buildNewRow({ product_code: 'Z999' })], [
      buildExistingRow(),
    ]);

    expect(plan.conflicting).toEqual([]);
    expect(plan.ambiguous).toEqual([]);
    expect(plan.appended).toHaveLength(1);
    expect(plan.appended[0].row).toMatchObject({
      row_id: 'Z999__01',
      product_code: 'Z999',
      is_ai_appended: true,
      tax_price: 12000,
    });
  });

  it('builds the row_id from the sale price type, matching the workbook rule', () => {
    const plan = buildAiBulkNoteRowPlan(
      [
        buildNewRow({ product_code: 'Z999', sale_price_type_code: null, sale_price_type_name: '면세' }),
        buildNewRow({ product_code: 'Y888', sale_price_type_code: null, sale_price_type_name: null }),
      ],
      [],
    );

    expect(plan.appended.map((entry) => entry.row.row_id)).toEqual([
      'Z999__면세',
      'Y888____missing_sale_price_type__',
    ]);
  });

  it('reports a single existing row with the same product_code as a conflict', () => {
    const existingRow = buildExistingRow();
    const plan = buildAiBulkNoteRowPlan([buildNewRow()], [existingRow]);

    expect(plan.appended).toEqual([]);
    expect(plan.ambiguous).toEqual([]);
    expect(plan.conflicting).toHaveLength(1);
    expect(plan.conflicting[0].targetRow).toBe(existingRow);
  });

  it('defers to the merchant when one product_code spans several rows', () => {
    const rows = [
      buildExistingRow({ row_id: 'A100__01', sale_price_type_name: '과세' }),
      buildExistingRow({ row_id: 'A100__02', sale_price_type_name: '영세' }),
    ];
    const plan = buildAiBulkNoteRowPlan([buildNewRow()], rows);

    expect(plan.conflicting).toEqual([]);
    expect(plan.ambiguous).toHaveLength(1);
    expect(plan.ambiguous[0].targetRows).toHaveLength(2);
  });

  it('skips a conflicting row that carries nothing to write', () => {
    const plan = buildAiBulkNoteRowPlan(
      [
        {
          product_code: 'A100',
          product_name: null,
          spec: null,
          sale_price_type_code: null,
          sale_price_type_name: null,
          note: null,
          tax_price: null,
          zero_tax_price: null,
          exempt_tax_price: null,
        },
      ],
      [buildExistingRow()],
    );

    expect(countAiBulkNoteRowPlan(plan)).toBe(0);
  });

  it('ignores existing rows that have no product_code of their own', () => {
    const plan = buildAiBulkNoteRowPlan([buildNewRow()], [
      { row_id: 'orphan', product_code: null },
    ]);

    expect(plan.appended).toHaveLength(1);
  });
});

describe('markAiBulkNoteRowPlanStaticData', () => {
  it('flags every entry by whether the static registry knows its product_code', () => {
    const plan = buildAiBulkNoteRowPlan(
      [buildNewRow({ product_code: 'Z999' }), buildNewRow({ product_code: 'Y888' })],
      [],
    );

    const marked = markAiBulkNoteRowPlanStaticData(plan, new Set(['Z999']));

    expect(marked.appended.map((entry) => entry.hasStaticData)).toEqual([true, false]);
  });
});
