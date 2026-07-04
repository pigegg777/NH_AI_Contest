import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useWorkbookAiRecommendationState } from '../hooks/ai-recommendations/useWorkbookAiRecommendationState';
import { analyzeWorkbookAiRecommendations } from '../model/ai-recommendations/workbookAiAnalysisModel';

vi.mock('../model/ai-recommendations/workbookAiAnalysisModel', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    analyzeWorkbookAiRecommendations: vi.fn(),
  };
});

const mergedRows = [
  { row_id: 'A100__01', product_code: 'A100', product_name: 'Alpha Fertilizer' },
  { row_id: 'B200__02', product_code: 'B200', product_name: 'Beta Pesticide' },
];

const mockRecommendation = {
  id: 'rec-1',
  severity: 'medium',
  title: '가격 확인',
  reason: '세전가가 세후가보다 낮습니다',
  relatedRowIds: ['B200__02'],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('useWorkbookAiRecommendationState', () => {
  it('analyzes exactly the merged rows and officeCode it was given', async () => {
    analyzeWorkbookAiRecommendations.mockResolvedValue({
      mode: 'openai',
      recommendations: [mockRecommendation],
    });

    const { result } = renderHook(() =>
      useWorkbookAiRecommendationState(mergedRows, 'workbook-a', 'OFF-1'),
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(analyzeWorkbookAiRecommendations).toHaveBeenCalledWith(mergedRows, {
      officeCode: 'OFF-1',
    });
    expect(result.current.analysisMode).toBe('openai');
    expect(result.current.recommendations).toEqual([mockRecommendation]);
  });

  it('toggles the active recommendation', async () => {
    analyzeWorkbookAiRecommendations.mockResolvedValue({
      mode: 'openai',
      recommendations: [mockRecommendation],
    });

    const { result } = renderHook(() =>
      useWorkbookAiRecommendationState(mergedRows, 'workbook-a', 'OFF-1'),
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
    analyzeWorkbookAiRecommendations.mockResolvedValue({
      mode: 'openai',
      recommendations: [mockRecommendation],
    });

    const { result, rerender } = renderHook(
      ({ workbookFingerprint }) =>
        useWorkbookAiRecommendationState(
          mergedRows,
          workbookFingerprint,
          'OFF-1',
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
    expect(result.current.analysisMode).toBe('idle');
    expect(result.current.activeRecommendationId).toBe(null);
  });

  it('surfaces the mode and message returned by a failed analysis', async () => {
    analyzeWorkbookAiRecommendations.mockResolvedValue({
      mode: 'error',
      recommendations: [],
      message: 'OpenAI 보조 분석에 실패했습니다.',
    });

    const { result } = renderHook(() =>
      useWorkbookAiRecommendationState(mergedRows, 'workbook-a', 'OFF-1'),
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.analysisMode).toBe('error');
    expect(result.current.analysisMessage).toBe('OpenAI 보조 분석에 실패했습니다.');
    expect(result.current.recommendations).toEqual([]);
  });

  it('clears recommendations and exposes the error when analysis fails', async () => {
    analyzeWorkbookAiRecommendations
      .mockResolvedValueOnce({
        mode: 'openai',
        recommendations: [mockRecommendation],
      })
      .mockRejectedValueOnce(new Error('OpenAI API request failed.'));

    const { result } = renderHook(() =>
      useWorkbookAiRecommendationState(mergedRows, 'workbook-a', 'OFF-1'),
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.recommendations).toEqual([mockRecommendation]);

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.recommendations).toEqual([]);
    expect(result.current.activeRecommendationId).toBe(null);
  });
});
