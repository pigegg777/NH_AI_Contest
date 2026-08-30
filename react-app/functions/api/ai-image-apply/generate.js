import {
  DEFAULT_OPENAI_IMAGE_MODEL,
  requestOpenAiImage,
} from '../../lib/openAiImageRequest.js';
import { resolveOpenAiImageModel } from '../../lib/openAiModel.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  assertPromptWithinLimit,
  pickAllowedKeys,
  readOfficeCode,
  readValidatedJsonBody,
  RequestValidationError,
  toOptionalTrimmedString,
  withRequestErrorHandling,
} from '../../lib/requestValidation.js';
import { requireOwnedOffice } from '../../lib/officeOwnershipGuard.js';

const OPENAI_IMAGE_MODEL_ENV_KEY = 'OPENAI_MODEL_IMAGE_GENERATE';
const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'prompt',
  'supabaseUrl',
  'supabasePublishableKey',
];

function buildImageGenerationPrompt(userPrompt) {
  return [
    userPrompt,
    '농업용 제품의 깔끔한 스튜디오 컷 상품 사진 스타일 일러스트, 실제 브랜드 로고나 텍스트 없이',
  ].join(', ');
}

export const onRequestPost = withRequestErrorHandling(async ({ request, env }) => {
  const rawBody = await readValidatedJsonBody(request);
  const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
  const officeCode = readOfficeCode(body);
  const userPrompt = toOptionalTrimmedString(body.prompt);

  if (!userPrompt) {
    throw new RequestValidationError('prompt is required.', 422);
  }

  const prompt = buildImageGenerationPrompt(userPrompt);
  assertPromptWithinLimit(prompt);

  await requireOwnedOffice({ request, env, officeCode, body });

  let imageResult;

  try {
    imageResult = await requestOpenAiImage(prompt, env.OPENAI_API_KEY, {
      model: resolveOpenAiImageModel(
        env,
        OPENAI_IMAGE_MODEL_ENV_KEY,
        DEFAULT_OPENAI_IMAGE_MODEL,
      ),
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'OpenAI image request failed.', 502);
  }

  return jsonResponse({ imageDataUri: imageResult.imageDataUri, prompt });
});
