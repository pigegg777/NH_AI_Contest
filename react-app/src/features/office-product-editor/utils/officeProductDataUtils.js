import { toTrimmedString } from '../../../common/utils/text';

export function getProductDataEntries(row) {
  return Array.isArray(row?.product_data) ? row.product_data : [];
}

export function normalizeEntryRows(categoryName, rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...(row ?? {}),
    product_category_name:
      toTrimmedString(row?.product_category_name) || categoryName,
  }));
}
