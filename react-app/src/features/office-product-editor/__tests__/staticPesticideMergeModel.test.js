import { describe, expect, it } from 'vitest';

import {
  getStaticPesticideProductCodes,
  mergeRowsWithStaticPesticide,
} from '../model/static-data-merge/staticPesticideMergeModel';

describe('static pesticide merge model', () => {
  it('dedupes normalized product codes and merges lookup fields into rows', () => {
    const rows = [
      { product_code: ' A100 ' },
      { product_code: 'A100' },
      { product_code: 'B200' },
      { product_code: '' },
    ];

    expect(getStaticPesticideProductCodes(rows)).toEqual(['A100', 'B200']);

    expect(
      mergeRowsWithStaticPesticide(
        [{ row_id: 'A100__01', product_code: 'A100' }, { row_id: 'B200__01', product_code: 'B200' }],
        {
          A100: {
            product_code: 'A100',
            nutirent: '클로르페나피르 액상수화제',
            product_category: '살충',
            product_usage: [
              {
                cropName: '고추',
                diseaseWeedName: '꽃노랑총채벌레',
                pestiUse: '경엽처리',
                dilutUnit: '2000배',
                useSuittime: '수확3일전',
                useNum: '3회',
              },
            ],
            indict_symbl: '13',
          },
        },
      ),
    ).toEqual([
      expect.objectContaining({
        row_id: 'A100__01',
        nutirent: '클로르페나피르 액상수화제',
        product_category: '살충',
        product_usage: [
          expect.objectContaining({ cropName: '고추' }),
        ],
        indict_symbl: '13',
      }),
      expect.objectContaining({
        row_id: 'B200__01',
        nutirent: null,
        product_category: null,
        product_usage: [],
        indict_symbl: null,
      }),
    ]);
  });
});
