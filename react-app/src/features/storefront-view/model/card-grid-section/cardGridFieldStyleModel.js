import {
  CARD_HEADER_TITLE_SIZE_OFFSET_REM,
  DEFAULT_CARD_STYLE,
  normalizeFieldFontSizeToken,
  normalizeFieldFontWeightToken,
  resolveFieldColorRoleValue,
} from '../card-style/cardStyleModel';

export const PRICE_FIELD_SET = new Set([
  'zero_tax_price',
  'tax_price',
  'exempt_tax_price',
  'price_subsidy',
]);

// Evenly spaced so every legacy token lands on an exact equivalent:
// small = xs, medium = md, large = xxl, in both the base and the offset scale.
const FIELD_FONT_SIZE_VALUES = {
  xs: 'calc(var(--card-font-size, 0.85rem) - 0.08rem)',
  sm: 'calc(var(--card-font-size, 0.85rem) - 0.04rem)',
  md: 'var(--card-font-size, 0.85rem)',
  lg: 'calc(var(--card-font-size, 0.85rem) + 0.04rem)',
  xl: 'calc(var(--card-font-size, 0.85rem) + 0.08rem)',
  xxl: 'calc(var(--card-font-size, 0.85rem) + 0.12rem)',
};
const CARD_BASE_FONT_SIZE_REM = {
  xs: '0.75rem',
  sm: '0.80rem',
  md: '0.85rem',
  lg: '0.90rem',
  xl: '0.95rem',
  xxl: '1rem',
};
// Labels sit well below the body scale, so they get their own rem ladder rather than
// an offset. md is the pre-token 0.68rem of .fieldLabel.
const CARD_LABEL_FONT_SIZE_REM = {
  xs: '0.60rem',
  sm: '0.64rem',
  md: '0.68rem',
  lg: '0.72rem',
  xl: '0.76rem',
  xxl: '0.80rem',
};
const HEX_COLOR_PATTERN = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;

export function buildLineClampStyle(lines = 2) {
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
}

export function resolveCssColor(value) {
  return HEX_COLOR_PATTERN.test(String(value || '')) ? value : '';
}

export function isUrlValue(value) {
  return (
    typeof value === 'string' &&
    (value.startsWith('http://') || value.startsWith('https://'))
  );
}

export function buildFieldValueStyle(fieldStyle) {
  if (!fieldStyle) {
    return undefined;
  }

  const valueStyle = {};
  // bodySlots are persisted, so a saved slot style can still carry a legacy token.
  const fontWeight =
    fieldStyle.fontWeight == null
      ? undefined
      : normalizeFieldFontWeightToken(fieldStyle.fontWeight);
  const fontSize =
    fieldStyle.fontSize == null
      ? undefined
      : FIELD_FONT_SIZE_VALUES[normalizeFieldFontSizeToken(fieldStyle.fontSize)];

  if (fieldStyle.colorRole) {
    valueStyle['--field-text-color'] = resolveFieldColorRoleValue(
      fieldStyle.colorRole,
    );
  }

  if (fontWeight) {
    valueStyle['--field-font-weight'] = fontWeight;
  }

  if (fontSize) {
    valueStyle['--field-font-size'] = fontSize;
  }

  if (fieldStyle.emphasis === 'strong') {
    valueStyle['--field-letter-spacing'] = '-0.01em';
  }

  return Object.keys(valueStyle).length > 0 ? valueStyle : undefined;
}

export function buildShellCssVars(cardStyle) {
  const cssVars = {
    '--card-font-size':
      CARD_BASE_FONT_SIZE_REM[cardStyle.field.defaultFontSize],
    '--card-header-bg': resolveCssColor(cardStyle.header.backgroundColor),
    '--card-header-title-color': resolveCssColor(
      cardStyle.header.titleColorHex,
    ),
    '--card-header-title-weight': cardStyle.header.fontWeight,
    '--card-header-title-offset':
      CARD_HEADER_TITLE_SIZE_OFFSET_REM[cardStyle.header.titleSizeToken],
    // Always emitted: the muted role resolves to the same #6b7280 the admin --corp-muted
    // token holds, so this is a visual no-op that drops the admin dependency.
    '--card-field-label-color': resolveFieldColorRoleValue(
      cardStyle.info.labelColorRole,
    ),
    '--card-image-size': `${cardStyle.image.sizePx}px`,
    '--price-text-color': resolveFieldColorRoleValue(
      cardStyle.field.priceColorRole,
    ),
    '--field-default-color': resolveFieldColorRoleValue(
      cardStyle.field.defaultColorRole,
    ),
    // 정보영역 데이터 글자 굵기의 기본값. 개별 필드 스타일(--field-font-weight)이 있으면 그쪽이 이긴다.
    '--card-field-value-weight': cardStyle.field.defaultFontWeight,
  };
  const shellBorder = resolveCssColor(cardStyle.shell.borderColor);
  const infoBackground = resolveCssColor(cardStyle.info.backgroundColor);
  const isSideImage =
    cardStyle.layoutPlan.imagePlacement === 'left' ||
    cardStyle.layoutPlan.imagePlacement === 'right';

  if (shellBorder) cssVars['--card-border-color'] = shellBorder;
  if (infoBackground) cssVars['--card-info-bg'] = infoBackground;

  // Left unset at the default step so .fieldLabel and .groupFieldLabel keep their own
  // fallbacks (0.68/600 vs 0.72/700); once chosen, both labels follow the one token.
  if (cardStyle.info.labelFontSizeToken !== DEFAULT_CARD_STYLE.info.labelFontSizeToken) {
    cssVars['--card-field-label-size'] =
      CARD_LABEL_FONT_SIZE_REM[cardStyle.info.labelFontSizeToken];
  }

  if (cardStyle.info.labelFontWeight !== DEFAULT_CARD_STYLE.info.labelFontWeight) {
    cssVars['--card-field-label-weight'] = cardStyle.info.labelFontWeight;
  }

  if (isSideImage) {
    cssVars['--card-image-width'] = `${cardStyle.image.sizePx}px`;
  } else {
    cssVars['--card-image-height'] = `${cardStyle.image.sizePx}px`;
  }

  return cssVars;
}
