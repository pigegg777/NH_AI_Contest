import {
  PAGE_STYLE_CHIP_GAP_VALUES,
  PAGE_STYLE_CHIP_RADIUS_VALUES,
  PAGE_STYLE_CHIP_SIZE_VALUES,
  PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES,
  PAGE_STYLE_SEARCH_SIZE_VALUES,
} from '../page-design/page-style/pageStyleModel';

function buildChipCssVars(prefix, chips) {
  const size = PAGE_STYLE_CHIP_SIZE_VALUES[chips.sizeToken];

  return {
    [`--${prefix}-bg`]: chips.backgroundHex,
    [`--${prefix}-text`]: chips.textHex,
    [`--${prefix}-border`]: chips.borderColorHex,
    [`--${prefix}-active-bg`]: chips.activeBackgroundHex,
    [`--${prefix}-active-text`]: chips.activeTextHex,
    [`--${prefix}-hover-bg`]: chips.hoverBackgroundHex,
    [`--${prefix}-hover-text`]: chips.hoverTextHex,
    [`--${prefix}-hover-border`]: chips.hoverBorderHex,
    [`--${prefix}-height`]: size.minHeight,
    [`--${prefix}-font-size`]: size.fontSize,
    [`--${prefix}-padding-inline`]: size.paddingInline,
    [`--${prefix}-radius`]: PAGE_STYLE_CHIP_RADIUS_VALUES[chips.radiusToken],
    [`--${prefix}-gap`]: PAGE_STYLE_CHIP_GAP_VALUES[chips.gapToken],
  };
}

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
    ...buildChipCssVars('page-chip', view.pageStyle.categoryChips),
    ...buildChipCssVars('page-product-chip', view.pageStyle.productCategoryChips),
  };
}
