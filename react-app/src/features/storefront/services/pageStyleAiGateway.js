import supabase from '../../../lib/supabaseClient';
import { toTrimmedString } from '../../../common/utils/text';
import { normalizePageAiDesignInput } from '../model/pageAiDesignModel';
import { normalizePageStyle } from '../model/pageStyleModel';
import {
  buildHeuristicPageAiExplanation,
  buildHeuristicPageAiIntent,
  normalizePageStyleAiIntent,
} from './pageStyleAiContract';

const PAGE_STYLE_AI_ENDPOINT = '/api/storefront-ai/page-style';
const SESSION_EXPIRED_ERROR_MESSAGE = '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.';
const DEFAULT_EXPLANATION_MESSAGE = '요청하신 내용을 페이지 스타일에 반영했습니다.';

function isLocalHeuristicModeEnabled() {
  return toTrimmedString(import.meta.env.VITE_STOREFRONT_AI_LOCAL_HEURISTIC) === 'true';
}

async function readErrorMessage(response) {
  try {
    const body = await response.json();
    return toTrimmedString(body?.error) || `Storefront AI request failed with status ${response.status}.`;
  } catch {
    return `Storefront AI request failed with status ${response.status}.`;
  }
}

export async function requestPageStyleAiIntent({ pageAiDesign, currentPageStyle, officeCode, history } = {}) {
  const normalizedInput = normalizePageAiDesignInput(pageAiDesign);
  const resolvedCurrentPageStyle = normalizePageStyle(currentPageStyle);
  const normalizedHistory = Array.isArray(history) ? history : [];

  if (isLocalHeuristicModeEnabled()) {
    const intent = buildHeuristicPageAiIntent(normalizedInput, resolvedCurrentPageStyle);

    return { intent, explanation: buildHeuristicPageAiExplanation(intent), suggestion: null };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error(SESSION_EXPIRED_ERROR_MESSAGE);
  }

  const response = await fetch(PAGE_STYLE_AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      officeCode: toTrimmedString(officeCode),
      pageAiDesign: normalizedInput,
      currentPageStyle: resolvedCurrentPageStyle,
      history: normalizedHistory,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const body = await response.json();

  return {
    intent: normalizePageStyleAiIntent(body?.intent, resolvedCurrentPageStyle.palette.accentHex, normalizedInput.targetScope),
    explanation: toTrimmedString(body?.explanation) || DEFAULT_EXPLANATION_MESSAGE,
    suggestion: toTrimmedString(body?.suggestion) || null,
  };
}
