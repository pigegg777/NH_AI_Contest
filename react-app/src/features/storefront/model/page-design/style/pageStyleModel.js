import { ensureReadableTextColor, mixHexColors, normalizeHexColor } from '../../shared/pageStyleColor';

export const PAGE_STYLE_SCHEMA_VERSION = 1;

export const PAGE_STYLE_SEARCH_SIZE_TOKENS = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
export const PAGE_STYLE_BORDER_STRENGTH_TOKENS = ['none', 'hairline', 'soft', 'normal', 'strong', 'bold'];
export const PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

export const PAGE_STYLE_SEARCH_SIZE_VALUES = {
  xs: { minHeight: '32px', fontSize: '0.86rem' },
  sm: { minHeight: '36px', fontSize: '0.9rem' },
  md: { minHeight: '40px', fontSize: '0.94rem' },
  lg: { minHeight: '44px', fontSize: '0.98rem' },
  xl: { minHeight: '48px', fontSize: '1.02rem' },
  xxl: { minHeight: '52px', fontSize: '1.06rem' },
};

export const PAGE_STYLE_HEADER_TITLE_SIZE_VALUES = {
  xs: '0.9rem',
  sm: '1rem',
  md: '1.1rem',
  lg: '1.2rem',
  xl: '1.3rem',
  xxl: '1.4rem',
};

export const PAGE_STYLE_DESCRIPTION_FONT_SIZE_TOKENS = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

// A scale of its own rather than the title's: md matches the 0.88rem the hero
// subtitle already renders at, so adding this section changes nothing on screen.
export const PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES = {
  xs: '0.76rem',
  sm: '0.82rem',
  md: '0.88rem',
  lg: '0.94rem',
  xl: '1rem',
  xxl: '1.06rem',
};

export const PAGE_STYLE_BORDER_WIDTH_VALUES = {
  none: '0px',
  hairline: '0.5px',
  soft: '1px',
  normal: '1.5px',
  strong: '2px',
  bold: '2.5px',
};

export const PAGE_STYLE_CHIP_VARIANT_TOKENS = ['soft', 'outline', 'filled'];
export const PAGE_STYLE_CHIP_BORDER_SIDE_TOKENS = ['all', 'bottom', 'top', 'left', 'right'];
export const PAGE_STYLE_CHIP_SIZE_TOKENS = ['sm', 'md', 'lg'];
export const PAGE_STYLE_CHIP_RADIUS_TOKENS = ['none', 'square', 'rounded', 'pill'];
export const PAGE_STYLE_CHIP_GAP_TOKENS = ['none', 'tight', 'normal', 'relaxed'];

export const PAGE_STYLE_CHIP_SIZE_VALUES = {
  sm: { minHeight: '28px', fontSize: '0.72rem', paddingInline: '10px' },
  md: { minHeight: '34px', fontSize: '0.8rem', paddingInline: '14px' },
  lg: { minHeight: '40px', fontSize: '0.88rem', paddingInline: '18px' },
};

export const PAGE_STYLE_CHIP_RADIUS_VALUES = {
  none: '0px',
  square: '8px',
  rounded: '14px',
  pill: '999px',
};

export const PAGE_STYLE_CHIP_GAP_VALUES = {
  none: '0px',
  tight: '8px',
  normal: '14px',
  relaxed: '20px',
};

