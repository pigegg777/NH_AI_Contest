import { toTrimmedString } from '../../src/common/utils/text.js';

const OPENAI_IMAGES_API_URL = 'https://api.openai.com/v1/images/generations';
const DEFAULT_IMAGE_MODEL = 'gpt-image-2';

async function readOpenAiImageError(response) {
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

export async function requestOpenAiImage(prompt, apiKey, { model = DEFAULT_IMAGE_MODEL } = {}) {
  const response = await fetch(OPENAI_IMAGES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const message = await readOpenAiImageError(response);
    throw new Error(
      message
        ? `OpenAI Image API request failed: ${message}`
        : `OpenAI Image API request failed with status ${response.status}.`,
    );
  }

  const responseBody = await response.json();
  const b64 = responseBody?.data?.[0]?.b64_json;

  if (typeof b64 !== 'string' || !b64) {
    throw new Error('OpenAI returned no image data.');
  }

  return { imageDataUri: `data:image/png;base64,${b64}` };
}
