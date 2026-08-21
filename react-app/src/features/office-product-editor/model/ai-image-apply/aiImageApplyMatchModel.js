import { toTrimmedString } from '../../../../common/utils/text';

export function sanitizeAiImageApplyMatches(payload, sentRowIds) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const sentRowIdSet = new Set(Array.isArray(sentRowIds) ? sentRowIds : []);
  const rawRowIds = Array.isArray(safePayload.row_ids) ? safePayload.row_ids : [];

  const rowIds = [
    ...new Set(
      rawRowIds
        .map((rawRowId) => toTrimmedString(rawRowId))
        .filter((rowId) => rowId !== '' && sentRowIdSet.has(rowId)),
    ),
  ];

  return {
    rowIds,
    unmatchedReason: toTrimmedString(safePayload.unmatched_reason) || null,
  };
}
