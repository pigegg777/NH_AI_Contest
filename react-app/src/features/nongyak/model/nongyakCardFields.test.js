import { describe, expect, it } from 'vitest';
import {
  buildCategoryOptions,
  formatNongyakDisplayValue,
  NONGYAK_USAGE_COLUMNS,
} from './nongyakCardFields';

describe('formatNongyakDisplayValue', () => {
  it('returns the trimmed value when present', () => {
    expect(formatNongyakDisplayValue('  살균  ')).toBe('살균');
  });

  it('returns a dash for null, undefined, or empty string', () => {
    expect(formatNongyakDisplayValue(null)).toBe('-');
    expect(formatNongyakDisplayValue(undefined)).toBe('-');
    expect(formatNongyakDisplayValue('   ')).toBe('-');
  });
});

describe('buildCategoryOptions', () => {
  it('prefixes with the all-option and sorts distinct categories in Korean order', () => {
    const rows = [
      { product_category: '살충' },
      { product_category: '살균' },
      { product_category: '살충' },
      { product_category: null },
    ];

    expect(buildCategoryOptions(rows)).toEqual(['전체', '살균', '살충']);
  });

  it('returns only the all-option for an empty list', () => {
    expect(buildCategoryOptions([])).toEqual(['전체']);
  });
});

describe('NONGYAK_USAGE_COLUMNS', () => {
  it('maps the six raw RDA usage fields to Korean labels in display order', () => {
    expect(NONGYAK_USAGE_COLUMNS.map((col) => col.key)).toEqual([
      'cropName',
      'diseaseWeedName',
      'pestiUse',
      'dilutUnit',
      'useSuittime',
      'useNum',
    ]);
    expect(NONGYAK_USAGE_COLUMNS.map((col) => col.label)).toEqual([
      '작물',
      '대상 병해충/잡초',
      '사용방법',
      '희석배수',
      '사용시기',
      '사용횟수',
    ]);
  });
});
