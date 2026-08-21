import supabase from '../../../../lib/supabaseClient';
import { toTrimmedString } from '../../../../common/utils/text';

const PAGE_STYLE_AI_SESSION_EXPIRED_ERROR_MESSAGE = '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.';
const PAGE_STYLE_AI_ENDPOINT = '/api/storefront-ai/page-style';

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

export async function postPageStyleAiRequest(requestBody) {
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
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}
