import { beforeEach, describe, expect, it } from 'vitest';

import {
  readStoredAiSimilarityExtractionState,
  writeStoredAiSimilarityExtractionState,
} from '../model/ai-similarity-extraction/aiSimilarityExtractionStorageModel';

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

describe('aiSimilarityExtractionStorageModel', () => {
  it('round-trips a written state through storage', () => {
    writeStoredAiSimilarityExtractionState(globalThis.sessionStorage, 'fp-1', sampleState);

    expect(readStoredAiSimilarityExtractionState(globalThis.sessionStorage, 'fp-1')).toEqual(
      sampleState,
    );
  });

  it('returns null when nothing is stored for the fingerprint', () => {
    expect(readStoredAiSimilarityExtractionState(globalThis.sessionStorage, 'fp-missing')).toBe(
      null,
    );
  });

  it('keeps state scoped to its own workbook fingerprint', () => {
    writeStoredAiSimilarityExtractionState(globalThis.sessionStorage, 'fp-1', sampleState);

    expect(readStoredAiSimilarityExtractionState(globalThis.sessionStorage, 'fp-2')).toBe(null);
  });

  it('returns null for corrupted JSON instead of throwing', () => {
    globalThis.sessionStorage.setItem('office-product-editor:ai-similarity-extraction:fp-1', '{not json');

    expect(readStoredAiSimilarityExtractionState(globalThis.sessionStorage, 'fp-1')).toBe(null);
  });

  it('returns null without a workbook fingerprint', () => {
    expect(readStoredAiSimilarityExtractionState(globalThis.sessionStorage, '')).toBe(null);
    writeStoredAiSimilarityExtractionState(globalThis.sessionStorage, '', sampleState);
    expect(globalThis.sessionStorage.length).toBe(0);
  });
});
