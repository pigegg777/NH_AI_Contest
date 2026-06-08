import { describe, expect, it } from 'vitest';

import {
  EMPTY_FILTER_VALUE,
  SORT_DIRECTION,
  createInitialFilters,
} from '../model/workbook-review/table';
import {
  buildFilterOptions,
  buildTableModel,
  formatManufacturerList,
  getWarningRows,
  sortRows,
} from '../model/workbook-review/table';

const sampleRows = [
  {
    product_code: 'B200',
    product_name: '복합비료',
    nutrient: 'P-K',
    price_subsidy: 1200,
    img_url: null,
    product_url: null,
    sale_price_type_code: 'TYPE-B',
    sale_price_type_name: '기본단가',
    large_category: '비료',
    medium_category: '무기질비료(일반)',
    small_category: '복비',
    detail_category: '',
    tax_price: 1200,
    zero_tax_price: null,
    spec: '20kg',
    manufacturer_list: [{ manufacturer_code: 'M02', manufacturer_name: '제조사B' }],
    warnings: ['과세만 존재'],
  },
  {
    product_code: 'A100',
    product_name: '단비료',
    nutrient: 'N-P-K',
    price_subsidy: 980,
    img_url: 'https://example.com/a100.png',
    product_url: 'https://example.com/a100',
    sale_price_type_code: 'TYPE-A',
    sale_price_type_name: '회원단가',
    large_category: '비료',
    medium_category: '무기질비료(일반)',
    small_category: '단비',
    detail_category: null,
    tax_price: 980,
    zero_tax_price: 900,
    spec: '20kg',
    manufacturer_list: [{ manufacturer_code: 'M01', manufacturer_name: '제조사A' }],
    warnings: [],
  },
];

describe('excel extract workbook review table model', () => {
  it('builds filter options and keeps an empty marker for nullable categories', () => {
    const filterOptions = buildFilterOptions(sampleRows);

    expect(filterOptions.sale_price_type_name).toEqual(['기본단가', '회원단가']);
    expect(filterOptions.detail_category).toEqual([EMPTY_FILTER_VALUE]);
  });

  it('filters by nutrient search and collects warning rows through one interface', () => {
    const filters = createInitialFilters();
    filters.small_category = '단비';

    const tableModel = buildTableModel(sampleRows, 'n-p-k', filters, {
      key: 'tax_price',
      direction: SORT_DIRECTION.descending,
    });

    expect(tableModel.sortedRows).toHaveLength(1);
    expect(tableModel.sortedRows[0].product_code).toBe('A100');
    expect(tableModel.warningRows).toEqual([sampleRows[0]]);
  });

  it('sorts the new static fertilizer fields', () => {
    const sortedRows = sortRows(sampleRows, {
      key: 'price_subsidy',
      direction: SORT_DIRECTION.descending,
    });

    expect(sortedRows.map((row) => row.product_code)).toEqual(['B200', 'A100']);
  });

  it('formats manufacturer rows for sorting and rendering', () => {
    expect(getWarningRows(sampleRows)).toHaveLength(1);
    expect(formatManufacturerList(sampleRows[0].manufacturer_list)).toBe('제조사B / M02');
    expect(formatManufacturerList([])).toBe('-');
  });
});
