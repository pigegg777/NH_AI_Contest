import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_STYLE } from '../model/page-style/pageStyleModel';
import { buildStorefrontViewCssVars } from '../model/view/storefrontViewStyleModel';

function buildView(pageStyleOverrides = {}) {
  return {
    brandColor: '#1d4a2e',
    chipAccentColor: '#1d4a2e',
    titleTextColorValue: '#173223',
    titleFontSizeValue: '1.1rem',
    typographyToneValue: { headingWeight: 800, bodyWeight: 400, letterSpacing: 'normal' },
    pageStyle: {
      ...DEFAULT_PAGE_STYLE,
      ...pageStyleOverrides,
      search: { ...DEFAULT_PAGE_STYLE.search, ...pageStyleOverrides.search },
      categoryChips: { ...DEFAULT_PAGE_STYLE.categoryChips, ...pageStyleOverrides.categoryChips },
      productCategoryChips: {
        ...DEFAULT_PAGE_STYLE.productCategoryChips,
        ...pageStyleOverrides.productCategoryChips,
      },
    },
  };
}

describe('buildStorefrontViewCssVars', () => {
  it('exposes the search backgroundHex as its own CSS var, independent of the page background', () => {
    const view = buildView({
      palette: { backgroundHex: '#111111', accentHex: '#1d4a2e' },
      search: { backgroundHex: '#0f172a' },
    });

    const cssVars = buildStorefrontViewCssVars(view);

    expect(cssVars['--page-search-bg']).toBe('#0f172a');
    expect(cssVars['--page-bg']).toBe('#111111');
  });

  it('exposes chip activeBorderHex, borderStrengthToken width, and fontWeight as their own CSS vars', () => {
    const view = buildView({
      categoryChips: { activeBorderHex: '#334155', borderStrengthToken: 'bold', fontWeight: 800 },
      productCategoryChips: { activeBorderHex: '#1e293b', borderStrengthToken: 'none', styleMode: 'chip', fontWeight: 500 },
    });

    const cssVars = buildStorefrontViewCssVars(view);

    expect(cssVars['--page-chip-active-border']).toBe('#334155');
    expect(cssVars['--page-chip-border-width']).toBe('2.5px');
    expect(cssVars['--page-chip-font-weight']).toBe(800);
    expect(cssVars['--page-product-chip-active-border']).toBe('#1e293b');
    expect(cssVars['--page-product-chip-border-width']).toBe('0px');
    expect(cssVars['--page-product-chip-font-weight']).toBe(500);
  });

  it('draws tab mode as a bottom-only border and doubles it for the selected tab, leaving chip mode a plain single value', () => {
    const view = buildView({
      categoryChips: { borderStrengthToken: 'bold', styleMode: 'tab' },
      productCategoryChips: { borderStrengthToken: 'strong', styleMode: 'chip' },
    });

    const cssVars = buildStorefrontViewCssVars(view);

    expect(cssVars['--page-chip-border-width']).toBe('0px 0px 2.5px 0px');
    expect(cssVars['--page-chip-active-border-width']).toBe('0px 0px 5px 0px');
    expect(cssVars['--page-product-chip-border-width']).toBe('2px');
    expect(cssVars['--page-product-chip-active-border-width']).toBe('2px');
  });
});
