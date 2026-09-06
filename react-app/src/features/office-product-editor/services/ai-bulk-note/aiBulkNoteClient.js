import { toTrimmedString } from '../../../../common/utils/text';
import { postAuthenticatedJson } from '../../../../common/services/postAuthenticatedJson';

const AI_BULK_NOTE_ENDPOINT = '/api/ai-bulk-note/analyze';

export async function requestAiBulkNoteMatches({
  officeCode,
  tableNameMode,
  instruction,
  rows,
  referenceSheet = null,
}) {
  const body = await postAuthenticatedJson(
    AI_BULK_NOTE_ENDPOINT,
    {
      officeCode: toTrimmedString(officeCode),
      tableNameMode: toTrimmedString(tableNameMode),
      instruction: toTrimmedString(instruction),
      rows,
      referenceSheet: referenceSheet ?? null,
    },
    { failureLabel: 'AI bulk note request' },
  );

  return {
    action: body?.action ?? 'none',
    matches: Array.isArray(body?.matches) ? body.matches : [],
    newRows: Array.isArray(body?.newRows) ? body.newRows : [],
    unmatchedReason: body?.unmatchedReason ?? null,
  };
}
