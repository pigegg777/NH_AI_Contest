import { toTrimmedString } from '../../../src/common/utils/text.js';
import { buildInformationEmphasisOpenAiRequestBody } from '../../../src/features/storefront/model/information-emphasis/ai-request/informationEmphasisOpenAiRequest.js';
import { normalizeInformationEmphasisResponse } from '../../../src/features/storefront/model/information-emphasis/ai-response/informationEmphasisAiNormalizer.js';
import { requestOpenAiJson } from '../../lib/openAiJsonRequest.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  assertPromptWithinLimit,
  pickAllowedKeys,
  readOfficeCode,
  readValidatedJsonBody,
  withRequestErrorHandling,
} from '../../lib/requestValidation.js';
import { requireOwnedOffice } from '../../lib/officeOwnershipGuard.js';

const INFORMATION_EMPHASIS_ALLOWED_KEYS = ['officeCode', 'label', 'description'];
const INFORMATION_EMPHASIS_DEFAULT_OPENAI_MODEL = 'gpt-5.6-terra';

export const onRequestPost = withRequestErrorHandling(async ({ request, env }) => {
  const body = pickAllowedKeys(
    await readValidatedJsonBody(request),
    INFORMATION_EMPHASIS_ALLOWED_KEYS,
  );
  const officeCode = readOfficeCode(body);

  // 설명은 다듬지 않고 받은 그대로 쓴다. 여기서 trim 하면 돌려준 값이 판매자가
  // 친 글과 달라지고, 그건 이 기능이 하지 않기로 한 바로 그 일이다.
  const description = body.description;
  assertPromptWithinLimit(description);

  await requireOwnedOffice({ request, env, officeCode });

  let payload;

  try {
    ({ payload } = await requestOpenAiJson(
      buildInformationEmphasisOpenAiRequestBody({
        label: toTrimmedString(body.label),
        description,
        openAiModel: env.OPENAI_MODEL || INFORMATION_EMPHASIS_DEFAULT_OPENAI_MODEL,
      }),
      env.OPENAI_API_KEY,
    ));
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'OpenAI request failed.',
      502,
    );
  }

  // 검증에 걸리면 원문을 성공인 척 돌려주지 않는다. 그러면 판매자는 "강조할 게
  // 없었나 보다" 로 오해하고 우리는 이 실패를 영영 못 본다.
  const { description: markedDescription, errorMessage } =
    normalizeInformationEmphasisResponse(payload, description);

  if (errorMessage) {
    return errorResponse(errorMessage, 502);
  }

  return jsonResponse({ description: markedDescription });
});
