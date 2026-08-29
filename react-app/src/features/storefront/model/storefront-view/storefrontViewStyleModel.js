import {
  PAGE_STYLE_BORDER_WIDTH_VALUES,
  PAGE_STYLE_CHIP_GAP_VALUES,
  PAGE_STYLE_CHIP_RADIUS_VALUES,
  PAGE_STYLE_CHIP_SIZE_VALUES,
  PAGE_STYLE_SEARCH_SIZE_VALUES,
  PAGE_STYLE_TAB_ACTIVE_BORDER_WIDTH_VALUES,
} from '../page-design/style/pageStyleModel';

// 탭 모드는 아래쪽 한 면만 그리고, 선택된 탭은 그 두 배 두께로 그린다.
function resolveChipBorderWidths(chips) {
  const width = PAGE_STYLE_BORDER_WIDTH_VALUES[chips.borderStrengthToken];

  if (chips.styleMode !== 'tab') {
    return { borderWidth: width, activeBorderWidth: width };
  }

  return {
    borderWidth: `0px 0px ${width} 0px`,
    activeBorderWidth: `0px 0px ${PAGE_STYLE_TAB_ACTIVE_BORDER_WIDTH_VALUES[chips.borderStrengthToken]} 0px`,
  };
}

function buildChipCssVars(prefix, chips) {
  const size = PAGE_STYLE_CHIP_SIZE_VALUES[chips.sizeToken];
  const { borderWidth, activeBorderWidth } = resolveChipBorderWidths(chips);

  return {
    [`--${prefix}-bg`]: chips.backgroundHex,
    [`--${prefix}-text`]: chips.textHex,
    [`--${prefix}-border`]: chips.borderColorHex,
    [`--${prefix}-active-bg`]: chips.activeBackgroundHex,
    [`--${prefix}-active-text`]: chips.activeTextHex,
    [`--${prefix}-active-border`]: chips.activeBorderHex,
    [`--${prefix}-height`]: size.minHeight,
    [`--${prefix}-font-size`]: size.fontSize,
    [`--${prefix}-padding-inline`]: size.paddingInline,
    [`--${prefix}-radius`]: PAGE_STYLE_CHIP_RADIUS_VALUES[chips.radiusToken],
    [`--${prefix}-gap`]: PAGE_STYLE_CHIP_GAP_VALUES[chips.gapToken],
    [`--${prefix}-border-width`]: borderWidth,
    [`--${prefix}-active-border-width`]: activeBorderWidth,
    [`--${prefix}-font-weight`]: chips.fontWeight,
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
      PAGE_STYLE_BORDER_WIDTH_VALUES[view.pageStyle.search.borderStrengthToken],
    '--page-search-bg': view.pageStyle.search.backgroundHex,
    '--page-search-border-color': view.pageStyle.search.borderColorHex,
    ...buildChipCssVars('page-chip', view.pageStyle.categoryChips),
    ...buildChipCssVars('page-product-chip', view.pageStyle.productCategoryChips),
  };
}
