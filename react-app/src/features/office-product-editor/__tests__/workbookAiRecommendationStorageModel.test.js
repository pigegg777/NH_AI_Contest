import { beforeEach, describe, expect, it } from 'vitest';

import {
  readStoredWorkbookAiRecommendationState,
  writeStoredWorkbookAiRecommendationState,
} from '../model/ai-recommendations/workbookAiRecommendationStorageModel';

const sampleState = {
  recommendations: [
    {
      id: 'rec-1',
      groupType: 'same_product',
      title: '가격 확인 필요',
      reason: '동일 상품 가격 상이',
      relatedRowIds: ['A100__01'],
    },
  ],
  analysisMode: 'openai',
  analysisMessage: '',
  activeRecommendationId: 'rec-1',
};

beforeEach(() => {
  globalThis.sessionStorage.clear();
});

describe('workbookAiRecommendationStorageModel', () => {
  it('round-trips a written state through storage', () => {
    writeStoredWorkbookAiRecommendationState(globalThis.sessionStorage, 'fp-1', sampleState);

    expect(readStoredWorkbookAiRecommendationState(globalThis.sessionStorage, 'fp-1')).toEqual(
      sampleState,
    );
  });

  it('returns null when nothing is stored for the fingerprint', () => {
    expect(readStoredWorkbookAiRecommendationState(globalThis.sessionStorage, 'fp-missing')).toBe(
      null,
    );
  });

  it('keeps state scoped to its own workbook fingerprint', () => {
    writeStoredWorkbookAiRecommendationState(globalThis.sessionStorage, 'fp-1', sampleState);

    expect(readStoredWorkbookAiRecommendationState(globalThis.sessionStorage, 'fp-2')).toBe(null);
  });

  it('returns null for corrupted JSON instead of throwing', () => {
    globalThis.sessionStorage.setItem('office-product-editor:ai-recommendations:fp-1', '{not json');

    expect(readStoredWorkbookAiRecommendationState(globalThis.sessionStorage, 'fp-1')).toBe(null);
  });

  it('returns null without a workbook fingerprint', () => {
    expect(readStoredWorkbookAiRecommendationState(globalThis.sessionStorage, '')).toBe(null);
    writeStoredWorkbookAiRecommendationState(globalThis.sessionStorage, '', sampleState);
    expect(globalThis.sessionStorage.length).toBe(0);
  });
});
