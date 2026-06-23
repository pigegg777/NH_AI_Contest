import { normalizeCardAiDesignInput } from '../../../src/features/storefront/model/cardAiDesignModel.js';
import { normalizeCardStyle } from '../../../src/features/storefront/model/cardStyleModel.js';
import { requestOpenAiJson } from '../../../src/features/storefront/services/openAiJsonRequest.js';
import {
  buildCardStyleOpenAiRequestBody,
  normalizeOpenAiCardIntent,
} from '../../../src/features/storefront/services/cardStyleAiContract.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  RequestValidationError,
  assertOfficeCodePresent,
  assertPostJsonRequest,
  assertPromptWithinLimit,
  pickAllowedKeys,
  readJsonBody,
} from '../../lib/requestValidation.js';
import { requireAuthenticatedSupabaseUser } from '../../lib/supabaseServerAuth.js';
import { assertOfficeOwnership } from '../../lib/officeOwnershipGuard.js';

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'cardAiDesign',
  'visibleFields',
  'productCategoryName',
  'currentCardStyle',
];

export async function onRequestPost({ request, env }) {
  try {
    assertPostJsonRequest(request);

    const rawBody = await readJsonBody(request);
    const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
    const officeCode = typeof body.officeCode === 'string' ? body.officeCode.trim() : '';
    assertOfficeCodePresent(officeCode);

    const cardAiDesign = normalizeCardAiDesignInput(body.cardAiDesign);
    assertPromptWithinLimit(cardAiDesign.prompt);

    const visibleFields = Array.isArray(body.visibleFields) ? body.visibleFields : [];
    const productCategoryName = typeof body.productCategoryName === 'string' ? body.productCategoryName : '';
    const currentCardStyle = normalizeCardStyle(body.currentCardStyle);

    const { supabase, user } = await requireAuthenticatedSupabaseUser(request, env);
    await assertOfficeOwnership({ supabase, authUserId: user.id, officeCode });

    const requestBody = buildCardStyleOpenAiRequestBody({
      cardAiDesign,
      visibleFields,
      productCategoryName,
      openAiModel: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      currentCardStyle,
    });

    let payload;

    try {
      payload = await requestOpenAiJson(requestBody, env.OPENAI_API_KEY);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : 'OpenAI request failed.', 502);
    }

    const intent = normalizeOpenAiCardIntent(payload, cardAiDesign.targetScope);

    return jsonResponse({ intent });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse('Unexpected server error.', 500);
  }
}
