import { describe, expect, it } from 'vitest';

import {
  buildBulkNoteRequestBody,
  serializeRowsForBulkNoteReview,
} from '../model/bulk-note/bulkNoteRequestBodyModel';
import { BULK_NOTE_WRITER_PROMPT } from '../model/bulk-note/bulkNoteWriterPrompt';
import { MAX_WORKBOOK_AI_ROWS } from '../model/ai-recommendations/workbookAiRequestBodyModel';

describe('serializeRowsForBulkNoteReview', () => {
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

    expect(serializeRowsForBulkNoteReview(rows)).toEqual([
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

    expect(serializeRowsForBulkNoteReview(rows)).toHaveLength(MAX_WORKBOOK_AI_ROWS);
  });

  it('returns an empty array for non-array input', () => {
    expect(serializeRowsForBulkNoteReview(null)).toEqual([]);
    expect(serializeRowsForBulkNoteReview(undefined)).toEqual([]);
  });
});

describe('buildBulkNoteRequestBody', () => {
  it('builds an OpenAI Responses API request body with the bulk-note schema', () => {
    const requestBody = buildBulkNoteRequestBody({
      rows: [{ row_id: 'A100__01', product_name: '유기질비료', spec: '20kg' }],
      tableNameMode: 'fertilizer',
      instruction: "소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘",
      openAiModel: 'gpt-4.1-mini',
      prompt: BULK_NOTE_WRITER_PROMPT,
    });

    expect(requestBody.model).toBe('gpt-4.1-mini');
    expect(requestBody.input[0]).toEqual({ role: 'system', content: BULK_NOTE_WRITER_PROMPT });

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

    expect(requestBody.text.format.type).toBe('json_schema');
    expect(requestBody.text.format.strict).toBe(true);
    expect(requestBody.text.format.schema.required).toEqual(['matches', 'unmatched_reason']);
    expect(requestBody.text.format.schema.properties.matches.items.required).toEqual([
      'row_id',
      'note',
    ]);
  });
});
