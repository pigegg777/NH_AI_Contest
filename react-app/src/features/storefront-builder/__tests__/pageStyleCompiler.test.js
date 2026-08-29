import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../../storefront-view/model/shared/styleColor';
import { DEFAULT_PAGE_STYLE } from '../../storefront-view/model/page-style/pageStyleModel';
import { compilePageStyle } from '../model/page-design/pageStyleCompiler';

const BASE_INTENT = {
  palette: { backgroundHex: '#eef3fb', surfaceHex: '#ffffff', accentHex: '#2563eb', textHex: '#111827' },
  header: null,
  categoryChips: null,
  productCategoryChips: null,
  search: null,
};

describe('compilePageStyle resolved output', () => {
  it('always returns resolved hex values and a stamped schemaVersion, never semantic placeholders', () => {
    const result = compilePageStyle({ intent: BASE_INTENT, previousPageStyle: undefined });

    expect(result.schemaVersion).toBe(2);
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
  it('keeps chip colors unchanged when only the palette changes', () => {
    const previousPageStyle = compilePageStyle({
      intent: { ...BASE_INTENT, categoryChips: { activeBackgroundHex: '#7c3aed' } },
      previousPageStyle: undefined,
    });

    expect(previousPageStyle.categoryChips.activeBackgroundHex).toBe('#7c3aed');

    const nextIntent = { ...BASE_INTENT, palette: { ...BASE_INTENT.palette, accentHex: '#ea580c' }, categoryChips: null };
    const result = compilePageStyle({ intent: nextIntent, previousPageStyle });

    expect(result.categoryChips.activeBackgroundHex).toBe('#7c3aed');
  });

  it('uses the chip override when present instead of the palette-derived default', () => {
    const result = compilePageStyle({
      intent: { ...BASE_INTENT, categoryChips: { activeBackgroundHex: '#7c3aed' } },
      previousPageStyle: undefined,
    });

    expect(result.categoryChips.activeBackgroundHex).toBe('#7c3aed');
  });

  it('keeps a customized chip style across a palette-only change', () => {
    const previousPageStyle = compilePageStyle({
      intent: { ...BASE_INTENT, categoryChips: { styleMode: 'tab', sizeToken: 'lg', radiusToken: 'square', gapToken: 'tight' } },
      previousPageStyle: undefined,
    });

    const nextIntent = { ...BASE_INTENT, palette: { ...BASE_INTENT.palette, accentHex: '#ea580c' }, categoryChips: null };
    const result = compilePageStyle({ intent: nextIntent, previousPageStyle });

    expect(result.categoryChips.styleMode).toBe('tab');
    expect(result.categoryChips.sizeToken).toBe('lg');
    expect(result.categoryChips.radiusToken).toBe('square');
    expect(result.categoryChips.gapToken).toBe('tight');
    expect(result.categoryChips.activeBackgroundHex).toBe(DEFAULT_PAGE_STYLE.categoryChips.activeBackgroundHex);
  });
});

describe('compilePageStyle precedence: product category chips', () => {
  it('keeps product category chip colors unchanged when only the palette changes', () => {
    const previousPageStyle = compilePageStyle({
      intent: {
        ...BASE_INTENT,
        productCategoryChips: { activeBackgroundHex: '#7c3aed' },
      },
      previousPageStyle: undefined,
    });

    const result = compilePageStyle({
      intent: {
        ...BASE_INTENT,
        palette: { ...BASE_INTENT.palette, accentHex: '#ea580c' },
        productCategoryChips: null,
      },
      previousPageStyle,
    });

    expect(result.productCategoryChips.activeBackgroundHex).toBe('#7c3aed');
  });
});

describe('compilePageStyle precedence: product category chips', () => {
  it('scopes an update to productCategoryChips only, leaving categoryChips untouched', () => {
    const previousPageStyle = compilePageStyle({
      intent: { ...BASE_INTENT, categoryChips: { activeBackgroundHex: '#7c3aed' } },
      previousPageStyle: undefined,
    });

    const result = compilePageStyle({
      intent: {
        ...BASE_INTENT,
        productCategoryChips: { activeBackgroundHex: '#ea580c' },
      },
      previousPageStyle,
      targetScope: 'productCategoryChips',
    });

    expect(result.productCategoryChips.activeBackgroundHex).toBe('#ea580c');
    expect(result.categoryChips).toEqual(previousPageStyle.categoryChips);
    expect(result.palette).toEqual(previousPageStyle.palette);
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
        backgroundHex: '#ffffff',
        borderColorHex: '#1d4a2e',
      },
      categoryChips: {
        ...DEFAULT_PAGE_STYLE.categoryChips,
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
      },
      categoryChips: {
        ...DEFAULT_PAGE_STYLE.categoryChips,
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

    expect(Object.keys(result).sort()).toEqual([
      'categoryChips',
      'header',
      'palette',
      'productCategoryChips',
      'schemaVersion',
      'search',
    ]);
    expect(Object.keys(result.search).sort()).toEqual([
      'backgroundHex',
      'borderColorHex',
      'borderStrengthToken',
      'sizeToken',
    ]);
    expect(Object.keys(result.categoryChips).sort()).toEqual([
      'activeBackgroundHex',
      'activeBorderHex',
      'activeTextHex',
      'backgroundHex',
      'borderColorHex',
      'borderStrengthToken',
      'fontWeight',
      'gapToken',
      'radiusToken',
      'sizeToken',
      'styleMode',
      'textHex',
    ]);
  });

  it('keeps search colors unchanged when only its size is requested', () => {
    const result = compilePageStyle({
      intent: { ...BASE_INTENT, search: { sizeToken: 'lg' } },
      previousPageStyle: undefined,
    });

    expect(result.search.backgroundHex).toBe(DEFAULT_PAGE_STYLE.search.backgroundHex);
    expect(result.search.borderColorHex).toBe(DEFAULT_PAGE_STYLE.search.borderColorHex);
  });
});

describe('compilePageStyle: search colors independent of palette', () => {
  it('uses an AI-supplied search backgroundHex/borderColorHex instead of the palette-derived default', () => {
    const result = compilePageStyle({
      intent: {
        ...BASE_INTENT,
        search: { backgroundHex: '#0f172a', borderColorHex: '#38bdf8' },
      },
      previousPageStyle: undefined,
      targetScope: 'search',
    });

    expect(result.search.backgroundHex).toBe('#0f172a');
    expect(result.search.borderColorHex).toBe('#38bdf8');
  });

  it('keeps a customized search backgroundHex when a later prompt changes only the palette', () => {
    const previousPageStyle = compilePageStyle({
      intent: { ...BASE_INTENT, search: { backgroundHex: '#0f172a' } },
      previousPageStyle: undefined,
      targetScope: 'search',
    });

    const result = compilePageStyle({
      intent: { ...BASE_INTENT, palette: { ...BASE_INTENT.palette, accentHex: '#ea580c' }, search: null },
      previousPageStyle,
    });

    expect(result.search.backgroundHex).toBe('#0f172a');
  });
});

describe('compilePageStyle: chip activeBorderHex/borderStrengthToken/fontWeight', () => {
  it('uses an AI-supplied chip activeBorderHex/borderStrengthToken/fontWeight override', () => {
    const result = compilePageStyle({
      intent: {
        ...BASE_INTENT,
        categoryChips: { activeBorderHex: '#334155', borderStrengthToken: 'bold', fontWeight: 800 },
      },
      previousPageStyle: undefined,
      targetScope: 'categoryChips',
    });

    expect(result.categoryChips.activeBorderHex).toBe('#334155');
    expect(result.categoryChips.borderStrengthToken).toBe('bold');
    expect(result.categoryChips.fontWeight).toBe(800);
  });

  it('keeps a customized chip borderStrengthToken across a palette-only change', () => {
    const previousPageStyle = compilePageStyle({
      intent: { ...BASE_INTENT, categoryChips: { borderStrengthToken: 'none' } },
      previousPageStyle: undefined,
      targetScope: 'categoryChips',
    });

    const result = compilePageStyle({
      intent: { ...BASE_INTENT, palette: { ...BASE_INTENT.palette, accentHex: '#ea580c' }, categoryChips: null },
      previousPageStyle,
    });

    expect(result.categoryChips.borderStrengthToken).toBe('none');
  });

  it('uses an AI-supplied chip styleMode override and keeps it sticky across a palette-only change', () => {
    const result = compilePageStyle({
      intent: { ...BASE_INTENT, categoryChips: { styleMode: 'tab' } },
      previousPageStyle: undefined,
      targetScope: 'categoryChips',
    });

    expect(result.categoryChips.styleMode).toBe('tab');

    const next = compilePageStyle({
      intent: { ...BASE_INTENT, palette: { ...BASE_INTENT.palette, accentHex: '#ea580c' }, categoryChips: null },
      previousPageStyle: result,
    });

    expect(next.categoryChips.styleMode).toBe('tab');
  });
});
