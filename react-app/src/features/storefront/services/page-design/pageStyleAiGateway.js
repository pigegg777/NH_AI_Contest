import supabase from '../../../../lib/supabaseClient';
import { toTrimmedString } from '../../../../common/utils/text';
import { PAGE_STYLE_AI_SESSION_EXPIRED_ERROR_MESSAGE } from '../../config/page-design/pageStyleAiCopyConfig';
import { PAGE_STYLE_AI_ENDPOINT } from '../../config/page-design/pageStyleAiHttpConfig';

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
