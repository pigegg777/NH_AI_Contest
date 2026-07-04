import { formatManufacturerList } from '../../utils/reviewTableCellValueUtils';

export class ReviewTableSortModel {
  constructor(rows, sortState) {
    this.rows = rows;
    this.sortState = sortState;
  }

  sortRows() {
    if (!this.sortState) {
      return this.rows;
    }

    const directionFactor = this.sortState.direction === 'asc' ? 1 : -1;

    return [...this.rows].sort((left, right) => {
      const leftValue =
        this.sortState.key === 'manufacturer_list'
          ? formatManufacturerList(left.manufacturer_list)
          : left[this.sortState.key];
      const rightValue =
        this.sortState.key === 'manufacturer_list'
          ? formatManufacturerList(right.manufacturer_list)
          : right[this.sortState.key];

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

      return (
        String(leftValue).localeCompare(String(rightValue), 'ko-KR', {
          numeric: true,
          sensitivity: 'base',
        }) * directionFactor
      );
    });
  }
}
