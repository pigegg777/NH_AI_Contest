import { describe, expect, it } from 'vitest';

import { buildMarketResearchRequestBody } from '../model/market-research/marketResearchRequestBodyModel';
import { MARKET_RESEARCH_PROMPT } from '../model/market-research/marketResearchPrompt';

describe('market research request body model', () => {
  it('builds an OpenAI Responses API request body with the web_search tool and the report schema', () => {
    const requestBody = buildMarketResearchRequestBody({
      productQuery: '사과 부사 5kg',
      matchedProducts: [{ productName: '사과 부사', spec: '5kg', priceKrw: 20000 }],
      openAiModel: 'gpt-4.1-mini',
      prompt: MARKET_RESEARCH_PROMPT,
    });

    expect(requestBody.model).toBe('gpt-4.1-mini');
    expect(requestBody.input[0]).toEqual({ role: 'system', content: MARKET_RESEARCH_PROMPT });
    expect(requestBody.input[1]).toEqual({
      role: 'user',
      content: JSON.stringify({
        product_query: '사과 부사 5kg',
        matched_products: [{ product_name: '사과 부사', spec: '5kg', price_krw: 20000 }],
      }),
    });
    expect(requestBody.tools).toEqual([{ type: 'web_search' }]);
    expect(requestBody.text.format.type).toBe('json_schema');
    expect(requestBody.text.format.strict).toBe(true);

    const schema = requestBody.text.format.schema;
    expect(schema.required).toEqual([
      'understood_query',
      'clarification_needed',
      'data_found',
      'price_range',
      'price_sources',
      'news_articles',
      'price_comparison',
    ]);
    expect(schema.properties.price_sources.items.required).toEqual([
      'url',
      'site',
      'price_krw',
      'observed_date',
    ]);
    expect(schema.properties.news_articles.items.required).toEqual([
      'title',
      'summary',
      'url',
      'site',
      'published_date',
    ]);
    expect(schema.properties.price_comparison.required).toEqual([
      'data_product_name',
      'data_price_krw',
      'market_min_krw',
      'market_max_krw',
      'difference_krw',
      'note',
    ]);
    expect(schema.properties.price_range.properties.unit.type).toBe('string');
  });
});
