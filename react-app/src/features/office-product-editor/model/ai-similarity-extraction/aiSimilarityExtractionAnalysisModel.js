import { toTrimmedString } from '../../../../common/utils/text';
import { requestAiSimilarityExtractionMatches } from '../../services/ai-similarity-extraction/aiSimilarityExtractionClient';
import { serializeRowsForAiSimilarityExtractionReview } from './aiSimilarityExtractionRequestBodyModel';

export async function analyzeAiSimilarityExtractionMatches(
  rows,
  { officeCode, tableNameMode, userHint } = {},
) {
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeRows.length === 0) {
    return {
      mode: 'idle',
      recommendations: [],
    };
  }

  if (!toTrimmedString(officeCode)) {
    return {
      mode: 'unavailable',
      recommendations: [],
    };
  }

  try {
    const reviewRows = serializeRowsForAiSimilarityExtractionReview(
      safeRows,
      tableNameMode,
    );

    const { recommendations } = await requestAiSimilarityExtractionMatches({
      officeCode,
      rows: reviewRows,
      tableNameMode,
      userHint,
    });

    return {
      mode: 'openai',
      recommendations,
    };
  } catch (error) {
    return {
      mode: 'error',
      recommendations: [],
      message:
        error instanceof Error
          ? error.message
          : 'OpenAI 보조 분석에 실패했습니다.',
    };
  }
}
