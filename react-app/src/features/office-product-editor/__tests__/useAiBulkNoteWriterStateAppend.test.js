import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAiBulkNoteWriterState } from '../hooks/ai-bulk-note/useAiBulkNoteWriterState';
import { analyzeAiBulkNoteMatches } from '../model/ai-bulk-note/aiBulkNoteAnalysisModel';
import { fetchStaticProductLookup } from '../services/staticProductLookupService';

vi.mock('../model/ai-bulk-note/aiBulkNoteAnalysisModel', () => ({
  analyzeAiBulkNoteMatches: vi.fn(),
}));

vi.mock('../services/staticProductLookupService', () => ({
  fetchStaticProductLookup: vi.fn(),
}));

const sampleNewRow = {
  product_code: 'Z999',
  product_name: '새 상품',
  spec: '20kg',
  large_category: null,
  medium_category: null,
  small_category: null,
  detail_category: null,
  sale_price_type_code: '01',
  sale_price_type_name: '과세',
  note: '보조 1500원',
  zero_tax_price: null,
  tax_price: 12000,
  exempt_tax_price: null,
};

const existingRow = {
  row_id: 'A100__01',
  product_code: 'A100',
  product_name: '기존 비료',
  sale_price_type_code: '01',
  sale_price_type_name: '과세',
  note: '기존 비고',
  tax_price: 9000,
};

function createWriterOptions(overrides = {}) {
  return {
    officeCode: 'OFF-1',
    rows: [existingRow],
    tableNameMode: 'fertilizer',
    updateNote: vi.fn(),
    updatePrice: vi.fn(),
    appendRows: vi.fn(),
    patchRows: vi.fn(),
    ...overrides,
  };
}

function mockAppendResponse(newRows) {
  analyzeAiBulkNoteMatches.mockResolvedValue({
    mode: 'openai',
    action: 'append_rows',
    matches: [],
    newRows,
    unmatchedReason: null,
  });
}

