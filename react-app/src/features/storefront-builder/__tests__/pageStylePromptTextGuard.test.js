import { describe, expect, it } from 'vitest';

import { PAGE_STYLE_AI_OPENAI_SYSTEM_INSTRUCTIONS } from '../model/page-design/ai-request/pageStyleAiPrompt';

describe('page style prompt text guard', () => {
  const prompt = PAGE_STYLE_AI_OPENAI_SYSTEM_INSTRUCTIONS.join('\n');

  it('forbids rewriting the title text', () => {
    expect(prompt).toMatch(/never rewrite the title text/i);
  });
});
