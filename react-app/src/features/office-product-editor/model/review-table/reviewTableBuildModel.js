import { ReviewTableFilterModel } from './reviewTableFilterModel';
import { ReviewTableSortModel } from './reviewTableSortModel';
import { formatManufacturerList } from '../../utils/reviewTableCellValueUtils';

const DEFAULT_SEARCH_VALUE_GETTERS = [
  (row) => row.product_code,
  (row) => row.product_name,
  (row) => row.nutrient,
  (row) => row.price_subsidy,
  (row) => row.product_nutirent,
  (row) => row.product_category,
  (row) => row.sale_price_type_code,
  (row) => row.sale_price_type_name,
  (row) => row.large_category,
  (row) => row.medium_category,
  (row) => row.small_category,
  (row) => row.detail_category,
  (row) => formatManufacturerList(row.manufacturer_list),
];

export const FILTER_FIELDS = [
  {
    key: 'sale_price_type_name',
    id: 'filter-sale-price-type',
    label: '단가유형',
    initialValue: '',
  },
  {
    key: 'medium_category',
    id: 'filter-medium-category',
    label: '중분류',
    initialValue: '',
  },
  {
    key: 'small_category',
    id: 'filter-small-category',
    label: '소분류',
    initialValue: '',
  },
  {
    key: 'detail_category',
    id: 'filter-detail-category',
    label: '세분류',
    initialValue: '',
  },
];

export function createInitialFilters() {
  return FILTER_FIELDS.reduce((filters, field) => {
    filters[field.key] = field.initialValue;
    return filters;
  }, {});
}

export class ReviewTableBuildModel {
  constructor(
    rows,
    searchQuery,
    filters,
    sortState,
    searchValueGetters = DEFAULT_SEARCH_VALUE_GETTERS,
  ) {
    this.rows = rows;
    this.searchQuery = searchQuery;
    this.filters = filters;
    this.sortState = sortState;
    this.searchValueGetters = searchValueGetters;
  }

  static buildFilterOptions(rows) {
    return FILTER_FIELDS.reduce((options, field) => {
      const values = new Set();
      let hasEmptyValue = false;

      rows.forEach((row) => {
        const value = row[field.key];

        if (value == null || value === '') {
          hasEmptyValue = true;
          return;
        }

        values.add(value);
      });

      options[field.key] = [...values].sort((left, right) =>
        String(left).localeCompare(String(right), 'ko-KR', {
          numeric: true,
          sensitivity: 'base',
        }),
      );

      if (hasEmptyValue) {
        options[field.key].push('__empty__');
      }

      return options;
    }, {});
  }

  build() {
    const filteredRows = new ReviewTableFilterModel(
      this.rows,
      this.searchQuery,
      this.filters,
      FILTER_FIELDS,
      DEFAULT_SEARCH_VALUE_GETTERS,
    ).filterRows();
    const sortedRows = new ReviewTableSortModel(
      filteredRows,
      this.sortState,
    ).sortRows();
    const warningRows = this.rows.filter(
      (row) => Array.isArray(row.warnings) && row.warnings.length > 0,
    );
    return {
      sortedRows,
      warningRows,
    };
  }
}
