import { describe, expect, it } from 'vitest';

import { buildWorkbookAiRequestBody } from '../model/ai-recommendations/workbookAiRequestBodyModel';
import { WORKBOOK_AI_ANALYSIS_PROMPT } from '../model/ai-recommendations/workbookAiRecommendationPrompt';
import { extractStructuredPayload } from '../../storefront/services/openAiJsonRequest';

describe('workbook AI recommendation payload model', () => {
  it('builds the OpenAI request body with the separated prompt', () => {
    const requestBody = buildWorkbookAiRequestBody({
      rows: [
        {
          row_id: 'A100__01',
          product_code: 'A100',
          product_name: 'Alpha',
          manufacturer_list: [{ manufacturer_name: 'NH' }],
        },
      ],
      openAiModel: 'gpt-4.1-mini',
      prompt: WORKBOOK_AI_ANALYSIS_PROMPT,
    });

    expect(requestBody.model).toBe('gpt-4.1-mini');
    expect(requestBody.input[0].content).toBe(WORKBOOK_AI_ANALYSIS_PROMPT);
    expect(requestBody.input[1].content).toContain('"analysis_scope": "all_rows"');
    expect(requestBody.input[1].content).toContain('"manufacturer_name": "NH"');
    expect(requestBody.input[1].content).not.toContain('manufacturer_code');
    expect(requestBody.input[1].content).not.toContain('rule_based_findings');
    expect(requestBody.text.format.schema.properties.recommendations.items.required).toEqual([
      'severity',
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
