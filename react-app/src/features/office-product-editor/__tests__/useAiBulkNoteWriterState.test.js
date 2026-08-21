import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAiBulkNoteWriterState } from '../hooks/ai-bulk-note/useAiBulkNoteWriterState';
import { analyzeAiBulkNoteMatches } from '../model/ai-bulk-note/aiBulkNoteAnalysisModel';
import { AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS } from '../model/ai-bulk-note/aiBulkNoteRequestBodyModel';
import { readWorkbookSheet } from '../services/workbookSheetReader';

vi.mock('../model/ai-bulk-note/aiBulkNoteAnalysisModel', () => ({
  analyzeAiBulkNoteMatches: vi.fn(),
}));

vi.mock('../services/workbookSheetReader', () => ({
  readWorkbookSheet: vi.fn(),
}));

const sampleMatches = [
  { rowId: 'A100__01', note: '보조 1500원' },
  { rowId: 'B200__01', note: '보조 1500원' },
];

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAiBulkNoteWriterState', () => {
  it('previews matches for an instruction without touching annotations', async () => {
    analyzeAiBulkNoteMatches.mockResolvedValue({ mode: 'openai', matches: sampleMatches, unmatchedReason: null });
    const updateNote = vi.fn();

    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', updateNote, vi.fn()));

    await act(async () => {
      await result.current.handlePreview("소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.mode).toBe('openai');
    expect(result.current.matches).toEqual(sampleMatches);
    expect(updateNote).not.toHaveBeenCalled();
  });

  it('exposes loading state while the preview request is pending', async () => {
    let resolvePromise;
    analyzeAiBulkNoteMatches.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn(), vi.fn()));

    act(() => {
      void result.current.handlePreview('조건');
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise({ mode: 'openai', matches: [], unmatchedReason: null });
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('calls updateNote once per match and clears the preview when applied', async () => {
    analyzeAiBulkNoteMatches.mockResolvedValue({ mode: 'openai', matches: sampleMatches, unmatchedReason: null });
    const updateNote = vi.fn();

    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', updateNote, vi.fn()));

    await act(async () => {
      await result.current.handlePreview('조건');
    });

    act(() => {
      result.current.handleApply();
    });

    expect(updateNote).toHaveBeenCalledTimes(2);
    expect(updateNote).toHaveBeenNthCalledWith(1, 'A100__01', '보조 1500원');
    expect(updateNote).toHaveBeenNthCalledWith(2, 'B200__01', '보조 1500원');
    expect(result.current.matches).toEqual([]);
    expect(result.current.appliedCount).toBe(2);
  });

  it('applies whichever price fields and note a match carries, calling only the setters for fields actually present', async () => {
    analyzeAiBulkNoteMatches.mockResolvedValue({
      mode: 'openai',
      matches: [
        { rowId: 'A100__01', zero_tax_price: 3000 },
        { rowId: 'B200__01', note: '가격 인상', tax_price: 3300, exempt_tax_price: 2900 },
      ],
      unmatchedReason: null,
    });
    const updateNote = vi.fn();
    const updatePrice = vi.fn();

    const { result } = renderHook(() =>
      useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', updateNote, updatePrice),
    );

    await act(async () => {
      await result.current.handlePreview('조건');
    });

    act(() => {
      result.current.handleApply();
    });

    expect(updateNote).toHaveBeenCalledTimes(1);
    expect(updateNote).toHaveBeenCalledWith('B200__01', '가격 인상');

    expect(updatePrice).toHaveBeenCalledTimes(3);
    expect(updatePrice).toHaveBeenCalledWith('A100__01', 'zero_tax_price', 3000);
    expect(updatePrice).toHaveBeenCalledWith('B200__01', 'tax_price', 3300);
    expect(updatePrice).toHaveBeenCalledWith('B200__01', 'exempt_tax_price', 2900);
    expect(result.current.appliedCount).toBe(2);
  });

  it('clears the preview without applying when handleClear is called', async () => {
    analyzeAiBulkNoteMatches.mockResolvedValue({ mode: 'openai', matches: sampleMatches, unmatchedReason: null });
    const updateNote = vi.fn();

    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', updateNote, vi.fn()));

    await act(async () => {
      await result.current.handlePreview('조건');
    });

    act(() => {
      result.current.handleClear();
    });

    expect(updateNote).not.toHaveBeenCalled();
    expect(result.current.matches).toEqual([]);
  });

  it('keeps only the result of the latest preview request when submitted twice quickly', async () => {
    let resolveFirst;
    let resolveSecond;
    analyzeAiBulkNoteMatches
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
      );

    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn(), vi.fn()));

    act(() => {
      void result.current.handlePreview('조건A');
      void result.current.handlePreview('조건B');
    });

    await act(async () => {
      resolveSecond({ mode: 'openai', matches: [{ rowId: 'B', note: 'B' }], unmatchedReason: null });
    });

    await act(async () => {
      resolveFirst({ mode: 'openai', matches: [{ rowId: 'A', note: 'A' }], unmatchedReason: null });
    });

    expect(result.current.matches).toEqual([{ rowId: 'B', note: 'B' }]);
  });

  it('rejects a file with a disallowed extension without parsing it', async () => {
    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn(), vi.fn()));

    await act(async () => {
      await result.current.handleUploadReferenceSheet({ name: 'ref.csv' });
    });

    expect(readWorkbookSheet).not.toHaveBeenCalled();
    expect(result.current.referenceSheet).toBeNull();
    expect(result.current.referenceSheetError).toBe('엑셀(.xlsx, .xls) 파일만 업로드할 수 있습니다.');
  });

  it('stores the parsed reference sheet on a valid upload', async () => {
    readWorkbookSheet.mockResolvedValue({
      sheetName: 'Sheet1',
      sheetRows: [
        ['product_name', 'price'],
        ['유기질비료', 15000],
      ],
    });
    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn(), vi.fn()));

    await act(async () => {
      await result.current.handleUploadReferenceSheet({ name: 'ref.xlsx' });
    });

    expect(result.current.referenceSheet).toEqual({
      fileName: 'ref.xlsx',
      sheetName: 'Sheet1',
      rows: [
        ['product_name', 'price'],
        ['유기질비료', 15000],
      ],
    });
    expect(result.current.referenceSheetError).toBeNull();
  });

  it('surfaces an error when the file cannot be parsed', async () => {
    readWorkbookSheet.mockRejectedValue(new Error('corrupt'));
    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn(), vi.fn()));

    await act(async () => {
      await result.current.handleUploadReferenceSheet({ name: 'ref.xlsx' });
    });

    expect(result.current.referenceSheet).toBeNull();
    expect(result.current.referenceSheetError).toBe('엑셀 파일을 읽을 수 없습니다.');
  });

  it('rejects a sheet with more than the max supported rows', async () => {
    readWorkbookSheet.mockResolvedValue({
      sheetName: 'Sheet1',
      sheetRows: Array.from({ length: AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS + 1 }, (_, i) => [`row-${i}`]),
    });
    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn(), vi.fn()));

    await act(async () => {
      await result.current.handleUploadReferenceSheet({ name: 'ref.xlsx' });
    });

    expect(result.current.referenceSheet).toBeNull();
    expect(result.current.referenceSheetError).toBe(
      `참고 엑셀은 ${AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS}행 이하만 지원합니다.`,
    );
  });

  it('replaces the reference sheet when a new file is uploaded', async () => {
    readWorkbookSheet
      .mockResolvedValueOnce({ sheetName: 'Sheet1', sheetRows: [['a']] })
      .mockResolvedValueOnce({ sheetName: 'Sheet2', sheetRows: [['b']] });
    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn(), vi.fn()));

    await act(async () => {
      await result.current.handleUploadReferenceSheet({ name: 'first.xlsx' });
    });
    await act(async () => {
      await result.current.handleUploadReferenceSheet({ name: 'second.xlsx' });
    });

    expect(result.current.referenceSheet).toEqual({
      fileName: 'second.xlsx',
      sheetName: 'Sheet2',
      rows: [['b']],
    });
  });

  it('clears the reference sheet on explicit removal', async () => {
    readWorkbookSheet.mockResolvedValue({ sheetName: 'Sheet1', sheetRows: [['a']] });
    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn(), vi.fn()));

    await act(async () => {
      await result.current.handleUploadReferenceSheet({ name: 'ref.xlsx' });
    });
    act(() => {
      result.current.handleRemoveReferenceSheet();
    });

    expect(result.current.referenceSheet).toBeNull();
  });

  it('keeps the reference sheet across handleClear and handleApply', async () => {
    readWorkbookSheet.mockResolvedValue({ sheetName: 'Sheet1', sheetRows: [['a']] });
    analyzeAiBulkNoteMatches.mockResolvedValue({ mode: 'openai', matches: sampleMatches, unmatchedReason: null });
    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn(), vi.fn()));

    await act(async () => {
      await result.current.handleUploadReferenceSheet({ name: 'ref.xlsx' });
    });
    await act(async () => {
      await result.current.handlePreview('조건');
    });
    act(() => {
      result.current.handleApply();
    });

    expect(result.current.referenceSheet).toEqual({
      fileName: 'ref.xlsx',
      sheetName: 'Sheet1',
      rows: [['a']],
    });

    act(() => {
      result.current.handleClear();
    });

    expect(result.current.referenceSheet).toEqual({
      fileName: 'ref.xlsx',
      sheetName: 'Sheet1',
      rows: [['a']],
    });
  });

  it('forwards the uploaded reference sheet on preview', async () => {
    readWorkbookSheet.mockResolvedValue({ sheetName: 'Sheet1', sheetRows: [['a']] });
    analyzeAiBulkNoteMatches.mockResolvedValue({ mode: 'openai', matches: [], unmatchedReason: null });
    const { result } = renderHook(() => useAiBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn(), vi.fn()));

    await act(async () => {
      await result.current.handleUploadReferenceSheet({ name: 'ref.xlsx' });
    });
    await act(async () => {
      await result.current.handlePreview('조건');
    });

    expect(analyzeAiBulkNoteMatches).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        referenceSheet: { sheetName: 'Sheet1', rows: [['a']] },
      }),
    );
  });
});
