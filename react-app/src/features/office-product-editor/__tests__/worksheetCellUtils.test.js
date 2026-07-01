import { describe, expect, it } from 'vitest';

import {
  getCell,
  normalizeHeaderCell,
  normalizeWorksheetNumber,
} from '../utils/worksheetCellUtils';

describe('worksheet cell utils', () => {
  it('returns null for missing or invalid indexes', () => {
    expect(getCell(['A', 'B'], null)).toBeNull();
    expect(getCell(['A', 'B'], -1)).toBeNull();
    expect(getCell(['A', 'B'], 4)).toBeNull();
  });

  it('normalizes header text by removing line breaks and spaces', () => {
    expect(normalizeHeaderCell(' 매출\n단가 유형 ')).toBe('매출단가유형');
    expect(normalizeHeaderCell(null)).toBe('');
  });

  it('normalizes worksheet numeric cells into finite numbers', () => {
    expect(normalizeWorksheetNumber(null)).toBeNull();
    expect(normalizeWorksheetNumber('')).toBeNull();
    expect(normalizeWorksheetNumber(' 1,000 ')).toBe(1000);
    expect(normalizeWorksheetNumber(42)).toBe(42);
    expect(normalizeWorksheetNumber('not-a-number')).toBeNull();
  });
});
