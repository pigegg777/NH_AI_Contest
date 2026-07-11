import { resolveFieldColorRoleValue } from '../card-design/cardStyleModel';

export const PRICE_FIELD_SET = new Set([
  'zero_tax_price',
  'tax_price',
  'exempt_tax_price',
  'price_subsidy',
]);

const FIELD_FONT_WEIGHT_VALUES = {
  normal: '400',
  medium: '500',
  semibold: '700',
  bold: '800',
};
const FIELD_FONT_SIZE_VALUES = {
  small: 'calc(var(--card-font-size, 0.85rem) - 0.08rem)',
  medium: 'var(--card-font-size, 0.85rem)',
  large: 'calc(var(--card-font-size, 0.85rem) + 0.12rem)',
};
const CARD_BASE_FONT_SIZE_REM = {
  small: '0.75rem',
  medium: '0.85rem',
  large: '1rem',
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
  const fontWeight = FIELD_FONT_WEIGHT_VALUES[fieldStyle.fontWeight];
  const fontSize = FIELD_FONT_SIZE_VALUES[fieldStyle.fontSize];

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
    '--card-header-title-letter-spacing': cardStyle.header.letterSpacing,
    '--card-image-size': `${cardStyle.image.sizePx}px`,
    '--info-field-group-gap':
      cardStyle.info.fieldGroupGap === 'tight'
        ? '6px'
        : cardStyle.info.fieldGroupGap === 'relaxed'
          ? '14px'
          : '10px',
    '--price-text-color': resolveFieldColorRoleValue(
      cardStyle.field.priceColorRole,
    ),
    '--field-default-color': resolveFieldColorRoleValue(
      cardStyle.field.defaultColorRole,
    ),
  };
  const shellBackground = resolveCssColor(cardStyle.shell.backgroundColor);
  const shellBorder = resolveCssColor(cardStyle.shell.borderColor);
  const infoBackground = resolveCssColor(cardStyle.info.backgroundColor);
  const infoBorder = resolveCssColor(cardStyle.info.borderColor);
  const headerBorder = resolveCssColor(cardStyle.header.borderColor);
  const isSideImage =
    cardStyle.layoutPlan.imagePlacement === 'left' ||
    cardStyle.layoutPlan.imagePlacement === 'right';

  if (shellBackground) cssVars['--card-bg'] = shellBackground;
  if (shellBorder) cssVars['--card-border-color'] = shellBorder;
  if (infoBackground) cssVars['--card-info-bg'] = infoBackground;
  if (infoBorder) cssVars['--card-info-border'] = infoBorder;
  if (headerBorder) cssVars['--card-header-border'] = headerBorder;

  if (isSideImage) {
    cssVars['--card-image-width'] = `${cardStyle.image.sizePx}px`;
  } else {
    cssVars['--card-image-height'] = `${cardStyle.image.sizePx}px`;
  }

  return cssVars;
}
