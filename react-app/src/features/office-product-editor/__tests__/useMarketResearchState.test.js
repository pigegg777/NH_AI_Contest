import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMarketResearchState } from '../hooks/market-research/useMarketResearchState';
import { analyzeMarketResearchQuery } from '../model/market-research/marketResearchAnalysisModel';

vi.mock('../model/market-research/marketResearchAnalysisModel', () => ({
  analyzeMarketResearchQuery: vi.fn(),
}));

const sampleReport = {
  understoodQuery: '사과 부사 5kg 온라인 판매가 조사',
  clarificationNeeded: null,
  dataFound: true,
  priceRange: { minKrw: 13800, maxKrw: 29900, unit: 'KRW per 5kg box' },
  priceSources: [],
  newsArticles: [],
  priceComparison: null,
  searchQueries: [],
};

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  globalThis.sessionStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useMarketResearchState', () => {
  it('runs a market research query for the given product and office', async () => {
    analyzeMarketResearchQuery.mockResolvedValue({ mode: 'openai', report: sampleReport });

    const { result } = renderHook(() => useMarketResearchState('OFF-1'));

    await act(async () => {
      await result.current.handleMarketResearch('사과 부사 5kg');
    });

    expect(analyzeMarketResearchQuery).toHaveBeenCalledWith('사과 부사 5kg', { officeCode: 'OFF-1', rows: [] });
    expect(result.current.activeQuery).toBe('사과 부사 5kg');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.mode).toBe('openai');
    expect(result.current.report).toEqual(sampleReport);
  });

  it('exposes loading state while the request is pending', async () => {
    const deferred = createDeferred();
    analyzeMarketResearchQuery.mockReturnValue(deferred.promise);

    const { result } = renderHook(() => useMarketResearchState('OFF-1'));

    act(() => {
      void result.current.handleMarketResearch('사과 5kg');
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      deferred.resolve({ mode: 'openai', report: sampleReport });
      await deferred.promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('keeps only the result of the latest request when clicked twice quickly', async () => {
    const firstDeferred = createDeferred();
    const secondDeferred = createDeferred();
    analyzeMarketResearchQuery
      .mockReturnValueOnce(firstDeferred.promise)
      .mockReturnValueOnce(secondDeferred.promise);

    const { result } = renderHook(() => useMarketResearchState('OFF-1'));

    act(() => {
      void result.current.handleMarketResearch('상품A');
      void result.current.handleMarketResearch('상품B');
    });

    await act(async () => {
      secondDeferred.resolve({ mode: 'openai', report: { ...sampleReport, understoodQuery: 'B' } });
      await secondDeferred.promise;
    });

    await act(async () => {
      firstDeferred.resolve({ mode: 'openai', report: { ...sampleReport, understoodQuery: 'A' } });
      await firstDeferred.promise.catch(() => {});
    });

    expect(result.current.activeQuery).toBe('상품B');
    expect(result.current.report.understoodQuery).toBe('B');
  });

  it('surfaces the error message when the query fails', async () => {
    analyzeMarketResearchQuery.mockResolvedValue({
      mode: 'error',
      report: null,
      message: '시장조사 요청에 실패했습니다.',
    });

    const { result } = renderHook(() => useMarketResearchState('OFF-1'));

    await act(async () => {
      await result.current.handleMarketResearch('사과 5kg');
    });

    expect(result.current.mode).toBe('error');
    expect(result.current.message).toBe('시장조사 요청에 실패했습니다.');
    expect(result.current.report).toBe(null);
  });

  it('persists the report to sessionStorage after a successful query', async () => {
    analyzeMarketResearchQuery.mockResolvedValue({ mode: 'openai', report: sampleReport });

    const { result } = renderHook(() => useMarketResearchState('OFF-1'));

    await act(async () => {
      await result.current.handleMarketResearch('사과 부사 5kg');
    });

    const stored = JSON.parse(
      globalThis.sessionStorage.getItem('office-product-editor:market-research:OFF-1'),
    );
    expect(stored.report).toEqual(sampleReport);
    expect(stored.activeQuery).toBe('사과 부사 5kg');
    expect(stored.mode).toBe('openai');
  });

  it('restores the report from sessionStorage for the same office on mount', () => {
    globalThis.sessionStorage.setItem(
      'office-product-editor:market-research:OFF-1',
      JSON.stringify({
        version: 1,
        activeQuery: '사과 부사 5kg',
        mode: 'openai',
        report: sampleReport,
        message: '',
      }),
    );

    const { result } = renderHook(() => useMarketResearchState('OFF-1'));

    expect(result.current.activeQuery).toBe('사과 부사 5kg');
    expect(result.current.mode).toBe('openai');
    expect(result.current.report).toEqual(sampleReport);
    expect(analyzeMarketResearchQuery).not.toHaveBeenCalled();
  });

  it('does not restore another office\'s stored report', () => {
    globalThis.sessionStorage.setItem(
      'office-product-editor:market-research:OFF-OTHER',
      JSON.stringify({
        version: 1,
        activeQuery: '사과 부사 5kg',
        mode: 'openai',
        report: sampleReport,
        message: '',
      }),
    );

    const { result } = renderHook(() => useMarketResearchState('OFF-1'));

    expect(result.current.mode).toBe('idle');
    expect(result.current.report).toBe(null);
  });
});
