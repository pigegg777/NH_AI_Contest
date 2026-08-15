import { describe, expect, it } from 'vitest';

import { buildWorkbookAiRequestBody } from '../model/ai-recommendations/workbookAiRequestBodyModel';
import { buildWorkbookAiAnalysisPrompt } from '../model/ai-recommendations/workbookAiRecommendationPrompt';
import { extractStructuredPayload } from '../../storefront/services/openai/openAiJsonRequest';

describe('workbook AI recommendation payload model', () => {
  it('builds the OpenAI request body with the separated prompt', () => {
    const fertilizerPrompt = buildWorkbookAiAnalysisPrompt('fertilizer');
    const requestBody = buildWorkbookAiRequestBody({
      tableNameMode: 'fertilizer',
      rows: [
        {
          row_id: 'A100__01',
          product_code: 'A100',
          product_name: 'Alpha',
          spec: '20kg',
        },
      ],
      openAiModel: 'gpt-4.1-mini',
      prompt: fertilizerPrompt,
      userHint: '  필름과 비닐은 같은 상품으로 봐주세요  ',
    });
    const userPayload = JSON.parse(requestBody.input[1].content);

    expect(requestBody.model).toBe('gpt-4.1-mini');
    expect(requestBody.input[0].content).toBe(fertilizerPrompt);
    expect(fertilizerPrompt).toContain('nutrient');
    expect(fertilizerPrompt).not.toContain('indict_symbl');
    expect(fertilizerPrompt).toContain('user_hint');
    expect(userPayload.analysis_scope).toBe('all_rows');
    expect(userPayload.table_name_mode).toBe('fertilizer');
    expect(userPayload.user_hint).toBe('필름과 비닐은 같은 상품으로 봐주세요');
    expect(userPayload.rows).toEqual([
      expect.objectContaining({
        row_id: 'A100__01',
        product_code: 'A100',
        product_name: 'Alpha',
        spec: '20kg',
      }),
    ]);
    expect(requestBody.input[1].content).not.toContain('manufacturer_code');
    expect(requestBody.input[1].content).not.toContain('rule_based_findings');
    expect(requestBody.text.format.schema.properties.recommendations.items.required).toEqual([
      'groupType',
      'title',
      'reason',
      'relatedRowIds',
    ]);
  });

  it('extracts a structured payload from output_parsed, output_text, and REST output content', () => {
    expect(
      extractStructuredPayload({
        output_parsed: { recommendations: [{ title: 'x' }] },
      }),
    ).toEqual({ recommendations: [{ title: 'x' }] });

    expect(
      extractStructuredPayload({
        output_text: JSON.stringify({ recommendations: [{ title: 'y' }] }),
      }),
    ).toEqual({ recommendations: [{ title: 'y' }] });

    expect(
      extractStructuredPayload({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({ recommendations: [{ title: 'z' }] }),
              },
            ],
          },
        ],
      }),
    ).toEqual({ recommendations: [{ title: 'z' }] });

    expect(
      extractStructuredPayload({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                parsed: { recommendations: [{ title: 'parsed' }] },
              },
            ],
          },
        ],
      }),
    ).toEqual({ recommendations: [{ title: 'parsed' }] });
  });
});
