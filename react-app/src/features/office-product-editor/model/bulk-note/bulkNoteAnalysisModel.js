import { toTrimmedString } from '../../../../common/utils/text';
import { requestBulkNoteMatches } from '../../services/bulk-note/bulkNoteClient';
import { serializeRowsForBulkNoteReview } from './bulkNoteRequestBodyModel';

export async function analyzeBulkNoteMatches(rows, { officeCode, tableNameMode, instruction } = {}) {
  const safeInstruction = toTrimmedString(instruction);
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeInstruction === '' || safeRows.length === 0) {
    return { mode: 'idle', matches: [], unmatchedReason: null };
  }

  if (!toTrimmedString(officeCode)) {
    return { mode: 'unavailable', matches: [], unmatchedReason: null };
  }

  try {
    const { matches, unmatchedReason } = await requestBulkNoteMatches({
      officeCode,
      tableNameMode,
      instruction: safeInstruction,
      rows: serializeRowsForBulkNoteReview(safeRows),
    });

    return { mode: 'openai', matches, unmatchedReason: unmatchedReason ?? null };
  } catch (error) {
    return {
      mode: 'error',
      matches: [],
      unmatchedReason: null,
      message: error instanceof Error ? error.message : '일괄비고 작성 요청에 실패했습니다.',
    };
  }
}
