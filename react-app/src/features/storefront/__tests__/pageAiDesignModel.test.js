import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_AI_DESIGN,
  normalizePageAiDesignInput,
} from '../model/page-design/pageAiDesignModel';

describe('DEFAULT_PAGE_AI_DESIGN', () => {
  it('starts with one empty prompt', () => {
    expect(DEFAULT_PAGE_AI_DESIGN).toEqual({
      prompt: '',
      targetScope: '',
    });
  });
});

describe('normalizePageAiDesignInput', () => {
  it('trims the prompt and defaults missing values to an empty string', () => {
    const result = normalizePageAiDesignInput({
      prompt: '  warm and friendly, make the search stronger  ',
    });

    expect(result).toEqual({
      prompt: 'warm and friendly, make the search stronger',
      targetScope: '',
    });
  });

  it('merges the legacy main/override fields into one prompt for backward compatibility', () => {
    const result = normalizePageAiDesignInput({
      mainPrompt: 'warm and friendly',
      overridePrompt: 'make the search stronger',
    });

    expect(result).toEqual({
      prompt: 'warm and friendly\n\nmake the search stronger',
      targetScope: '',
    });
  });

  it('handles undefined input without throwing', () => {
    expect(normalizePageAiDesignInput(undefined)).toEqual(DEFAULT_PAGE_AI_DESIGN);
  });

  it('coerces non-string prompt values to empty strings', () => {
    expect(normalizePageAiDesignInput({ prompt: 42 }).prompt).toBe('');
  });

  it('keeps a valid targetScope and drops an unknown one', () => {
    expect(
      normalizePageAiDesignInput({
        prompt: 'make the search box larger',
        targetScope: 'search',
      }),
    ).toEqual({
      prompt: 'make the search box larger',
      targetScope: 'search',
    });

    expect(
      normalizePageAiDesignInput({
        prompt: 'make the search box larger',
        targetScope: 'layout',
      }),
    ).toEqual({
      prompt: 'make the search box larger',
      targetScope: '',
    });
  });
});
