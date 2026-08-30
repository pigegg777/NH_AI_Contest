import { buildAiImageApplyMatchRequestBody } from '../../../src/features/office-product-editor/model/ai-image-apply/aiImageApplyRequestBodyModel.js';
import { sanitizeAiImageApplyMatches } from '../../../src/features/office-product-editor/model/ai-image-apply/aiImageApplyMatchModel.js';
import { requestOpenAiJson } from '../../lib/openAiJsonRequest.js';
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

const OPENAI_MODEL_ENV_KEY = 'OPENAI_MODEL_IMAGE_MATCH';
const DEFAULT_OPENAI_MODEL = 'gpt-5.6-terra';
const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'instruction',
  'rows',
  'supabaseUrl',
  'supabasePublishableKey',
];
const MAX_REQUEST_BODY_BYTES = 300000;
const MAX_WORKBOOK_AI_ROWS = 500;

export const onRequestPost = withRequestErrorHandling(async ({ request, env }) => {
  const rawBody = await readValidatedJsonBody(request, {
    maxBytes: MAX_REQUEST_BODY_BYTES,
  });
  const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
  const officeCode = readOfficeCode(body);
  const instruction = toOptionalTrimmedString(body.instruction);

  assertPromptWithinLimit(instruction);

  const rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_WORKBOOK_AI_ROWS) : [];
  const sentRowIds = rows
    .map((row) => toOptionalTrimmedString(row?.row_id))
    .filter((rowId) => rowId !== '');

  if (rows.length === 0) {
    return jsonResponse({ rowIds: [], unmatchedReason: null });
  }

  await requireOwnedOffice({ request, env, officeCode, body });

  const requestBody = buildAiImageApplyMatchRequestBody({
    rows,
    instruction,
    openAiModel: resolveOpenAiModel(env, OPENAI_MODEL_ENV_KEY, DEFAULT_OPENAI_MODEL),
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

  const { rowIds, unmatchedReason } = sanitizeAiImageApplyMatches(payload, sentRowIds);

  return jsonResponse({ rowIds, unmatchedReason });
});
