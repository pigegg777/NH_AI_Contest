import {
  deriveCategoryChipsFromPalette,
  deriveSearchDefaultsFromPalette,
  normalizePageStyle,
} from '../model/pageStyleModel';

function resolveHeader(intentHeader, previousHeader) {
  return {
    titleColorHex: intentHeader?.titleColorHex ?? previousHeader.titleColorHex,
    letterSpacing: intentHeader?.letterSpacing ?? previousHeader.letterSpacing,
    fontWeight: intentHeader?.fontWeight ?? previousHeader.fontWeight,
  };
}

function resolveSearch(intentSearch, previousSearch, palette) {
  const paletteDefaults = deriveSearchDefaultsFromPalette(palette);

  return {
    sizeToken: intentSearch?.sizeToken ?? previousSearch.sizeToken,
    borderStrengthToken: intentSearch?.borderStrengthToken ?? previousSearch.borderStrengthToken,
    borderColorHex: paletteDefaults.borderColorHex,
    focusBorderColorHex: paletteDefaults.focusBorderColorHex,
  };
}

function resolveCategoryChips(intentChips, palette) {
  const paletteDefaults = deriveCategoryChipsFromPalette(palette);

  return {
    backgroundHex: intentChips?.backgroundHex ?? paletteDefaults.backgroundHex,
    textHex: intentChips?.textHex ?? paletteDefaults.textHex,
    borderColorHex: intentChips?.borderColorHex ?? paletteDefaults.borderColorHex,
    activeBackgroundHex: intentChips?.activeBackgroundHex ?? paletteDefaults.activeBackgroundHex,
    activeTextHex: intentChips?.activeTextHex ?? paletteDefaults.activeTextHex,
  };
}

export function compilePageStyle({ intent, previousPageStyle }) {
  const previous = normalizePageStyle(previousPageStyle);
  const palette = intent.palette;

  return normalizePageStyle({
    palette,
    header: resolveHeader(intent.header, previous.header),
    search: resolveSearch(intent.search, previous.search, palette),
    categoryChips: resolveCategoryChips(intent.categoryChips, palette),
  });
}
