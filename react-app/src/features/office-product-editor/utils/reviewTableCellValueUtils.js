import { normalizeWorksheetNumber } from './worksheetCellUtils';

export const PRICE_COLUMN_KEYS = new Set([
  'tax_price',
  'zero_tax_price',
  'exempt_tax_price',
]);

export const NUMERIC_FORMAT_COLUMN_KEYS = new Set([
  ...PRICE_COLUMN_KEYS,
  'price_subsidy',
]);

export function formatManufacturerList(manufacturerList) {
  if (!manufacturerList || manufacturerList.length === 0) {
    return '-';
  }

  return manufacturerList
    .map(({ manufacturer_name: manufacturerName }) => manufacturerName)
    .filter(Boolean)
    .join(', ');
}

export function formatPriceValue(value) {
  return typeof value === 'number' ? value.toLocaleString('ko-KR') : '-';
}

export function getCellTextValue(row, key) {
  if (key === 'manufacturer_list') {
    return formatManufacturerList(row.manufacturer_list);
  }

  if (key === 'img_url' || key === 'product_url') {
    return row[key] ?? '-';
  }

  if (NUMERIC_FORMAT_COLUMN_KEYS.has(key)) {
    return formatPriceValue(row[key]);
  }

  return row[key] || row[key] === 0 ? row[key] : '-';
}

export function parsePriceDraftValue(draft) {
  const trimmed = String(draft).trim();

  if (trimmed === '') {
    return null;
  }

  const numericValue = normalizeWorksheetNumber(trimmed);
  return numericValue == null ? undefined : numericValue;
}
