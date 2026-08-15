// Schema shape validated in the spike:
// react-app/scripts/prototypes/market-research-spike/requestVariants.mjs
const MARKET_RESEARCH_REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    understood_query: { type: 'string' },
    clarification_needed: { type: ['string', 'null'] },
    data_found: { type: 'boolean' },
    price_range: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        min_krw: { type: 'number' },
        max_krw: { type: 'number' },
        unit: { type: 'string' },
      },
      required: ['min_krw', 'max_krw', 'unit'],
    },
    price_sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          url: { type: 'string' },
          site: { type: 'string' },
          price_krw: { type: ['number', 'null'] },
          observed_date: { type: ['string', 'null'] },
        },
        required: ['url', 'site', 'price_krw', 'observed_date'],
      },
    },
    news_articles: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          url: { type: 'string' },
          site: { type: 'string' },
          published_date: { type: ['string', 'null'] },
        },
        required: ['title', 'summary', 'url', 'site', 'published_date'],
      },
    },
    price_comparison: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        data_product_name: { type: 'string' },
        data_price_krw: { type: ['number', 'null'] },
        market_min_krw: { type: ['number', 'null'] },
        market_max_krw: { type: ['number', 'null'] },
        difference_krw: { type: ['number', 'null'] },
        note: { type: 'string' },
      },
      required: [
        'data_product_name',
        'data_price_krw',
        'market_min_krw',
        'market_max_krw',
        'difference_krw',
        'note',
      ],
    },
  },
  required: [
    'understood_query',
    'clarification_needed',
    'data_found',
    'price_range',
    'price_sources',
    'news_articles',
    'price_comparison',
  ],
};

export function buildMarketResearchRequestBody({
  productQuery,
  matchedProducts = [],
  openAiModel,
  prompt,
}) {
  return {
    model: openAiModel,
    input: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: JSON.stringify({
          product_query: productQuery,
          matched_products: matchedProducts.map((product) => ({
            product_name: product.productName,
            spec: product.spec,
            price_krw: product.priceKrw,
          })),
        }),
      },
    ],
    tools: [{ type: 'web_search' }],
    text: {
      format: {
        type: 'json_schema',
        name: 'market_research_report',
        strict: true,
        schema: MARKET_RESEARCH_REPORT_SCHEMA,
      },
    },
    max_output_tokens: 6000,
  };
}
