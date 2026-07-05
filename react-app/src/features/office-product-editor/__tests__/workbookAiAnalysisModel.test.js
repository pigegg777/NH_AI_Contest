import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAiRecommendation } from '../model/ai-recommendations/workbookAiRecommendationModel';
import { analyzeWorkbookAiRecommendations } from '../model/ai-recommendations/workbookAiAnalysisModel';
import { requestWorkbookAiRecommendations } from '../services/workbook-ai-recommendation/workbookAiRecommendationClient';

vi.mock('../services/workbook-ai-recommendation/workbookAiRecommendationClient', () => ({
  requestWorkbookAiRecommendations: vi.fn(),
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

describe('workbookAiAnalysisModel', () => {
  it('creates a minimal recommendation model', () => {
    expect(
      createAiRecommendation({
        id: 'rec-1',
        severity: 'high',
        title: '가격 확인',
        reason: '행 검토 필요',
        relatedRowIds: ['A100__01', 'A100__01'],
      }),
    ).toEqual({
      id: 'rec-1',
      severity: 'high',
      title: '가격 확인',
      reason: '행 검토 필요',
      relatedRowIds: ['A100__01'],
    });
  });

  it('returns client recommendations when officeCode is configured', async () => {
    requestWorkbookAiRecommendations.mockResolvedValue({
      recommendations: [
        {
          severity: 'medium',
          title: '같은 상품처럼 보이는데 코드가 다릅니다',
          reason: '상품명과 규격이 유사한데 코드가 나뉘어 있습니다.',
          relatedRowIds: ['A100__01', 'B200__01', 'A100__01'],
        },
      ],
    });

    const result = await analyzeWorkbookAiRecommendations(sampleRows, {
      officeCode: 'OFF-1',
      tableNameMode: 'fertilizer',
    });

    expect(result.mode).toBe('openai');
    expect(requestWorkbookAiRecommendations).toHaveBeenCalledWith({
      officeCode: 'OFF-1',
      tableNameMode: 'fertilizer',
      rows: sampleRows,
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

  it('returns no recommendations when officeCode is empty', async () => {
    const result = await analyzeWorkbookAiRecommendations(sampleRows, {
      officeCode: '',
    });

    expect(result.mode).toBe('unavailable');
    expect(result.recommendations).toEqual([]);
  });

  it('returns an error result when the recommendation client fails', async () => {
    requestWorkbookAiRecommendations.mockRejectedValue(
      new Error('OpenAI 보조 분석에 실패했습니다.'),
    );

    const result = await analyzeWorkbookAiRecommendations(sampleRows, {
      officeCode: 'OFF-1',
    });

    expect(result.mode).toBe('error');
    expect(result.recommendations).toEqual([]);
    expect(result.message).toBe('OpenAI 보조 분석에 실패했습니다.');
  });

  it('returns an idle result when the row list is empty', async () => {
    const result = await analyzeWorkbookAiRecommendations([], {
      officeCode: 'OFF-1',
    });

    expect(result.mode).toBe('idle');
    expect(result.recommendations).toEqual([]);
  });
});
