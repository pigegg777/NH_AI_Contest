import { toTrimmedString } from '../../../../common/utils/text';

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses';

export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';

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

export async function requestWorkbookAiResponse(requestBody, config) {
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

  return responseBody;
}
