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
  PAGE_STYLE_CHIP_STYLE_MODE_TOKENS,
  PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS,
  PAGE_STYLE_HEADER_TITLE_SIZE_VALUES,
  PAGE_STYLE_SCHEMA_VERSION,
  PAGE_STYLE_BORDER_STRENGTH_TOKENS,
  PAGE_STYLE_BORDER_WIDTH_VALUES,
  PAGE_STYLE_SEARCH_SIZE_TOKENS,
  PAGE_STYLE_SEARCH_SIZE_VALUES,
  deriveCategoryChipsFromPalette,
  deriveSearchDefaultsFromPalette,
  normalizePageStyle,
} from '../model/page-design/style/pageStyleModel';

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
    PAGE_STYLE_BORDER_STRENGTH_TOKENS.forEach((token) => {
      expect(PAGE_STYLE_BORDER_WIDTH_VALUES[token]).toEqual(expect.any(String));
    });
  });

  it('offers finer-grained search size steps than the old 4-token scale, without moving the md default', () => {
    expect(PAGE_STYLE_SEARCH_SIZE_TOKENS.length).toBeGreaterThanOrEqual(6);
    expect(PAGE_STYLE_SEARCH_SIZE_VALUES.md).toEqual({ minHeight: '40px', fontSize: '0.94rem' });

    const heights = PAGE_STYLE_SEARCH_SIZE_TOKENS.map(
      (token) => Number.parseFloat(PAGE_STYLE_SEARCH_SIZE_VALUES[token].minHeight),
    );
    const steps = heights.slice(1).map((value, index) => value - heights[index]);

    steps.forEach((step) => {
      expect(step).toBeCloseTo(4, 5);
    });
  });

  it('offers finer-grained search border-strength steps than the old 3-token scale, without moving the normal default', () => {
    expect(PAGE_STYLE_BORDER_STRENGTH_TOKENS.length).toBeGreaterThanOrEqual(5);
    expect(PAGE_STYLE_BORDER_WIDTH_VALUES.normal).toBe('1.5px');

    const widths = PAGE_STYLE_BORDER_STRENGTH_TOKENS.map(
      (token) => Number.parseFloat(PAGE_STYLE_BORDER_WIDTH_VALUES[token]),
    );
    const steps = widths.slice(1).map((value, index) => value - widths[index]);

    steps.forEach((step) => {
      expect(step).toBeCloseTo(0.5, 5);
    });
  });

  it('offers a "none" border-strength token that removes the search border entirely', () => {
    expect(PAGE_STYLE_BORDER_STRENGTH_TOKENS[0]).toBe('none');
    expect(PAGE_STYLE_BORDER_WIDTH_VALUES.none).toBe('0px');
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

  it('offers a "none" chip radius token that renders sharp square corners', () => {
    expect(PAGE_STYLE_CHIP_RADIUS_TOKENS).toContain('none');
    expect(PAGE_STYLE_CHIP_RADIUS_VALUES.none).toBe('0px');
  });

  it('offers a "none" chip gap token that removes spacing between chips', () => {
    expect(PAGE_STYLE_CHIP_GAP_TOKENS).toContain('none');
    expect(PAGE_STYLE_CHIP_GAP_VALUES.none).toBe('0px');
  });

  it('exposes a fontSize value for every header title size token', () => {
    PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS.forEach((token) => {
      expect(PAGE_STYLE_HEADER_TITLE_SIZE_VALUES[token]).toEqual(expect.any(String));
    });
  });

  it('offers finer-grained header title size steps than the old 4-token scale, without moving the md default', () => {
    expect(PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS.length).toBeGreaterThanOrEqual(6);
    expect(PAGE_STYLE_HEADER_TITLE_SIZE_VALUES.md).toBe('1.1rem');

    const remValues = PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS.map(
      (token) => Number.parseFloat(PAGE_STYLE_HEADER_TITLE_SIZE_VALUES[token]),
    );
    const steps = remValues.slice(1).map((value, index) => value - remValues[index]);

    steps.forEach((step) => {
      expect(step).toBeCloseTo(0.1, 5);
    });
  });
});

