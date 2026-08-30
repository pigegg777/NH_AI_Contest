import { buildAiMarketResearchRequestBody } from '../../../src/features/office-product-editor/model/ai-market-research/aiMarketResearchRequestBodyModel.js';
import { normalizeAiMarketResearchReport } from '../../../src/features/office-product-editor/model/ai-market-research/aiMarketResearchReportModel.js';
import { requestOpenAiJson } from '../../lib/openAiJsonRequest.js';
import { toTrimmedString } from '../../../src/common/utils/text.js';
import { toNumberOrNull } from '../../../src/common/utils/number.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  assertPromptWithinLimit,
  pickAllowedKeys,
  readOfficeCode,
  readValidatedJsonBody,
  toOptionalTrimmedString,
  withRequestErrorHandling,
} from '../../lib/requestValidation.js';
import { requireOwnedOffice } from '../../lib/officeOwnershipGuard.js';
import { resolveOpenAiModel } from '../../lib/openAiModel.js';

const OPENAI_MODEL_ENV_KEY = 'OPENAI_MODEL_MARKET_RESEARCH';
const DEFAULT_OPENAI_MODEL = 'gpt-5.6-sol';
const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'productQuery',
  'matchedProducts',
  'supabaseUrl',
  'supabasePublishableKey',
];
const MAX_MATCHED_PRODUCTS = 3;

function sanitizeMatchedProducts(matchedProducts) {
  if (!Array.isArray(matchedProducts)) {
    return [];
  }

  return matchedProducts.slice(0, MAX_MATCHED_PRODUCTS).map((product) => ({
    productName: toTrimmedString(product?.productName),
    spec: toTrimmedString(product?.spec),
    priceKrw: toNumberOrNull(product?.priceKrw),
  }));
}

export const onRequestPost = withRequestErrorHandling(
  async ({ request, env }) => {
    const rawBody = await readValidatedJsonBody(request);
    const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
    const officeCode = readOfficeCode(body);
    const productQuery = toOptionalTrimmedString(body.productQuery);

    assertPromptWithinLimit(productQuery);

    await requireOwnedOffice({ request, env, officeCode, body });

    const requestBody = buildAiMarketResearchRequestBody({
      productQuery,
      matchedProducts: sanitizeMatchedProducts(body.matchedProducts),
      openAiModel: resolveOpenAiModel(env, OPENAI_MODEL_ENV_KEY, DEFAULT_OPENAI_MODEL),
    });

    let payload;
    let webSearchQueries;

    try {
      ({ payload, webSearchQueries } = await requestOpenAiJson(
        requestBody,
        env.OPENAI_API_KEY,
      ));
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : 'OpenAI request failed.',
        502,
      );
    }

    return jsonResponse({
      report: normalizeAiMarketResearchReport(payload, webSearchQueries),
    });
  },
);
