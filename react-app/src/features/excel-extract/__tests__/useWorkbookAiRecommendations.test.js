import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useWorkbookAiRecommendations } from '../hooks/workbook-review/useWorkbookAiRecommendations';
import { analyzeWorkbookAiRecommendations } from '../services/workbookAiRecommendationService';

vi.mock('../services/workbookAiRecommendationService', async (importOriginal) => {
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
  kind: 'price-anomaly',
  severity: 'medium',
  title: '가격 확인',
  reason: '세전가가 세후가보다 낮습니다',
  actionText: '확인하세요',
  relatedRowIds: ['B200__02'],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('useWorkbookAiRecommendations', () => {
  it('analyzes exactly the merged rows it was given', async () => {
    analyzeWorkbookAiRecommendations.mockResolvedValue({
      mode: 'mock',
      recommendations: [mockRecommendation],
    });

    const { result } = renderHook(() => useWorkbookAiRecommendations(mergedRows, 'workbook-a'));

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(analyzeWorkbookAiRecommendations).toHaveBeenCalledWith(mergedRows);
    expect(result.current.analysisMode).toBe('mock');
    expect(result.current.recommendations).toEqual([mockRecommendation]);
  });

  it('toggles the active recommendation and derives highlighted row ids', async () => {
    analyzeWorkbookAiRecommendations.mockResolvedValue({
      mode: 'mock',
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
      mode: 'mock',
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
    expect(result.current.analysisMode).toBe('mock');
    expect(result.current.activeRecommendationId).toBe(null);
    expect(result.current.highlightedRowIds).toEqual([]);
  });
});
