import { EMPTY_FILTER_VALUE, FILTER_FIELDS, SORT_DIRECTION } from './tableConfigModel';
import { toLowerTrimmedString } from '../../../../common/utils/text';

const collator = new Intl.Collator('ko-KR', { numeric: true, sensitivity: 'base' });

export function formatManufacturerList(manufacturerList) {
  if (!manufacturerList || manufacturerList.length === 0) {
    return '-';
  }

  return manufacturerList
    .map(({ manufacturer_name: manufacturerName }) => manufacturerName)
    .filter(Boolean)
    .join(', ');
}

export function getWarningRows(rows) {
  return rows.filter((row) => Array.isArray(row.warnings) && row.warnings.length > 0);
}

export function getFilterOptions(rows, key) {
  const values = new Set();
  let hasEmptyValue = false;

  rows.forEach((row) => {
    const value = row[key];

    if (value == null || value === '') {
      hasEmptyValue = true;
      return;
    }

    values.add(value);
  });

  const options = [...values].sort((left, right) => collator.compare(String(left), String(right)));

  if (hasEmptyValue) {
    options.push(EMPTY_FILTER_VALUE);
  }

  return options;
}

export function buildFilterOptions(rows) {
  return FILTER_FIELDS.reduce((options, field) => {
    options[field.key] = getFilterOptions(rows, field.key);
    return options;
  }, {});
}

function getComparableValue(row, key) {
  if (key === 'manufacturer_list') {
    return formatManufacturerList(row.manufacturer_list);
  }

  return row[key];
}

export function matchesSearch(row, query) {
  if (!query) {
    return true;
  }

  const haystacks = [
    row.product_code,
    row.product_name,
    row.nutrient,
    row.price_subsidy,
    row.product_nutirent,
    row.product_category,
    row.sale_price_type_code,
    row.sale_price_type_name,
    row.large_category,
    row.medium_category,
    row.small_category,
    row.detail_category,
    formatManufacturerList(row.manufacturer_list),
  ]
    .filter((value) => value != null && value !== '')
    .map((value) => toLowerTrimmedString(value));

  return haystacks.some((value) => value.includes(query));
}

export function matchesFilter(row, key, selectedValue) {
  if (!selectedValue) {
    return true;
  }

  const rowValue = row[key];

  if (selectedValue === EMPTY_FILTER_VALUE) {
    return rowValue == null || rowValue === '';
  }

  return rowValue === selectedValue;
}

export function filterRows(rows, searchQuery, filters) {
  return rows.filter(
    (row) =>
      matchesSearch(row, searchQuery) &&
      FILTER_FIELDS.every((field) => matchesFilter(row, field.key, filters[field.key])),
  );
}

export function sortRows(rows, sortState) {
  if (!sortState) {
    return rows;
  }

  const directionFactor = sortState.direction === SORT_DIRECTION.ascending ? 1 : -1;

  return [...rows].sort((left, right) => {
    const leftValue = getComparableValue(left, sortState.key);
    const rightValue = getComparableValue(right, sortState.key);

    if (leftValue == null && rightValue == null) {
      return 0;
    }

    if (leftValue == null) {
      return 1;
    }

    if (rightValue == null) {
      return -1;
    }

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * directionFactor;
    }

    return collator.compare(String(leftValue), String(rightValue)) * directionFactor;
  });
}

export function buildTableModel(rows, searchQuery, filters, sortState) {
  const filterOptions = buildFilterOptions(rows);
  const filteredRows = filterRows(rows, searchQuery, filters);
  const sortedRows = sortRows(filteredRows, sortState);
  const warningRows = getWarningRows(rows);

  return {
    filterOptions,
    sortedRows,
    warningRows,
  };
}

