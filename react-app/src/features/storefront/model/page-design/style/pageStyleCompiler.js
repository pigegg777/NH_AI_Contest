import { normalizeHexColor } from '../../shared/pageStyleColor';
import { normalizePageAiTargetScope } from '../ai-request/pageAiDesignModel';
import { deriveCategoryChipsFromPalette, normalizePageStyle } from './pageStyleModel';

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

function resolveSearch(intentSearch, previousSearch) {
  return {
    sizeToken: intentSearch?.sizeToken ?? previousSearch.sizeToken,
    borderStrengthToken:
      intentSearch?.borderStrengthToken ?? previousSearch.borderStrengthToken,
    backgroundHex: intentSearch?.backgroundHex ?? previousSearch.backgroundHex,
    borderColorHex: intentSearch?.borderColorHex ?? previousSearch.borderColorHex,
  };
}

const CHIP_FIELDS = [
  'backgroundHex',
  'textHex',
  'borderColorHex',
  'activeBackgroundHex',
  'activeTextHex',
  'activeBorderHex',
  'styleMode',
  'sizeToken',
  'radiusToken',
  'gapToken',
  'borderStrengthToken',
  'fontWeight',
];

function resolveChips(intentChips, previousChips, palette, shouldRefreshPaletteDefaults) {
  if (!intentChips && !shouldRefreshPaletteDefaults) {
    return previousChips;
  }

  // Palette changes only ever refresh colors; shape/size/gap tokens stay put.
  const baseChips = shouldRefreshPaletteDefaults
    ? { ...previousChips, ...deriveCategoryChipsFromPalette(palette) }
    : previousChips;

  return Object.fromEntries(
    CHIP_FIELDS.map((field) => [field, intentChips?.[field] ?? baseChips[field]]),
  );
}

function resolveScopedChips(intentChips, previousChips) {
  return Object.fromEntries(
    CHIP_FIELDS.map((field) => [field, intentChips?.[field] ?? previousChips[field]]),
  );
}

export function compilePageStyle({ intent, previousPageStyle, targetScope }) {
  const previous = normalizePageStyle(previousPageStyle);
  const normalizedTargetScope = normalizePageAiTargetScope(targetScope);

  if (!normalizedTargetScope) {
    const palette = resolvePalette(intent?.palette, previous.palette);

    return normalizePageStyle({
      palette,
      header: resolveHeader(intent.header, previous.header),
      search: resolveSearch(intent.search, previous.search),
      categoryChips: resolveChips(
        intent.categoryChips,
        previous.categoryChips,
        palette,
        false,
      ),
      productCategoryChips: resolveChips(
        intent.productCategoryChips,
        previous.productCategoryChips,
        palette,
        false,
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
      productCategoryChips: previous.productCategoryChips,
    });
  }

  if (normalizedTargetScope === 'header') {
    return normalizePageStyle({
      palette: previous.palette,
      header: resolveHeader(intent.header, previous.header),
      search: previous.search,
      categoryChips: previous.categoryChips,
      productCategoryChips: previous.productCategoryChips,
    });
  }

  if (normalizedTargetScope === 'categoryChips') {
    return normalizePageStyle({
      palette: previous.palette,
      header: previous.header,
      search: previous.search,
      categoryChips: resolveScopedChips(
        intent.categoryChips,
        previous.categoryChips,
      ),
      productCategoryChips: previous.productCategoryChips,
    });
  }

  if (normalizedTargetScope === 'productCategoryChips') {
    return normalizePageStyle({
      palette: previous.palette,
      header: previous.header,
      search: previous.search,
      categoryChips: previous.categoryChips,
      productCategoryChips: resolveScopedChips(
        intent.productCategoryChips,
        previous.productCategoryChips,
      ),
    });
  }

  return normalizePageStyle({
    palette: previous.palette,
    header: previous.header,
    search: resolveSearch(intent.search, previous.search),
    categoryChips: previous.categoryChips,
    productCategoryChips: previous.productCategoryChips,
  });
}
