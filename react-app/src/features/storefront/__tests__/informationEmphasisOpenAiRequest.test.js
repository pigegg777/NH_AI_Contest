import { describe, expect, it } from 'vitest';

import { buildInformationEmphasisOpenAiRequestBody } from '../model/information-emphasis/ai-request/informationEmphasisOpenAiRequest';

function buildBody(overrides = {}) {
  return buildInformationEmphasisOpenAiRequestBody({
    label: '영세가격 안내',
    description: '비료: 요소 20kg 15,000원',
    openAiModel: 'test-model',
    ...overrides,
  });
}

describe('buildInformationEmphasisOpenAiRequestBody', () => {
  it('sends the label alongside the description so the model can judge context', () => {
    const userMessage = buildBody().input.at(-1);
    const payload = JSON.parse(userMessage.content);

    expect(userMessage.role).toBe('user');
    expect(payload.label).toBe('영세가격 안내');
    expect(payload.description).toBe('비료: 요소 20kg 15,000원');
  });

  it('states the marker rules in the system message', () => {
    const systemMessage = buildBody().input[0];

    expect(systemMessage.role).toBe('system');
    expect(systemMessage.content).toContain('<<');
    expect(systemMessage.content).toContain('[[');
  });

  it('locks the response to a single description field', () => {
    const { format } = buildBody().text;

    expect(format.type).toBe('json_schema');
    expect(format.strict).toBe(true);
    expect(Object.keys(format.schema.properties)).toEqual(['description']);
    expect(format.schema.required).toEqual(['description']);
    expect(format.schema.additionalProperties).toBe(false);
  });

  it('uses the model it was given', () => {
    expect(buildBody({ openAiModel: 'other-model' }).model).toBe('other-model');
  });
});
