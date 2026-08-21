import { describe, expect, it } from 'vitest';

import {
  buildAiImageApplyMatchRequestBody,
  serializeRowsForAiImageApplyReview,
} from '../model/ai-image-apply/aiImageApplyRequestBodyModel';
import { AI_IMAGE_APPLY_MATCH_PROMPT } from '../model/ai-image-apply/aiImageApplyPrompt';

describe('serializeRowsForAiImageApplyReview', () => {
  it('trims a row down to the fields the matcher needs, including has_img_url', () => {
    const rows = [
      {
        row_id: 'A100__01',
        product_name: '복합비료',
        spec: '20kg',
        medium_category: '복합비료',
        small_category: '',
        detail_category: '',
        product_category: '',
        img_url: 'https://example.com/a.png',
        note: 'ignored field',
      },
    ];

    expect(serializeRowsForAiImageApplyReview(rows)).toEqual([
      {
        row_id: 'A100__01',
        product_name: '복합비료',
        spec: '20kg',
        medium_category: '복합비료',
        small_category: '',
        detail_category: '',
        product_category: '',
        has_img_url: true,
      },
    ]);
  });

  it('reports has_img_url as false when img_url is missing or empty', () => {
    const rows = [
      { row_id: 'A100__01' },
      { row_id: 'B200__01', img_url: '' },
      { row_id: 'C300__01', img_url: '   ' },
    ];

    expect(serializeRowsForAiImageApplyReview(rows).map((row) => row.has_img_url)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('is idempotent: re-serializing an already-serialized row preserves has_img_url (the client calls this before sending to the backend, which calls it again)', () => {
    const rawRows = [
      { row_id: 'A100__01', product_name: '복합비료', img_url: 'https://example.com/a.png' },
      { row_id: 'B200__01', product_name: '유기질비료', img_url: '' },
    ];

    const firstPass = serializeRowsForAiImageApplyReview(rawRows);
    const secondPass = serializeRowsForAiImageApplyReview(firstPass);

    expect(secondPass.map((row) => row.has_img_url)).toEqual([true, false]);
  });

  it('caps the row count at 500', () => {
    const rows = Array.from({ length: 510 }, (_, i) => ({ row_id: `R${i}` }));

    expect(serializeRowsForAiImageApplyReview(rows)).toHaveLength(500);
  });

  it('returns an empty array for non-array input', () => {
    expect(serializeRowsForAiImageApplyReview(null)).toEqual([]);
    expect(serializeRowsForAiImageApplyReview(undefined)).toEqual([]);
  });
});

describe('buildAiImageApplyMatchRequestBody', () => {
  it('builds an OpenAI Responses API request body carrying has_img_url per row', () => {
    const requestBody = buildAiImageApplyMatchRequestBody({
      rows: [
        { row_id: 'A100__01', product_name: '복합비료', img_url: '' },
        { row_id: 'B200__01', product_name: '유기질비료', img_url: 'https://example.com/b.png' },
      ],
      instruction: '이미지 url 없는 상품에 적용해줘',
      openAiModel: 'gpt-5.6-luna',
    });

    expect(requestBody.model).toBe('gpt-5.6-luna');
    expect(requestBody.input[0]).toEqual({ role: 'system', content: AI_IMAGE_APPLY_MATCH_PROMPT });

    const userContent = JSON.parse(requestBody.input[1].content);
    expect(userContent.instruction).toBe('이미지 url 없는 상품에 적용해줘');
    expect(userContent.rows).toEqual([
      {
        row_id: 'A100__01',
        product_name: '복합비료',
        spec: '',
        medium_category: '',
        small_category: '',
        detail_category: '',
        product_category: '',
        has_img_url: false,
      },
      {
        row_id: 'B200__01',
        product_name: '유기질비료',
        spec: '',
        medium_category: '',
        small_category: '',
        detail_category: '',
        product_category: '',
        has_img_url: true,
      },
    ]);

    expect(requestBody.text.format.type).toBe('json_schema');
    expect(requestBody.text.format.strict).toBe(true);
    expect(requestBody.text.format.schema.required).toEqual(['row_ids', 'unmatched_reason']);
  });
});
