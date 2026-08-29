import { ensureReadableTextColor, mixHexColors, normalizeHexColor } from '../../storefront-view/model/shared/styleColor';
import {
  deriveCategoryChipsFromPalette,
  deriveSearchDefaultsFromPalette,
  normalizePageStyle,
} from '../../storefront-view/model/page-style/pageStyleModel';

const LEGACY_DESIGN_DIRECTION_ACCENT_SEED_HEX = {
  friendly: '#2f9e6e',
  warm: '#ea580c',
  green: '#1d4a2e',
  trust: '#2563eb',
  white: '#52525b',
};

const LEGACY_TITLE_TEXT_COLOR_VALUES = {
  default: '#173223',
  ink: '#0f172a',
  charcoal: '#27272a',
};

const LEGACY_TYPOGRAPHY_TONE_VALUES = {
  standard: { headingWeight: 800, letterSpacing: 'normal' },
  clean: { headingWeight: 700, letterSpacing: '0.01em' },
  soft: { headingWeight: 600, letterSpacing: 'normal' },
  bold: { headingWeight: 800, letterSpacing: '-0.01em' },
  official: { headingWeight: 700, letterSpacing: '0.02em' },
};

const LEGACY_SEARCH_VARIANT_BORDER_STRENGTH_TOKENS = {
  pill: 'soft',
  outlined: 'strong',
  soft: 'soft',
};

function resolveLegacyAccentSeedHex(legacyPageConfig) {
  const directionSeed = LEGACY_DESIGN_DIRECTION_ACCENT_SEED_HEX[legacyPageConfig?.designDirection] || LEGACY_DESIGN_DIRECTION_ACCENT_SEED_HEX.friendly;

  return normalizeHexColor(legacyPageConfig?.theme?.brandColor, directionSeed);
}

function resolveLegacyTitleColorHex(legacyPageConfig, accentSeedHex) {
  const legacyTitleTextColor = legacyPageConfig?.theme?.titleTextColor;

  if (legacyTitleTextColor === 'brand') {
    return accentSeedHex;
  }

  return LEGACY_TITLE_TEXT_COLOR_VALUES[legacyTitleTextColor] || LEGACY_TITLE_TEXT_COLOR_VALUES.default;
}

export function pageConfigNeedsPageStyleMigration(legacyPageConfig) {
  return Boolean(legacyPageConfig) && !legacyPageConfig.pageStyle && Boolean(legacyPageConfig.designDirection || legacyPageConfig.theme);
}

export function migrateLegacyPageConfigToPageStyle(legacyPageConfig) {
  const accentSeedHex = resolveLegacyAccentSeedHex(legacyPageConfig);
  const backgroundHex = mixHexColors(accentSeedHex, '#ffffff', 0.94);
  const palette = { backgroundHex, accentHex: accentSeedHex };
  const typographyTone =
    LEGACY_TYPOGRAPHY_TONE_VALUES[legacyPageConfig?.theme?.typographyTone] || LEGACY_TYPOGRAPHY_TONE_VALUES.standard;
  const titleColorHex = resolveLegacyTitleColorHex(legacyPageConfig, accentSeedHex);
  const searchDefaults = deriveSearchDefaultsFromPalette(palette);
  const categoryChips = deriveCategoryChipsFromPalette(palette);
  const productCategoryChips = deriveCategoryChipsFromPalette(palette);

  return normalizePageStyle({
    palette,
    header: {
      titleColorHex: ensureReadableTextColor(titleColorHex, backgroundHex),
      letterSpacing: typographyTone.letterSpacing,
      fontWeight: typographyTone.headingWeight,
    },
    search: {
      ...searchDefaults,
      borderStrengthToken:
        LEGACY_SEARCH_VARIANT_BORDER_STRENGTH_TOKENS[legacyPageConfig?.searchSection?.variant] || 'normal',
    },
    categoryChips,
    productCategoryChips,
  });
}
