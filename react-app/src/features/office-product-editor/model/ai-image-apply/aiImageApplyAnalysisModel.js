import { toTrimmedString } from '../../../../common/utils/text';
import { requestAiImageApplyMatches } from '../../services/ai-image-apply/aiImageApplyClient';
import { serializeRowsForAiImageApplyReview } from './aiImageApplyRequestBodyModel';

export async function analyzeAiImageApplyMatches(rows, { officeCode, instruction } = {}) {
  const safeInstruction = toTrimmedString(instruction);
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeInstruction === '' || safeRows.length === 0) {
    return { mode: 'idle', rowIds: [], unmatchedReason: null };
  }

  if (!toTrimmedString(officeCode)) {
    return { mode: 'unavailable', rowIds: [], unmatchedReason: null };
  }

  try {
    const { rowIds, unmatchedReason } = await requestAiImageApplyMatches({
      officeCode,
      instruction: safeInstruction,
      rows: serializeRowsForAiImageApplyReview(safeRows),
    });

    return { mode: 'openai', rowIds, unmatchedReason: unmatchedReason ?? null };
  } catch (error) {
    return {
      mode: 'error',
      rowIds: [],
      unmatchedReason: null,
      message: error instanceof Error ? error.message : '이미지 적용 요청에 실패했습니다.',
    };
  }
}
