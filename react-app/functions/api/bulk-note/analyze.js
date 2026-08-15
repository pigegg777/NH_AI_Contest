import { buildBulkNoteRequestBody } from '../../../src/features/office-product-editor/model/bulk-note/bulkNoteRequestBodyModel.js';
import { normalizeBulkNoteMatches } from '../../../src/features/office-product-editor/model/bulk-note/bulkNoteMatchModel.js';
import { BULK_NOTE_WRITER_PROMPT } from '../../../src/features/office-product-editor/model/bulk-note/bulkNoteWriterPrompt.js';
import { MAX_WORKBOOK_AI_ROWS } from '../../../src/features/office-product-editor/model/ai-recommendations/workbookAiRequestBodyModel.js';
import { requestOpenAiJson } from '../../../src/features/storefront/services/openai/openAiJsonRequest.js';
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

const DEFAULT_OPENAI_MODEL = 'gpt-5.6-luna';
const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'tableNameMode',
  'instruction',
  'rows',
  'supabaseUrl',
  'supabasePublishableKey',
];
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
  const supabasePublishableKey = toOptionalTrimmedString(body.supabasePublishableKey);
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

    const rawBody = await readJsonBody(request, { maxBytes: MAX_REQUEST_BODY_BYTES });
    const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
    const officeCode = toOptionalTrimmedString(body.officeCode);
    const tableNameMode = toOptionalTrimmedString(body.tableNameMode);
    const instruction = toOptionalTrimmedString(body.instruction);

    assertOfficeCodePresent(officeCode);
    assertPromptWithinLimit(instruction);

    const rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_WORKBOOK_AI_ROWS) : [];
    const sentRowIds = rows
      .map((row) => toOptionalTrimmedString(row?.row_id))
      .filter((rowId) => rowId !== '');

    if (rows.length === 0) {
      return jsonResponse({ matches: [], unmatchedReason: null });
    }

    const effectiveEnv = {
      ...buildLocalSupabaseEnvFallback(request, body),
      ...env,
    };

    const { supabase, user } = await requireAuthenticatedSupabaseUser(request, effectiveEnv);
    await assertOfficeOwnership({ supabase, authUserId: user.id, officeCode });

    const requestBody = buildBulkNoteRequestBody({
      rows,
      tableNameMode,
      instruction,
      openAiModel: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      prompt: BULK_NOTE_WRITER_PROMPT,
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

    const { matches, unmatchedReason } = normalizeBulkNoteMatches(payload, sentRowIds);

    return jsonResponse({ matches, unmatchedReason });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse('Unexpected server error.', 500);
  }
}
