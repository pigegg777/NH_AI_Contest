import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBulkNoteWriterState } from '../hooks/bulk-note/useBulkNoteWriterState';
import { analyzeBulkNoteMatches } from '../model/bulk-note/bulkNoteAnalysisModel';

vi.mock('../model/bulk-note/bulkNoteAnalysisModel', () => ({
  analyzeBulkNoteMatches: vi.fn(),
}));

const sampleMatches = [
  { rowId: 'A100__01', note: '보조 1500원' },
  { rowId: 'B200__01', note: '보조 1500원' },
];

afterEach(() => {
  vi.clearAllMocks();
});

describe('useBulkNoteWriterState', () => {
  it('previews matches for an instruction without touching annotations', async () => {
    analyzeBulkNoteMatches.mockResolvedValue({ mode: 'openai', matches: sampleMatches, unmatchedReason: null });
    const updateNote = vi.fn();

    const { result } = renderHook(() => useBulkNoteWriterState('OFF-1', [], 'fertilizer', updateNote));

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
    analyzeBulkNoteMatches.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    const { result } = renderHook(() => useBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn()));

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
    analyzeBulkNoteMatches.mockResolvedValue({ mode: 'openai', matches: sampleMatches, unmatchedReason: null });
    const updateNote = vi.fn();

    const { result } = renderHook(() => useBulkNoteWriterState('OFF-1', [], 'fertilizer', updateNote));

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

  it('clears the preview without applying when handleClear is called', async () => {
    analyzeBulkNoteMatches.mockResolvedValue({ mode: 'openai', matches: sampleMatches, unmatchedReason: null });
    const updateNote = vi.fn();

    const { result } = renderHook(() => useBulkNoteWriterState('OFF-1', [], 'fertilizer', updateNote));

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
    analyzeBulkNoteMatches
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

    const { result } = renderHook(() => useBulkNoteWriterState('OFF-1', [], 'fertilizer', vi.fn()));

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
});
