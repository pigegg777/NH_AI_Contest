import { toNumberOrNull } from '../../../../common/utils/number';
import { toNullableTrimmedString, toTrimmedString } from '../../../../common/utils/text';
import {
  AI_BULK_NOTE_NEW_ROW_PRICE_FIELDS,
  AI_BULK_NOTE_NEW_ROW_STRING_FIELDS,
} from './aiBulkNoteRequestBodyModel';

const MAX_NOTE_LENGTH = 300;
const MAX_NEW_ROWS = 500;
const AI_BULK_NOTE_ACTIONS = new Set(['edit_rows', 'append_rows', 'none']);
const UNKNOWN_TEXT_VALUE_PATTERN = /^(?:미상|없음|모름|확인불가|알\s*수\s*없음|unknown|n\/?a|-+)$/i;
const RECOGNIZABLE_PRODUCT_CODE_PATTERN = /^(?=.*\d)[a-z0-9][a-z0-9._/-]*$/i;

function toRecognizedOptionalString(value) {
  const normalized = toNullableTrimmedString(value);

  return normalized && !UNKNOWN_TEXT_VALUE_PATTERN.test(normalized)
    ? normalized
    : null;
}

export function readAiBulkNoteAction(payload) {
  const action = toTrimmedString(payload?.action);
  return AI_BULK_NOTE_ACTIONS.has(action) ? action : 'none';
}

function normalizeNewRow(rawRow) {
  const productCode = toTrimmedString(rawRow?.product_code);

  // product_code is the row's identity and the key every collision check and
  // static-data lookup runs on. A row without one cannot be placed.
  if (!RECOGNIZABLE_PRODUCT_CODE_PATTERN.test(productCode)) {
    return null;
  }

  const normalized = { product_code: productCode };

  for (const field of AI_BULK_NOTE_NEW_ROW_STRING_FIELDS) {
    if (field === 'product_code') {
      continue;
    }

    normalized[field] = toRecognizedOptionalString(rawRow?.[field]);
  }

  if (normalized.note !== null) {
    normalized.note = normalized.note.slice(0, MAX_NOTE_LENGTH);
  }

  for (const field of AI_BULK_NOTE_NEW_ROW_PRICE_FIELDS) {
    normalized[field] = toNumberOrNull(rawRow?.[field]);
  }

  return normalized;
}

export function sanitizeAiBulkNoteNewRows(payload) {
  if (readAiBulkNoteAction(payload) !== 'append_rows') {
    return [];
  }

  const rawRows = Array.isArray(payload?.new_rows) ? payload.new_rows : [];
  const seenProductCodes = new Set();
  const newRows = [];

  for (const rawRow of rawRows) {
    if (newRows.length >= MAX_NEW_ROWS) {
      break;
    }

    const normalized = normalizeNewRow(rawRow);

    if (!normalized || seenProductCodes.has(normalized.product_code)) {
      continue;
    }

    seenProductCodes.add(normalized.product_code);
    newRows.push(normalized);
  }

  return newRows;
}
