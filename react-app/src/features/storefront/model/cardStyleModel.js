export const DEFAULT_CARD_STYLE = {
  layout: 'grid',
  accentColor: '#1d4a2e',
  fontSize: 'medium',
  cardsPerRow: 2,
  imageSize: 'sm',
  imageFit: 'contain',
  cardRadius: 'lg',
  cardShadow: 'soft',
  cardSpacing: 'relaxed',
  priceTextColor: 'default',
};

export const CARD_STYLE_LAYOUT_OPTIONS = ['grid', 'compact'];

export const CARD_STYLE_ACCENT_COLOR_OPTIONS = ['#1d4a2e', '#2563eb', '#ea580c', '#7c3aed'];

export const CARD_STYLE_FONT_SIZE_OPTIONS = ['small', 'medium', 'large'];

export const CARD_STYLE_CARDS_PER_ROW_OPTIONS = [1, 2, 3];

export const CARD_STYLE_IMAGE_SIZE_OPTIONS = ['hidden', 'sm', 'md', 'lg'];

export const CARD_STYLE_IMAGE_FIT_OPTIONS = ['cover', 'contain'];

export const CARD_STYLE_RADIUS_OPTIONS = ['md', 'lg', 'xl'];

export const CARD_STYLE_SHADOW_OPTIONS = ['none', 'soft', 'strong'];

export const CARD_STYLE_SPACING_OPTIONS = ['tight', 'normal', 'relaxed'];

export const CARD_STYLE_PRICE_TEXT_COLOR_OPTIONS = ['default', 'brand', 'muted'];

export const CARD_STYLE_PRICE_TEXT_COLOR_VALUES = {
  default: '#d32f2f',
  muted: '#6b7280',
};

export function resolveCardPriceTextColor(priceTextColor, accentColor) {
  if (priceTextColor === 'brand') {
    return accentColor || DEFAULT_CARD_STYLE.accentColor;
  }

  return CARD_STYLE_PRICE_TEXT_COLOR_VALUES[priceTextColor] || CARD_STYLE_PRICE_TEXT_COLOR_VALUES.default;
}

export const CARD_STYLE_FONT_SIZE_REM = {
  small: '0.75rem',
  medium: '0.85rem',
  large: '1rem',
};

export function normalizeCardStyle(style) {
  const source = style ?? {};
  const cardsPerRow = Number(source.cardsPerRow);

  return {
    layout: CARD_STYLE_LAYOUT_OPTIONS.includes(source.layout) ? source.layout : DEFAULT_CARD_STYLE.layout,
    accentColor: CARD_STYLE_ACCENT_COLOR_OPTIONS.includes(source.accentColor)
      ? source.accentColor
      : DEFAULT_CARD_STYLE.accentColor,
    fontSize: CARD_STYLE_FONT_SIZE_OPTIONS.includes(source.fontSize) ? source.fontSize : DEFAULT_CARD_STYLE.fontSize,
    cardsPerRow: CARD_STYLE_CARDS_PER_ROW_OPTIONS.includes(cardsPerRow) ? cardsPerRow : DEFAULT_CARD_STYLE.cardsPerRow,
    imageSize: CARD_STYLE_IMAGE_SIZE_OPTIONS.includes(source.imageSize) ? source.imageSize : DEFAULT_CARD_STYLE.imageSize,
    imageFit: CARD_STYLE_IMAGE_FIT_OPTIONS.includes(source.imageFit) ? source.imageFit : DEFAULT_CARD_STYLE.imageFit,
    cardRadius: CARD_STYLE_RADIUS_OPTIONS.includes(source.cardRadius) ? source.cardRadius : DEFAULT_CARD_STYLE.cardRadius,
    cardShadow: CARD_STYLE_SHADOW_OPTIONS.includes(source.cardShadow) ? source.cardShadow : DEFAULT_CARD_STYLE.cardShadow,
    cardSpacing: CARD_STYLE_SPACING_OPTIONS.includes(source.cardSpacing) ? source.cardSpacing : DEFAULT_CARD_STYLE.cardSpacing,
    priceTextColor: CARD_STYLE_PRICE_TEXT_COLOR_OPTIONS.includes(source.priceTextColor)
      ? source.priceTextColor
      : DEFAULT_CARD_STYLE.priceTextColor,
  };
}
