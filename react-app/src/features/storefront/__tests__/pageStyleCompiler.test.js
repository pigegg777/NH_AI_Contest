import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../model/page-design/pageStyleColor';
import { DEFAULT_PAGE_STYLE } from '../model/page-design/pageStyleModel';
import { compilePageStyle } from '../model/page-design/pageStyleCompiler';

const BASE_INTENT = {
  palette: { backgroundHex: '#eef3fb', surfaceHex: '#ffffff', accentHex: '#2563eb', textHex: '#111827' },
  header: null,
  categoryChips: null,
  search: null,
};

describe('compilePageStyle resolved output', () => {
  it('always returns resolved hex values and a stamped schemaVersion, never semantic placeholders', () => {
    const result = compilePageStyle({ intent: BASE_INTENT, previousPageStyle: undefined });

    expect(result.schemaVersion).toBe(1);
    expect(result.palette.accentHex).toBe('#2563eb');
    expect(result.search.sizeToken).toBe('md');
    expect(typeof result.categoryChips.backgroundHex).toBe('string');
  });
});

describe('compilePageStyle precedence: palette', () => {
  it('keeps a previously customized accentHex when the intent only supplies backgroundHex', () => {
    const previousPageStyle = {
      ...DEFAULT_PAGE_STYLE,
      palette: { backgroundHex: '#f8fafc', accentHex: '#7c3aed' },
    };

    const result = compilePageStyle({
      // The AI nulls out fields it isn't changing this turn, per the system prompt contract.
      intent: { palette: { backgroundHex: '#fff7ed', accentHex: null }, header: null, categoryChips: null, search: null },
      previousPageStyle,
    });

    expect(result.palette.backgroundHex).toBe('#fff7ed');
    expect(result.palette.accentHex).toBe('#7c3aed');
  });
});

describe('compilePageStyle precedence: header/search', () => {
  it('uses the override when present', () => {
    const result = compilePageStyle({
      intent: { ...BASE_INTENT, header: { fontWeight: 800 }, search: { sizeToken: 'lg' } },
      previousPageStyle: undefined,
    });

    expect(result.header.fontWeight).toBe(800);
    expect(result.search.sizeToken).toBe('lg');
  });

  it('falls back to the previous compiled value when no override is given (sticky across re-applies)', () => {
    const previousPageStyle = compilePageStyle({
      intent: { ...BASE_INTENT, header: { fontWeight: 800 }, search: { sizeToken: 'lg' } },
      previousPageStyle: undefined,
    });
    const result = compilePageStyle({ intent: BASE_INTENT, previousPageStyle });

    expect(result.header.fontWeight).toBe(800);
    expect(result.search.sizeToken).toBe('lg');
  });

  it('falls back to the white-seed default for a brand-new draft with no previous style and no override', () => {
    const result = compilePageStyle({ intent: BASE_INTENT, previousPageStyle: undefined });

    expect(result.header.fontWeight).toBe(DEFAULT_PAGE_STYLE.header.fontWeight);
    expect(result.search.sizeToken).toBe(DEFAULT_PAGE_STYLE.search.sizeToken);
  });
});

describe('compilePageStyle precedence: category chips', () => {
  it('re-derives chip colors from the new palette even when a previous custom chip style existed, if no override is given this time', () => {
    const previousPageStyle = compilePageStyle({
      intent: { ...BASE_INTENT, categoryChips: { activeBackgroundHex: '#7c3aed' } },
      previousPageStyle: undefined,
    });

    expect(previousPageStyle.categoryChips.activeBackgroundHex).toBe('#7c3aed');

    const nextIntent = { ...BASE_INTENT, palette: { ...BASE_INTENT.palette, accentHex: '#ea580c' }, categoryChips: null };
    const result = compilePageStyle({ intent: nextIntent, previousPageStyle });

    expect(result.categoryChips.activeBackgroundHex).toBe('#ea580c');
  });

  it('uses the chip override when present instead of the palette-derived default', () => {
    const result = compilePageStyle({
      intent: { ...BASE_INTENT, categoryChips: { activeBackgroundHex: '#7c3aed' } },
      previousPageStyle: undefined,
    });

    expect(result.categoryChips.activeBackgroundHex).toBe('#7c3aed');
  });
});

