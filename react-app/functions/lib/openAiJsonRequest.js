import { toTrimmedString } from '../../src/common/utils/text.js';

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

export function extractWebSearchQueries(responseBody) {
  if (!Array.isArray(responseBody?.output)) {
    return [];
  }

  const queries = [];

  for (const outputItem of responseBody.output) {
    if (outputItem?.type !== 'web_search_call') {
      continue;
    }

    const action = outputItem.action;

    if (Array.isArray(action?.queries)) {
      queries.push(...action.queries);
    } else if (typeof action?.query === 'string') {
      queries.push(action.query);
    }
  }

  return [...new Set(queries.map((query) => toTrimmedString(query)).filter(Boolean))];
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

  return {
    payload: structuredPayload,
    webSearchQueries: extractWebSearchQueries(responseBody),
  };
}
