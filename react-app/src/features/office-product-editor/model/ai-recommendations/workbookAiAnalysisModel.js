export { createAiRecommendation } from './workbookAiRecommendationModel';
import { toTrimmedString } from '../../../../common/utils/text';
import { requestWorkbookAiRecommendations } from '../../services/workbook-ai-recommendation/workbookAiRecommendationClient';

export async function analyzeWorkbookAiRecommendations(rows, { officeCode } = {}) {
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
    const { recommendations } = await requestWorkbookAiRecommendations({
      officeCode,
      rows: safeRows,
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
