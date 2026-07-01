import { toLowerTrimmedString } from '../../../../common/utils/text';
import { formatManufacturerList } from '../../utils/reviewTableCellValueUtils';


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

export function createInitialFilters() {
  return FILTER_FIELDS.reduce((filters, field) => {
    filters[field.key] = field.initialValue;
    return filters;
  }, {});
}

export function matchesFilter(row, key, selectedValue) {
  if (!selectedValue) {
    return true;
  }

  const rowValue = row[key];

  if (selectedValue === '__empty__') {
    return rowValue == null || rowValue === '';
  }

  return rowValue === selectedValue;
}

export function matchesSearch(
  row,
  query,
  searchValueGetters = DEFAULT_SEARCH_VALUE_GETTERS,
) {
  if (!query) {
    return true;
  }

  const haystacks = searchValueGetters
    .map((getValue) => getValue(row))
    .filter((value) => value != null && value !== '')
    .map((value) => toLowerTrimmedString(value));

  return haystacks.some((value) => value.includes(query));
}

export function filterRows(
  rows,
  searchQuery,
  filters,
  searchValueGetters = DEFAULT_SEARCH_VALUE_GETTERS,
) {
  return rows.filter(
    (row) =>
      matchesSearch(row, searchQuery, searchValueGetters) &&
      FILTER_FIELDS.every((field) =>
        matchesFilter(row, field.key, filters[field.key]),
      ),
  );
}
