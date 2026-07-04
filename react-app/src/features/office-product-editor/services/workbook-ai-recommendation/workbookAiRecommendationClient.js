import supabase from '../../../../lib/supabaseClient';
import { toTrimmedString } from '../../../../common/utils/text';

const WORKBOOK_AI_RECOMMENDATION_ENDPOINT = '/api/workbook-ai-recommendation/analyze';
const SESSION_EXPIRED_ERROR_MESSAGE = '濡쒓렇???뺣낫媛 留뚮즺?섏뿀?듬땲?? ?ㅼ떆 濡쒓렇?명빐 二쇱꽭??';
const LOCAL_SUPABASE_URL = toTrimmedString(import.meta.env.VITE_SUPABASE_URL);
const LOCAL_SUPABASE_PUBLISHABLE_KEY = toTrimmedString(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_KEY,
);

async function readErrorMessage(response) {
  try {
    const body = await response.json();
    return toTrimmedString(body?.error) || `Workbook AI request failed with status ${response.status}.`;
  } catch {
    return `Workbook AI request failed with status ${response.status}.`;
  }
}

export async function requestWorkbookAiRecommendations({ officeCode, rows }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error(SESSION_EXPIRED_ERROR_MESSAGE);
  }

  const response = await fetch(WORKBOOK_AI_RECOMMENDATION_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      officeCode: toTrimmedString(officeCode),
      rows: Array.isArray(rows) ? rows : [],
      supabaseUrl: LOCAL_SUPABASE_URL,
      supabasePublishableKey: LOCAL_SUPABASE_PUBLISHABLE_KEY,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const body = await response.json();

  return {
    recommendations: Array.isArray(body?.recommendations) ? body.recommendations : [],
  };
}
