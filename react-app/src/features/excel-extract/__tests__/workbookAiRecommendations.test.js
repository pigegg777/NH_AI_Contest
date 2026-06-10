import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAiRecommendation } from '../model/recommendations/core/aiRecommendationModel';
import { buildRuleBasedAiRecommendations } from '../model/recommendations/rules/ruleBasedRecommendationModel';
import { analyzeWorkbookAiRecommendations } from '../services/workbook-ai-recommendation/workbookAiRecommendationService';

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
  it('creates a minimal recommendation model', () => {
    expect(
      createAiRecommendation({
        id: 'rec-1',
        severity: 'high',
        title: '가격 확인',
        reason: '행 검토 필요',
        relatedRowIds: ['A100__01', 'A100__01'],
      }),
    ).toEqual(
      {
        id: 'rec-1',
        severity: 'high',
        title: '가격 확인',
        reason: '행 검토 필요',
        relatedRowIds: ['A100__01'],
      },
    );
  });

  it('creates a local recommendation when tax price exceeds zero tax price', () => {
    const recommendations = buildRuleBasedAiRecommendations(sampleRows);

    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'high',
          title: '과세단가가 영세단가보다 높습니다',
          relatedRowIds: ['B200__01'],
        }),
      ]),
    );
  });

  it('creates a local recommendation for rows that look like the same product under different codes', () => {
    const recommendations = buildRuleBasedAiRecommendations(sampleRows);

    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'medium',
          title: '동일 상품으로 보이나 상품코드가 다릅니다',
          relatedRowIds: ['A100__01', 'B200__01'],
        }),
      ]),
    );
  });

  it('uses the OpenAI responses API when a key is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  recommendations: [
                    {
                      severity: 'medium',
                      title: '같은 상품처럼 보이는데 코드가 다릅니다',
                      reason: '상품명과 규격이 유사한데 코드가 나뉘어 있습니다.',
                      relatedRowIds: ['A100__01', 'B200__01'],
                    },
                  ],
                }),
              },
            ],
          },
        ],
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
    expect(requestBody.input[1].content).not.toContain('rule_based_findings');
    expect(result.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: '같은 상품처럼 보이는데 코드가 다릅니다',
          relatedRowIds: ['A100__01', 'B200__01'],
        }),
      ]),
    );
  });

  it('returns local recommendations when the key is empty', async () => {
    const result = await analyzeWorkbookAiRecommendations(sampleRows, {
      openAiApiKey: '',
      openAiModel: '',
    });

    expect(result.mode).toBe('unavailable');
    expect(result.recommendations).toEqual(buildRuleBasedAiRecommendations(sampleRows));
  });

  it('falls back to local recommendations when the OpenAI response cannot be parsed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output: [] }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeWorkbookAiRecommendations(sampleRows, {
      openAiApiKey: 'sk-test',
      openAiModel: 'gpt-4.1-mini',
    });

    expect(result.mode).toBe('local-only');
    expect(result.recommendations).toEqual(buildRuleBasedAiRecommendations(sampleRows));
    expect(result.message).toBe('OpenAI 보조 분석에 실패하여 로컬 검사 결과만 표시합니다.');
  });

  it('returns an idle result when the row list is empty', async () => {
    const result = await analyzeWorkbookAiRecommendations([], {
      openAiApiKey: 'sk-test',
      openAiModel: 'gpt-4.1-mini',
    });

    expect(result.mode).toBe('idle');
    expect(result.recommendations).toEqual([]);
  });
});

