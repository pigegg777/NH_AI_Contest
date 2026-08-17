import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../model/shared/pageStyleColor';
import {
  DEFAULT_PAGE_STYLE,
  PAGE_STYLE_CHIP_GAP_TOKENS,
  PAGE_STYLE_CHIP_GAP_VALUES,
  PAGE_STYLE_CHIP_RADIUS_TOKENS,
  PAGE_STYLE_CHIP_RADIUS_VALUES,
  PAGE_STYLE_CHIP_SIZE_TOKENS,
  PAGE_STYLE_CHIP_SIZE_VALUES,
  PAGE_STYLE_CHIP_VARIANT_TOKENS,
  PAGE_STYLE_SCHEMA_VERSION,
  PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS,
  PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES,
  PAGE_STYLE_SEARCH_SIZE_TOKENS,
  PAGE_STYLE_SEARCH_SIZE_VALUES,
  deriveCategoryChipsFromPalette,
  deriveSearchDefaultsFromPalette,
  normalizePageStyle,
} from '../model/page-design/page-style/pageStyleModel';

describe('DEFAULT_PAGE_STYLE', () => {
  it('is an explicit white default, not a fallback branch', () => {
    expect(DEFAULT_PAGE_STYLE.schemaVersion).toBe(PAGE_STYLE_SCHEMA_VERSION);
    expect(DEFAULT_PAGE_STYLE.palette.backgroundHex).toBe('#ffffff');
  });
});

describe('token tables', () => {
  it('exposes a size/fontSize pair for every search size token', () => {
    PAGE_STYLE_SEARCH_SIZE_TOKENS.forEach((token) => {
      expect(PAGE_STYLE_SEARCH_SIZE_VALUES[token]).toMatchObject({
        minHeight: expect.any(String),
        fontSize: expect.any(String),
      });
    });
  });

  it('exposes a border width for every border strength token', () => {
    PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS.forEach((token) => {
      expect(PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES[token]).toEqual(expect.any(String));
    });
  });

  it('exposes a height/fontSize/padding triple for every chip size token', () => {
    PAGE_STYLE_CHIP_SIZE_TOKENS.forEach((token) => {
      expect(PAGE_STYLE_CHIP_SIZE_VALUES[token]).toMatchObject({
        minHeight: expect.any(String),
        fontSize: expect.any(String),
        paddingInline: expect.any(String),
      });
    });
  });

  it('exposes a radius value for every chip radius token', () => {
    PAGE_STYLE_CHIP_RADIUS_TOKENS.forEach((token) => {
      expect(PAGE_STYLE_CHIP_RADIUS_VALUES[token]).toEqual(expect.any(String));
    });
  });

  it('exposes a gap value for every chip gap token', () => {
    PAGE_STYLE_CHIP_GAP_TOKENS.forEach((token) => {
      expect(PAGE_STYLE_CHIP_GAP_VALUES[token]).toEqual(expect.any(String));
    });
  });
});

