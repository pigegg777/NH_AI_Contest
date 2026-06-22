import supabase from '../../../lib/supabaseClient';
import { toTrimmedString } from '../../../common/utils/text';
import { normalizePageAiDesignInput } from '../model/pageAiDesignModel';
import { normalizePageStyle } from '../model/pageStyleModel';
import { buildHeuristicPageAiIntent, normalizePageStyleAiIntent } from './pageStyleAiContract';

const PAGE_STYLE_AI_ENDPOINT = '/api/storefront-ai/page-style';
const SESSION_EXPIRED_ERROR_MESSAGE = '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.';

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

export async function requestPageStyleAiIntent({ pageAiDesign, currentPageStyle, officeCode } = {}) {
  const normalizedInput = normalizePageAiDesignInput(pageAiDesign);
  const resolvedCurrentPageStyle = normalizePageStyle(currentPageStyle);

  if (isLocalHeuristicModeEnabled()) {
    return buildHeuristicPageAiIntent(normalizedInput, resolvedCurrentPageStyle);
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
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const body = await response.json();

  return normalizePageStyleAiIntent(
    body?.intent,
    resolvedCurrentPageStyle.palette.accentHex,
    normalizedInput.targetScope,
  );
}
