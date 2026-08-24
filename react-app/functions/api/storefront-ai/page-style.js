import { normalizePageAiDesignInput } from '../../../src/features/storefront/model/page-design/ai-request/pageAiDesignModel.js';
import {
  normalizePageStyleAiExplanation,
  normalizePageStyleAiIntent,
} from '../../../src/features/storefront/model/page-design/ai-response/pageStyleAiResponseNormalizer.js';
import { normalizePageStyle } from '../../../src/features/storefront/model/page-design/style/pageStyleModel.js';
import { requestOpenAiJson } from '../../lib/openAiJsonRequest.js';
import { buildPageStyleOpenAiRequestBody } from '../../../src/features/storefront/model/page-design/ai-request/pageStyleOpenAiRequest.js';
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

const PAGE_STYLE_AI_REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'pageAiDesign',
  'currentPageStyle',
  'history',
];
const PAGE_STYLE_AI_DEFAULT_OPENAI_MODEL = 'gpt-5.6-terra';
export const onRequestPost = withRequestErrorHandling(
  async ({ request, env }) => {
    const rawBody = await readValidatedJsonBody(request);
    const body = pickAllowedKeys(
      rawBody,
      PAGE_STYLE_AI_REQUEST_BODY_ALLOWED_KEYS,
    );
    const officeCode = readOfficeCode(body);

    const pageAiDesign = normalizePageAiDesignInput(body.pageAiDesign);
    assertPromptWithinLimit(pageAiDesign.prompt);

    const currentPageStyle = normalizePageStyle(body.currentPageStyle);
    const history = Array.isArray(body.history) ? body.history : [];
    assertHistoryWithinLimits(history);

    await requireOwnedOffice({ request, env, officeCode });

    const requestBody = buildPageStyleOpenAiRequestBody({
      pageAiDesign,
      openAiModel: PAGE_STYLE_AI_DEFAULT_OPENAI_MODEL,
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
    const { explanation, suggestion } =
      normalizePageStyleAiExplanation(payload);

    return jsonResponse({ intent, explanation, suggestion });
  },
);
