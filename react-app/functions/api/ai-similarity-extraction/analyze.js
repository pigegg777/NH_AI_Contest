import { buildAiSimilarityExtractionRequestBody } from '../../../src/features/office-product-editor/model/ai-similarity-extraction/aiSimilarityExtractionRequestBodyModel.js';
import { sanitizeAiSimilarityExtractionMatches } from '../../../src/features/office-product-editor/model/ai-similarity-extraction/aiSimilarityExtractionListModel.js';
import { requestOpenAiJson } from '../../lib/openAiJsonRequest.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  pickAllowedKeys,
  readOfficeCode,
  readValidatedJsonBody,
  toOptionalTrimmedString,
  withRequestErrorHandling,
} from '../../lib/requestValidation.js';
import { requireOwnedOffice } from '../../lib/officeOwnershipGuard.js';

const DEFAULT_OPENAI_MODEL = 'gpt-5.6-luna';
const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'tableNameMode',
  'rows',
  'userHint',
  'supabaseUrl',
  'supabasePublishableKey',
];
const MAX_WORKBOOK_AI_ROWS = 500;
const MAX_USER_HINT_LENGTH = 500;

export const onRequestPost = withRequestErrorHandling(async ({ request, env }) => {
  const rawBody = await readValidatedJsonBody(request);
  const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
  const officeCode = readOfficeCode(body);
  const tableNameMode = toOptionalTrimmedString(body.tableNameMode);
  const userHint = toOptionalTrimmedString(body.userHint).slice(
    0,
    MAX_USER_HINT_LENGTH,
  );

  const rows = Array.isArray(body.rows)
    ? body.rows.slice(0, MAX_WORKBOOK_AI_ROWS)
    : [];

  if (rows.length === 0) {
    return jsonResponse({ recommendations: [] });
  }

  await requireOwnedOffice({ request, env, officeCode, body });

  const requestBody = buildAiSimilarityExtractionRequestBody({
    rows,
    tableNameMode,
    openAiModel: DEFAULT_OPENAI_MODEL,
    userHint,
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

  if (!Array.isArray(payload?.recommendations)) {
    return errorResponse(
      'OpenAI returned an unreadable structured response.',
      502,
    );
  }

  const recommendations = sanitizeAiSimilarityExtractionMatches(
    payload.recommendations,
    rows,
  );

  return jsonResponse({ recommendations });
});
