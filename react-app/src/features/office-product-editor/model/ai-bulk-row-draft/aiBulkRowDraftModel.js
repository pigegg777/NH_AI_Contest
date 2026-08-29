import { toNullableTrimmedString, toTrimmedString } from '../../../../common/utils/text';

const MISSING_SALE_PRICE_TYPE_TOKEN = '__missing_sale_price_type__';

// Fields the excel importer is allowed to write onto an existing row. The
// annotation-backed fields (note, the three prices, img_url) are deliberately
// absent: those are the merchant's live edit layer and always win over a draft,
// so a patch placed here would be invisible. They are applied through
// updateNote/updatePrice/updateImgUrl instead.
export const AI_BULK_ROW_PATCHABLE_FIELDS = [
  'product_name',
  'spec',
  'large_category',
  'medium_category',
  'small_category',
  'detail_category',
  'sale_price_type_code',
  'sale_price_type_name',
];

export function createEmptyAiBulkRowDrafts() {
  return { appended: {}, patched: {} };
}

export function buildAiBulkRowId(row) {
  const productCode = toTrimmedString(row?.product_code);

  if (productCode === '') {
    return '';
  }

  const salePriceType =
    toNullableTrimmedString(row?.sale_price_type_code) ??
    toNullableTrimmedString(row?.sale_price_type_name) ??
    MISSING_SALE_PRICE_TYPE_TOKEN;

  return `${productCode}__${salePriceType}`;
}

export function hasAiBulkRowDrafts(drafts) {
  return (
    Object.keys(drafts?.appended ?? {}).length > 0 ||
    Object.keys(drafts?.patched ?? {}).length > 0
  );
}

export function applyAiBulkRowDrafts(rows, drafts) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const patched = drafts?.patched ?? {};
  const appended = drafts?.appended ?? {};
  const appendedRowIds = Object.keys(appended);

  if (appendedRowIds.length === 0 && Object.keys(patched).length === 0) {
    return safeRows;
  }

  // A row already present in the workbook wins over an appended draft with the
  // same row_id — that happens when the merchant re-uploads a workbook that now
  // contains a product they had added by hand, and the real row is the truth.
  const existingRowIds = new Set();
  const patchedRows = safeRows.map((row) => {
    const rowId = toTrimmedString(row?.row_id);

    if (rowId !== '') {
      existingRowIds.add(rowId);
    }

    const patch = patched[rowId];
    return patch ? { ...row, ...patch } : row;
  });

  const appendedRows = [];

  for (const rowId of appendedRowIds) {
    if (!existingRowIds.has(rowId)) {
      appendedRows.push(appended[rowId]);
    }
  }

  return appendedRows.length > 0
    ? [...patchedRows, ...appendedRows]
    : patchedRows;
}