export const DEFAULT_PAGE_STYLE = {
  schemaVersion: PAGE_STYLE_SCHEMA_VERSION,
  palette: { backgroundHex: '#ffffff', accentHex: '#1d4a2e' },
  header: { titleColorHex: '#173223', letterSpacing: 'normal', fontWeight: 800, titleFontSizeToken: 'md' },
  description: {
    colorHex: '#51635a',
    letterSpacing: 'normal',
    fontWeight: 400,
    fontSizeToken: 'md',
  },
  search: {
    sizeToken: 'md',
    borderStrengthToken: 'normal',
    backgroundHex: '#ffffff',
    borderColorHex: '#d8e2dc',
    focusBorderColorHex: '#1d4a2e',
  },
  categoryChips: {
    backgroundHex: '#ffffff',
    textHex: '#5f6d5b',
    borderColorHex: '#d8e2dc',
    activeBackgroundHex: '#1d4a2e',
    activeTextHex: '#ffffff',
    activeBorderHex: '#1d4a2e',
    hoverBackgroundHex: '#f4f7f5',
    hoverTextHex: '#355a30',
    hoverBorderHex: '#a9c2af',
    variant: 'soft',
    sizeToken: 'md',
    radiusToken: 'pill',
    gapToken: 'relaxed',
    borderStrengthToken: 'soft',
    borderSides: 'all',
    fontWeight: 600,
  },
  productCategoryChips: {
    backgroundHex: '#ffffff',
    textHex: '#355a30',
    borderColorHex: '#d8e2dc',
    activeBackgroundHex: '#1d4a2e',
    activeTextHex: '#ffffff',
    activeBorderHex: '#1d4a2e',
    hoverBackgroundHex: '#ffffff',
    hoverTextHex: '#1d4a2e',
    hoverBorderHex: '#7fa688',
    variant: 'soft',
    sizeToken: 'md',
    radiusToken: 'pill',
    gapToken: 'normal',
    borderStrengthToken: 'soft',
    borderSides: 'all',
    fontWeight: 700,
  },
};

function normalizePalette(palette) {
  const source = palette ?? {};

  return {
    backgroundHex: normalizeHexColor(source.backgroundHex, DEFAULT_PAGE_STYLE.palette.backgroundHex),
    accentHex: normalizeHexColor(source.accentHex, DEFAULT_PAGE_STYLE.palette.accentHex),
  };
}

function normalizeHeader(header, backgroundHex) {
  const source = header ?? {};
  const candidateColor = normalizeHexColor(source.titleColorHex, DEFAULT_PAGE_STYLE.header.titleColorHex);

  return {
    titleColorHex: ensureReadableTextColor(candidateColor, backgroundHex),
    letterSpacing: typeof source.letterSpacing === 'string' && source.letterSpacing ? source.letterSpacing : DEFAULT_PAGE_STYLE.header.letterSpacing,
    fontWeight: Number.isFinite(source.fontWeight) ? source.fontWeight : DEFAULT_PAGE_STYLE.header.fontWeight,
    titleFontSizeToken: PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS.includes(source.titleFontSizeToken)
      ? source.titleFontSizeToken
      : DEFAULT_PAGE_STYLE.header.titleFontSizeToken,
  };
}

function normalizeDescription(description) {
  const source = description ?? {};

  return {
    colorHex: normalizeHexColor(source.colorHex, DEFAULT_PAGE_STYLE.description.colorHex),
    letterSpacing:
      typeof source.letterSpacing === 'string' && source.letterSpacing
        ? source.letterSpacing
        : DEFAULT_PAGE_STYLE.description.letterSpacing,
    fontWeight: Number.isFinite(source.fontWeight)
      ? source.fontWeight
      : DEFAULT_PAGE_STYLE.description.fontWeight,
    fontSizeToken: PAGE_STYLE_DESCRIPTION_FONT_SIZE_TOKENS.includes(source.fontSizeToken)
      ? source.fontSizeToken
      : DEFAULT_PAGE_STYLE.description.fontSizeToken,
  };
}

function normalizeSearch(search) {
  const source = search ?? {};

  return {
    sizeToken: PAGE_STYLE_SEARCH_SIZE_TOKENS.includes(source.sizeToken) ? source.sizeToken : DEFAULT_PAGE_STYLE.search.sizeToken,
    borderStrengthToken: PAGE_STYLE_BORDER_STRENGTH_TOKENS.includes(source.borderStrengthToken)
      ? source.borderStrengthToken
      : DEFAULT_PAGE_STYLE.search.borderStrengthToken,
    backgroundHex: normalizeHexColor(source.backgroundHex, DEFAULT_PAGE_STYLE.search.backgroundHex),
    borderColorHex: normalizeHexColor(source.borderColorHex, DEFAULT_PAGE_STYLE.search.borderColorHex),
    focusBorderColorHex: normalizeHexColor(source.focusBorderColorHex, DEFAULT_PAGE_STYLE.search.focusBorderColorHex),
  };
}

