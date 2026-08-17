import { toTrimmedString } from '../../../../common/utils/text';

const MAX_NOTE_LENGTH = 300;

function normalizeMatch(rawMatch, sentRowIdSet) {
  const rowId = toTrimmedString(rawMatch?.row_id);
  const note = toTrimmedString(rawMatch?.note).slice(0, MAX_NOTE_LENGTH);

  if (rowId === '' || note === '' || !sentRowIdSet.has(rowId)) {
    return null;
  }

  return { rowId, note };
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
