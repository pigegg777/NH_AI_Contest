import supabase from '../../../../lib/supabaseClient';
import { toTrimmedString } from '../../../../common/utils/text';
import {
  PAGE_STYLE_AI_DEFAULT_EXPLANATION_MESSAGE,
  PAGE_STYLE_AI_SESSION_EXPIRED_ERROR_MESSAGE,
} from '../../config/page-design/pageStyleAiCopyConfig';
import { PAGE_STYLE_AI_ENDPOINT } from '../../config/page-design/pageStyleAiHttpConfig';
import { normalizePageAiDesignInput } from '../../model/page-design/pageAiDesignModel';
import {
  normalizePageStyleAiIntent,
} from '../../model/page-design/pageStyleAiResponseModel';
import { normalizePageStyle } from '../../model/page-design/pageStyleModel';

async function readErrorMessage(response) {
  try {
    const body = await response.json();
    return (
      toTrimmedString(body?.error) ||
      `Storefront AI request failed with status ${response.status}.`
    );
  } catch {
    return `Storefront AI request failed with status ${response.status}.`;
  }
}

export async function requestPageStyleAiIntent({
  pageAiDesign,
  currentPageStyle,
  officeCode,
  history,
} = {}) {
  const normalizedInput = normalizePageAiDesignInput(pageAiDesign);
  const resolvedCurrentPageStyle = normalizePageStyle(currentPageStyle);
  const normalizedHistory = Array.isArray(history) ? history : [];

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error(PAGE_STYLE_AI_SESSION_EXPIRED_ERROR_MESSAGE);
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
    intent: normalizePageStyleAiIntent(
      body?.intent,
      resolvedCurrentPageStyle.palette.accentHex,
      normalizedInput.targetScope,
    ),
    explanation:
      toTrimmedString(body?.explanation) ||
      PAGE_STYLE_AI_DEFAULT_EXPLANATION_MESSAGE,
    suggestion: toTrimmedString(body?.suggestion) || null,
  };
}