const ADD_INSTRUCTION = '참고 엑셀 상품들 추가해줘';

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAiBulkNoteWriterState — 엑셀 기반 상품 추가', () => {
  it('classifies a product_code the table does not have as a new row', async () => {
    mockAppendResponse([sampleNewRow]);
    fetchStaticProductLookup.mockResolvedValue({ Z999: { product_code: 'Z999' } });

    const { result } = renderHook(() => useAiBulkNoteWriterState(createWriterOptions()));

    await act(async () => {
      await result.current.handlePreview(ADD_INSTRUCTION);
    });

    expect(result.current.action).toBe('append_rows');
    expect(result.current.rowPlanCount).toBe(1);
    expect(result.current.rowPlan.appended).toHaveLength(1);
    expect(result.current.rowPlan.appended[0].hasStaticData).toBe(true);
  });

  it('marks a product_code the static registry does not know', async () => {
    mockAppendResponse([sampleNewRow]);
    fetchStaticProductLookup.mockResolvedValue({});

    const { result } = renderHook(() => useAiBulkNoteWriterState(createWriterOptions()));

    await act(async () => {
      await result.current.handlePreview(ADD_INSTRUCTION);
    });

    expect(result.current.rowPlan.appended[0].hasStaticData).toBe(false);
  });

  it('appends new rows without touching the existing ones', async () => {
    mockAppendResponse([sampleNewRow]);
    fetchStaticProductLookup.mockResolvedValue({});

    const appendRows = vi.fn();
    const patchRows = vi.fn();
    const updateNote = vi.fn();
    const { result } = renderHook(() =>
      useAiBulkNoteWriterState(createWriterOptions({ appendRows, patchRows, updateNote })),
    );

    await act(async () => {
      await result.current.handlePreview(ADD_INSTRUCTION);
    });
    act(() => {
      result.current.handleApplyRowPlan({ includeConflicts: false });
    });

    expect(appendRows).toHaveBeenCalledWith([
      expect.objectContaining({
        row_id: 'Z999__01',
        product_code: 'Z999',
        is_ai_appended: true,
      }),
    ]);
    expect(patchRows).toHaveBeenCalledWith({});
    expect(updateNote).not.toHaveBeenCalled();
    expect(result.current.appliedSummary).toContain('1개 상품을 추가했습니다.');
  });

  it('reports a matching product_code as a conflict and leaves it alone until confirmed', async () => {
    mockAppendResponse([{ ...sampleNewRow, product_code: 'A100' }]);
    fetchStaticProductLookup.mockResolvedValue({});

    const patchRows = vi.fn();
    const updateNote = vi.fn();
    const updatePrice = vi.fn();
    const { result } = renderHook(() =>
      useAiBulkNoteWriterState(createWriterOptions({ patchRows, updateNote, updatePrice })),
    );

    await act(async () => {
      await result.current.handlePreview(ADD_INSTRUCTION);
    });

    expect(result.current.rowPlan.conflicting).toHaveLength(1);
    expect(result.current.rowPlan.appended).toEqual([]);

    act(() => {
      result.current.handleApplyRowPlan({ includeConflicts: false });
    });

    expect(patchRows).toHaveBeenCalledWith({});
    expect(updateNote).not.toHaveBeenCalled();
    expect(updatePrice).not.toHaveBeenCalled();
  });

  it('splits a confirmed update between the annotation layer and the row patch', async () => {
    mockAppendResponse([{ ...sampleNewRow, product_code: 'A100' }]);
    fetchStaticProductLookup.mockResolvedValue({});

    const patchRows = vi.fn();
    const updateNote = vi.fn();
    const updatePrice = vi.fn();
    const { result } = renderHook(() =>
      useAiBulkNoteWriterState(createWriterOptions({ patchRows, updateNote, updatePrice })),
    );

    await act(async () => {
      await result.current.handlePreview(ADD_INSTRUCTION);
    });
    act(() => {
      result.current.handleApplyRowPlan({ includeConflicts: true });
    });

    expect(updateNote).toHaveBeenCalledWith('A100__01', '보조 1500원');
    expect(updatePrice).toHaveBeenCalledWith('A100__01', 'tax_price', 12000);
    expect(patchRows).toHaveBeenCalledWith({
      A100__01: {
        product_name: '새 상품',
        spec: '20kg',
        sale_price_type_code: '01',
        sale_price_type_name: '과세',
      },
    });
  });

  it('only updates the ambiguous target rows the merchant ticked', async () => {
    mockAppendResponse([{ ...sampleNewRow, product_code: 'A100' }]);
    fetchStaticProductLookup.mockResolvedValue({});

    const secondRow = { ...existingRow, row_id: 'A100__02', sale_price_type_name: '영세' };
    const updateNote = vi.fn();
    const { result } = renderHook(() =>
      useAiBulkNoteWriterState(
        createWriterOptions({ rows: [existingRow, secondRow], updateNote }),
      ),
    );

    await act(async () => {
      await result.current.handlePreview(ADD_INSTRUCTION);
    });

    expect(result.current.rowPlan.ambiguous).toHaveLength(1);
    expect(result.current.rowPlan.conflicting).toEqual([]);

    act(() => {
      result.current.handleToggleAmbiguousTarget('A100', 'A100__02');
    });

    expect(result.current.selectedAmbiguousCount).toBe(1);

    act(() => {
      result.current.handleApplyRowPlan({ includeConflicts: true });
    });

    expect(updateNote).toHaveBeenCalledTimes(1);
    expect(updateNote).toHaveBeenCalledWith('A100__02', '보조 1500원');
  });

  it('does not build a row plan when the AI decided the request was an edit', async () => {
    analyzeAiBulkNoteMatches.mockResolvedValue({
      mode: 'openai',
      action: 'edit_rows',
      matches: [{ rowId: 'A100__01', note: '보조 1500원' }],
      newRows: [],
      unmatchedReason: null,
    });

    const { result } = renderHook(() => useAiBulkNoteWriterState(createWriterOptions()));

    await act(async () => {
      await result.current.handlePreview('비고 작성해줘');
    });

    expect(result.current.rowPlanCount).toBe(0);
    expect(result.current.matches).toHaveLength(1);
    expect(fetchStaticProductLookup).not.toHaveBeenCalled();
  });

  it('skips the static lookup for a custom table that has no static registry', async () => {
    mockAppendResponse([sampleNewRow]);

    const { result } = renderHook(() =>
      useAiBulkNoteWriterState(createWriterOptions({ tableNameMode: 'custom' })),
    );

    await act(async () => {
      await result.current.handlePreview(ADD_INSTRUCTION);
    });

    expect(fetchStaticProductLookup).not.toHaveBeenCalled();
    // Left unmarked rather than marked false, so the panel shows no badge.
    expect(result.current.rowPlan.appended[0].hasStaticData).toBeUndefined();
  });

  it('still previews an import when the category has no rows yet', async () => {
    mockAppendResponse([sampleNewRow]);
    fetchStaticProductLookup.mockResolvedValue({});

    const { result } = renderHook(() =>
      useAiBulkNoteWriterState(createWriterOptions({ rows: [] })),
    );

    await act(async () => {
      await result.current.handlePreview(ADD_INSTRUCTION);
    });

    expect(result.current.rowPlan.appended).toHaveLength(1);
  });

  it('clears the row plan on 취소', async () => {
    mockAppendResponse([sampleNewRow]);
    fetchStaticProductLookup.mockResolvedValue({});

    const { result } = renderHook(() => useAiBulkNoteWriterState(createWriterOptions()));

    await act(async () => {
      await result.current.handlePreview(ADD_INSTRUCTION);
    });
    act(() => {
      result.current.handleClear();
    });

    expect(result.current.rowPlanCount).toBe(0);
    expect(result.current.action).toBe('none');
  });
});
