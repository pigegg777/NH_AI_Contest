import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TABLE_COLUMNS,
  FERTILIZER_TABLE_COLUMNS,
  PESTICIDE_TABLE_COLUMNS,
  getTableColumnsByMode,
} from '../model/review-table/reviewTableConfigModel';
import {
  createInitialFilters,
  ReviewTableBuildModel,
} from '../model/review-table/reviewTableBuildModel';
import { ReviewTableSortModel } from '../model/review-table/reviewTableSortModel';
import { formatManufacturerList } from '../utils/reviewTableCellValueUtils';

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
    manufacturer_list: [{ manufacturer_name: '제조사B' }],
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
    manufacturer_list: [{ manufacturer_name: '제조사A' }],
    warnings: [],
  },
];

describe('excel extract workbook review table model', () => {
  it('builds filter options and keeps an empty marker for nullable categories', () => {
    const filterOptions = ReviewTableBuildModel.buildFilterOptions(sampleRows);

    expect(filterOptions.sale_price_type_name).toEqual(['기본단가', '회원단가']);
    expect(filterOptions.detail_category).toEqual(['__empty__']);
  });

  it('filters by nutrient search and collects warning rows through one interface', () => {
    const filters = createInitialFilters();
    filters.small_category = '단비';

    const tableModel = new ReviewTableBuildModel(sampleRows, 'n-p-k', filters, {
      key: 'tax_price',
      direction: 'desc',
    }).build();

    expect(tableModel.sortedRows).toHaveLength(1);
    expect(tableModel.sortedRows[0].product_code).toBe('A100');
    expect(tableModel.warningRows).toEqual([sampleRows[0]]);
  });

  it('sorts the new static fertilizer fields', () => {
    const sortedRows = new ReviewTableSortModel(sampleRows, {
      key: 'price_subsidy',
      direction: 'desc',
    }).sortRows();

    expect(sortedRows.map((row) => row.product_code)).toEqual(['B200', 'A100']);
  });

  it('formats manufacturer rows for sorting and rendering', () => {
    expect(
      new ReviewTableBuildModel(sampleRows, '', createInitialFilters(), {
        key: 'product_code',
        direction: 'asc',
      }).build().warningRows,
    ).toHaveLength(1);
    expect(formatManufacturerList(sampleRows[0].manufacturer_list)).toBe('제조사B');
    expect(formatManufacturerList([])).toBe('-');
  });

  it('returns the extended fertilizer column set for fertilizer mode', () => {
    const extendedKeys = FERTILIZER_TABLE_COLUMNS.map((column) => column.key);

    expect(extendedKeys.slice(0, 8)).toEqual(
      DEFAULT_TABLE_COLUMNS.slice(0, 8).map((column) => column.key),
    );
    expect(extendedKeys).toContain('nutrient');
    expect(extendedKeys).toContain('price_subsidy');
    expect(extendedKeys).toContain('img_url');
    expect(extendedKeys).toContain('product_url');
    expect(extendedKeys[13]).toBe('price_subsidy');
    expect(extendedKeys[15]).toBe('product_url');
    expect(extendedKeys[8]).toBe('note');
    expect(getTableColumnsByMode('fertilizer')).toBe(FERTILIZER_TABLE_COLUMNS);
  });

  it('returns the default column set plus pesticide-specific columns for pesticide mode', () => {
    const pesticideKeys = PESTICIDE_TABLE_COLUMNS.map((column) => column.key);
    const defaultKeys = DEFAULT_TABLE_COLUMNS.map((column) => column.key);

    expect(pesticideKeys.slice(0, defaultKeys.length)).toEqual(defaultKeys);
    expect(pesticideKeys).toContain('nutirent');
    expect(pesticideKeys).toContain('product_category');
    expect(pesticideKeys).toContain('product_usage');
    expect(pesticideKeys).toContain('indict_symbl');
    expect(pesticideKeys).not.toContain('nutrient');
    expect(pesticideKeys).toContain('img_url');
    expect(pesticideKeys).not.toContain('product_url');
    expect(getTableColumnsByMode('pesticide')).toBe(PESTICIDE_TABLE_COLUMNS);
  });

  it('returns the default column set with img_url but without nutrient/subsidy/product_url columns for custom and unset modes', () => {
    const defaultKeys = DEFAULT_TABLE_COLUMNS.map((column) => column.key);

    expect(defaultKeys).not.toContain('nutrient');
    expect(defaultKeys).not.toContain('price_subsidy');
    expect(defaultKeys).toContain('img_url');
    expect(defaultKeys).not.toContain('product_url');
    expect(defaultKeys).toHaveLength(FERTILIZER_TABLE_COLUMNS.length - 3);
    expect(getTableColumnsByMode('custom')).toBe(DEFAULT_TABLE_COLUMNS);
    expect(getTableColumnsByMode('')).toBe(DEFAULT_TABLE_COLUMNS);
    expect(getTableColumnsByMode(undefined)).toBe(DEFAULT_TABLE_COLUMNS);
  });
});
