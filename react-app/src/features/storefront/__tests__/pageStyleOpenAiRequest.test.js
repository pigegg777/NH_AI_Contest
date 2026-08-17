import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildPageStyleOpenAiRequestBody } from '../model/page-design/ai-request/pageStyleOpenAiRequest';

afterEach(() => {
  vi.clearAllMocks();
});

describe('buildPageStyleOpenAiRequestBody', () => {
  it('splices history turns between the system message and the final user message', () => {
    const requestBody = buildPageStyleOpenAiRequestBody({
      pageAiDesign: { prompt: 'make it bigger', targetScope: '' },
      openAiModel: 'gpt-4.1-mini',
      currentPageStyle: undefined,
      history: [
        { role: 'user', text: 'make it blue' },
        { role: 'assistant', text: 'I changed the background to blue.' },
      ],
    });

    expect(requestBody.input[0].role).toBe('system');
    expect(requestBody.input[1]).toEqual({ role: 'user', content: 'make it blue' });
    expect(requestBody.input[2]).toEqual({
      role: 'assistant',
      content: 'I changed the background to blue.',
    });
    expect(requestBody.input[3].role).toBe('user');
    expect(requestBody.input).toHaveLength(4);
  });

  it('mentions explanation and suggestion in the system prompt', () => {
    const requestBody = buildPageStyleOpenAiRequestBody({
      pageAiDesign: { prompt: 'x', targetScope: '' },
      openAiModel: 'gpt-4.1-mini',
      currentPageStyle: undefined,
    });

    expect(requestBody.input[0].content).toContain('explanation');
    expect(requestBody.input[0].content).toContain('suggestion');
  });
});
