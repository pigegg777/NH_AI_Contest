import { toTrimmedString } from '../../../../common/utils/text';
import { PAGE_STYLE_AI_DEFAULT_EXPLANATION_MESSAGE } from '../../config/page-design/pageStyleAiCopyConfig';
import { HEX_COLOR_SCHEMA_PATTERN } from '../../config/page-design/pageStyleAiSchemaConfig';
import {
  isHexColor,
  mixHexColors,
  normalizeHexColor,
  pickReadableTextColor,
} from './pageStyleColor';
import {
  PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS,
  PAGE_STYLE_SEARCH_SIZE_TOKENS,
} from './pageStyleModel';

const NULLABLE_HEADER_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    titleColorHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
    },
    letterSpacing: { type: ['string', 'null'] },
    fontWeight: { type: ['number', 'null'] },
  },
  required: ['titleColorHex', 'letterSpacing', 'fontWeight'],
};

const NULLABLE_CATEGORY_CHIPS_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
    },
    textHex: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
    borderColorHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
    },
    activeBackgroundHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
    },
    activeTextHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
    },
  },
  required: [
    'backgroundHex',
    'textHex',
    'borderColorHex',
    'activeBackgroundHex',
    'activeTextHex',
  ],
};

const NULLABLE_SEARCH_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    sizeToken: {
      type: ['string', 'null'],
      enum: [...PAGE_STYLE_SEARCH_SIZE_TOKENS, null],
    },
    borderStrengthToken: {
      type: ['string', 'null'],
      enum: [...PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS, null],
    },
  },
  required: ['sizeToken', 'borderStrengthToken'],
};

const NULLABLE_PALETTE_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
    },
    surfaceHex: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
    accentHex: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
    textHex: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
  },
  required: ['backgroundHex', 'surfaceHex', 'accentHex', 'textHex'],
};

export const PAGE_STYLE_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    palette: NULLABLE_PALETTE_SCHEMA,
    header: NULLABLE_HEADER_SCHEMA,
    categoryChips: NULLABLE_CATEGORY_CHIPS_SCHEMA,
    search: NULLABLE_SEARCH_SCHEMA,
    explanation: { type: 'string' },
    suggestion: { type: ['string', 'null'] },
  },
  required: [
    'palette',
    'header',
    'categoryChips',
    'search',
    'explanation',
    'suggestion',
  ],
};

export function normalizePaletteIntent(rawPalette, fallbackAccentHex) {
  const source = rawPalette ?? {};
  const accentHex = normalizeHexColor(source.accentHex, fallbackAccentHex);
  const backgroundHex = isHexColor(source.backgroundHex)
    ? normalizeHexColor(source.backgroundHex, accentHex)
    : mixHexColors(accentHex, '#ffffff', 0.94);

  return {
    backgroundHex,
    surfaceHex: normalizeHexColor(source.surfaceHex, '#ffffff'),
    accentHex,
    textHex: normalizeHexColor(
      source.textHex,
      pickReadableTextColor(backgroundHex),
    ),
  };
}

function normalizePalettePatchIntent(rawPalette, fallbackAccentHex) {
  if (!rawPalette) {
    return null;
  }

  const hasRecognizedHex = [
    'backgroundHex',
    'surfaceHex',
    'accentHex',
    'textHex',
  ].some((key) => isHexColor(rawPalette[key]));

  return hasRecognizedHex
    ? normalizePaletteIntent(rawPalette, fallbackAccentHex)
    : null;
}

export function normalizeHeaderIntent(rawHeader) {
  if (!rawHeader) {
    return null;
  }

  const intent = {};

  if (isHexColor(rawHeader.titleColorHex)) {
    intent.titleColorHex = normalizeHexColor(rawHeader.titleColorHex);
  }

  if (typeof rawHeader.letterSpacing === 'string' && rawHeader.letterSpacing) {
    intent.letterSpacing = rawHeader.letterSpacing;
  }

  if (Number.isFinite(rawHeader.fontWeight)) {
    intent.fontWeight = rawHeader.fontWeight;
  }

  return Object.keys(intent).length > 0 ? intent : null;
}

export function normalizeCategoryChipsIntent(rawChips) {
  if (!rawChips) {
    return null;
  }

  const intent = {};

  [
    'backgroundHex',
    'textHex',
    'borderColorHex',
    'activeBackgroundHex',
    'activeTextHex',
  ].forEach((key) => {
    if (isHexColor(rawChips[key])) {
      intent[key] = normalizeHexColor(rawChips[key]);
    }
  });

  return Object.keys(intent).length > 0 ? intent : null;
}

export function normalizeSearchIntent(rawSearch) {
  if (!rawSearch) {
    return null;
  }

  const intent = {};

  if (PAGE_STYLE_SEARCH_SIZE_TOKENS.includes(rawSearch.sizeToken)) {
    intent.sizeToken = rawSearch.sizeToken;
  }

  if (
    PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS.includes(
      rawSearch.borderStrengthToken,
    )
  ) {
    intent.borderStrengthToken = rawSearch.borderStrengthToken;
  }

  return Object.keys(intent).length > 0 ? intent : null;
}

function limitIntentToTargetScope(intent, targetScope) {
  switch (targetScope) {
    case 'palette':
      return {
        palette: intent.palette,
        header: null,
        categoryChips: null,
        search: null,
      };
    case 'header':
      return {
        palette: null,
        header: intent.header,
        categoryChips: null,
        search: null,
      };
    case 'categoryChips':
      return {
        palette: null,
        header: null,
        categoryChips: intent.categoryChips,
        search: null,
      };
    case 'search':
      return {
        palette: null,
        header: null,
        categoryChips: null,
        search: intent.search,
      };
    default:
      return intent;
  }
}

export function normalizePageStyleAiIntent(
  payload,
  fallbackAccentHex,
  targetScope,
) {
  return limitIntentToTargetScope(
    {
      palette: normalizePalettePatchIntent(payload?.palette, fallbackAccentHex),
      header: normalizeHeaderIntent(payload?.header),
      categoryChips: normalizeCategoryChipsIntent(payload?.categoryChips),
      search: normalizeSearchIntent(payload?.search),
    },
    targetScope,
  );
}

export function normalizePageStyleAiExplanation(payload) {
  return {
    explanation:
      toTrimmedString(payload?.explanation) ||
      PAGE_STYLE_AI_DEFAULT_EXPLANATION_MESSAGE,
    suggestion: toTrimmedString(payload?.suggestion) || null,
  };
}
