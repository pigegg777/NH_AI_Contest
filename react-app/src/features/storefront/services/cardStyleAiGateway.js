import supabase from '../../../lib/supabaseClient';
import { toTrimmedString } from '../../../common/utils/text';
import { normalizeCardAiDesignInput } from '../model/cardAiDesignModel';
import { normalizeCardStyle } from '../model/cardStyleModel';
import { buildHeuristicCardAiIntent, normalizeOpenAiCardIntent } from './cardStyleAiContract';

const CARD_STYLE_AI_ENDPOINT = '/api/storefront-ai/card-style';
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

export async function requestCardStyleAiIntent({
  cardAiDesign,
  visibleFields,
  productCategoryName,
  currentCardStyle,
  officeCode,
} = {}) {
  const normalizedInput = normalizeCardAiDesignInput(cardAiDesign);
  const normalizedVisibleFields = Array.isArray(visibleFields) ? visibleFields : [];

  if (isLocalHeuristicModeEnabled()) {
    return buildHeuristicCardAiIntent({ cardAiDesign: normalizedInput, visibleFields: normalizedVisibleFields });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error(SESSION_EXPIRED_ERROR_MESSAGE);
  }

  const response = await fetch(CARD_STYLE_AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      officeCode: toTrimmedString(officeCode),
      cardAiDesign: normalizedInput,
      visibleFields: normalizedVisibleFields,
      productCategoryName: toTrimmedString(productCategoryName),
      currentCardStyle: normalizeCardStyle(currentCardStyle),
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const body = await response.json();

  return normalizeOpenAiCardIntent(body?.intent, normalizedInput.targetScope);
}
