import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildRuleBasedAiRecommendations,
  createAiRecommendation,
} from '../model/workbook-review/recommendations';
import { analyzeWorkbookAiRecommendations } from '../services/workbookAiRecommendationService';

const sampleRows = [
  {
    row_id: 'A100__01',
    product_code: 'A100',
    product_name: 'Alpha Fertilizer',
    nutrient: 'N-P-K',
    spec: '20kg',
    tax_price: 1000,
    zero_tax_price: 1200,
    manufacturer_list: [{ manufacturer_code: 'M01', manufacturer_name: 'NH' }],
  },
  {
    row_id: 'B200__01',
    product_code: 'B200',
    product_name: 'Alpha Fertilizer',
    nutrient: 'N-P-K',
    spec: '20kg',
    tax_price: 980,
    zero_tax_price: 900,
    manufacturer_list: [{ manufacturer_code: 'M01', manufacturer_name: 'NH' }],
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('workbook AI recommendations', () => {
  it('creates a normalized recommendation schema', () => {
    expect(
      createAiRecommendation({
        id: 'rec-1',
        kind: 'zero-tax-higher-than-tax',
      }),
    ).toEqual(
      expect.objectContaining({
        id: 'rec-1',
        kind: 'zero-tax-higher-than-tax',
        severity: 'medium',
        title: '',
        reason: '',
        actionText: '',
        relatedRowIds: [],
      }),
    );
  });

  it('creates a rule-based recommendation when zero tax price exceeds tax price', () => {
    const recommendations = buildRuleBasedAiRecommendations(sampleRows);

    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'zero-tax-higher-than-tax',
          severity: 'high',
          relatedRowIds: ['A100__01'],
        }),
      ]),
    );
  });

  it('creates a same-product-different-code recommendation for likely same products', () => {
    const recommendations = buildRuleBasedAiRecommendations(sampleRows);

    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'same-product-different-code',
          relatedRowIds: expect.arrayContaining(['A100__01', 'B200__01']),
        }),
      ]),
    );
  });

  it('creates a same-product-price-mismatch recommendation for similar products with different prices', () => {
    const recommendations = buildRuleBasedAiRecommendations(sampleRows);

    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'same-product-price-mismatch',
          severity: 'medium',
          relatedRowIds: expect.arrayContaining(['A100__01', 'B200__01']),
        }),
      ]),
    );
  });

  it('uses the OpenAI responses API when a key is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          recommendations: [
            {
              kind: 'same-product-different-code',
              severity: 'medium',
              title: 'Same product, different code',
              reason: 'The name, nutrient, spec, and manufacturer match closely.',
              actionText: 'Compare the source workbook before editing.',
              relatedRowIds: ['A100__01', 'B200__01'],
            },
          ],
        }),
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeWorkbookAiRecommendations(sampleRows, {
      openAiApiKey: 'sk-test',
      openAiModel: 'gpt-4.1-mini',
    });

    expect(result.mode).toBe('openai');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
        }),
      }),
    );

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(requestBody.model).toBe('gpt-4.1-mini');
    expect(requestBody.text.format).toMatchObject({
      type: 'json_schema',
      name: 'workbook_ai_recommendations',
      strict: true,
    });
    expect(requestBody.input[0].content).toContain('Do not modify the workbook data.');
    expect(requestBody.input[1].content).toContain('"analysis_scope": "all_rows"');
    expect(result.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'same-product-different-code',
          title: 'Same product, different code',
          relatedRowIds: ['A100__01', 'B200__01'],
        }),
        expect.objectContaining({
          kind: 'zero-tax-higher-than-tax',
          relatedRowIds: ['A100__01'],
        }),
      ]),
    );
  });

  it('returns mock provider recommendations when the key is empty', async () => {
    const result = await analyzeWorkbookAiRecommendations(sampleRows, {
      openAiApiKey: '',
      openAiModel: '',
    });

    expect(result.mode).toBe('mock');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('falls back to mock mode when the row list is empty', async () => {
    const result = await analyzeWorkbookAiRecommendations([], {
      openAiApiKey: 'sk-test',
      openAiModel: 'gpt-4.1-mini',
    });

    expect(result.mode).toBe('mock');
    expect(result.recommendations).toEqual([]);
  });
});
