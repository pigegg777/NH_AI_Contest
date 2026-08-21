import { toTrimmedString } from '../../../../common/utils/text';
import { toNumberOrNull } from '../../../../common/utils/number';
import { AI_BULK_NOTE_WRITER_PROMPT } from './aiBulkNoteWriterPrompt';

const MAX_WORKBOOK_AI_ROWS = 500;

const AI_BULK_NOTE_MATCH_SCHEMA = {
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
          note: { type: ['string', 'null'] },
          zero_tax_price: { type: ['number', 'null'] },
          tax_price: { type: ['number', 'null'] },
          exempt_tax_price: { type: ['number', 'null'] },
        },
        required: ['row_id', 'note', 'zero_tax_price', 'tax_price', 'exempt_tax_price'],
      },
    },
    unmatched_reason: { type: ['string', 'null'] },
  },
  required: ['matches', 'unmatched_reason'],
};

export const AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS = 500;

export function serializeRowsForAiBulkNoteReview(rows) {
  const cappedRows = (Array.isArray(rows) ? rows : []).slice(
    0,
    MAX_WORKBOOK_AI_ROWS,
  );

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

export function serializeReferenceSheetForAiBulkNoteReview(referenceSheet) {
  if (!referenceSheet || !Array.isArray(referenceSheet.rows)) {
    return null;
  }

  const rows = referenceSheet.rows.slice(
    0,
    AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS,
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    sheet_name: toTrimmedString(referenceSheet.sheetName),
    rows,
  };
}

export function buildAiBulkNoteRequestBody({
  rows,
  tableNameMode,
  instruction,
  referenceSheet,
  openAiModel,
}) {
  return {
    model: openAiModel,
    input: [
      { role: 'system', content: AI_BULK_NOTE_WRITER_PROMPT },
      {
        role: 'user',
        content: JSON.stringify({
          table_name_mode: toTrimmedString(tableNameMode),
          instruction: toTrimmedString(instruction),
          rows: serializeRowsForAiBulkNoteReview(rows),
          reference_sheet:
            serializeReferenceSheetForAiBulkNoteReview(referenceSheet),
        }),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'ai_bulk_note_matches',
        strict: true,
        schema: AI_BULK_NOTE_MATCH_SCHEMA,
      },
    },
    max_output_tokens: 8000,
  };
}
