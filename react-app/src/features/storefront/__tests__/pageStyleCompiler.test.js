import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../model/pageStyleColor';
import { DEFAULT_PAGE_STYLE } from '../model/pageStyleModel';
import { compilePageStyle } from '../services/pageStyleCompiler';

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