describe('compilePageStyle sticky incremental edits', () => {
  it('keeps previous non-palette customizations when a later prompt only changes the header', () => {
    const previousPageStyle = {
      ...DEFAULT_PAGE_STYLE,
      palette: {
        backgroundHex: '#f8fafc',
        accentHex: '#1d4a2e',
      },
      header: {
        titleColorHex: '#173223',
        letterSpacing: 'normal',
        fontWeight: 700,
      },
      search: {
        sizeToken: 'lg',
        borderStrengthToken: 'strong',
        borderColorHex: '#1d4a2e',
        focusBorderColorHex: '#173223',
      },
      categoryChips: {
        backgroundHex: '#eef6f0',
        textHex: '#2d4a36',
        borderColorHex: '#8aa391',
        activeBackgroundHex: '#244d31',
        activeTextHex: '#ffffff',
      },
    };

    const result = compilePageStyle({
      intent: {
        palette: null,
        header: { fontWeight: 800 },
        categoryChips: null,
        search: null,
      },
      previousPageStyle,
    });

    expect(result.palette).toEqual(previousPageStyle.palette);
    expect(result.header.fontWeight).toBe(800);
    expect(result.search).toEqual(previousPageStyle.search);
    expect(result.categoryChips).toEqual(previousPageStyle.categoryChips);
  });
});

describe('compilePageStyle scoped merges', () => {
  it('keeps non-selected areas unchanged when only the search scope is targeted', () => {
    const previousPageStyle = {
      ...DEFAULT_PAGE_STYLE,
      palette: {
        backgroundHex: '#f8fafc',
        accentHex: '#1d4a2e',
      },
      header: {
        titleColorHex: '#0f172a',
        letterSpacing: '0.04em',
        fontWeight: 700,
        titleFontSizeToken: 'lg',
      },
      search: {
        sizeToken: 'sm',
        borderStrengthToken: 'soft',
        borderColorHex: '#cbd5e1',
        focusBorderColorHex: '#0f172a',
      },
      categoryChips: {
        backgroundHex: '#eff6ff',
        textHex: '#1e3a8a',
        borderColorHex: '#93c5fd',
        activeBackgroundHex: '#2563eb',
        activeTextHex: '#ffffff',
      },
    };

    const result = compilePageStyle({
      intent: {
        palette: {
          backgroundHex: '#fff7ed',
          surfaceHex: '#ffffff',
          accentHex: '#ea580c',
          textHex: '#7c2d12',
        },
        header: { fontWeight: 800 },
        categoryChips: { activeBackgroundHex: '#ea580c' },
        search: { sizeToken: 'xl', borderStrengthToken: 'strong' },
      },
      previousPageStyle,
      targetScope: 'search',
    });

    expect(result.palette).toEqual(previousPageStyle.palette);
    expect(result.header).toEqual(previousPageStyle.header);
    expect(result.categoryChips).toEqual(previousPageStyle.categoryChips);
    expect(result.search.sizeToken).toBe('xl');
    expect(result.search.borderStrengthToken).toBe('strong');
    expect(result.search.borderColorHex).toBe(previousPageStyle.search.borderColorHex);
    expect(result.search.focusBorderColorHex).toBe(previousPageStyle.search.focusBorderColorHex);
  });
});

describe('compilePageStyle contrast correction', () => {
  it('keeps header title text readable against an extreme palette background', () => {
    const result = compilePageStyle({
      intent: { ...BASE_INTENT, palette: { backgroundHex: '#111111', surfaceHex: '#1a1a1a', accentHex: '#222222', textHex: '#111111' } },
      previousPageStyle: undefined,
    });

    expect(contrastRatio(result.header.titleColorHex, result.palette.backgroundHex)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps chip text readable against the palette-derived chip background', () => {
    const result = compilePageStyle({ intent: BASE_INTENT, previousPageStyle: undefined });

    expect(contrastRatio(result.categoryChips.textHex, result.categoryChips.backgroundHex)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(result.categoryChips.activeTextHex, result.categoryChips.activeBackgroundHex)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('compilePageStyle property boundaries', () => {
  it('never leaks extra properties beyond the canonical pageStyle shape', () => {
    const result = compilePageStyle({ intent: BASE_INTENT, previousPageStyle: undefined });

    expect(Object.keys(result).sort()).toEqual(['categoryChips', 'header', 'palette', 'schemaVersion', 'search']);
    expect(Object.keys(result.search).sort()).toEqual(['borderColorHex', 'borderStrengthToken', 'focusBorderColorHex', 'sizeToken']);
  });

  it('search border/focus color always tracks the current palette, ignoring any stray color fields on the intent', () => {
    const result = compilePageStyle({
      intent: { ...BASE_INTENT, search: { sizeToken: 'lg' } },
      previousPageStyle: undefined,
    });

    expect(result.search.borderColorHex).not.toBe(DEFAULT_PAGE_STYLE.search.borderColorHex);
  });
});
