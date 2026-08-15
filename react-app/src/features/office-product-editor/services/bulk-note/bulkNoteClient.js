import supabase from '../../../../lib/supabaseClient';
import { toTrimmedString } from '../../../../common/utils/text';

const BULK_NOTE_ENDPOINT = '/api/bulk-note/analyze';
const SESSION_EXPIRED_ERROR_MESSAGE = '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.';
const LOCAL_SUPABASE_URL = toTrimmedString(import.meta.env.VITE_SUPABASE_URL);
const LOCAL_SUPABASE_PUBLISHABLE_KEY = toTrimmedString(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_KEY,
);

async function readErrorMessage(response) {
  try {
    const body = await response.json();
    return toTrimmedString(body?.error) || `Bulk note request failed with status ${response.status}.`;
  } catch {
    return `Bulk note request failed with status ${response.status}.`;
  }
}

export async function requestBulkNoteMatches({ officeCode, tableNameMode, instruction, rows }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error(SESSION_EXPIRED_ERROR_MESSAGE);
  }

  const response = await fetch(BULK_NOTE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      officeCode: toTrimmedString(officeCode),
      tableNameMode: toTrimmedString(tableNameMode),
      instruction: toTrimmedString(instruction),
      rows,
      supabaseUrl: LOCAL_SUPABASE_URL,
      supabasePublishableKey: LOCAL_SUPABASE_PUBLISHABLE_KEY,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const body = await response.json();

  return {
    matches: Array.isArray(body?.matches) ? body.matches : [],
    unmatchedReason: body?.unmatchedReason ?? null,
  };
}
