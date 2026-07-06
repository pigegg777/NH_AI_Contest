import { buildWorkbookAiRequestBody } from '../../../src/features/office-product-editor/model/ai-recommendations/workbookAiRequestBodyModel.js';
import {
  normalizeOpenAiRecommendations,
  sortWorkbookAiRecommendations,
} from '../../../src/features/office-product-editor/model/ai-recommendations/workbookAiRecommendationListModel.js';
import { WORKBOOK_AI_ANALYSIS_PROMPT } from '../../../src/features/office-product-editor/model/ai-recommendations/workbookAiRecommendationPrompt.js';
import { requestOpenAiJson } from '../../../src/features/storefront/services/openai/openAiJsonRequest.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  RequestValidationError,
  assertOfficeCodePresent,
  assertPostJsonRequest,
  pickAllowedKeys,
  readJsonBody,
} from '../../lib/requestValidation.js';
import { requireAuthenticatedSupabaseUser } from '../../lib/supabaseServerAuth.js';
import { assertOfficeOwnership } from '../../lib/officeOwnershipGuard.js';

const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';
const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'tableNameMode',
  'rows',
  'supabaseUrl',
  'supabasePublishableKey',
];
const MAX_ROWS = 500;
const MAX_REQUEST_BODY_BYTES = 300000;

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
    const officeCode =
      typeof body.officeCode === 'string' ? body.officeCode.trim() : '';
    const tableNameMode =
      typeof body.tableNameMode === 'string' ? body.tableNameMode.trim() : '';
    assertOfficeCodePresent(officeCode);

    const rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS) : [];

    if (rows.length === 0) {
      return jsonResponse({ recommendations: [] });
    }

    const effectiveEnv = {
      ...buildLocalSupabaseEnvFallback(request, body),
      ...env,
    };

    const { supabase, user } = await requireAuthenticatedSupabaseUser(
      request,
      effectiveEnv,
    );
    await assertOfficeOwnership({ supabase, authUserId: user.id, officeCode });

    const requestBody = buildWorkbookAiRequestBody({
      rows,
      tableNameMode,
      openAiModel: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      prompt: WORKBOOK_AI_ANALYSIS_PROMPT,
    });

    let payload;

    try {
      payload = await requestOpenAiJson(requestBody, env.OPENAI_API_KEY);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : 'OpenAI request failed.',
        502,
      );
    }

    if (!Array.isArray(payload?.recommendations)) {
      return errorResponse(
        'OpenAI returned an unreadable structured response.',
        502,
      );
    }

    const openAiRecommendations = normalizeOpenAiRecommendations(
      payload.recommendations,
      rows,
    );
    const recommendations = sortWorkbookAiRecommendations(
      openAiRecommendations,
    );

    return jsonResponse({ recommendations });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse('Unexpected server error.', 500);
  }
}
