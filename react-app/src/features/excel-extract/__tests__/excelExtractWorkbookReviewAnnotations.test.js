import { describe, expect, it } from 'vitest';

import { mergeRowsWithAnnotations } from '../model/annotations/annotationModel';

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

  it('keeps the extracted price values when no annotation override exists', () => {
    const rowsWithPrices = [
      { ...sampleRows[0], tax_price: 1000, zero_tax_price: 900 },
    ];

    const [merged] = mergeRowsWithAnnotations(rowsWithPrices, {});

    expect(merged.tax_price).toBe(1000);
    expect(merged.zero_tax_price).toBe(900);
  });

  it('applies tax_price/zero_tax_price overrides from annotations over the extracted values', () => {
    const rowsWithPrices = [
      { ...sampleRows[0], tax_price: 1000, zero_tax_price: 900 },
    ];

    const [merged] = mergeRowsWithAnnotations(rowsWithPrices, {
      A100__01: { shadow: false, note: '', tax_price: 1500, zero_tax_price: 1400 },
    });

    expect(merged.tax_price).toBe(1500);
    expect(merged.zero_tax_price).toBe(1400);
  });
});

