// Demo-day safety net: if the live OpenAI call fails or times out for this
// exact pre-rehearsed query, serve this captured-real report instead of a
// 502 so the live demo doesn't die on stage. Any other product query still
// surfaces the real error — this is not a general cache.
export const MARKET_RESEARCH_FALLBACK_PRODUCT_QUERY = '사과 부사 5kg';

export const MARKET_RESEARCH_FALLBACK_REPORT = {
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
    {
      url: 'https://www.11st.co.kr/products/4951646894',
      site: '11번가',
      priceKrw: 16900,
      observedDate: '2026-08-14',
    },
    {
      url: 'https://www.lotteon.com/csearch/search/search?brand=p615&mallId=n&platform=m&q=%EB%B6%80%EC%82%AC%EC%82%AC%EA%B3%BC&render=search&typo=N',
      site: '롯데ON 검색결과',
      priceKrw: 29900,
      observedDate: '2026-08-14',
    },
    {
      url: 'https://www.enuri.com/search.jsp?keyword=%EB%B6%80%EC%82%AC%EC%82%AC%EA%B3%BC+5KG',
      site: '에누리 가격비교',
      priceKrw: 12660,
      observedDate: '2026-08-14',
    },
  ],
  newsArticles: [],
  priceComparison: null,
  searchQueries: [],
};
