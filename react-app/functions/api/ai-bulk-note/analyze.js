import { buildAiBulkNoteRequestBody } from '../../../src/features/office-product-editor/model/ai-bulk-note/aiBulkNoteRequestBodyModel.js';
import { sanitizeAiBulkNoteMatches } from '../../../src/features/office-product-editor/model/ai-bulk-note/aiBulkNoteMatchModel.js';
import {
  readAiBulkNoteAction,
  sanitizeAiBulkNoteNewRows,
} from '../../../src/features/office-product-editor/model/ai-bulk-note/aiBulkNoteNewRowModel.js';
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

const OPENAI_MODEL_ENV_KEY = 'OPENAI_MODEL_BULK_NOTE';
const DEFAULT_OPENAI_MODEL = 'gpt-5.6-luna';
const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'tableNameMode',
  'instruction',
  'rows',
  'referenceSheet',
  'supabaseUrl',
  'supabasePublishableKey',
];
const MAX_REQUEST_BODY_BYTES = 300000;
const MAX_WORKBOOK_AI_ROWS = 500;

export const onRequestPost = withRequestErrorHandling(
  async ({ request, env }) => {
    const rawBody = await readValidatedJsonBody(request, {
      maxBytes: MAX_REQUEST_BODY_BYTES,
    });
    const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
    const officeCode = readOfficeCode(body);
    const tableNameMode = toOptionalTrimmedString(body.tableNameMode);
    const instruction = toOptionalTrimmedString(body.instruction);

    assertPromptWithinLimit(instruction);

    const rows = Array.isArray(body.rows)
      ? body.rows.slice(0, MAX_WORKBOOK_AI_ROWS)
      : [];
    const sentRowIds = rows
      .map((row) => toOptionalTrimmedString(row?.row_id))
      .filter((rowId) => rowId !== '');

    if (rows.length === 0 && !body.referenceSheet) {
      return jsonResponse({
        action: 'none',
        matches: [],
        newRows: [],
        unmatchedReason: null,
      });
    }

    await requireOwnedOffice({ request, env, officeCode, body });

    const requestBody = buildAiBulkNoteRequestBody({
      rows,
      tableNameMode,
      instruction,
      referenceSheet: body.referenceSheet,
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

    const hasExplicitAction = ['edit_rows', 'append_rows', 'none'].includes(
      payload?.action,
    );
    const action = hasExplicitAction
      ? readAiBulkNoteAction(payload)
      : Array.isArray(payload?.matches) && payload.matches.length > 0
        ? 'edit_rows'
        : 'none';
    const matches =
      action === 'edit_rows'
        ? sanitizeAiBulkNoteMatches(payload, sentRowIds).matches
        : [];
    const newRows =
      action === 'append_rows' ? sanitizeAiBulkNoteNewRows(payload) : [];
    const unmatchedReason = payload?.unmatched_reason ?? null;

    return hasExplicitAction
      ? jsonResponse({ action, matches, newRows, unmatchedReason })
      : jsonResponse({ matches, unmatchedReason });
  },
);
