import { describe, expect, it } from 'vitest';

import {
  getStaticFertilizerProductCodes,
  mergeRowsWithStaticFertilizer,
} from '../model/static-data-merge/staticFertilizerMergeModel';

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

  it('preserves an img_url already on the row instead of overwriting it from the static lookup', () => {
    const result = mergeRowsWithStaticFertilizer(
      [
        {
          row_id: 'A100__01',
          product_code: 'A100',
          img_url: 'https://example.supabase.co/storage/v1/object/public/product-images/OFF-1/x.png',
        },
      ],
      {
        A100: {
          product_code: 'A100',
          img_url: 'https://example.com/static-a100.png',
        },
      },
    );

    expect(result[0].img_url).toBe(
      'https://example.supabase.co/storage/v1/object/public/product-images/OFF-1/x.png',
    );
  });

  it('falls back to the static lookup img_url when the row has none', () => {
    const result = mergeRowsWithStaticFertilizer(
      [{ row_id: 'A100__01', product_code: 'A100', img_url: '' }],
      { A100: { product_code: 'A100', img_url: 'https://example.com/static-a100.png' } },
    );

    expect(result[0].img_url).toBe('https://example.com/static-a100.png');
  });

  it('flags img_url_is_static when the effective img_url came from the static lookup', () => {
    const result = mergeRowsWithStaticFertilizer(
      [{ row_id: 'A100__01', product_code: 'A100', img_url: '' }],
      { A100: { product_code: 'A100', img_url: 'https://example.com/static-a100.png' } },
    );

    expect(result[0].img_url_is_static).toBe(true);
  });

  it('does not flag img_url_is_static when the row already has its own img_url', () => {
    const result = mergeRowsWithStaticFertilizer(
      [
        {
          row_id: 'A100__01',
          product_code: 'A100',
          img_url: 'https://example.supabase.co/storage/v1/object/public/product-images/OFF-1/x.png',
        },
      ],
      { A100: { product_code: 'A100', img_url: 'https://example.com/static-a100.png' } },
    );

    expect(result[0].img_url_is_static).toBe(false);
  });

  it('still flags img_url_is_static after the static value was previously saved onto the row itself (reload-after-save)', () => {
    // Once a row is saved, the merged img_url gets persisted as the row's
    // own field — on the next load, row.img_url is no longer empty, it now
    // literally equals the static registry's current value.
    const result = mergeRowsWithStaticFertilizer(
      [{ row_id: 'A100__01', product_code: 'A100', img_url: 'https://example.com/static-a100.png' }],
      { A100: { product_code: 'A100', img_url: 'https://example.com/static-a100.png' } },
    );

    expect(result[0].img_url_is_static).toBe(true);
  });

  it('does not flag img_url_is_static when neither the row nor the static lookup has an image', () => {
    const result = mergeRowsWithStaticFertilizer(
      [{ row_id: 'B200__01', product_code: 'B200' }],
      {},
    );

    expect(result[0].img_url_is_static).toBe(false);
  });
});
