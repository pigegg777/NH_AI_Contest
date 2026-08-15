import { buildMarketResearchRequestBody } from '../../../src/features/office-product-editor/model/market-research/marketResearchRequestBodyModel.js';
import { normalizeMarketResearchReport } from '../../../src/features/office-product-editor/model/market-research/marketResearchReportModel.js';
import { MARKET_RESEARCH_PROMPT } from '../../../src/features/office-product-editor/model/market-research/marketResearchPrompt.js';
import {
  MARKET_RESEARCH_FALLBACK_PRODUCT_QUERY,
  MARKET_RESEARCH_FALLBACK_REPORT,
} from '../../../src/features/office-product-editor/model/market-research/marketResearchFallbackReport.js';
import { requestOpenAiJson } from '../../../src/features/storefront/services/openai/openAiJsonRequest.js';
import { toTrimmedString } from '../../../src/common/utils/text.js';
import { toNumberOrNull } from '../../../src/common/utils/number.js';
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

const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';
const OPENAI_TIMEOUT_MS = 15000;
const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'productQuery',
  'matchedProducts',
  'supabaseUrl',
  'supabasePublishableKey',
];
const MAX_REQUEST_BODY_BYTES = 20000;
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

function toOptionalTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isLocalDevelopmentRequest(request) {
  try {
    const hostname = new URL(request.url).hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('OpenAI request timed out.')),
      ms,
    );

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function buildLocalSupabaseEnvFallback(request, body) {
  if (!isLocalDevelopmentRequest(request)) {
    return {};
  }

  const supabaseUrl = toOptionalTrimmedString(body.supabaseUrl);
  const supabasePublishableKey = toOptionalTrimmedString(
    body.supabasePublishableKey,
  );
  const fallbackEnv = {};

  if (supabaseUrl) {
    fallbackEnv.SUPABASE_URL = supabaseUrl;
  }

  if (supabasePublishableKey) {
    fallbackEnv.SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey;
  }

  return fallbackEnv;
}

export async function onRequestPost({ request, env }) {
  try {
    assertPostJsonRequest(request);

    const rawBody = await readJsonBody(request, {
      maxBytes: MAX_REQUEST_BODY_BYTES,
    });
    const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
    const officeCode = toOptionalTrimmedString(body.officeCode);
    const productQuery = toOptionalTrimmedString(body.productQuery);

    assertOfficeCodePresent(officeCode);
    assertPromptWithinLimit(productQuery);

    const effectiveEnv = {
      ...buildLocalSupabaseEnvFallback(request, body),
      ...env,
    };

    const { supabase, user } = await requireAuthenticatedSupabaseUser(
      request,
      effectiveEnv,
    );
    await assertOfficeOwnership({ supabase, authUserId: user.id, officeCode });

    const requestBody = buildMarketResearchRequestBody({
      productQuery,
      matchedProducts: sanitizeMatchedProducts(body.matchedProducts),
      openAiModel: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      prompt: MARKET_RESEARCH_PROMPT,
    });

    let payload;
    let webSearchQueries;

    try {
      ({ payload, webSearchQueries } = await withTimeout(
        requestOpenAiJson(requestBody, env.OPENAI_API_KEY),
        OPENAI_TIMEOUT_MS,
      ));
    } catch (error) {
      if (productQuery === MARKET_RESEARCH_FALLBACK_PRODUCT_QUERY) {
        return jsonResponse({ report: MARKET_RESEARCH_FALLBACK_REPORT });
      }

      return errorResponse(
        error instanceof Error ? error.message : 'OpenAI request failed.',
        502,
      );
    }

    return jsonResponse({
      report: normalizeMarketResearchReport(payload, webSearchQueries),
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse('Unexpected server error.', 500);
  }
}
