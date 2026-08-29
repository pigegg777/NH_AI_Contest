import { describe, expect, it } from 'vitest';

import {
  AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS,
  buildAiBulkNoteRequestBody,
  serializeReferenceSheetForAiBulkNoteReview,
  serializeRowsForAiBulkNoteReview,
} from '../model/ai-bulk-note/aiBulkNoteRequestBodyModel';
import { AI_BULK_NOTE_WRITER_PROMPT } from '../model/ai-bulk-note/aiBulkNoteWriterPrompt';
import { MAX_WORKBOOK_AI_ROWS } from '../model/ai-similarity-extraction/aiSimilarityExtractionRequestBodyModel';

describe('serializeRowsForAiBulkNoteReview', () => {
  it('trims a row down to the fields the bulk note writer needs', () => {
    const rows = [
      {
        row_id: 'A100__01',
        product_name: '유기질비료',
        spec: '20kg',
        medium_category: '유기질비료',
        small_category: '가축분퇴비',
        detail_category: '',
        product_category: '',
        note: '기존 비고',
        tax_price: 15000,
        zero_tax_price: null,
        exempt_tax_price: null,
        product_usage: [{ cropName: '벼' }],
      },
    ];

    expect(serializeRowsForAiBulkNoteReview(rows)).toEqual([
      {
        row_id: 'A100__01',
        product_name: '유기질비료',
        spec: '20kg',
        medium_category: '유기질비료',
        small_category: '가축분퇴비',
        detail_category: '',
        product_category: '',
        note: '기존 비고',
        tax_price: 15000,
        zero_tax_price: null,
        exempt_tax_price: null,
      },
    ]);
  });

  it('caps the row count at MAX_WORKBOOK_AI_ROWS', () => {
    const rows = Array.from({ length: MAX_WORKBOOK_AI_ROWS + 10 }, (_, i) => ({
      row_id: `R${i}`,
    }));

    expect(serializeRowsForAiBulkNoteReview(rows)).toHaveLength(MAX_WORKBOOK_AI_ROWS);
  });

  it('returns an empty array for non-array input', () => {
    expect(serializeRowsForAiBulkNoteReview(null)).toEqual([]);
    expect(serializeRowsForAiBulkNoteReview(undefined)).toEqual([]);
  });
});

describe('serializeReferenceSheetForAiBulkNoteReview', () => {
  it('shapes a reference sheet into sheet_name + rows', () => {
    const referenceSheet = {
      fileName: 'price-ref.xlsx',
      sheetName: 'Sheet1',
      rows: [
        ['product_name', 'price'],
        ['유기질비료', 15000],
      ],
    };

    expect(serializeReferenceSheetForAiBulkNoteReview(referenceSheet)).toEqual({
      sheet_name: 'Sheet1',
      rows: [
        ['product_name', 'price'],
        ['유기질비료', 15000],
      ],
    });
  });

  it('caps rows at AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS', () => {
    const referenceSheet = {
      sheetName: 'Sheet1',
      rows: Array.from({ length: AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS + 10 }, (_, i) => [`row-${i}`]),
    };

    expect(serializeReferenceSheetForAiBulkNoteReview(referenceSheet).rows).toHaveLength(
      AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS,
    );
  });

  it('returns null for null, missing rows, or an empty sheet', () => {
    expect(serializeReferenceSheetForAiBulkNoteReview(null)).toBeNull();
    expect(serializeReferenceSheetForAiBulkNoteReview({ sheetName: 'Sheet1' })).toBeNull();
    expect(serializeReferenceSheetForAiBulkNoteReview({ sheetName: 'Sheet1', rows: [] })).toBeNull();
  });
});

describe('buildAiBulkNoteRequestBody', () => {
  it('builds an OpenAI Responses API request body with the bulk-note schema', () => {
    const requestBody = buildAiBulkNoteRequestBody({
      rows: [{ row_id: 'A100__01', product_name: '유기질비료', spec: '20kg' }],
      tableNameMode: 'fertilizer',
      instruction: "소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘",
      referenceSheet: null,
      openAiModel: 'gpt-4.1-mini',
    });

    expect(requestBody.model).toBe('gpt-4.1-mini');
    expect(requestBody.input[0]).toEqual({ role: 'system', content: AI_BULK_NOTE_WRITER_PROMPT });
    expect(AI_BULK_NOTE_WRITER_PROMPT).toContain(
      'when product_code is missing, ambiguous, or unreadable.',
    );
    expect(AI_BULK_NOTE_WRITER_PROMPT).toContain(
      'null instead of guessing',
    );

    const userContent = JSON.parse(requestBody.input[1].content);
    expect(userContent.table_name_mode).toBe('fertilizer');
    expect(userContent.instruction).toBe("소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘");
    expect(userContent.rows).toEqual([
      {
        row_id: 'A100__01',
        product_name: '유기질비료',
        spec: '20kg',
        medium_category: '',
        small_category: '',
        detail_category: '',
        product_category: '',
        note: '',
        tax_price: null,
        zero_tax_price: null,
        exempt_tax_price: null,
      },
    ]);
    expect(userContent.reference_sheet).toBeNull();

    expect(requestBody.text.format.type).toBe('json_schema');
    expect(requestBody.text.format.strict).toBe(true);
    expect(requestBody.text.format.schema.required).toEqual([
      'action',
      'matches',
      'new_rows',
      'unmatched_reason',
    ]);
    expect(requestBody.text.format.schema.properties.matches.items.required).toEqual([
      'row_id',
      'note',
      'zero_tax_price',
      'tax_price',
      'exempt_tax_price',
    ]);
  });

  it('includes the reference sheet in the user content when provided', () => {
    const requestBody = buildAiBulkNoteRequestBody({
      rows: [{ row_id: 'A100__01' }],
      tableNameMode: 'fertilizer',
      instruction: '조건',
      referenceSheet: {
        sheetName: 'Sheet1',
        rows: [
          ['product_name', 'price'],
          ['유기질비료', 15000],
        ],
      },
      openAiModel: 'gpt-4.1-mini',
    });

    const userContent = JSON.parse(requestBody.input[1].content);
    expect(userContent.reference_sheet).toEqual({
      sheet_name: 'Sheet1',
      rows: [
        ['product_name', 'price'],
        ['유기질비료', 15000],
      ],
    });
  });
});
