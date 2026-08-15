export { createAiRecommendation } from './workbookAiRecommendationModel';
import { toTrimmedString } from '../../../../common/utils/text';
import { requestWorkbookAiRecommendations } from '../../services/workbook-ai-recommendation/workbookAiRecommendationClient';
import { serializeWorkbookRowsForAiReview } from './workbookAiRequestBodyModel';

export async function analyzeWorkbookAiRecommendations(
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
    // Trim rows down to just the AI-relevant fields (and cap the count)
    // before they ever go over the wire — a workbook row can carry large
    // fields (e.g. a pesticide row's merged product_usage array) that the
    // AI review never uses but that would otherwise bloat the request.
    const reviewRows = serializeWorkbookRowsForAiReview(safeRows, tableNameMode);

    const { recommendations } = await requestWorkbookAiRecommendations({
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
      message: error instanceof Error ? error.message : 'OpenAI 보조 분석에 실패했습니다.',
    };
  }
}
