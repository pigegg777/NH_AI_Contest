import supabase from '../../lib/supabaseClient';
import { toTrimmedString } from '../utils/text';

const SESSION_EXPIRED_ERROR_MESSAGE =
  '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.';
const LOCAL_SUPABASE_URL = toTrimmedString(import.meta.env.VITE_SUPABASE_URL);
const LOCAL_SUPABASE_PUBLISHABLE_KEY = toTrimmedString(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_KEY,
);

async function readErrorMessage(response, failureLabel) {
  try {
    const body = await response.json();
    return (
      toTrimmedString(body?.error) ||
      `${failureLabel} failed with status ${response.status}.`
    );
  } catch {
    return `${failureLabel} failed with status ${response.status}.`;
  }
}

export async function postAuthenticatedJson(
  endpoint,
  requestBody,
  { failureLabel },
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error(SESSION_EXPIRED_ERROR_MESSAGE);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ...requestBody,
      supabaseUrl: LOCAL_SUPABASE_URL,
      supabasePublishableKey: LOCAL_SUPABASE_PUBLISHABLE_KEY,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, failureLabel));
  }

  return response.json();
}
