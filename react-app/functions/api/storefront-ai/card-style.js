import { normalizeCardAiDesignInput } from '../../../src/features/storefront/model/card-design/ai-request/cardAiDesignModel.js';
import { normalizeCardStyle } from '../../../src/features/storefront/model/card-design/style/cardStyleModel.js';
import { requestOpenAiJson } from '../../lib/openAiJsonRequest.js';
import { buildCardStyleOpenAiRequestBody } from '../../../src/features/storefront/model/card-design/ai-request/cardStyleAiRequest.js';
import {
  normalizeOpenAiCardExplanation,
  normalizeOpenAiCardIntent,
} from '../../../src/features/storefront/model/card-design/ai-response/cardStyleAiResponseNormalizer.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  assertHistoryWithinLimits,
  assertPromptWithinLimit,
  pickAllowedKeys,
  readOfficeCode,
  readValidatedJsonBody,
  withRequestErrorHandling,
} from '../../lib/requestValidation.js';
import { requireOwnedOffice } from '../../lib/officeOwnershipGuard.js';

const DEFAULT_OPENAI_MODEL = 'gpt-5.6-luna';
const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'cardAiDesign',
  'visibleFields',
  'productCategoryName',
  'conditionFieldValueSamples',
  'currentCardStyle',
  'history',
];

export const onRequestPost = withRequestErrorHandling(
  async ({ request, env }) => {
    const rawBody = await readValidatedJsonBody(request);
    const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
    const officeCode = readOfficeCode(body);

    const cardAiDesign = normalizeCardAiDesignInput(body.cardAiDesign);
    assertPromptWithinLimit(cardAiDesign.prompt);

    const visibleFields = Array.isArray(body.visibleFields)
      ? body.visibleFields
      : [];
    const productCategoryName =
      typeof body.productCategoryName === 'string'
        ? body.productCategoryName
        : '';
    const conditionFieldValueSamples =
      body.conditionFieldValueSamples &&
      typeof body.conditionFieldValueSamples === 'object'
        ? body.conditionFieldValueSamples
        : {};
    const currentCardStyle = normalizeCardStyle(body.currentCardStyle);
    const history = Array.isArray(body.history) ? body.history : [];
    assertHistoryWithinLimits(history);

    await requireOwnedOffice({ request, env, officeCode });

    const requestBody = buildCardStyleOpenAiRequestBody({
      cardAiDesign,
      visibleFields,
      productCategoryName,
      conditionFieldValueSamples,
      openAiModel: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      currentCardStyle,
      history,
    });

    let payload;

    try {
      ({ payload } = await requestOpenAiJson(requestBody, env.OPENAI_API_KEY));
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : 'OpenAI request failed.',
        502,
      );
    }

    const intent = normalizeOpenAiCardIntent(payload, cardAiDesign.targetScope);
    const { explanation, suggestion } = normalizeOpenAiCardExplanation(payload);

    return jsonResponse({ intent, explanation, suggestion });
  },
);
