import { describe, expect, it } from 'vitest';

import { formatFieldDisplayValue, formatManufacturerList, hasRenderableValue } from '../model/card-grid-section/cardFieldRenderModel';

describe('hasRenderableValue', () => {
  it('treats null, undefined, empty string, and empty arrays as not renderable', () => {
    expect(hasRenderableValue(null)).toBe(false);
    expect(hasRenderableValue(undefined)).toBe(false);
    expect(hasRenderableValue('')).toBe(false);
    expect(hasRenderableValue([])).toBe(false);
  });

  it('treats 0, non-empty strings, and non-empty arrays as renderable', () => {
    expect(hasRenderableValue(0)).toBe(true);
    expect(hasRenderableValue('Alpha')).toBe(true);
    expect(hasRenderableValue(['a'])).toBe(true);
  });
});

describe('formatFieldDisplayValue', () => {
  it('formats tax-like fields as Korean currency', () => {
    expect(formatFieldDisplayValue('tax_price', 1000)).toBe('1,000원');
    expect(formatFieldDisplayValue('zero_tax_price', 900)).toBe('900원');
  });

  it('returns an empty string for empty values', () => {
    expect(formatFieldDisplayValue('spec', null)).toBe('');
    expect(formatFieldDisplayValue('spec', '')).toBe('');
  });

  it('previews generic structured arrays with a truncation marker beyond 3 items', () => {
    expect(formatFieldDisplayValue('custom_tags', ['A', 'B', 'C', 'D'])).toBe('[A, B, C, ...]');
  });

  it('stringifies plain scalar values', () => {
    expect(formatFieldDisplayValue('product_name', 'Alpha')).toBe('Alpha');
  });

  it('flattens manufacturer_list into comma-joined manufacturer names', () => {
    expect(
      formatFieldDisplayValue('manufacturer_list', [
        { manufacturer_name: '경농' },
        { manufacturer_name: '팜한농' },
      ]),
    ).toBe('경농, 팜한농');
  });

  it('hides manufacturer_list when every entry is missing a name', () => {
    expect(formatFieldDisplayValue('manufacturer_list', [{ manufacturer_name: '' }, {}])).toBe('');
  });
});

describe('formatManufacturerList', () => {
  it('joins manufacturer names with a comma', () => {
    expect(formatManufacturerList([{ manufacturer_name: '경농' }, { manufacturer_name: '팜한농' }])).toBe(
      '경농, 팜한농',
    );
  });

  it('drops blank or missing names', () => {
    expect(formatManufacturerList([{ manufacturer_name: '경농' }, { manufacturer_name: '' }, {}])).toBe('경농');
  });

  it('returns an empty string for an empty or non-array list', () => {
    expect(formatManufacturerList([])).toBe('');
    expect(formatManufacturerList(null)).toBe('');
    expect(formatManufacturerList(undefined)).toBe('');
  });
});
