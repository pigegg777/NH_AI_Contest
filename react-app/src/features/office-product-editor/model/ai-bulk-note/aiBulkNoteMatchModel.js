import { toTrimmedString } from '../../../../common/utils/text';
import { toNumberOrNull } from '../../../../common/utils/number';

const MAX_NOTE_LENGTH = 300;
export const AI_BULK_NOTE_PRICE_FIELD_KEYS = ['zero_tax_price', 'tax_price', 'exempt_tax_price'];
const PRICE_FIELD_KEYS = AI_BULK_NOTE_PRICE_FIELD_KEYS;

function normalizeMatch(rawMatch, sentRowIdSet) {
  const rowId = toTrimmedString(rawMatch?.row_id);

  if (rowId === '' || !sentRowIdSet.has(rowId)) {
    return null;
  }

  const match = { rowId };
  const trimmedNote = toTrimmedString(rawMatch?.note);

  if (trimmedNote !== '') {
    match.note = trimmedNote.slice(0, MAX_NOTE_LENGTH);
  }

  if (typeof rawMatch?.shadow === 'boolean') {
    match.shadow = rawMatch.shadow;
  }

  for (const key of PRICE_FIELD_KEYS) {
    const value = toNumberOrNull(rawMatch?.[key]);

    if (value !== null) {
      match[key] = value;
    }
  }

  // A match must actually change something — the AI's instruction may only
  // target a price field, only the note, only the hide flag, or several
  // fields at once, but never nothing.
  return Object.keys(match).length > 1 ? match : null;
}

export function sanitizeAiBulkNoteMatches(payload, sentRowIds) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const sentRowIdSet = new Set(Array.isArray(sentRowIds) ? sentRowIds : []);
  const rawMatches = Array.isArray(safePayload.matches) ? safePayload.matches : [];

  const matches = rawMatches
    .map((rawMatch) => normalizeMatch(rawMatch, sentRowIdSet))
    .filter((match) => match !== null);

  return {
    matches,
    unmatchedReason: toTrimmedString(safePayload.unmatched_reason) || null,
  };
}
