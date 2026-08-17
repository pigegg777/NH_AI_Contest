import { describe, expect, it } from 'vitest';

import { buildAiMarketResearchRequestBody } from '../model/ai-market-research/aiMarketResearchRequestBodyModel';
import { AI_MARKET_RESEARCH_PROMPT } from '../model/ai-market-research/aiMarketResearchPrompt';

describe('market research request body model', () => {
  it('builds an OpenAI Responses API request body with the web_search tool and the report schema', () => {
    const requestBody = buildAiMarketResearchRequestBody({
      productQuery: '사과 부사 5kg',
      matchedProducts: [{ productName: '사과 부사', spec: '5kg', priceKrw: 20000 }],
      openAiModel: 'gpt-4.1-mini',
    });

    expect(requestBody.model).toBe('gpt-4.1-mini');
    expect(requestBody.input[0]).toEqual({ role: 'system', content: AI_MARKET_RESEARCH_PROMPT });
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
      'product_name',
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
