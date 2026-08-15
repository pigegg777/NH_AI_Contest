import { describe, expect, it } from 'vitest';

import { filterRowsByActiveRecommendation } from '../model/ai-recommendations/workbookAiRecommendationRowFilterModel';

const rows = [
  { row_id: 'A100__01', product_name: 'Alpha' },
  { row_id: 'B200__01', product_name: 'Beta' },
  { row_id: 'C300__01', product_name: 'Gamma' },
];

const recommendations = [
  { id: 'rec-1', relatedRowIds: ['A100__01', 'B200__01'] },
  { id: 'rec-2', relatedRowIds: ['C300__01'] },
];

describe('filterRowsByActiveRecommendation', () => {
  it('returns all rows when no recommendation is active', () => {
    expect(filterRowsByActiveRecommendation(rows, recommendations, null)).toEqual(rows);
  });

  it('filters rows down to the active recommendation related row ids', () => {
    expect(filterRowsByActiveRecommendation(rows, recommendations, 'rec-1')).toEqual([
      rows[0],
      rows[1],
    ]);
  });

  it('returns all rows when the active recommendation id does not match any recommendation', () => {
    expect(filterRowsByActiveRecommendation(rows, recommendations, 'rec-missing')).toEqual(rows);
  });
});