function normalizeChips(chips, defaults) {
  const source = chips ?? {};
  const backgroundHex = normalizeHexColor(source.backgroundHex, defaults.backgroundHex);
  const activeBackgroundHex = normalizeHexColor(source.activeBackgroundHex, defaults.activeBackgroundHex);
  const hoverBackgroundHex = normalizeHexColor(source.hoverBackgroundHex, defaults.hoverBackgroundHex);
  const candidateTextHex = normalizeHexColor(source.textHex, defaults.textHex);
  const candidateActiveTextHex = normalizeHexColor(source.activeTextHex, defaults.activeTextHex);
  const candidateHoverTextHex = normalizeHexColor(source.hoverTextHex, defaults.hoverTextHex);

  return {
    backgroundHex,
    textHex: ensureReadableTextColor(candidateTextHex, backgroundHex),
    borderColorHex: normalizeHexColor(source.borderColorHex, defaults.borderColorHex),
    activeBackgroundHex,
    activeTextHex: ensureReadableTextColor(candidateActiveTextHex, activeBackgroundHex),
    hoverBackgroundHex,
    hoverTextHex: ensureReadableTextColor(candidateHoverTextHex, hoverBackgroundHex),
    hoverBorderHex: normalizeHexColor(source.hoverBorderHex, defaults.hoverBorderHex),
    activeBorderHex: normalizeHexColor(source.activeBorderHex, defaults.activeBorderHex),
    variant: PAGE_STYLE_CHIP_VARIANT_TOKENS.includes(source.variant) ? source.variant : defaults.variant,
    sizeToken: PAGE_STYLE_CHIP_SIZE_TOKENS.includes(source.sizeToken) ? source.sizeToken : defaults.sizeToken,
    radiusToken: PAGE_STYLE_CHIP_RADIUS_TOKENS.includes(source.radiusToken) ? source.radiusToken : defaults.radiusToken,
    gapToken: PAGE_STYLE_CHIP_GAP_TOKENS.includes(source.gapToken) ? source.gapToken : defaults.gapToken,
    borderStrengthToken: PAGE_STYLE_BORDER_STRENGTH_TOKENS.includes(source.borderStrengthToken)
      ? source.borderStrengthToken
      : defaults.borderStrengthToken,
    borderSides: PAGE_STYLE_CHIP_BORDER_SIDE_TOKENS.includes(source.borderSides)
      ? source.borderSides
      : defaults.borderSides,
    fontWeight: Number.isFinite(source.fontWeight) ? source.fontWeight : defaults.fontWeight,
  };
}

function normalizeCategoryChips(categoryChips) {
  return normalizeChips(categoryChips, DEFAULT_PAGE_STYLE.categoryChips);
}

function normalizeProductCategoryChips(productCategoryChips) {
  return normalizeChips(productCategoryChips, DEFAULT_PAGE_STYLE.productCategoryChips);
}

export function normalizePageStyle(pageStyle) {
  const source = pageStyle ?? {};
  const palette = normalizePalette(source.palette);

  return {
    schemaVersion: PAGE_STYLE_SCHEMA_VERSION,
    palette,
    header: normalizeHeader(source.header, palette.backgroundHex),
    description: normalizeDescription(source.description),
    search: normalizeSearch(source.search),
    categoryChips: normalizeCategoryChips(source.categoryChips),
    productCategoryChips: normalizeProductCategoryChips(source.productCategoryChips),
  };
}

export function deriveCategoryChipsFromPalette(palette) {
  const backgroundHex = mixHexColors(palette.accentHex, '#ffffff', 0.88);
  const activeBackgroundHex = palette.accentHex;
  const hoverBackgroundHex = mixHexColors(palette.accentHex, '#ffffff', 0.82);

  return {
    backgroundHex,
    textHex: ensureReadableTextColor('#173223', backgroundHex),
    borderColorHex: mixHexColors(palette.accentHex, '#ffffff', 0.7),
    activeBackgroundHex,
    activeTextHex: ensureReadableTextColor('#ffffff', activeBackgroundHex),
    hoverBackgroundHex,
    hoverTextHex: ensureReadableTextColor('#173223', hoverBackgroundHex),
    hoverBorderHex: mixHexColors(palette.accentHex, '#ffffff', 0.55),
  };
}

export function deriveSearchDefaultsFromPalette(palette) {
  return {
    sizeToken: 'md',
    borderStrengthToken: 'normal',
    borderColorHex: mixHexColors(palette.accentHex, '#ffffff', 0.7),
    focusBorderColorHex: palette.accentHex,
  };
}
