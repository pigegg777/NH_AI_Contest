import { toTrimmedString } from '../../../../common/utils/text';
import { postAuthenticatedJson } from '../postAuthenticatedJson';

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
    matches: Array.isArray(body?.matches) ? body.matches : [],
    unmatchedReason: body?.unmatchedReason ?? null,
  };
}
