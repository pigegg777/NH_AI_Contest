import { describe, expect, it } from 'vitest';

import { buildStorefrontAiSystemPrompt, selectStorefrontAiSkillPackIds } from '../services/storefrontAiSkillService';

describe('buildStorefrontAiSystemPrompt', () => {
  it('always appends the bundled storefront design-edit skill references', () => {
    const prompt = buildStorefrontAiSystemPrompt(['base-system', 'layout']);

    expect(prompt).toContain('independent-first');
    expect(prompt).toContain('card.field');
    expect(prompt).toContain('grouping');
    expect(prompt).toContain('preview');
  });
});

describe('selectStorefrontAiSkillPackIds', () => {
  it('still keeps the existing runtime skill-pack selection behavior', () => {
    const ids = selectStorefrontAiSkillPackIds({
      productCategoryName: 'Fertilizer Upload',
      editPolicy: { allowSemanticGrouping: true },
      mode: 'preview',
    });

    expect(ids).toEqual(expect.arrayContaining(['base-system', 'layout', 'transform']));
  });
});