describe('normalizePageStyle', () => {
  it('returns the white default when given nothing', () => {
    expect(normalizePageStyle(undefined)).toEqual(DEFAULT_PAGE_STYLE);
  });

  it('keeps valid hex/tokens and stamps schemaVersion', () => {
    const result = normalizePageStyle({
      palette: { backgroundHex: '#0f172a', surfaceHex: '#1e293b', accentHex: '#38bdf8', textHex: '#f8fafc' },
      header: { titleColorHex: '#f8fafc', letterSpacing: '0.02em', fontWeight: 700 },
      search: { sizeToken: 'lg', borderStrengthToken: 'strong', borderColorHex: '#38bdf8', focusBorderColorHex: '#38bdf8' },
      categoryChips: {
        backgroundHex: '#1e293b',
        textHex: '#f8fafc',
        borderColorHex: '#38bdf8',
        activeBackgroundHex: '#38bdf8',
        activeTextHex: '#0f172a',
      },
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.palette.backgroundHex).toBe('#0f172a');
    expect(result.search.sizeToken).toBe('lg');
    expect(result.search.borderStrengthToken).toBe('strong');
  });

  it('falls back per-field on invalid input without throwing', () => {
    const result = normalizePageStyle({
      palette: { backgroundHex: 'neon' },
      search: { sizeToken: 'huge', borderStrengthToken: 'extreme' },
    });

    expect(result.palette.backgroundHex).toBe('#ffffff');
    expect(result.search.sizeToken).toBe('md');
    expect(result.search.borderStrengthToken).toBe('normal');
  });

  it('contrast-corrects header title color and chip text colors against their backgrounds', () => {
    const result = normalizePageStyle({
      palette: { backgroundHex: '#ffffff' },
      header: { titleColorHex: '#fefefe' },
      categoryChips: { backgroundHex: '#fcfcfc', textHex: '#fdfdfd', activeBackgroundHex: '#1d4a2e', activeTextHex: '#222222' },
    });

    expect(contrastRatio(result.header.titleColorHex, result.palette.backgroundHex)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(result.categoryChips.textHex, result.categoryChips.backgroundHex)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(result.categoryChips.activeTextHex, result.categoryChips.activeBackgroundHex)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('deriveCategoryChipsFromPalette', () => {
  it('derives readable chip colors from the page accent', () => {
    const chips = deriveCategoryChipsFromPalette({ backgroundHex: '#ffffff', surfaceHex: '#ffffff', accentHex: '#1d4a2e', textHex: '#173223' });

    expect(contrastRatio(chips.textHex, chips.backgroundHex)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(chips.activeTextHex, chips.activeBackgroundHex)).toBeGreaterThanOrEqual(4.5);
    expect(chips.activeBackgroundHex).toBe('#1d4a2e');
  });

  it('also derives a readable hover color set', () => {
    const chips = deriveCategoryChipsFromPalette({ backgroundHex: '#ffffff', surfaceHex: '#ffffff', accentHex: '#1d4a2e', textHex: '#173223' });

    expect(contrastRatio(chips.hoverTextHex, chips.hoverBackgroundHex)).toBeGreaterThanOrEqual(4.5);
    expect(chips.hoverBackgroundHex).not.toBe(chips.backgroundHex);
  });
});

describe('normalizePageStyle chip tokens', () => {
  it('defaults variant/sizeToken/radiusToken/gapToken and rejects invalid tokens', () => {
    const result = normalizePageStyle({
      categoryChips: { variant: 'not-a-variant', sizeToken: 'huge', radiusToken: 'circle', gapToken: 'none' },
    });

    expect(result.categoryChips.variant).toBe(DEFAULT_PAGE_STYLE.categoryChips.variant);
    expect(result.categoryChips.sizeToken).toBe(DEFAULT_PAGE_STYLE.categoryChips.sizeToken);
    expect(result.categoryChips.radiusToken).toBe(DEFAULT_PAGE_STYLE.categoryChips.radiusToken);
    expect(result.categoryChips.gapToken).toBe(DEFAULT_PAGE_STYLE.categoryChips.gapToken);
  });

  it('keeps valid chip tokens and hover colors, letting categoryChips and productCategoryChips be set identically', () => {
    const sharedChips = {
      backgroundHex: '#f4f7f5',
      hoverBackgroundHex: '#e4ece6',
      hoverTextHex: '#173223',
      hoverBorderHex: '#a9c2af',
      variant: 'outline',
      sizeToken: 'lg',
      radiusToken: 'square',
      gapToken: 'tight',
    };

    const result = normalizePageStyle({ categoryChips: sharedChips, productCategoryChips: sharedChips });

    expect(result.categoryChips.variant).toBe('outline');
    expect(result.categoryChips.hoverBackgroundHex).toBe('#e4ece6');
    expect(result.productCategoryChips.variant).toBe('outline');
    expect(result.productCategoryChips.hoverBackgroundHex).toBe('#e4ece6');
  });
});

describe('deriveSearchDefaultsFromPalette', () => {
  it('derives md/normal defaults with a palette-tinted border', () => {
    const search = deriveSearchDefaultsFromPalette({ backgroundHex: '#ffffff', surfaceHex: '#ffffff', accentHex: '#1d4a2e', textHex: '#173223' });

    expect(search.sizeToken).toBe('md');
    expect(search.borderStrengthToken).toBe('normal');
    expect(search.focusBorderColorHex).toBe('#1d4a2e');
  });
});
