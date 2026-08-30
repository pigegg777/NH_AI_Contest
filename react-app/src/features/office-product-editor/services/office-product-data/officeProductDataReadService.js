import {
  toNullableTrimmedString,
  toTrimmedString,
} from '../../../../common/utils/text';
import {
  getProductDataEntries,
  normalizeEntryRows,
} from '../../utils/officeProductDataUtils';
import { fetchOfficeProductDataRow } from './officeProductDataRowService';

function buildOfficeProductDataSummary(row, productData) {
  return {
    officeCode: row?.office_code ?? '',
    officeName: row?.office_name ?? '',
    categoryName: productData?.category_name ?? '',
    rowCount: Number.isFinite(productData?.row_count)
      ? productData.row_count
      : 0,
    sourceFileName: toNullableTrimmedString(productData?.source_file_name),
    updatedAt: toNullableTrimmedString(productData?.updated_at),
  };
}

export async function fetchOfficeProductDataCatalog({ officeCode }) {
  const row = await fetchOfficeProductDataRow(officeCode);

  if (!row) {
    return [];
  }

  return getProductDataEntries(row)
    .map((productData) => buildOfficeProductDataSummary(row, productData))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export async function fetchOfficeProductDataEntries({ officeCode }) {
  const row = await fetchOfficeProductDataRow(officeCode);

  if (!row) {
    return [];
  }

  return getProductDataEntries(row).map((productData) => ({
    ...buildOfficeProductDataSummary(row, productData),
    rows: normalizeEntryRows(
      toTrimmedString(productData?.category_name),
      productData?.rows,
    ),
  }));
}

export async function fetchOfficeProductData({ officeCode, categoryName }) {
  const normalizedCategoryName = toTrimmedString(categoryName);

  if (!normalizedCategoryName) {
    return null;
  }

  const row = await fetchOfficeProductDataRow(officeCode);

  if (!row) {
    return null;
  }

  const productData =
    getProductDataEntries(row).find(
      (currentProductData) =>
        toTrimmedString(currentProductData?.category_name) ===
        normalizedCategoryName,
    ) ?? null;

  if (!productData) {
    return null;
  }

  return {
    rows: normalizeEntryRows(normalizedCategoryName, productData.rows),
    sourceFileName: toNullableTrimmedString(productData.source_file_name),
    updatedAt: toNullableTrimmedString(productData.updated_at),
    rowCount: Number.isFinite(productData.row_count)
      ? productData.row_count
      : 0,
  };
}
