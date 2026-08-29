import { toTrimmedString } from '../../../common/utils/text';

export function getProductDataEntries(row) {
  return Array.isArray(row?.product_data) ? row.product_data : [];
}

export function removeProductUsageFromRow(row) {
  const { product_usage: _productUsage, ...nextRow } =
    row && typeof row === 'object' && !Array.isArray(row) ? row : {};

  return nextRow;
}

export function removeProductUsageFromRows(rows) {
  return (Array.isArray(rows) ? rows : []).map(removeProductUsageFromRow);
}

export function normalizeEntryRows(categoryName, rows) {
  return removeProductUsageFromRows(rows).map((row) => ({
    ...row,
    product_category_name:
      toTrimmedString(row?.product_category_name) || categoryName,
  }));
}
