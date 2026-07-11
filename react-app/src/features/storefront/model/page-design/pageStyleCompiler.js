import { normalizeHexColor } from './pageStyleColor';
import { normalizePageAiTargetScope } from './pageAiDesignModel';
import {
  deriveCategoryChipsFromPalette,
  deriveSearchDefaultsFromPalette,
  normalizePageStyle,
} from './pageStyleModel';

function resolvePalette(intentPalette, previousPalette) {
  if (!intentPalette) {
    return previousPalette;
  }

  return {
    backgroundHex: normalizeHexColor(intentPalette.backgroundHex, previousPalette.backgroundHex),
    accentHex: normalizeHexColor(intentPalette.accentHex, previousPalette.accentHex),
  };
}

function resolveHeader(intentHeader, previousHeader) {
  return {
    titleColorHex: intentHeader?.titleColorHex ?? previousHeader.titleColorHex,
    letterSpacing: intentHeader?.letterSpacing ?? previousHeader.letterSpacing,
    fontWeight: intentHeader?.fontWeight ?? previousHeader.fontWeight,
    titleFontSizeToken:
      intentHeader?.titleFontSizeToken ?? previousHeader.titleFontSizeToken,
  };
}

function resolveSearch(intentSearch, previousSearch, palette, shouldRefreshPaletteDefaults) {
  const paletteDefaults = deriveSearchDefaultsFromPalette(palette);

  return {
    sizeToken: intentSearch?.sizeToken ?? previousSearch.sizeToken,
    borderStrengthToken:
      intentSearch?.borderStrengthToken ?? previousSearch.borderStrengthToken,
    borderColorHex: shouldRefreshPaletteDefaults
      ? paletteDefaults.borderColorHex
      : previousSearch.borderColorHex,
    focusBorderColorHex: shouldRefreshPaletteDefaults
      ? paletteDefaults.focusBorderColorHex
      : previousSearch.focusBorderColorHex,
  };
}

function resolveScopedSearch(intentSearch, previousSearch) {
  return {
    sizeToken: intentSearch?.sizeToken ?? previousSearch.sizeToken,
    borderStrengthToken:
      intentSearch?.borderStrengthToken ?? previousSearch.borderStrengthToken,
    borderColorHex: previousSearch.borderColorHex,
    focusBorderColorHex: previousSearch.focusBorderColorHex,
  };
}

function resolveCategoryChips(
  intentChips,
  previousChips,
  palette,
  shouldRefreshPaletteDefaults,
) {
  const paletteDefaults = deriveCategoryChipsFromPalette(palette);
  const baseChips = shouldRefreshPaletteDefaults ? paletteDefaults : previousChips;

  if (!intentChips && !shouldRefreshPaletteDefaults) {
    return previousChips;
  }

  return {
    backgroundHex: intentChips?.backgroundHex ?? baseChips.backgroundHex,
    textHex: intentChips?.textHex ?? baseChips.textHex,
    borderColorHex:
      intentChips?.borderColorHex ?? baseChips.borderColorHex,
    activeBackgroundHex:
      intentChips?.activeBackgroundHex ?? baseChips.activeBackgroundHex,
    activeTextHex:
      intentChips?.activeTextHex ?? baseChips.activeTextHex,
  };
}

function resolveScopedCategoryChips(intentChips, previousChips) {
  return {
    backgroundHex: intentChips?.backgroundHex ?? previousChips.backgroundHex,
    textHex: intentChips?.textHex ?? previousChips.textHex,
    borderColorHex:
      intentChips?.borderColorHex ?? previousChips.borderColorHex,
    activeBackgroundHex:
      intentChips?.activeBackgroundHex ?? previousChips.activeBackgroundHex,
    activeTextHex: intentChips?.activeTextHex ?? previousChips.activeTextHex,
  };
}

export function compilePageStyle({ intent, previousPageStyle, targetScope }) {
  const previous = normalizePageStyle(previousPageStyle);
  const normalizedTargetScope = normalizePageAiTargetScope(targetScope);

  if (!normalizedTargetScope) {
    const hasPalettePatch = Boolean(intent?.palette);
    const palette = resolvePalette(intent?.palette, previous.palette);

    return normalizePageStyle({
      palette,
      header: resolveHeader(intent.header, previous.header),
      search: resolveSearch(intent.search, previous.search, palette, hasPalettePatch),
      categoryChips: resolveCategoryChips(
        intent.categoryChips,
        previous.categoryChips,
        palette,
        hasPalettePatch,
      ),
    });
  }

  if (normalizedTargetScope === 'palette') {
    const palette = resolvePalette(intent?.palette, previous.palette);

    return normalizePageStyle({
      palette,
      header: previous.header,
      search: previous.search,
      categoryChips: previous.categoryChips,
    });
  }

  if (normalizedTargetScope === 'header') {
    return normalizePageStyle({
      palette: previous.palette,
      header: resolveHeader(intent.header, previous.header),
      search: previous.search,
      categoryChips: previous.categoryChips,
    });
  }

  if (normalizedTargetScope === 'categoryChips') {
    return normalizePageStyle({
      palette: previous.palette,
      header: previous.header,
      search: previous.search,
      categoryChips: resolveScopedCategoryChips(
        intent.categoryChips,
        previous.categoryChips,
      ),
    });
  }

  return normalizePageStyle({
    palette: previous.palette,
    header: previous.header,
    search: resolveScopedSearch(intent.search, previous.search),
    categoryChips: previous.categoryChips,
  });
}
