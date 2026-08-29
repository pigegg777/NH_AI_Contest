import { toNumberOrNull } from '../../../../common/utils/number';
import { toNullableTrimmedString, toTrimmedString } from '../../../../common/utils/text';
import {
  AI_BULK_ROW_PATCHABLE_FIELDS,
  createEmptyAiBulkRowDrafts,
} from './aiBulkRowDraftModel';

const DRAFT_STORAGE_VERSION = 1;

const APPENDED_ROW_STRING_FIELDS = [
  'product_name',
  'spec',
  'large_category',
  'medium_category',
  'small_category',
  'detail_category',
  'sale_price_type_code',
  'sale_price_type_name',
];

const APPENDED_ROW_PRICE_FIELDS = [
  'zero_tax_price',
  'tax_price',
  'exempt_tax_price',
];

function buildAppendedRowWarnings(row) {
  const warnings = [
    'AI로 신규 등록한 데이터입니다. 저장 전에 내용을 확인해 주세요.',
  ];

  if (!row.product_name) {
    warnings.push('상품명이 없어 확인이 필요합니다.');
  }

  if (!row.sale_price_type_code && !row.sale_price_type_name) {
    warnings.push('단가유형이 없어 확인이 필요합니다.');
  }

  if (APPENDED_ROW_PRICE_FIELDS.every((field) => row[field] == null)) {
    warnings.push('판매단가가 없어 확인이 필요합니다.');
  }

  return warnings;
}

function createStorageKey(workbookFingerprint) {
  return `excel-review:ai-bulk-rows:${workbookFingerprint}`;
}

export function normalizeAppendedRow(row) {
  const rowId = toTrimmedString(row?.row_id);
  const productCode = toTrimmedString(row?.product_code);

  if (rowId === '' || productCode === '') {
    return null;
  }

  const normalized = {
    row_id: rowId,
    product_code: productCode,
    is_ai_appended: true,
    note: typeof row?.note === 'string' ? row.note : '',
    img_url: toNullableTrimmedString(row?.img_url),
    product_type_variants: [],
    manufacturer_list: null,
    warnings: [],
  };

  for (const field of APPENDED_ROW_STRING_FIELDS) {
    normalized[field] = toNullableTrimmedString(row?.[field]);
  }

  for (const field of APPENDED_ROW_PRICE_FIELDS) {
    normalized[field] = toNumberOrNull(row?.[field]);
  }

  normalized.warnings = buildAppendedRowWarnings(normalized);

  return normalized;
}

function normalizePatch(patch) {
  const normalized = {};

  for (const field of AI_BULK_ROW_PATCHABLE_FIELDS) {
    if (patch && field in patch) {
      normalized[field] = toNullableTrimmedString(patch[field]);
    }
  }

  return normalized;
}

export function sanitizeAiBulkRowDrafts(drafts) {
  const sanitized = createEmptyAiBulkRowDrafts();
  const rawAppended = drafts?.appended;
  const rawPatched = drafts?.patched;

  if (rawAppended && typeof rawAppended === 'object') {
    for (const rowId of Object.keys(rawAppended)) {
      const normalizedRow = normalizeAppendedRow(rawAppended[rowId]);

      if (normalizedRow && normalizedRow.row_id === rowId) {
        sanitized.appended[rowId] = normalizedRow;
      }
    }
  }

  if (rawPatched && typeof rawPatched === 'object') {
    for (const rowId of Object.keys(rawPatched)) {
      if (toTrimmedString(rowId) === '') {
        continue;
      }

      const normalizedPatch = normalizePatch(rawPatched[rowId]);

      if (Object.keys(normalizedPatch).length > 0) {
        sanitized.patched[rowId] = normalizedPatch;
      }
    }
  }

  return sanitized;
}

export function readStoredAiBulkRowDrafts(storage, workbookFingerprint) {
  if (!storage || !workbookFingerprint) {
    return createEmptyAiBulkRowDrafts();
  }

  const rawValue = storage.getItem(createStorageKey(workbookFingerprint));

  if (!rawValue) {
    return createEmptyAiBulkRowDrafts();
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (parsed?.version !== DRAFT_STORAGE_VERSION) {
      return createEmptyAiBulkRowDrafts();
    }

    return sanitizeAiBulkRowDrafts(parsed);
  } catch {
    return createEmptyAiBulkRowDrafts();
  }
}

export function writeStoredAiBulkRowDrafts(storage, workbookFingerprint, drafts) {
  if (!storage || !workbookFingerprint) {
    return;
  }

  const storageKey = createStorageKey(workbookFingerprint);
  const sanitized = sanitizeAiBulkRowDrafts(drafts);

  if (
    Object.keys(sanitized.appended).length === 0 &&
    Object.keys(sanitized.patched).length === 0
  ) {
    storage.removeItem(storageKey);
    return;
  }

  storage.setItem(
    storageKey,
    JSON.stringify({ version: DRAFT_STORAGE_VERSION, ...sanitized }),
  );
}
