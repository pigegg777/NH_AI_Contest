import { toTrimmedString } from '../../../../common/utils/text';
import { toNumberOrNull } from '../../../../common/utils/number';
import { MAX_WORKBOOK_AI_ROWS } from '../ai-recommendations/workbookAiRequestBodyModel';

const BULK_NOTE_MATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          row_id: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['row_id', 'note'],
      },
    },
    unmatched_reason: { type: ['string', 'null'] },
  },
  required: ['matches', 'unmatched_reason'],
};

export function serializeRowsForBulkNoteReview(rows) {
  const cappedRows = (Array.isArray(rows) ? rows : []).slice(0, MAX_WORKBOOK_AI_ROWS);

  return cappedRows.map((row) => ({
    row_id: toTrimmedString(row?.row_id),
    product_name: toTrimmedString(row?.product_name),
    spec: toTrimmedString(row?.spec),
    medium_category: toTrimmedString(row?.medium_category),
    small_category: toTrimmedString(row?.small_category),
    detail_category: toTrimmedString(row?.detail_category),
    product_category: toTrimmedString(row?.product_category),
    note: toTrimmedString(row?.note),
    tax_price: toNumberOrNull(row?.tax_price),
    zero_tax_price: toNumberOrNull(row?.zero_tax_price),
    exempt_tax_price: toNumberOrNull(row?.exempt_tax_price),
  }));
}

export function buildBulkNoteRequestBody({ rows, tableNameMode, instruction, openAiModel, prompt }) {
  return {
    model: openAiModel,
    input: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: JSON.stringify({
          table_name_mode: toTrimmedString(tableNameMode),
          instruction: toTrimmedString(instruction),
          rows: serializeRowsForBulkNoteReview(rows),
        }),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'bulk_note_matches',
        strict: true,
        schema: BULK_NOTE_MATCH_SCHEMA,
      },
    },
    max_output_tokens: 8000,
  };
}
