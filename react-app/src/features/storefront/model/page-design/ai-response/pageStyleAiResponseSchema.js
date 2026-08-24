import {
  PAGE_STYLE_BORDER_STRENGTH_TOKENS,
  PAGE_STYLE_CHIP_BORDER_SIDE_TOKENS,
  PAGE_STYLE_CHIP_GAP_TOKENS,
  PAGE_STYLE_CHIP_RADIUS_TOKENS,
  PAGE_STYLE_CHIP_SIZE_TOKENS,
  PAGE_STYLE_CHIP_VARIANT_TOKENS,
  PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS,
  PAGE_STYLE_SEARCH_SIZE_TOKENS,
} from '../style/pageStyleModel';

const HEX_COLOR_SCHEMA_PATTERN = '^#[0-9a-fA-F]{6}$';
const LETTER_SPACING_SCHEMA_PATTERN = '^normal$|^-?\\d+(\\.\\d+)?(em|rem|px)$';
const FONT_WEIGHT_TOKENS = [400, 500, 600, 700, 800, 900];

function nullableHex() {
  return { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN };
}

function nullableToken(values) {
  return { type: ['string', 'null'], enum: [...values, null] };
}

function nullableObject(properties) {
  return {
    type: ['object', 'null'],
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  };
}

const NULLABLE_HEADER_SCHEMA = nullableObject({
  titleColorHex: nullableHex(),
  letterSpacing: {
    type: ['string', 'null'],
    pattern: LETTER_SPACING_SCHEMA_PATTERN,
  },
  fontWeight: {
    type: ['number', 'null'],
    enum: [...FONT_WEIGHT_TOKENS, null],
  },
  titleFontSizeToken: nullableToken(PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS),
});

function buildNullableChipsSchema() {
  return nullableObject({
    backgroundHex: nullableHex(),
    textHex: nullableHex(),
    borderColorHex: nullableHex(),
    activeBackgroundHex: nullableHex(),
    activeTextHex: nullableHex(),
    activeBorderHex: nullableHex(),
    hoverBackgroundHex: nullableHex(),
    hoverTextHex: nullableHex(),
    hoverBorderHex: nullableHex(),
    variant: nullableToken(PAGE_STYLE_CHIP_VARIANT_TOKENS),
    sizeToken: nullableToken(PAGE_STYLE_CHIP_SIZE_TOKENS),
    radiusToken: nullableToken(PAGE_STYLE_CHIP_RADIUS_TOKENS),
    gapToken: nullableToken(PAGE_STYLE_CHIP_GAP_TOKENS),
    borderStrengthToken: nullableToken(PAGE_STYLE_BORDER_STRENGTH_TOKENS),
    borderSides: nullableToken(PAGE_STYLE_CHIP_BORDER_SIDE_TOKENS),
    fontWeight: {
      type: ['number', 'null'],
      enum: [...FONT_WEIGHT_TOKENS, null],
    },
  });
}

const NULLABLE_SEARCH_SCHEMA = nullableObject({
  sizeToken: nullableToken(PAGE_STYLE_SEARCH_SIZE_TOKENS),
  borderStrengthToken: nullableToken(PAGE_STYLE_BORDER_STRENGTH_TOKENS),
  backgroundHex: nullableHex(),
  borderColorHex: nullableHex(),
  focusBorderColorHex: nullableHex(),
});

const NULLABLE_PALETTE_SCHEMA = nullableObject({
  backgroundHex: nullableHex(),
  accentHex: nullableHex(),
});

export const PAGE_STYLE_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    palette: NULLABLE_PALETTE_SCHEMA,
    header: NULLABLE_HEADER_SCHEMA,
    categoryChips: buildNullableChipsSchema(),
    productCategoryChips: buildNullableChipsSchema(),
    search: NULLABLE_SEARCH_SCHEMA,
    explanation: { type: 'string', pattern: '^[\\s\\S]{1,200}$' },
    suggestion: { type: ['string', 'null'], pattern: '^[\\s\\S]{1,120}$' },
  },
  required: [
    'palette',
    'header',
    'categoryChips',
    'productCategoryChips',
    'search',
    'explanation',
    'suggestion',
  ],
};
