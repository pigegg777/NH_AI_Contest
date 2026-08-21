import { toTrimmedString } from '../../../../common/utils/text';
import { AI_IMAGE_APPLY_MATCH_PROMPT } from './aiImageApplyPrompt';

const MAX_WORKBOOK_AI_ROWS = 500;

const AI_IMAGE_APPLY_MATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    row_ids: {
      type: 'array',
      items: { type: 'string' },
    },
    unmatched_reason: { type: ['string', 'null'] },
  },
  required: ['row_ids', 'unmatched_reason'],
};

// The client serializes rows before sending them to the match endpoint (to
// keep the request payload small), and the endpoint serializes again when
// building the OpenAI request body. Once serialized, a row no longer carries
// img_url (only has_img_url) — so this must read an existing has_img_url
// back as-is instead of recomputing it from a by-then-absent img_url, or the
// second pass would silently collapse every row to has_img_url: false.
function resolveHasImgUrl(row) {
  if (typeof row?.has_img_url === 'boolean') {
    return row.has_img_url;
  }

  return Boolean(toTrimmedString(row?.img_url));
}

export function serializeRowsForAiImageApplyReview(rows) {
  const cappedRows = (Array.isArray(rows) ? rows : []).slice(0, MAX_WORKBOOK_AI_ROWS);

  return cappedRows.map((row) => ({
    row_id: toTrimmedString(row?.row_id),
    product_name: toTrimmedString(row?.product_name),
    spec: toTrimmedString(row?.spec),
    medium_category: toTrimmedString(row?.medium_category),
    small_category: toTrimmedString(row?.small_category),
    detail_category: toTrimmedString(row?.detail_category),
    product_category: toTrimmedString(row?.product_category),
    has_img_url: resolveHasImgUrl(row),
  }));
}

export function buildAiImageApplyMatchRequestBody({ rows, instruction, openAiModel }) {
  return {
    model: openAiModel,
    input: [
      { role: 'system', content: AI_IMAGE_APPLY_MATCH_PROMPT },
      {
        role: 'user',
        content: JSON.stringify({
          instruction: toTrimmedString(instruction),
          rows: serializeRowsForAiImageApplyReview(rows),
        }),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'ai_image_apply_matches',
        strict: true,
        schema: AI_IMAGE_APPLY_MATCH_SCHEMA,
      },
    },
    max_output_tokens: 4000,
  };
}
