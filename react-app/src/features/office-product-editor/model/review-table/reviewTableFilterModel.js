import { toLowerTrimmedString } from '../../../../common/utils/text';

export class ReviewTableFilterModel {
  constructor(rows, searchQuery, filters, filterFields, searchValueGetters) {
    this.rows = rows;
    this.searchQuery = searchQuery;
    this.filters = filters;
    this.filterFields = filterFields;
    this.searchValueGetters = searchValueGetters;
  }

  static matchesFilter(row, key, selectedValue) {
    if (!selectedValue) {
      return true;
    }

    const rowValue = row[key];

    if (selectedValue === '__empty__') {
      return rowValue == null || rowValue === '';
    }

    return rowValue === selectedValue;
  }

  matchesSearch(row) {
    if (!this.searchQuery) {
      return true;
    }

    const haystacks = this.searchValueGetters
      .map((getValue) => getValue(row))
      .filter((value) => value != null && value !== '')
      .map((value) => toLowerTrimmedString(value));

    return haystacks.some((value) => value.includes(this.searchQuery));
  }

  filterRows() {
    return this.rows.filter(
      (row) =>
        this.matchesSearch(row) &&
        this.filterFields.every((field) =>
          ReviewTableFilterModel.matchesFilter(
            row,
            field.key,
            this.filters[field.key],
          ),
        ),
    );
  }
}
