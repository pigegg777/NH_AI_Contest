import { afterEach, describe, expect, it, vi } from 'vitest';

import { analyzeMarketResearchQuery } from '../model/market-research/marketResearchAnalysisModel';
import { requestMarketResearchReport } from '../services/market-research/marketResearchClient';

vi.mock('../services/market-research/marketResearchClient', () => ({
  requestMarketResearchReport: vi.fn(),
}));

const normalizedReport = {
  understoodQuery: '사과 부사 5kg 온라인 판매가 조사',
  clarificationNeeded: null,
  dataFound: true,
  priceRange: { minKrw: 13800, maxKrw: 29900, unit: 'KRW per 5kg box' },
  priceSources: [],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('marketResearchAnalysisModel', () => {
  it('returns the client report when officeCode and productQuery are set', async () => {
    requestMarketResearchReport.mockResolvedValue({ report: normalizedReport });

    const result = await analyzeMarketResearchQuery('사과 부사 5kg', { officeCode: 'OFF-1' });

    expect(requestMarketResearchReport).toHaveBeenCalledWith({
      officeCode: 'OFF-1',
      productQuery: '사과 부사 5kg',
      matchedProducts: [],
    });
    expect(result.mode).toBe('openai');
    expect(result.report).toEqual({ ...normalizedReport, priceComparison: null });
  });

  it('includes rows that match the query as matchedProducts', async () => {
    requestMarketResearchReport.mockResolvedValue({ report: normalizedReport });

    await analyzeMarketResearchQuery('사과 부사 5kg', {
      officeCode: 'OFF-1',
      rows: [{ product_name: '사과 부사', spec: '5kg', tax_price: 20000 }],
    });

    expect(requestMarketResearchReport).toHaveBeenCalledWith({
      officeCode: 'OFF-1',
      productQuery: '사과 부사 5kg',
      matchedProducts: [{ productName: '사과 부사', spec: '5kg', priceKrw: 20000 }],
    });
  });

  it('fills in price_comparison itself when the AI omits it but a matched product has a price', async () => {
    requestMarketResearchReport.mockResolvedValue({ report: normalizedReport });

    const result = await analyzeMarketResearchQuery('사과 부사 5kg', {
      officeCode: 'OFF-1',
      rows: [{ product_name: '사과 부사', spec: '5kg', tax_price: 20000 }],
    });

    expect(result.report.priceComparison).toEqual({
      dataProductName: '사과 부사',
      dataPriceKrw: 20000,
      marketMinKrw: 13800,
      marketMaxKrw: 29900,
      differenceKrw: 1850,
      note: '등록가가 시세보다 낮습니다.',
    });
  });

  it('keeps the AI-provided price_comparison when present', async () => {
    const aiComparison = {
      dataProductName: '사과 부사',
      dataPriceKrw: 20000,
      marketMinKrw: 13800,
      marketMaxKrw: 29900,
      differenceKrw: -2150,
      note: 'AI가 작성한 코멘트',
    };
    requestMarketResearchReport.mockResolvedValue({
      report: { ...normalizedReport, priceComparison: aiComparison },
    });

    const result = await analyzeMarketResearchQuery('사과 부사 5kg', {
      officeCode: 'OFF-1',
      rows: [{ product_name: '사과 부사', spec: '5kg', tax_price: 999999 }],
    });

    expect(result.report.priceComparison).toEqual(aiComparison);
  });

  it('returns an idle result when productQuery is empty', async () => {
    const result = await analyzeMarketResearchQuery('', { officeCode: 'OFF-1' });

    expect(result.mode).toBe('idle');
    expect(result.report).toBe(null);
    expect(requestMarketResearchReport).not.toHaveBeenCalled();
  });

  it('returns an unavailable result when officeCode is empty', async () => {
    const result = await analyzeMarketResearchQuery('사과 5kg', { officeCode: '' });

    expect(result.mode).toBe('unavailable');
    expect(result.report).toBe(null);
    expect(requestMarketResearchReport).not.toHaveBeenCalled();
  });

  it('returns an error result when the client fails', async () => {
    requestMarketResearchReport.mockRejectedValue(new Error('시장조사 요청에 실패했습니다.'));

    const result = await analyzeMarketResearchQuery('사과 5kg', { officeCode: 'OFF-1' });

    expect(result.mode).toBe('error');
    expect(result.report).toBe(null);
    expect(result.message).toBe('시장조사 요청에 실패했습니다.');
  });
});
