import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAiSimilarityExtractionState } from '../hooks/ai-similarity-extraction/useAiSimilarityExtractionState';
import { analyzeAiSimilarityExtractionMatches } from '../model/ai-similarity-extraction/aiSimilarityExtractionAnalysisModel';

vi.mock('../model/ai-similarity-extraction/aiSimilarityExtractionAnalysisModel', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    analyzeAiSimilarityExtractionMatches: vi.fn(),
  };
});

const mergedRows = [
  { row_id: 'A100__01', product_code: 'A100', product_name: 'Alpha Fertilizer' },
  { row_id: 'B200__02', product_code: 'B200', product_name: 'Beta Pesticide' },
];

const mockRecommendation = {
  id: 'rec-1',
  groupType: 'same_product',
  title: '가격 확인',
  reason: '이전 가격이 현재 값보다 더 높습니다',
  relatedRowIds: ['B200__02'],
};

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

beforeEach(() => {
  globalThis.sessionStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAiSimilarityExtractionState', () => {
  it('analyzes exactly the merged rows and officeCode it was given', async () => {
    analyzeAiSimilarityExtractionMatches.mockResolvedValue({
      mode: 'openai',
      recommendations: [mockRecommendation],
    });

    const { result } = renderHook(() =>
      useAiSimilarityExtractionState(
        mergedRows,
        'workbook-a',
        'OFF-1',
        'fertilizer',
      ),
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(analyzeAiSimilarityExtractionMatches).toHaveBeenCalledWith(mergedRows, {
      officeCode: 'OFF-1',
      tableNameMode: 'fertilizer',
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.analysisMode).toBe('openai');
    expect(result.current.recommendations).toEqual([mockRecommendation]);
  });

  it('exposes loading state while the AI analysis request is pending', async () => {
    const deferred = createDeferred();

    analyzeAiSimilarityExtractionMatches.mockReturnValue(deferred.promise);

    const { result } = renderHook(() =>
      useAiSimilarityExtractionState(
        mergedRows,
        'workbook-a',
        'OFF-1',
        'fertilizer',
      ),
    );

    act(() => {
      void result.current.handleAnalyze();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      deferred.resolve({
        mode: 'openai',
        recommendations: [mockRecommendation],
      });
      await deferred.promise;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.recommendations).toEqual([mockRecommendation]);
  });

  it('ignores duplicate analyze requests while a request is already running', async () => {
    const deferred = createDeferred();

    analyzeAiSimilarityExtractionMatches.mockReturnValue(deferred.promise);

    const { result } = renderHook(() =>
      useAiSimilarityExtractionState(
        mergedRows,
        'workbook-a',
        'OFF-1',
        'fertilizer',
      ),
    );

    act(() => {
      void result.current.handleAnalyze();
      void result.current.handleAnalyze();
    });

    expect(analyzeAiSimilarityExtractionMatches).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve({
        mode: 'openai',
        recommendations: [mockRecommendation],
      });
      await deferred.promise;
    });
  });

  it('toggles the active recommendation', async () => {
    analyzeAiSimilarityExtractionMatches.mockResolvedValue({
      mode: 'openai',
      recommendations: [mockRecommendation],
    });

    const { result } = renderHook(() =>
      useAiSimilarityExtractionState(
        mergedRows,
        'workbook-a',
        'OFF-1',
        'fertilizer',
      ),
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });

    act(() => {
      result.current.handleRecommendationSelect('rec-1');
    });

    expect(result.current.activeRecommendationId).toBe('rec-1');

    act(() => {
      result.current.handleRecommendationSelect('rec-1');
    });

    expect(result.current.activeRecommendationId).toBe(null);
  });

  it('resets state when the workbook fingerprint changes', async () => {
    analyzeAiSimilarityExtractionMatches.mockResolvedValue({
      mode: 'openai',
      recommendations: [mockRecommendation],
    });

    const { result, rerender } = renderHook(
      ({ workbookFingerprint }) =>
        useAiSimilarityExtractionState(
          mergedRows,
          workbookFingerprint,
          'OFF-1',
          'fertilizer',
        ),
      { initialProps: { workbookFingerprint: 'workbook-a' } },
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });
    act(() => {
      result.current.handleRecommendationSelect('rec-1');
    });

    expect(result.current.recommendations).toEqual([mockRecommendation]);
    expect(result.current.activeRecommendationId).toBe('rec-1');

    rerender({ workbookFingerprint: 'workbook-b' });

    expect(result.current.recommendations).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.analysisMode).toBe('idle');
    expect(result.current.activeRecommendationId).toBe(null);
  });

  it('surfaces the mode and message returned by a failed analysis', async () => {
    analyzeAiSimilarityExtractionMatches.mockResolvedValue({
      mode: 'error',
      recommendations: [],
      message: 'OpenAI 보조 분석에 실패했습니다.',
    });

    const { result } = renderHook(() =>
      useAiSimilarityExtractionState(
        mergedRows,
        'workbook-a',
        'OFF-1',
        'fertilizer',
      ),
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.analysisMode).toBe('error');
    expect(result.current.analysisMessage).toBe('OpenAI 보조 분석에 실패했습니다.');
    expect(result.current.recommendations).toEqual([]);
  });

  it('clears recommendations and exposes the error when analysis fails', async () => {
    analyzeAiSimilarityExtractionMatches
      .mockResolvedValueOnce({
        mode: 'openai',
        recommendations: [mockRecommendation],
      })
      .mockRejectedValueOnce(new Error('OpenAI API request failed.'));

    const { result } = renderHook(() =>
      useAiSimilarityExtractionState(
        mergedRows,
        'workbook-a',
        'OFF-1',
        'fertilizer',
      ),
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.recommendations).toEqual([mockRecommendation]);

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.recommendations).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.activeRecommendationId).toBe(null);
  });

  it('persists recommendations to sessionStorage after a successful analysis', async () => {
    analyzeAiSimilarityExtractionMatches.mockResolvedValue({
      mode: 'openai',
      recommendations: [mockRecommendation],
    });

    const { result } = renderHook(() =>
      useAiSimilarityExtractionState(mergedRows, 'workbook-a', 'OFF-1', 'fertilizer'),
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });

    const stored = JSON.parse(
      globalThis.sessionStorage.getItem('office-product-editor:ai-similarity-extraction:workbook-a'),
    );
    expect(stored.recommendations).toEqual([mockRecommendation]);
    expect(stored.analysisMode).toBe('openai');
  });

  it('restores recommendations from sessionStorage for the same workbook fingerprint on mount', () => {
    globalThis.sessionStorage.setItem(
      'office-product-editor:ai-similarity-extraction:workbook-a',
      JSON.stringify({
        version: 1,
        recommendations: [mockRecommendation],
        analysisMode: 'openai',
        analysisMessage: '',
        activeRecommendationId: 'rec-1',
      }),
    );

    const { result } = renderHook(() =>
      useAiSimilarityExtractionState(mergedRows, 'workbook-a', 'OFF-1', 'fertilizer'),
    );

    expect(result.current.recommendations).toEqual([mockRecommendation]);
    expect(result.current.analysisMode).toBe('openai');
    expect(result.current.activeRecommendationId).toBe('rec-1');
    expect(analyzeAiSimilarityExtractionMatches).not.toHaveBeenCalled();
  });

  it('does not restore a different workbook fingerprint state after the fingerprint changes', () => {
    globalThis.sessionStorage.setItem(
      'office-product-editor:ai-similarity-extraction:workbook-a',
      JSON.stringify({
        version: 1,
        recommendations: [mockRecommendation],
        analysisMode: 'openai',
        analysisMessage: '',
        activeRecommendationId: 'rec-1',
      }),
    );

    const { result, rerender } = renderHook(
      ({ workbookFingerprint }) =>
        useAiSimilarityExtractionState(mergedRows, workbookFingerprint, 'OFF-1', 'fertilizer'),
      { initialProps: { workbookFingerprint: 'workbook-a' } },
    );

    expect(result.current.recommendations).toEqual([mockRecommendation]);

    rerender({ workbookFingerprint: 'workbook-b' });

    expect(result.current.recommendations).toEqual([]);
    expect(result.current.analysisMode).toBe('idle');
  });
});
