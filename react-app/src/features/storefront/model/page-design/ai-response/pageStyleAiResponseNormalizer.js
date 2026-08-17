import { toTrimmedString } from '../../../../../common/utils/text';
import { PAGE_STYLE_AI_DEFAULT_EXPLANATION_MESSAGE } from '../../../config/page-design/pageStyleAiCopyConfig';
import { isHexColor, mixHexColors, normalizeHexColor } from '../../shared/pageStyleColor';
import {
  PAGE_STYLE_CHIP_GAP_TOKENS,
  PAGE_STYLE_CHIP_RADIUS_TOKENS,
  PAGE_STYLE_CHIP_SIZE_TOKENS,
  PAGE_STYLE_CHIP_VARIANT_TOKENS,
  PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS,
  PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS,
  PAGE_STYLE_SEARCH_SIZE_TOKENS,
} from '../page-style/pageStyleModel';

const CHIP_INTENT_HEX_KEYS = [
  'backgroundHex',
  'textHex',
  'borderColorHex',
  'activeBackgroundHex',
  'activeTextHex',
  'hoverBackgroundHex',
  'hoverTextHex',
  'hoverBorderHex',
];

function toRecognizedObject(source, keys) {
  const result = {};

  keys.forEach((key) => {
    if (isHexColor(source?.[key])) {
      result[key] = normalizeHexColor(source[key]);
    }
  });

  return result;
}

export function normalizePaletteIntent(rawPalette, fallbackAccentHex) {
  const source = rawPalette ?? {};
  const accentHex = normalizeHexColor(source.accentHex, fallbackAccentHex);
  const backgroundHex = isHexColor(source.backgroundHex)
    ? normalizeHexColor(source.backgroundHex, accentHex)
    : mixHexColors(accentHex, '#ffffff', 0.94);

  return { backgroundHex, accentHex };
}

function normalizePalettePatchIntent(rawPalette, fallbackAccentHex) {
  if (!rawPalette || !['backgroundHex', 'accentHex'].some((key) => isHexColor(rawPalette[key]))) {
    return null;
  }

  return normalizePaletteIntent(rawPalette, fallbackAccentHex);
}

export function normalizeHeaderIntent(rawHeader) {
  if (!rawHeader) return null;

  const intent = toRecognizedObject(rawHeader, ['titleColorHex']);

  if (typeof rawHeader.letterSpacing === 'string' && rawHeader.letterSpacing) {
    intent.letterSpacing = rawHeader.letterSpacing;
  }
  if (Number.isFinite(rawHeader.fontWeight)) intent.fontWeight = rawHeader.fontWeight;
  if (PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS.includes(rawHeader.titleFontSizeToken)) {
    intent.titleFontSizeToken = rawHeader.titleFontSizeToken;
  }

  return Object.keys(intent).length > 0 ? intent : null;
}

function normalizeChipsIntent(rawChips) {
  if (!rawChips) return null;

  const intent = toRecognizedObject(rawChips, CHIP_INTENT_HEX_KEYS);

  [
    ['variant', PAGE_STYLE_CHIP_VARIANT_TOKENS],
    ['sizeToken', PAGE_STYLE_CHIP_SIZE_TOKENS],
    ['radiusToken', PAGE_STYLE_CHIP_RADIUS_TOKENS],
    ['gapToken', PAGE_STYLE_CHIP_GAP_TOKENS],
  ].forEach(([key, tokens]) => {
    if (tokens.includes(rawChips[key])) intent[key] = rawChips[key];
  });

  return Object.keys(intent).length > 0 ? intent : null;
}

export function normalizeCategoryChipsIntent(rawChips) {
  return normalizeChipsIntent(rawChips);
}

export function normalizeProductCategoryChipsIntent(rawChips) {
  return normalizeChipsIntent(rawChips);
}

export function normalizeSearchIntent(rawSearch) {
  if (!rawSearch) return null;

  const intent = {};
  if (PAGE_STYLE_SEARCH_SIZE_TOKENS.includes(rawSearch.sizeToken)) {
    intent.sizeToken = rawSearch.sizeToken;
  }
  if (PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS.includes(rawSearch.borderStrengthToken)) {
    intent.borderStrengthToken = rawSearch.borderStrengthToken;
  }

  return Object.keys(intent).length > 0 ? intent : null;
}

function limitIntentToTargetScope(intent, targetScope) {
  const scopedKeyByTarget = {
    palette: 'palette',
    header: 'header',
    categoryChips: 'categoryChips',
    productCategoryChips: 'productCategoryChips',
    search: 'search',
  };
  const scopedKey = scopedKeyByTarget[targetScope];

  if (!scopedKey) return intent;

  return Object.fromEntries(
    Object.keys(scopedKeyByTarget).map((key) => [
      key,
      key === scopedKey ? intent[key] : null,
    ]),
  );
}

export function normalizePageStyleAiIntent(payload, fallbackAccentHex, targetScope) {
  return limitIntentToTargetScope(
    {
      palette: normalizePalettePatchIntent(payload?.palette, fallbackAccentHex),
      header: normalizeHeaderIntent(payload?.header),
      categoryChips: normalizeCategoryChipsIntent(payload?.categoryChips),
      productCategoryChips: normalizeProductCategoryChipsIntent(payload?.productCategoryChips),
      search: normalizeSearchIntent(payload?.search),
    },
    targetScope,
  );
}

export function normalizePageStyleAiExplanation(payload) {
  return {
    explanation:
      toTrimmedString(payload?.explanation) || PAGE_STYLE_AI_DEFAULT_EXPLANATION_MESSAGE,
    suggestion: toTrimmedString(payload?.suggestion) || null,
  };
}
