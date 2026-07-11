import {
  PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES,
  PAGE_STYLE_SEARCH_SIZE_VALUES,
} from '../page-design/pageStyleModel';

export function buildStorefrontViewCssVars(view) {
  return {
    '--brand-color': view.brandColor,
    '--chip-accent': view.chipAccentColor,
    '--title-text-color': view.titleTextColorValue,
    '--title-font-size': view.titleFontSizeValue,
    '--typography-heading-weight': view.typographyToneValue.headingWeight,
    '--typography-body-weight': view.typographyToneValue.bodyWeight,
    '--typography-letter-spacing': view.typographyToneValue.letterSpacing,
    '--page-bg': view.pageStyle.palette.backgroundHex,
    '--page-search-min-height':
      PAGE_STYLE_SEARCH_SIZE_VALUES[view.pageStyle.search.sizeToken].minHeight,
    '--page-search-font-size':
      PAGE_STYLE_SEARCH_SIZE_VALUES[view.pageStyle.search.sizeToken].fontSize,
    '--page-search-border-width':
      PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES[view.pageStyle.search.borderStrengthToken],
    '--page-search-border-color': view.pageStyle.search.borderColorHex,
    '--page-search-focus-border-color': view.pageStyle.search.focusBorderColorHex,
    '--page-chip-bg': view.pageStyle.categoryChips.backgroundHex,
    '--page-chip-text': view.pageStyle.categoryChips.textHex,
    '--page-chip-border': view.pageStyle.categoryChips.borderColorHex,
    '--page-chip-active-bg': view.pageStyle.categoryChips.activeBackgroundHex,
    '--page-chip-active-text': view.pageStyle.categoryChips.activeTextHex,
  };
}
