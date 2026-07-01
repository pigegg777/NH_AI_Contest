import { formatManufacturerList } from '../../utils/reviewTableCellValueUtils';

export function sortRows(rows, sortState) {
  if (!sortState) {
    return rows;
  }

  const directionFactor = sortState.direction === 'asc' ? 1 : -1;

  return [...rows].sort((left, right) => {
    const leftValue =
      sortState.key === 'manufacturer_list'
        ? formatManufacturerList(left.manufacturer_list)
        : left[sortState.key];
    const rightValue =
      sortState.key === 'manufacturer_list'
        ? formatManufacturerList(right.manufacturer_list)
        : right[sortState.key];

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
