import { describe, expect, it } from 'vitest';

import { mergeRowsWithAnnotations } from '../model/workbook-review/annotations/annotationModel';

const sampleRows = [
  {
    row_id: 'A100__01',
    product_code: 'A100',
    product_name: 'Alpha',
    sale_price_type_code: '01',
    sale_price_type_name: 'base',
  },
  {
    row_id: 'B200__02',
    product_code: 'B200',
    product_name: 'Beta',
    sale_price_type_code: '02',
    sale_price_type_name: 'member',
  },
];

describe('excel extract workbook review annotations', () => {
  it('merges rows with default shadow and note values', () => {
    expect(mergeRowsWithAnnotations(sampleRows, {})).toEqual([
      expect.objectContaining({
        row_id: 'A100__01',
        shadow: false,
        note: '',
      }),
      expect.objectContaining({
        row_id: 'B200__02',
        shadow: false,
        note: '',
      }),
    ]);
  });
});
