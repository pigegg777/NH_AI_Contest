import {
  PAGE_STYLE_BORDER_WIDTH_VALUES,
  PAGE_STYLE_CHIP_GAP_VALUES,
  PAGE_STYLE_CHIP_RADIUS_VALUES,
  PAGE_STYLE_CHIP_SIZE_VALUES,
  PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES,
  PAGE_STYLE_SEARCH_SIZE_VALUES,
} from '../page-design/style/pageStyleModel';

const CHIP_BORDER_SIDE_SHORTHANDS = {
  bottom: (width) => `0px 0px ${width} 0px`,
  top: (width) => `${width} 0px 0px 0px`,
  left: (width) => `0px 0px 0px ${width}`,
  right: (width) => `0px ${width} 0px 0px`,
};

function resolveChipBorderWidth(chips) {
  const width = PAGE_STYLE_BORDER_WIDTH_VALUES[chips.borderStrengthToken];
  const toShorthand = CHIP_BORDER_SIDE_SHORTHANDS[chips.borderSides];

  return toShorthand ? toShorthand(width) : width;
}

function buildChipCssVars(prefix, chips) {
  const size = PAGE_STYLE_CHIP_SIZE_VALUES[chips.sizeToken];

  return {
    [`--${prefix}-bg`]: chips.backgroundHex,
    [`--${prefix}-text`]: chips.textHex,
    [`--${prefix}-border`]: chips.borderColorHex,
    [`--${prefix}-active-bg`]: chips.activeBackgroundHex,
    [`--${prefix}-active-text`]: chips.activeTextHex,
    [`--${prefix}-active-border`]: chips.activeBorderHex,
    [`--${prefix}-hover-bg`]: chips.hoverBackgroundHex,
    [`--${prefix}-hover-text`]: chips.hoverTextHex,
    [`--${prefix}-hover-border`]: chips.hoverBorderHex,
    [`--${prefix}-height`]: size.minHeight,
    [`--${prefix}-font-size`]: size.fontSize,
    [`--${prefix}-padding-inline`]: size.paddingInline,
    [`--${prefix}-radius`]: PAGE_STYLE_CHIP_RADIUS_VALUES[chips.radiusToken],
    [`--${prefix}-gap`]: PAGE_STYLE_CHIP_GAP_VALUES[chips.gapToken],
    [`--${prefix}-border-width`]: resolveChipBorderWidth(chips),
    [`--${prefix}-font-weight`]: chips.fontWeight,
  };
}

export function buildStorefrontViewCssVars(view) {
  return {
    '--brand-color': view.brandColor,
    '--chip-accent': view.chipAccentColor,
    '--title-text-color': view.titleTextColorValue,
    '--title-font-size': view.titleFontSizeValue,
    '--page-description-color': view.pageStyle.description.colorHex,
    '--page-description-size':
      PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES[view.pageStyle.description.fontSizeToken],
    '--page-description-weight': view.pageStyle.description.fontWeight,
    '--page-description-letter-spacing': view.pageStyle.description.letterSpacing,
    '--typography-heading-weight': view.typographyToneValue.headingWeight,
    '--typography-body-weight': view.typographyToneValue.bodyWeight,
    '--typography-letter-spacing': view.typographyToneValue.letterSpacing,
    '--page-bg': view.pageStyle.palette.backgroundHex,
    '--page-search-min-height':
      PAGE_STYLE_SEARCH_SIZE_VALUES[view.pageStyle.search.sizeToken].minHeight,
    '--page-search-font-size':
      PAGE_STYLE_SEARCH_SIZE_VALUES[view.pageStyle.search.sizeToken].fontSize,
    '--page-search-border-width':
      PAGE_STYLE_BORDER_WIDTH_VALUES[view.pageStyle.search.borderStrengthToken],
    '--page-search-bg': view.pageStyle.search.backgroundHex,
    '--page-search-border-color': view.pageStyle.search.borderColorHex,
    '--page-search-focus-border-color': view.pageStyle.search.focusBorderColorHex,
    ...buildChipCssVars('page-chip', view.pageStyle.categoryChips),
    ...buildChipCssVars('page-product-chip', view.pageStyle.productCategoryChips),
  };
}
