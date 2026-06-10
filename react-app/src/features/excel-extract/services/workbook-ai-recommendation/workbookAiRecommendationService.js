import { buildRuleBasedAiRecommendations } from '../../model/recommendations/rules/ruleBasedRecommendationModel';
import {
  buildWorkbookAiRequestBody,
  extractWorkbookAiStructuredPayload,
  mergeWorkbookAiRecommendations,
  normalizeOpenAiRecommendations,
} from '../../model/recommendations/payload/workbookAiRecommendationPayloadModel';
import { toTrimmedString } from '../../../../common/utils/text';
import { WORKBOOK_AI_ANALYSIS_PROMPT } from './workbookAiRecommendationPrompt';

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';

async function readOpenAiError(response) {
  try {
    const errorBody = await response.json();
    const message = toTrimmedString(errorBody?.error?.message);

    if (message) {
      return message;
    }
  } catch {
    // Ignore JSON parsing errors and try plain text next.
  }

  try {
    const text = await response.text();

    return toTrimmedString(text);
  } catch {
    return '';
  }
}

async function requestOpenAiWorkbookAiRecommendations(rows, config) {
  const requestBody = buildWorkbookAiRequestBody({
    rows,
    openAiModel: config.openAiModel || DEFAULT_OPENAI_MODEL,
    prompt: WORKBOOK_AI_ANALYSIS_PROMPT,
  });

  // This remains a browser-direct call because the current app has no server proxy yet.
  const response = await fetch(OPENAI_RESPONSES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openAiApiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const openAiErrorMessage = await readOpenAiError(response);
    throw new Error(
      openAiErrorMessage
        ? `OpenAI API request failed: ${openAiErrorMessage}`
        : `OpenAI API request failed with status ${response.status}.`,
    );
  }

  const responseBody = await response.json();

  if (responseBody?.refusal) {
    throw new Error(
      `OpenAI refused the request: ${toTrimmedString(responseBody.refusal) || 'unknown reason'}`,
    );
  }

  const structuredPayload = extractWorkbookAiStructuredPayload(responseBody);

  if (!structuredPayload || !Array.isArray(structuredPayload.recommendations)) {
    throw new Error('OpenAI returned an unreadable structured response.');
  }

  return normalizeOpenAiRecommendations(structuredPayload.recommendations, rows);
}

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

  try {
    const openAiRecommendations = await requestOpenAiWorkbookAiRecommendations(safeRows, config);

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
