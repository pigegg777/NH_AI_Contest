import { describe, expect, it } from 'vitest';

import {
  buildCardAiTargetScopeInstruction,
  CARD_AI_TARGET_SCOPE_OPTIONS,
  DEFAULT_CARD_AI_DESIGN,
  getCardAiTargetScopeOption,
  normalizeCardAiDesignInput,
  normalizeCardAiTargetScope,
} from '../model/card-design/ai-request/cardAiDesignModel';

describe('normalizeCardAiTargetScope', () => {
  it('only allows the five approved scopes, falling back to empty (no selection) otherwise', () => {
    expect(normalizeCardAiTargetScope('header')).toBe('header');
    expect(normalizeCardAiTargetScope('image')).toBe('image');
    expect(normalizeCardAiTargetScope('info')).toBe('info');
    expect(normalizeCardAiTargetScope('field')).toBe('field');
    expect(normalizeCardAiTargetScope('description')).toBe('description');
    expect(normalizeCardAiTargetScope('unknown')).toBe('');
    expect(normalizeCardAiTargetScope(undefined)).toBe('');
  });
});

describe('normalizeCardAiDesignInput', () => {
  it('trims the prompt and normalizes the target scope', () => {
    expect(normalizeCardAiDesignInput({ prompt: '  비료 상품을 강조해줘  ', targetScope: 'header' })).toEqual({
      prompt: '비료 상품을 강조해줘',
      targetScope: 'header',
    });
  });

  it('defaults to an empty prompt and no scope when given nothing', () => {
    expect(normalizeCardAiDesignInput()).toEqual(DEFAULT_CARD_AI_DESIGN);
  });
});

describe('getCardAiTargetScopeOption / buildCardAiTargetScopeInstruction', () => {
  it('returns null/empty for no selection', () => {
    expect(getCardAiTargetScopeOption('')).toBeNull();
    expect(buildCardAiTargetScopeInstruction('')).toBe('');
  });

  it('builds a scoping instruction naming the label and detail for a selected scope', () => {
    const instruction = buildCardAiTargetScopeInstruction('field');
    // Scope labels are UI copy that gets renamed; read them off the option so a
    // rename never breaks this case.
    const fieldScope = getCardAiTargetScopeOption('field');

    expect(instruction).toContain(fieldScope.label);
    expect(instruction).toContain(fieldScope.detail);
    expect(instruction).toContain('전체 글자색, 전체 굵기, 전체 글자 크기');
  });

  it('lists exactly the five approved scopes', () => {
    expect(CARD_AI_TARGET_SCOPE_OPTIONS.map((option) => option.id)).toEqual([
      'header',
      'image',
      'info',
      'field',
      'description',
    ]);
  });
});
