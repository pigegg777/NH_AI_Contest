import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useWorkbookAiRecommendations } from '../hooks/useWorkbookAiRecommendations';
import { analyzeWorkbookAiRecommendations } from '../services/workbook-ai-recommendation/workbookAiRecommendationService';

vi.mock('../services/workbook-ai-recommendation/workbookAiRecommendationService', async (importOriginal) => {
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

describe('useWorkbookAiRecommendations', () => {
  it('analyzes exactly the merged rows it was given', async () => {
    analyzeWorkbookAiRecommendations.mockResolvedValue({
      mode: 'openai',
      recommendations: [mockRecommendation],
    });

    const { result } = renderHook(() => useWorkbookAiRecommendations(mergedRows, 'workbook-a'));

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(analyzeWorkbookAiRecommendations).toHaveBeenCalledWith(mergedRows);
    expect(result.current.analysisMode).toBe('openai');
    expect(result.current.recommendations).toEqual([mockRecommendation]);
  });

  it('toggles the active recommendation and derives highlighted row ids', async () => {
    analyzeWorkbookAiRecommendations.mockResolvedValue({
      mode: 'openai',
      recommendations: [mockRecommendation],
    });

    const { result } = renderHook(() => useWorkbookAiRecommendations(mergedRows, 'workbook-a'));

    await act(async () => {
      await result.current.handleAnalyze();
    });

    act(() => {
      result.current.handleRecommendationSelect('rec-1');
    });

    expect(result.current.activeRecommendationId).toBe('rec-1');
    expect(result.current.highlightedRowIds).toEqual(['B200__02']);

    act(() => {
      result.current.handleRecommendationSelect('rec-1');
    });

    expect(result.current.activeRecommendationId).toBe(null);
    expect(result.current.highlightedRowIds).toEqual([]);
  });

  it('resets state when the workbook fingerprint changes', async () => {
    analyzeWorkbookAiRecommendations.mockResolvedValue({
      mode: 'openai',
      recommendations: [mockRecommendation],
    });

    const { result, rerender } = renderHook(
      ({ workbookFingerprint }) => useWorkbookAiRecommendations(mergedRows, workbookFingerprint),
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
    expect(result.current.highlightedRowIds).toEqual([]);
  });

  it('surfaces a non-fatal notice when only local recommendations are available', async () => {
    analyzeWorkbookAiRecommendations.mockResolvedValue({
      mode: 'local-only',
      recommendations: [mockRecommendation],
      message: 'OpenAI 보조 분석에 실패하여 로컬 검사 결과만 표시합니다.',
    });

    const { result } = renderHook(() => useWorkbookAiRecommendations(mergedRows, 'workbook-a'));

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.analysisMode).toBe('local-only');
    expect(result.current.recommendations).toEqual([mockRecommendation]);
    expect(result.current.errorMessage).toBe(
      'OpenAI 보조 분석에 실패하여 로컬 검사 결과만 표시합니다.',
    );
  });

  it('clears recommendations and exposes the error when analysis fails', async () => {
    analyzeWorkbookAiRecommendations
      .mockResolvedValueOnce({
        mode: 'openai',
        recommendations: [mockRecommendation],
      })
      .mockRejectedValueOnce(new Error('OpenAI API request failed.'));

    const { result } = renderHook(() => useWorkbookAiRecommendations(mergedRows, 'workbook-a'));

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.recommendations).toEqual([mockRecommendation]);

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.recommendations).toEqual([]);
    expect(result.current.activeRecommendationId).toBe(null);
    expect(result.current.errorMessage).toBe('OpenAI API request failed.');
  });
});

