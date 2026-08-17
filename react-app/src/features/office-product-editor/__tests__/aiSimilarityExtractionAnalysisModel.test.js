import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAiSimilarityExtractionMatch } from '../model/ai-similarity-extraction/aiSimilarityExtractionListModel';
import { analyzeAiSimilarityExtractionMatches } from '../model/ai-similarity-extraction/aiSimilarityExtractionAnalysisModel';
import { requestAiSimilarityExtractionMatches } from '../services/ai-similarity-extraction/aiSimilarityExtractionClient';

vi.mock('../services/ai-similarity-extraction/aiSimilarityExtractionClient', () => ({
  requestAiSimilarityExtractionMatches: vi.fn(),
}));

const sampleRows = [
  {
    row_id: 'A100__01',
    product_code: 'A100',
    product_name: 'Alpha Fertilizer',
    nutrient: 'N-P-K',
    spec: '20kg',
    tax_price: 1000,
    zero_tax_price: 1200,
    manufacturer_list: [{ manufacturer_name: 'NH' }],
  },
  {
    row_id: 'B200__01',
    product_code: 'B200',
    product_name: 'Alpha Fertilizer',
    nutrient: 'N-P-K',
    spec: '20kg',
    tax_price: 980,
    zero_tax_price: 900,
    manufacturer_list: [{ manufacturer_name: 'NH' }],
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('aiSimilarityExtractionAnalysisModel', () => {
  it('creates a minimal recommendation model', () => {
    expect(
      createAiSimilarityExtractionMatch({
        id: 'rec-1',
        groupType: 'same_product',
        title: '가격 확인',
        reason: '행 검토 필요',
        relatedRowIds: ['A100__01', 'A100__01'],
      }),
    ).toEqual({
      id: 'rec-1',
      groupType: 'same_product',
      title: '가격 확인',
      reason: '행 검토 필요',
      relatedRowIds: ['A100__01'],
    });
  });

  it('returns client recommendations when officeCode is configured', async () => {
    requestAiSimilarityExtractionMatches.mockResolvedValue({
      recommendations: [
        {
          severity: 'medium',
          title: '같은 상품처럼 보이는데 코드가 다릅니다',
          reason: '상품명과 규격이 유사한데 코드가 나뉘어 있습니다.',
          relatedRowIds: ['A100__01', 'B200__01', 'A100__01'],
        },
      ],
    });

    const result = await analyzeAiSimilarityExtractionMatches(sampleRows, {
      officeCode: 'OFF-1',
      tableNameMode: 'fertilizer',
    });

    expect(result.mode).toBe('openai');
    expect(requestAiSimilarityExtractionMatches).toHaveBeenCalledWith({
      officeCode: 'OFF-1',
      tableNameMode: 'fertilizer',
      userHint: undefined,
      rows: [
        {
          row_id: 'A100__01',
          product_code: 'A100',
          product_name: 'Alpha Fertilizer',
          spec: '20kg',
          sale_price_type_name: '',
          zero_tax_price: 1200,
          tax_price: 1000,
          exempt_tax_price: null,
          nutrient: 'N-P-K',
        },
        {
          row_id: 'B200__01',
          product_code: 'B200',
          product_name: 'Alpha Fertilizer',
          spec: '20kg',
          sale_price_type_name: '',
          zero_tax_price: 900,
          tax_price: 980,
          exempt_tax_price: null,
          nutrient: 'N-P-K',
        },
      ],
    });
    expect(result.recommendations).toEqual([
      {
        severity: 'medium',
        title: '같은 상품처럼 보이는데 코드가 다릅니다',
        reason: '상품명과 규격이 유사한데 코드가 나뉘어 있습니다.',
        relatedRowIds: ['A100__01', 'B200__01', 'A100__01'],
      },
    ]);
  });

  it('strips bulky fields like a pesticide row\'s merged product_usage before sending', async () => {
    requestAiSimilarityExtractionMatches.mockResolvedValue({ recommendations: [] });

    const pesticideRows = [
      {
        row_id: 'P100__01',
        product_code: 'P100',
        product_name: '스미치온유제',
        spec: '100ml',
        tax_price: 5000,
        zero_tax_price: 6000,
        product_category: '살균제',
        product_usage: Array.from({ length: 50 }, (_, i) => ({
          cropName: `작물${i}`,
          diseaseWeedName: `병해충${i}`,
          pestiUse: '사용법',
          dilutUnit: '1000',
          useSuittime: '수확 7일 전',
          useNum: '3',
        })),
      },
    ];

    await analyzeAiSimilarityExtractionMatches(pesticideRows, {
      officeCode: 'OFF-1',
      tableNameMode: 'pesticide',
    });

    const sentRows = requestAiSimilarityExtractionMatches.mock.calls.at(-1)[0].rows;
    expect(sentRows).toHaveLength(1);
    expect(sentRows[0]).not.toHaveProperty('product_usage');
    expect(sentRows[0].product_category).toBe('살균제');
  });

  it('returns no recommendations when officeCode is empty', async () => {
    const result = await analyzeAiSimilarityExtractionMatches(sampleRows, {
      officeCode: '',
    });

    expect(result.mode).toBe('unavailable');
    expect(result.recommendations).toEqual([]);
  });

  it('returns an error result when the recommendation client fails', async () => {
    requestAiSimilarityExtractionMatches.mockRejectedValue(
      new Error('OpenAI 보조 분석에 실패했습니다.'),
    );

    const result = await analyzeAiSimilarityExtractionMatches(sampleRows, {
      officeCode: 'OFF-1',
    });

    expect(result.mode).toBe('error');
    expect(result.recommendations).toEqual([]);
    expect(result.message).toBe('OpenAI 보조 분석에 실패했습니다.');
  });

  it('returns an idle result when the row list is empty', async () => {
    const result = await analyzeAiSimilarityExtractionMatches([], {
      officeCode: 'OFF-1',
    });

    expect(result.mode).toBe('idle');
    expect(result.recommendations).toEqual([]);
  });
});
