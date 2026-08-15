import {
  PAGE_STYLE_AI_DEFAULT_OPENAI_MODEL,
} from '../../../src/features/storefront/config/page-design/pageStyleAiOpenAiConfig.js';
import {
  PAGE_STYLE_AI_REQUEST_BODY_ALLOWED_KEYS,
} from '../../../src/features/storefront/config/page-design/pageStyleAiHttpConfig.js';
import { normalizePageAiDesignInput } from '../../../src/features/storefront/model/page-design/pageAiDesignModel.js';
import {
  normalizePageStyleAiExplanation,
  normalizePageStyleAiIntent,
} from '../../../src/features/storefront/model/page-design/pageStyleAiResponseModel.js';
import { normalizePageStyle } from '../../../src/features/storefront/model/page-design/pageStyleModel.js';
import { requestOpenAiJson } from '../../../src/features/storefront/services/openai/openAiJsonRequest.js';
import { buildPageStyleOpenAiRequestBody } from '../../../src/features/storefront/model/page-design/pageStyleOpenAiRequest.js';
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

export async function onRequestPost({ request, env }) {
  try {
    assertPostJsonRequest(request);

    const rawBody = await readJsonBody(request);
    const body = pickAllowedKeys(rawBody, PAGE_STYLE_AI_REQUEST_BODY_ALLOWED_KEYS);
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
      openAiModel: env.OPENAI_MODEL || PAGE_STYLE_AI_DEFAULT_OPENAI_MODEL,
      currentPageStyle,
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

    const intent = normalizePageStyleAiIntent(
      payload,
      currentPageStyle.palette.accentHex,
      pageAiDesign.targetScope,
    );
    const { explanation, suggestion } = normalizePageStyleAiExplanation(payload);

    return jsonResponse({ intent, explanation, suggestion });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse('Unexpected server error.', 500);
  }
}
