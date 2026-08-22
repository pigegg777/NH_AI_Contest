import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { onRequestPost } from '../analyze';

const TEST_ENV = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  OPENAI_API_KEY: 'sk-test',
};

function buildSupabaseStub({ user = { id: 'user-1' }, officeCode = 'OFF-1' } = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { office_code: officeCode }, error: null }),
        })),
      })),
    })),
  };
}

function buildRequest(body, { authorization = 'Bearer test-token' } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });

  if (authorization) {
    headers.set('authorization', authorization);
  }

  return new Request('https://example.com/api/ai-market-research/analyze', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('POST /api/ai-market-research/analyze', () => {
  it('returns 401 when no bearer token is present', async () => {
    const request = buildRequest({ officeCode: 'OFF-1', productQuery: '사과 5kg' }, { authorization: '' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(401);
  });

  it('returns 403 when officeCode does not match the profile', async () => {
    createClient.mockReturnValue(buildSupabaseStub({ officeCode: 'OFF-OTHER' }));
    const request = buildRequest({ officeCode: 'OFF-1', productQuery: '사과 5kg' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(403);
  });

  it('returns 422 when officeCode is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: '', productQuery: '사과 5kg' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns 422 when productQuery is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: 'OFF-1', productQuery: '' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns 502 when OpenAI fails', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', productQuery: '사과 5kg' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(502);
  });

  it('returns 200 with a normalized report on success', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output: [
            {
              type: 'web_search_call',
              action: {
                type: 'search',
                queries: [
                  'site:search.shopping.naver.com/ns/search 사과 부사 5kg',
                  'site:search.danawa.com/dsearch.php 사과 부사 5kg',
                ],
                query: 'site:search.shopping.naver.com/ns/search 사과 부사 5kg',
              },
            },
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
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
                    overall_opinion: '등록가가 시세보다 낮아 경쟁력이 있습니다.',
                  }),
                },
              ],
            },
          ],
        }),
      }),
    );
    const request = buildRequest({
      officeCode: 'OFF-1',
      productQuery: '사과 부사 5kg',
      matchedProducts: [{ productName: '사과 부사', spec: '5kg', priceKrw: 20000 }],
    });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.report).toEqual({
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
      searchQueries: [
        'site:search.shopping.naver.com/ns/search 사과 부사 5kg',
        'site:search.danawa.com/dsearch.php 사과 부사 5kg',
      ],
      overallOpinion: '등록가가 시세보다 낮아 경쟁력이 있습니다.',
    });
  });
});
