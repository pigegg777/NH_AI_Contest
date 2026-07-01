import {
  FILTER_FIELDS,
  filterRows,
} from './reviewTableFilterModel';
import { sortRows } from './reviewTableSortModel';

export function buildFilterOptions(rows) {
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

export function buildTableModel(
  rows,
  searchQuery,
  filters,
  sortState,
  searchValueGetters,
) {
  const filterOptions = buildFilterOptions(rows);
  const filteredRows = filterRows(
    rows,
    searchQuery,
    filters,
    searchValueGetters,
  );
  const sortedRows = sortRows(filteredRows, sortState);
  const warningRows = rows.filter(
    (row) => Array.isArray(row.warnings) && row.warnings.length > 0,
  );

  return {
    filterOptions,
    sortedRows,
    warningRows,
  };
}