describe('normalizePageStyle', () => {
  it('returns the white default when given nothing', () => {
    expect(normalizePageStyle(undefined)).toEqual(DEFAULT_PAGE_STYLE);
  });

  it('defaults search.backgroundHex to white', () => {
    expect(DEFAULT_PAGE_STYLE.search.backgroundHex).toBe('#ffffff');
  });

  it('keeps a customized search backgroundHex independent of palette', () => {
    const result = normalizePageStyle({
      palette: { backgroundHex: '#111111', accentHex: '#222222' },
      search: { backgroundHex: '#38bdf8' },
    });

    expect(result.search.backgroundHex).toBe('#38bdf8');
  });

  it('falls back to white when search.backgroundHex is invalid', () => {
    const result = normalizePageStyle({ search: { backgroundHex: 'neon' } });

    expect(result.search.backgroundHex).toBe('#ffffff');
  });

  it('keeps valid hex/tokens and stamps schemaVersion', () => {
    const result = normalizePageStyle({
      palette: { backgroundHex: '#0f172a', surfaceHex: '#1e293b', accentHex: '#38bdf8', textHex: '#f8fafc' },
      header: { titleColorHex: '#f8fafc', letterSpacing: '0.02em', fontWeight: 700 },
      search: { sizeToken: 'lg', borderStrengthToken: 'strong', backgroundHex: '#0f172a', borderColorHex: '#38bdf8' },
      categoryChips: {
        backgroundHex: '#1e293b',
        textHex: '#f8fafc',
        borderColorHex: '#38bdf8',
        activeBackgroundHex: '#38bdf8',
        activeTextHex: '#0f172a',
      },
    });

    expect(result.schemaVersion).toBe(2);
    expect(result.palette.backgroundHex).toBe('#0f172a');
    expect(result.search.sizeToken).toBe('lg');
    expect(result.search.backgroundHex).toBe('#0f172a');
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

  it('derives no hover colors at all, since chips no longer style a hover state', () => {
    const chips = deriveCategoryChipsFromPalette({ backgroundHex: '#ffffff', surfaceHex: '#ffffff', accentHex: '#1d4a2e', textHex: '#173223' });

    expect(Object.keys(chips).filter((key) => key.startsWith('hover'))).toEqual([]);
  });
});

describe('normalizePageStyle chip tokens', () => {
  it('defaults styleMode/sizeToken/radiusToken/gapToken and rejects invalid tokens', () => {
    const result = normalizePageStyle({
      categoryChips: { styleMode: 'not-a-mode', sizeToken: 'huge', radiusToken: 'circle', gapToken: 'huge' },
    });

    expect(result.categoryChips.styleMode).toBe(DEFAULT_PAGE_STYLE.categoryChips.styleMode);
    expect(result.categoryChips.sizeToken).toBe(DEFAULT_PAGE_STYLE.categoryChips.sizeToken);
    expect(result.categoryChips.radiusToken).toBe(DEFAULT_PAGE_STYLE.categoryChips.radiusToken);
    expect(result.categoryChips.gapToken).toBe(DEFAULT_PAGE_STYLE.categoryChips.gapToken);
  });

  it('keeps valid chip tokens and drops saved hover colors, letting categoryChips and productCategoryChips be set identically', () => {
    const sharedChips = {
      backgroundHex: '#f4f7f5',
      hoverBackgroundHex: '#e4ece6',
      hoverTextHex: '#173223',
      hoverBorderHex: '#a9c2af',
      styleMode: 'tab',
      sizeToken: 'lg',
      radiusToken: 'square',
      gapToken: 'tight',
    };

    const result = normalizePageStyle({ categoryChips: sharedChips, productCategoryChips: sharedChips });

    expect(result.categoryChips.styleMode).toBe('tab');
    expect(result.productCategoryChips.styleMode).toBe('tab');
    expect(Object.keys(result.categoryChips).filter((key) => key.startsWith('hover'))).toEqual([]);
    expect(Object.keys(result.productCategoryChips).filter((key) => key.startsWith('hover'))).toEqual([]);
  });

  it('defaults categoryChips activeBorderHex/borderStrengthToken/fontWeight without moving from the hardcoded 1px/600 look', () => {
    expect(DEFAULT_PAGE_STYLE.categoryChips.borderStrengthToken).toBe('soft');
    expect(PAGE_STYLE_BORDER_WIDTH_VALUES[DEFAULT_PAGE_STYLE.categoryChips.borderStrengthToken]).toBe('1px');
    expect(DEFAULT_PAGE_STYLE.categoryChips.fontWeight).toBe(600);
    expect(DEFAULT_PAGE_STYLE.productCategoryChips.borderStrengthToken).toBe('soft');
    expect(DEFAULT_PAGE_STYLE.productCategoryChips.fontWeight).toBe(700);
  });

  it('keeps a custom activeBorderHex/borderStrengthToken/fontWeight and rejects invalid ones', () => {
    const result = normalizePageStyle({
      categoryChips: { activeBorderHex: '#334155', borderStrengthToken: 'bold', fontWeight: 900 },
    });

    expect(result.categoryChips.activeBorderHex).toBe('#334155');
    expect(result.categoryChips.borderStrengthToken).toBe('bold');
    expect(result.categoryChips.fontWeight).toBe(900);

    const fallback = normalizePageStyle({
      categoryChips: { activeBorderHex: 'neon', borderStrengthToken: 'extreme', fontWeight: 'huge' },
    });

    expect(fallback.categoryChips.activeBorderHex).toBe(DEFAULT_PAGE_STYLE.categoryChips.activeBorderHex);
    expect(fallback.categoryChips.borderStrengthToken).toBe(DEFAULT_PAGE_STYLE.categoryChips.borderStrengthToken);
    expect(fallback.categoryChips.fontWeight).toBe(DEFAULT_PAGE_STYLE.categoryChips.fontWeight);
  });

  it('defaults each chip scope to its own styleMode: 중분류는 칩, 대분류탭은 탭', () => {
    expect(DEFAULT_PAGE_STYLE.categoryChips.styleMode).toBe('chip');
    expect(DEFAULT_PAGE_STYLE.productCategoryChips.styleMode).toBe('tab');

    const result = normalizePageStyle({ categoryChips: { styleMode: 'tab' } });
    expect(result.categoryChips.styleMode).toBe('tab');

    const fallback = normalizePageStyle({ categoryChips: { styleMode: 'underline' } });
    expect(fallback.categoryChips.styleMode).toBe('chip');
  });

  it('migrates a schemaVersion 1 chip: bottom-only borders become tab, every other variant becomes chip', () => {
    const tabbed = normalizePageStyle({
      categoryChips: { variant: 'outline', borderSides: 'bottom' },
      productCategoryChips: { variant: 'soft', borderSides: 'all' },
    });

    expect(tabbed.categoryChips.styleMode).toBe('tab');
    expect(tabbed.productCategoryChips.styleMode).toBe('chip');
    expect(tabbed.schemaVersion).toBe(2);

    // variant만 저장된 예전 행도 칩으로 내려앉는다.
    expect(normalizePageStyle({ categoryChips: { variant: 'filled' } }).categoryChips.styleMode).toBe('chip');
  });
});

describe('deriveSearchDefaultsFromPalette', () => {
  it('derives md/normal defaults with a palette-tinted border', () => {
    const search = deriveSearchDefaultsFromPalette({ backgroundHex: '#ffffff', surfaceHex: '#ffffff', accentHex: '#1d4a2e', textHex: '#173223' });

    expect(search.sizeToken).toBe('md');
    expect(search.borderStrengthToken).toBe('normal');
    expect(search.focusBorderColorHex).toBeUndefined();
  });
});
