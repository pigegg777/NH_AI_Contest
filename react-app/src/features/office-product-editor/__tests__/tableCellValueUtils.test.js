import { describe, expect, it } from 'vitest';

import {
  formatManufacturerList,
  formatPriceValue,
  getCellTextValue,
  parsePriceDraftValue,
} from '../utils/reviewTableCellValueUtils';

describe('table cell value utils', () => {
  it('formats manufacturer lists and numeric price values for display', () => {
    expect(formatManufacturerList([{ manufacturer_name: '제조사A' }])).toBe(
      '제조사A',
    );
    expect(formatManufacturerList([])).toBe('-');
    expect(formatPriceValue(1200)).toBe('1,200');
    expect(formatPriceValue(null)).toBe('-');
  });

  it('builds text values for special table cell types', () => {
    const row = {
      manufacturer_list: [{ manufacturer_name: '제조사A' }],
      img_url: null,
      product_url: 'https://example.com/product',
      product_usage: [{ cropName: 'pepper' }, { cropName: 'rice' }],
      tax_price: 1200,
      product_name: '테스트비료',
    };

    expect(getCellTextValue(row, 'manufacturer_list')).toBe('제조사A');
    expect(getCellTextValue(row, 'img_url')).toBe('-');
    expect(getCellTextValue(row, 'product_url')).toBe(
      'https://example.com/product',
    );
    expect(getCellTextValue(row, 'product_usage')).toBe('2건');
    expect(getCellTextValue(row, 'tax_price')).toBe('1,200');
    expect(getCellTextValue(row, 'product_name')).toBe('테스트비료');
  });

  it('parses price drafts with the shared worksheet number parser', () => {
    expect(parsePriceDraftValue('')).toBeNull();
    expect(parsePriceDraftValue(' 1,500 ')).toBe(1500);
    expect(parsePriceDraftValue('invalid')).toBeUndefined();
  });
});
