import { describe, expect, it } from 'vitest';

import { buildShellCssVars } from '../model/card-grid-section/cardGridFieldStyleModel';
import {
  CARD_HEADER_BORDER_STRENGTH_TOKENS,
  CARD_HEADER_TITLE_SIZE_TOKENS,
  DEFAULT_CARD_STYLE,
  normalizeCardStyle,
} from '../model/card-design/style/cardStyleModel';

function cssVarsForHeader(header) {
  return buildShellCssVars(normalizeCardStyle({ header }));
}

describe('buildShellCssVars header appearance tokens', () => {
  it('emits a zero title offset by default so the pre-token size is unchanged', () => {
    const cssVars = buildShellCssVars(DEFAULT_CARD_STYLE);

    expect(cssVars['--card-header-title-offset']).toBe('0rem');
    expect(cssVars['--card-header-border-width']).toBe('1px');
    expect(cssVars['--card-header-title-align']).toBe('left');
  });

  it('maps each title size token to a resolved offset', () => {
    CARD_HEADER_TITLE_SIZE_TOKENS.forEach((titleSizeToken) => {
      const offset = cssVarsForHeader({ titleSizeToken })['--card-header-title-offset'];

      expect(offset).toMatch(/^-?\d+(\.\d+)?rem$/);
    });

    expect(cssVarsForHeader({ titleSizeToken: 'xxl' })['--card-header-title-offset']).toBe('0.30rem');
    expect(cssVarsForHeader({ titleSizeToken: 'xs' })['--card-header-title-offset']).toBe('-0.12rem');
  });

  it('maps each border strength token to a resolved width', () => {
    CARD_HEADER_BORDER_STRENGTH_TOKENS.forEach((borderStrengthToken) => {
      const width = cssVarsForHeader({ borderStrengthToken })['--card-header-border-width'];

      expect(width).toMatch(/^\d+(\.\d+)?px$/);
    });

    expect(cssVarsForHeader({ borderStrengthToken: 'none' })['--card-header-border-width']).toBe('0px');
    expect(cssVarsForHeader({ borderStrengthToken: 'bold' })['--card-header-border-width']).toBe('2.5px');
  });

  it('passes the title alignment straight through', () => {
    expect(cssVarsForHeader({ textAlign: 'center' })['--card-header-title-align']).toBe('center');
  });

  it('only emits a header border colour once one is chosen', () => {
    expect(buildShellCssVars(DEFAULT_CARD_STYLE)['--card-header-border']).toBeUndefined();
    expect(cssVarsForHeader({ borderColor: '#94a3b8' })['--card-header-border']).toBe('#94a3b8');
  });
});
