import { ensureReadableTextColor, mixHexColors, normalizeHexColor } from '../shared/styleColor';

export const PAGE_STYLE_SCHEMA_VERSION = 2;

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

export const PAGE_STYLE_BORDER_WIDTH_VALUES = {
  none: '0px',
  hairline: '0.5px',
  soft: '1px',
  normal: '1.5px',
  strong: '2px',
  bold: '2.5px',
};

// chip = 배경·전체 테두리·둥근 모서리, tab = 배경 없이 아래쪽 밑줄만.
// schemaVersion 1의 variant(soft/outline/filled) + borderSides를 이 한 토큰이 대신한다.
export const PAGE_STYLE_CHIP_STYLE_MODE_TOKENS = ['chip', 'tab'];
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

// 탭 모드에서 선택된 탭의 밑줄은 기본 밑줄의 두 배로 그린다.
export const PAGE_STYLE_TAB_ACTIVE_BORDER_WIDTH_VALUES = {
  none: '0px',
  hairline: '1px',
  soft: '2px',
  normal: '3px',
  strong: '4px',
  bold: '5px',
};

export const DEFAULT_PAGE_STYLE = {
  schemaVersion: PAGE_STYLE_SCHEMA_VERSION,
  palette: { backgroundHex: '#ffffff', accentHex: '#1d4a2e' },
  header: { titleColorHex: '#173223', letterSpacing: 'normal', fontWeight: 800, titleFontSizeToken: 'md' },
  search: {
    sizeToken: 'md',
    borderStrengthToken: 'normal',
    backgroundHex: '#ffffff',
    borderColorHex: '#d8e2dc',
  },
  categoryChips: {
    backgroundHex: '#ffffff',
    textHex: '#5f6d5b',
    borderColorHex: '#d8e2dc',
    activeBackgroundHex: '#6cc24a',
    activeTextHex: '#111827',
    activeBorderHex: '#4f9e33',
    styleMode: 'chip',
    sizeToken: 'md',
    radiusToken: 'pill',
    gapToken: 'normal',
    borderStrengthToken: 'soft',
    fontWeight: 600,
  },
  productCategoryChips: {
    backgroundHex: '#ffffff',
    textHex: '#5f6d5b',
    borderColorHex: '#e2e8e4',
    activeBackgroundHex: '#ffffff',
    activeTextHex: '#1d4a2e',
    activeBorderHex: '#1d4a2e',
    styleMode: 'tab',
    sizeToken: 'md',
    radiusToken: 'none',
    gapToken: 'normal',
    borderStrengthToken: 'soft',
    fontWeight: 700,
  },
};

const LEGACY_CHIP_TAB_BORDER_SIDES = ['bottom', 'top'];

// schemaVersion 1로 저장된 스토어를 읽을 때 variant/borderSides를 styleMode로 옮긴다.
// 밑줄 한 면만 쓰던 칩이 탭, 나머지는 전부 칩이다.
function resolveLegacyChipStyleMode(source, fallbackStyleMode) {
  if (LEGACY_CHIP_TAB_BORDER_SIDES.includes(source.borderSides)) {
    return 'tab';
  }

  if (typeof source.borderSides === 'string' || typeof source.variant === 'string') {
    return 'chip';
  }

  return fallbackStyleMode;
}

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

function normalizeSearch(search) {
  const source = search ?? {};

  return {
    sizeToken: PAGE_STYLE_SEARCH_SIZE_TOKENS.includes(source.sizeToken) ? source.sizeToken : DEFAULT_PAGE_STYLE.search.sizeToken,
    borderStrengthToken: PAGE_STYLE_BORDER_STRENGTH_TOKENS.includes(source.borderStrengthToken)
      ? source.borderStrengthToken
      : DEFAULT_PAGE_STYLE.search.borderStrengthToken,
    backgroundHex: normalizeHexColor(source.backgroundHex, DEFAULT_PAGE_STYLE.search.backgroundHex),
    borderColorHex: normalizeHexColor(source.borderColorHex, DEFAULT_PAGE_STYLE.search.borderColorHex),
  };
}

function normalizeChips(chips, defaults) {
  const source = chips ?? {};
  const backgroundHex = normalizeHexColor(source.backgroundHex, defaults.backgroundHex);
  const activeBackgroundHex = normalizeHexColor(source.activeBackgroundHex, defaults.activeBackgroundHex);
  const candidateTextHex = normalizeHexColor(source.textHex, defaults.textHex);
  const candidateActiveTextHex = normalizeHexColor(source.activeTextHex, defaults.activeTextHex);

  return {
    backgroundHex,
    textHex: ensureReadableTextColor(candidateTextHex, backgroundHex),
    borderColorHex: normalizeHexColor(source.borderColorHex, defaults.borderColorHex),
    activeBackgroundHex,
    activeTextHex: ensureReadableTextColor(candidateActiveTextHex, activeBackgroundHex),
    activeBorderHex: normalizeHexColor(source.activeBorderHex, defaults.activeBorderHex),
    styleMode: PAGE_STYLE_CHIP_STYLE_MODE_TOKENS.includes(source.styleMode)
      ? source.styleMode
      : resolveLegacyChipStyleMode(source, defaults.styleMode),
    sizeToken: PAGE_STYLE_CHIP_SIZE_TOKENS.includes(source.sizeToken) ? source.sizeToken : defaults.sizeToken,
    radiusToken: PAGE_STYLE_CHIP_RADIUS_TOKENS.includes(source.radiusToken) ? source.radiusToken : defaults.radiusToken,
    gapToken: PAGE_STYLE_CHIP_GAP_TOKENS.includes(source.gapToken) ? source.gapToken : defaults.gapToken,
    borderStrengthToken: PAGE_STYLE_BORDER_STRENGTH_TOKENS.includes(source.borderStrengthToken)
      ? source.borderStrengthToken
      : defaults.borderStrengthToken,
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
    search: normalizeSearch(source.search),
    categoryChips: normalizeCategoryChips(source.categoryChips),
    productCategoryChips: normalizeProductCategoryChips(source.productCategoryChips),
  };
}

export function deriveCategoryChipsFromPalette(palette) {
  const backgroundHex = mixHexColors(palette.accentHex, '#ffffff', 0.88);
  const activeBackgroundHex = palette.accentHex;

  return {
    backgroundHex,
    textHex: ensureReadableTextColor('#173223', backgroundHex),
    borderColorHex: mixHexColors(palette.accentHex, '#ffffff', 0.7),
    activeBackgroundHex,
    activeTextHex: ensureReadableTextColor('#ffffff', activeBackgroundHex),
  };
}

export function deriveSearchDefaultsFromPalette(palette) {
  return {
    sizeToken: 'md',
    borderStrengthToken: 'normal',
    borderColorHex: mixHexColors(palette.accentHex, '#ffffff', 0.7),
  };
}
