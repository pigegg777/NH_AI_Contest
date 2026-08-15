import { describe, expect, it } from 'vitest';

import { normalizeMarketResearchReport } from '../model/market-research/marketResearchReportModel';

describe('market research report model', () => {
  it('normalizes a full, well-formed payload', () => {
    const report = normalizeMarketResearchReport({
      understood_query: '사과 부사 5kg 온라인 판매가 조사',
      clarification_needed: null,
      data_found: true,
      price_range: { min_krw: 13800, max_krw: 29900, unit: 'KRW per 5kg box' },
      price_sources: [
        {
          url: 'https://www.coupang.com/np/search?q=5kg',
          site: '쿠팡 검색결과',
          price_krw: 13800,
          observed_date: '2026-08-14',
        },
      ],
      news_articles: [
        {
          title: '사과 가격 상승세',
          summary: '이상기후로 사과 출하량이 줄며 가격이 올랐다.',
          url: 'https://news.example.com/apple-price',
          site: '예시뉴스',
          published_date: '2026-08-10',
        },
      ],
      price_comparison: {
        data_product_name: '사과 부사',
        data_price_krw: 20000,
        market_min_krw: 13800,
        market_max_krw: 29900,
        difference_krw: -1850,
        note: '등록가가 시세 평균보다 낮습니다.',
      },
    }, [
      'site:search.shopping.naver.com/ns/search 사과 부사 5kg',
      'site:search.shopping.naver.com/ns/search 사과 부사 5kg',
      '  ',
    ]);

    expect(report).toEqual({
      understoodQuery: '사과 부사 5kg 온라인 판매가 조사',
      clarificationNeeded: null,
      dataFound: true,
      priceRange: { minKrw: 13800, maxKrw: 29900, unit: 'KRW per 5kg box' },
      priceSources: [
        {
          url: 'https://www.coupang.com/np/search?q=5kg',
          site: '쿠팡 검색결과',
          priceKrw: 13800,
          observedDate: '2026-08-14',
        },
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
    });
  });

  it('defaults missing or malformed fields to safe empty values', () => {
    const report = normalizeMarketResearchReport({});

    expect(report).toEqual({
      understoodQuery: '',
      clarificationNeeded: null,
      dataFound: false,
      priceRange: null,
      priceSources: [],
      newsArticles: [],
      priceComparison: null,
      searchQueries: [],
    });
  });

  it('drops an incomplete price_comparison', () => {
    const report = normalizeMarketResearchReport({
      understood_query: 'x',
      data_found: true,
      price_comparison: { data_product_name: '', data_price_krw: 1000, market_min_krw: 900, market_max_krw: 1100, difference_krw: 0, note: '' },
    });

    expect(report.priceComparison).toBe(null);
  });

  it('drops price_sources entries missing a url', () => {
    const report = normalizeMarketResearchReport({
      understood_query: 'x',
      data_found: true,
      price_sources: [
        { url: '', site: 'no url', price_krw: 100, observed_date: null },
        { url: 'https://example.com', site: 'has url', price_krw: null, observed_date: null },
      ],
    });

    expect(report.priceSources).toEqual([
      { url: 'https://example.com', site: 'has url', priceKrw: null, observedDate: null },
    ]);
  });

  it('drops news_articles entries missing a url or title', () => {
    const report = normalizeMarketResearchReport({
      understood_query: 'x',
      data_found: true,
      news_articles: [
        { title: '', summary: 'no title', url: 'https://example.com', site: 'x', published_date: null },
        { title: 'no url', summary: 's', url: '', site: 'x', published_date: null },
        {
          title: '유효 기사',
          summary: '요약',
          url: 'https://example.com/ok',
          site: '뉴스',
          published_date: null,
        },
      ],
    });

    expect(report.newsArticles).toEqual([
      {
        title: '유효 기사',
        summary: '요약',
        url: 'https://example.com/ok',
        site: '뉴스',
        publishedDate: null,
      },
    ]);
  });
});
