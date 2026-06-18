export { createAiRecommendation } from './aiRecommendationModel';
export { buildRuleBasedAiRecommendations } from './ruleBasedRecommendationModel';
import { toTrimmedString } from '../../../../common/utils/text';
import {
  DEFAULT_OPENAI_MODEL,
  requestWorkbookAiResponse,
} from '../../services/workbook-ai-recommendation/workbookAiRecommendationService';
import { WORKBOOK_AI_ANALYSIS_PROMPT } from '../../services/workbook-ai-recommendation/workbookAiRecommendationPrompt';
import {
  buildWorkbookAiRequestBody,
  extractWorkbookAiStructuredPayload,
  mergeWorkbookAiRecommendations,
  normalizeOpenAiRecommendations,
} from './workbookAiRecommendationPayloadModel';
import { buildRuleBasedAiRecommendations } from './ruleBasedRecommendationModel';

function resolveWorkbookAiConfig(env = import.meta.env) {
  const openAiModel = toTrimmedString(env?.VITE_OPENAI_MODEL);

  return {
    openAiApiKey: toTrimmedString(env?.VITE_OPENAI_API_KEY),
    openAiModel: openAiModel || DEFAULT_OPENAI_MODEL,
  };
}

export async function analyzeWorkbookAiRecommendations(
  rows,
  config = resolveWorkbookAiConfig(),
) {
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeRows.length === 0) {
    return {
      mode: 'idle',
      recommendations: [],
    };
  }

  const localRecommendations = buildRuleBasedAiRecommendations(safeRows);

  if (!config.openAiApiKey) {
    return {
      mode: 'unavailable',
      recommendations: localRecommendations,
    };
  }

  const requestBody = buildWorkbookAiRequestBody({
    rows: safeRows,
    openAiModel: config.openAiModel || DEFAULT_OPENAI_MODEL,
    prompt: WORKBOOK_AI_ANALYSIS_PROMPT,
  });

  try {
    const responseBody = await requestWorkbookAiResponse(requestBody, config);
    const structuredPayload = extractWorkbookAiStructuredPayload(responseBody);

    if (!structuredPayload || !Array.isArray(structuredPayload.recommendations)) {
      throw new Error('OpenAI returned an unreadable structured response.');
    }

    const openAiRecommendations = normalizeOpenAiRecommendations(
      structuredPayload.recommendations,
      safeRows,
    );

    return {
      mode: 'openai',
      recommendations: mergeWorkbookAiRecommendations(localRecommendations, openAiRecommendations),
    };
  } catch {
    return {
      mode: 'local-only',
      recommendations: localRecommendations,
      message: 'OpenAI 보조 분석에 실패하여 로컬 검사 결과만 표시합니다.',
    };
  }
}
