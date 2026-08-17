import { beforeEach, describe, expect, it } from 'vitest';

import {
  readStoredAiMarketResearchState,
  writeStoredAiMarketResearchState,
} from '../model/ai-market-research/aiMarketResearchStorageModel';

const sampleState = {
  activeQuery: '사과 부사 5kg',
  mode: 'openai',
  report: {
    understoodQuery: '사과 부사 5kg 온라인 판매가 조사',
    clarificationNeeded: null,
    dataFound: true,
    priceRange: { minKrw: 13800, maxKrw: 29900, unit: 'KRW per 5kg box' },
    priceSources: [
      { url: 'https://www.coupang.com/x', site: '쿠팡', priceKrw: 13800, observedDate: '2026-08-14' },
    ],
    newsArticles: [
      {
        title: '사과 가격 상승세',
        summary: '이상기후로 사과 출하량이 줄며 가격이 올랐다.',
        url: 'https://news.example.com/apple-price',
        site: '예시뉴스',
        publishedDate: '2026-08-10',
      },
    ],
    priceComparison: {
      dataProductName: '사과 부사',
      dataPriceKrw: 20000,
      marketMinKrw: 13800,
      marketMaxKrw: 29900,
      differenceKrw: -1850,
      note: '등록가가 시세 평균보다 낮습니다.',
    },
    searchQueries: ['site:search.shopping.naver.com/ns/search 사과 부사 5kg'],
  },
  message: '',
};

beforeEach(() => {
  globalThis.sessionStorage.clear();
});

describe('aiMarketResearchStorageModel', () => {
  it('round-trips a written state through storage', () => {
    writeStoredAiMarketResearchState(globalThis.sessionStorage, 'OFF-1', sampleState);

    expect(readStoredAiMarketResearchState(globalThis.sessionStorage, 'OFF-1')).toEqual(sampleState);
  });

  it('returns null when nothing is stored for the office', () => {
    expect(readStoredAiMarketResearchState(globalThis.sessionStorage, 'OFF-missing')).toBe(null);
  });

  it('keeps state scoped to its own office code', () => {
    writeStoredAiMarketResearchState(globalThis.sessionStorage, 'OFF-1', sampleState);

    expect(readStoredAiMarketResearchState(globalThis.sessionStorage, 'OFF-2')).toBe(null);
  });

  it('returns null for corrupted JSON instead of throwing', () => {
    globalThis.sessionStorage.setItem('office-product-editor:ai-market-research:OFF-1', '{not json');

    expect(readStoredAiMarketResearchState(globalThis.sessionStorage, 'OFF-1')).toBe(null);
  });

  it('round-trips a report-less idle state', () => {
    writeStoredAiMarketResearchState(globalThis.sessionStorage, 'OFF-1', {
      activeQuery: '',
      mode: 'idle',
      report: null,
      message: '',
    });

    expect(readStoredAiMarketResearchState(globalThis.sessionStorage, 'OFF-1')).toEqual({
      activeQuery: '',
      mode: 'idle',
      report: null,
      message: '',
    });
  });
});
