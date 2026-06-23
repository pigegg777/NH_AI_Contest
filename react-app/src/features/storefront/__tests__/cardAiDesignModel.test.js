import { describe, expect, it } from 'vitest';

import {
  buildCardAiTargetScopeInstruction,
  CARD_AI_TARGET_SCOPE_OPTIONS,
  DEFAULT_CARD_AI_DESIGN,
  getCardAiTargetScopeOption,
  normalizeCardAiDesignInput,
  normalizeCardAiTargetScope,
} from '../model/cardAiDesignModel';

describe('normalizeCardAiTargetScope', () => {
  it('only allows the four approved scopes, falling back to empty (no selection) otherwise', () => {
    expect(normalizeCardAiTargetScope('header')).toBe('header');
    expect(normalizeCardAiTargetScope('image')).toBe('image');
    expect(normalizeCardAiTargetScope('info')).toBe('info');
    expect(normalizeCardAiTargetScope('field')).toBe('field');
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

    expect(instruction).toContain('특정 항목');
    expect(instruction).toContain('언급한 항목의 색상, 굵기, 강조');
  });

  it('lists exactly the four approved scopes', () => {
    expect(CARD_AI_TARGET_SCOPE_OPTIONS.map((option) => option.id)).toEqual(['header', 'image', 'info', 'field']);
  });
});
