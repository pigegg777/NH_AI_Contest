import { describe, expect, it } from 'vitest';

import {
  getStaticFertilizerProductCodes,
  mergeRowsWithStaticFertilizer,
} from '../model/merge/staticFertilizerMergeModel';

describe('static fertilizer merge model', () => {
  it('dedupes normalized product codes and merges lookup fields into rows', () => {
    const rows = [
      { product_code: ' A100 ' },
      { product_code: 'A100' },
      { product_code: 'B200' },
      { product_code: '' },
    ];

    expect(getStaticFertilizerProductCodes(rows)).toEqual(['A100', 'B200']);

    expect(
      mergeRowsWithStaticFertilizer(
        [{ row_id: 'A100__01', product_code: 'A100' }, { row_id: 'B200__01', product_code: 'B200' }],
        {
          A100: {
            product_code: 'A100',
            img_url: 'https://example.com/a100.png',
            product_url: 'https://example.com/a100',
            nutrient: 'N-P-K',
            price_subsidy: 1200,
          },
        },
      ),
    ).toEqual([
      expect.objectContaining({
        row_id: 'A100__01',
        img_url: 'https://example.com/a100.png',
        product_url: 'https://example.com/a100',
        nutrient: 'N-P-K',
        price_subsidy: 1200,
      }),
      expect.objectContaining({
        row_id: 'B200__01',
        img_url: null,
        product_url: null,
        nutrient: null,
        price_subsidy: null,
      }),
    ]);
  });
});

