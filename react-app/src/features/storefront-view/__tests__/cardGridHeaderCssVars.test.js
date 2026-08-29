import { describe, expect, it } from 'vitest';

import { buildShellCssVars } from '../model/card-grid-section/cardGridFieldStyleModel';
import {
  CARD_HEADER_TITLE_SIZE_TOKENS,
  DEFAULT_CARD_STYLE,
  normalizeCardStyle,
} from '../model/card-style/cardStyleModel';

function cssVarsForHeader(header) {
  return buildShellCssVars(normalizeCardStyle({ header }));
}

describe('buildShellCssVars header appearance tokens', () => {
  it('emits a zero title offset by default so the pre-token size is unchanged', () => {
    const cssVars = buildShellCssVars(DEFAULT_CARD_STYLE);

    expect(cssVars['--card-header-title-offset']).toBe('0rem');
  });

  it('maps each title size token to a resolved offset', () => {
    CARD_HEADER_TITLE_SIZE_TOKENS.forEach((titleSizeToken) => {
      const offset = cssVarsForHeader({ titleSizeToken })['--card-header-title-offset'];

      expect(offset).toMatch(/^-?\d+(\.\d+)?rem$/);
    });

    expect(cssVarsForHeader({ titleSizeToken: 'xxl' })['--card-header-title-offset']).toBe('0.30rem');
    expect(cssVarsForHeader({ titleSizeToken: 'xs' })['--card-header-title-offset']).toBe('-0.12rem');
  });

  it('no longer emits border, alignment or letter spacing vars — the header frame is fixed', () => {
    const cssVars = cssVarsForHeader({
      borderColor: '#94a3b8',
      borderStrengthToken: 'bold',
      borderSide: 'all',
      textAlign: 'center',
      letterSpacing: '0.02em',
    });

    expect(cssVars['--card-header-border']).toBeUndefined();
    expect(cssVars['--card-header-border-width']).toBeUndefined();
    expect(cssVars['--card-header-title-align']).toBeUndefined();
    expect(cssVars['--card-header-title-letter-spacing']).toBeUndefined();
  });
});
