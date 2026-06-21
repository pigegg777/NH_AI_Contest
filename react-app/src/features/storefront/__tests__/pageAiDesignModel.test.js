import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_AI_DESIGN,
  hasPageAiDesignMainPrompt,
  normalizePageAiDesignInput,
} from '../model/pageAiDesignModel';

describe('DEFAULT_PAGE_AI_DESIGN', () => {
  it('starts with four empty prompts', () => {
    expect(DEFAULT_PAGE_AI_DESIGN).toEqual({
      mainPrompt: '',
      headerOverridePrompt: '',
      categoryChipsOverridePrompt: '',
      searchOverridePrompt: '',
    });
  });
});

describe('normalizePageAiDesignInput', () => {
  it('trims every prompt and defaults missing ones to empty strings', () => {
    const result = normalizePageAiDesignInput({
      mainPrompt: '  warm and friendly  ',
      headerOverridePrompt: ' bolder ',
    });

    expect(result).toEqual({
      mainPrompt: 'warm and friendly',
      headerOverridePrompt: 'bolder',
      categoryChipsOverridePrompt: '',
      searchOverridePrompt: '',
    });
  });

  it('handles undefined input without throwing', () => {
    expect(normalizePageAiDesignInput(undefined)).toEqual(DEFAULT_PAGE_AI_DESIGN);
  });

  it('coerces non-string prompt values to empty strings', () => {
    expect(normalizePageAiDesignInput({ mainPrompt: 42, searchOverridePrompt: null }).mainPrompt).toBe('');
    expect(normalizePageAiDesignInput({ searchOverridePrompt: null }).searchOverridePrompt).toBe('');
  });
});

describe('hasPageAiDesignMainPrompt', () => {
  it('is false for empty/whitespace-only main prompt, true otherwise', () => {
    expect(hasPageAiDesignMainPrompt(undefined)).toBe(false);
    expect(hasPageAiDesignMainPrompt({ mainPrompt: '   ' })).toBe(false);
    expect(hasPageAiDesignMainPrompt({ mainPrompt: 'warm' })).toBe(true);
  });
});
