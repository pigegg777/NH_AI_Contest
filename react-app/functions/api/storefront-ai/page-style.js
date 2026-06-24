import { normalizePageAiDesignInput } from '../../../src/features/storefront/model/pageAiDesignModel.js';
import { normalizePageStyle } from '../../../src/features/storefront/model/pageStyleModel.js';
import { requestOpenAiJson } from '../../../src/features/storefront/services/openAiJsonRequest.js';
import {
  buildPageStyleOpenAiRequestBody,
  normalizePageStyleAiExplanation,
  normalizePageStyleAiIntent,
} from '../../../src/features/storefront/services/pageStyleAiContract.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  RequestValidationError,
  assertHistoryWithinLimits,
  assertOfficeCodePresent,
  assertPostJsonRequest,
  assertPromptWithinLimit,
  pickAllowedKeys,
  readJsonBody,
} from '../../lib/requestValidation.js';
import { requireAuthenticatedSupabaseUser } from '../../lib/supabaseServerAuth.js';
import { assertOfficeOwnership } from '../../lib/officeOwnershipGuard.js';

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const REQUEST_BODY_ALLOWED_KEYS = ['officeCode', 'pageAiDesign', 'currentPageStyle', 'history'];

export async function onRequestPost({ request, env }) {
  try {
    assertPostJsonRequest(request);

    const rawBody = await readJsonBody(request);
    const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
    const officeCode = typeof body.officeCode === 'string' ? body.officeCode.trim() : '';
    assertOfficeCodePresent(officeCode);

    const pageAiDesign = normalizePageAiDesignInput(body.pageAiDesign);
    assertPromptWithinLimit(pageAiDesign.prompt);

    const currentPageStyle = normalizePageStyle(body.currentPageStyle);
    const history = Array.isArray(body.history) ? body.history : [];
    assertHistoryWithinLimits(history);

    const { supabase, user } = await requireAuthenticatedSupabaseUser(request, env);
    await assertOfficeOwnership({ supabase, authUserId: user.id, officeCode });

    const requestBody = buildPageStyleOpenAiRequestBody({
      pageAiDesign,
      openAiModel: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      currentPageStyle,
      history,
    });

    let payload;

    try {
      payload = await requestOpenAiJson(requestBody, env.OPENAI_API_KEY);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : 'OpenAI request failed.', 502);
    }

    const intent = normalizePageStyleAiIntent(payload, currentPageStyle.palette.accentHex, pageAiDesign.targetScope);
    const { explanation, suggestion } = normalizePageStyleAiExplanation(payload);

    return jsonResponse({ intent, explanation, suggestion });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse('Unexpected server error.', 500);
  }
}
