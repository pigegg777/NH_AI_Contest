import { toNullableTrimmedString } from '../../../../common/utils/text';

function getCell(row, index) {
  if (index == null || index < 0) {
    return null;
  }

  return row[index] ?? null;
}

function normalizeNumber(value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = String(value).replace(/,/g, '').trim();
  if (text === '') {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildNormalizedRow(row, columnMap, sourceRowIndex) {
  return {
    source_row_index: sourceRowIndex,
    product_code: toNullableTrimmedString(getCell(row, columnMap.product_code)),
    product_name: toNullableTrimmedString(getCell(row, columnMap.product_name)),
    sale_price_type_code: toNullableTrimmedString(getCell(row, columnMap.sale_price_type_code)),
    sale_price_type_name: toNullableTrimmedString(getCell(row, columnMap.sale_price_type_name)),
    product_type: toNullableTrimmedString(getCell(row, columnMap.product_type)),
    sale_price: normalizeNumber(getCell(row, columnMap.sale_price)),
    spec: toNullableTrimmedString(getCell(row, columnMap.spec)),
    large_category: toNullableTrimmedString(getCell(row, columnMap.large_category)),
    medium_category: toNullableTrimmedString(getCell(row, columnMap.medium_category)),
    small_category: toNullableTrimmedString(getCell(row, columnMap.small_category)),
    detail_category: toNullableTrimmedString(getCell(row, columnMap.detail_category)),
    manufacturer_code: toNullableTrimmedString(getCell(row, columnMap.manufacturer_code)),
    manufacturer_name: toNullableTrimmedString(getCell(row, columnMap.manufacturer_name)),
  };
}

export function normalizeWorksheetRows(
  rows,
  columnMap,
  dataStartRowIndex,
  dataEndRowIndex,
) {
  const normalizedRows = [];

  for (let index = dataStartRowIndex; index <= dataEndRowIndex; index += 1) {
    const row = buildNormalizedRow(rows[index] ?? [], columnMap, index);
    if (!row.product_code && !row.product_name) {
      continue;
    }

    normalizedRows.push(row);
  }

  return normalizedRows;
}

