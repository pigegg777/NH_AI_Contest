import { toTrimmedString } from '../../../../common/utils/text';

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses';

function parseJsonCandidate(candidate) {
  if (typeof candidate !== 'string' || toTrimmedString(candidate) === '') {
    return null;
  }

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export function extractStructuredPayload(responseBody) {
  if (responseBody && typeof responseBody.output_parsed === 'object') {
    return responseBody.output_parsed;
  }

  const parsedOutputText = parseJsonCandidate(responseBody?.output_text);

  if (parsedOutputText) {
    return parsedOutputText;
  }

  if (!Array.isArray(responseBody?.output)) {
    return null;
  }

  for (const outputItem of responseBody.output) {
    if (outputItem?.parsed && typeof outputItem.parsed === 'object') {
      return outputItem.parsed;
    }

    const parsedText = parseJsonCandidate(outputItem?.text);

    if (parsedText) {
      return parsedText;
    }

    if (!Array.isArray(outputItem?.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (contentItem?.parsed && typeof contentItem.parsed === 'object') {
        return contentItem.parsed;
      }

      const parsedContent = parseJsonCandidate(contentItem?.text);

      if (parsedContent) {
        return parsedContent;
      }
    }
  }

  return null;
}

async function readOpenAiError(response) {
  try {
    const errorBody = await response.json();
    const message = toTrimmedString(errorBody?.error?.message);

    if (message) {
      return message;
    }
  } catch {
    // fall through to plain text below
  }

  try {
    return toTrimmedString(await response.text());
  } catch {
    return '';
  }
}

export async function requestOpenAiJson(requestBody, openAiApiKey) {
  const response = await fetch(OPENAI_RESPONSES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const message = await readOpenAiError(response);
    throw new Error(
      message
        ? `OpenAI API request failed: ${message}`
        : `OpenAI API request failed with status ${response.status}.`,
    );
  }

  const responseBody = await response.json();
  const structuredPayload = extractStructuredPayload(responseBody);

  if (!structuredPayload) {
    throw new Error('OpenAI returned an unreadable structured response.');
  }

  return structuredPayload;
}
