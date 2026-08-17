import { requestOpenAiImage } from '../../lib/openAiImageRequest.js';
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

const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'mediumCategory',
  'promptOverride',
  'representativeProductFields',
];

function buildDefaultPrompt(mediumCategory, representativeProductFields) {
  const spec = toOptionalTrimmedString(representativeProductFields?.spec);
  const nutrient = toOptionalTrimmedString(representativeProductFields?.nutrient);
  const detailParts = [spec, nutrient].filter(Boolean).join(', ');

  return [
    `농업용 ${mediumCategory} 제품의 깔끔한 스튜디오 컷 상품 사진 스타일 일러스트`,
    detailParts ? `(참고 정보: ${detailParts})` : '',
    '실제 브랜드 로고나 텍스트 없이',
  ]
    .filter(Boolean)
    .join(' ');
}

export const onRequestPost = withRequestErrorHandling(async ({ request, env }) => {
  const rawBody = await readValidatedJsonBody(request);
  const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
  const officeCode = readOfficeCode(body);

  const mediumCategory = toOptionalTrimmedString(body.mediumCategory);

  if (!mediumCategory) {
    throw new RequestValidationError('mediumCategory is required.', 422);
  }

  const promptOverride = toOptionalTrimmedString(body.promptOverride);
  const prompt = promptOverride || buildDefaultPrompt(mediumCategory, body.representativeProductFields);

  assertPromptWithinLimit(prompt);

  await requireOwnedOffice({ request, env, officeCode });

  let imageResult;

  try {
    imageResult = await requestOpenAiImage(prompt, env.OPENAI_API_KEY);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'OpenAI image request failed.', 502);
  }

  return jsonResponse({
    mediumCategory,
    imageDataUri: imageResult.imageDataUri,
    prompt,
  });
});
