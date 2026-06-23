import { describe, expect, it } from 'vitest';

import { buildCardStyleAiSystemPrompt, selectCardStyleSkillPackIds } from '../services/cardStyleSkillPromptService';

describe('buildCardStyleAiSystemPrompt', () => {
  it('always appends the bundled card-design-edit skill references', () => {
    const prompt = buildCardStyleAiSystemPrompt(['base-system', 'layout']);

    expect(prompt).toContain('independent-first');
    expect(prompt).toContain('card.field');
    expect(prompt).toContain('grouping');
    expect(prompt).toContain('preview');
  });
});

describe('selectCardStyleSkillPackIds', () => {
  it('keeps the runtime skill-pack selection behavior', () => {
    const ids = selectCardStyleSkillPackIds({
      productCategoryName: 'Fertilizer Upload',
      allowSemanticGrouping: true,
      mode: 'preview',
    });

    expect(ids).toEqual(expect.arrayContaining(['base-system', 'layout', 'transform', 'fertilizer-domain']));
  });

  it('drops the transform pack when semantic grouping is disallowed', () => {
    const ids = selectCardStyleSkillPackIds({ allowSemanticGrouping: false });

    expect(ids).not.toContain('transform');
  });
});
