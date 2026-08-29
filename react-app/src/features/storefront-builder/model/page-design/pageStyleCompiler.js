import { normalizeHexColor } from '../../../storefront-view/model/shared/styleColor';
import { normalizePageAiTargetScope } from './ai-request/pageAiDesignModel';
import {
  deriveCategoryChipsFromPalette,
  deriveProductCategoryChipsFromPalette,
  deriveSearchDefaultsFromPalette,
  normalizePageStyle,
} from '../../../storefront-view/model/page-style/pageStyleModel';

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

function resolveChips(intentChips, previousChips, paletteColors) {
  if (!intentChips && !paletteColors) {
    return previousChips;
  }

  // Palette changes only ever refresh colors; shape/size/gap tokens stay put.
  const baseChips = paletteColors
    ? { ...previousChips, ...paletteColors }
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
    const shouldRefreshPageColors = Boolean(intent?.palette);
    const previousHeader = shouldRefreshPageColors
      ? { ...previous.header, titleColorHex: palette.accentHex }
      : previous.header;
    const paletteSearchColors = deriveSearchDefaultsFromPalette(palette);
    const previousSearch = shouldRefreshPageColors
      ? {
          ...previous.search,
          borderColorHex: paletteSearchColors.borderColorHex,
        }
      : previous.search;

    return normalizePageStyle({
      palette,
      header: resolveHeader(intent.header, previousHeader),
      search: resolveSearch(intent.search, previousSearch),
      categoryChips: resolveChips(
        intent.categoryChips,
        previous.categoryChips,
        shouldRefreshPageColors
          ? deriveCategoryChipsFromPalette(palette)
          : null,
      ),
      productCategoryChips: resolveChips(
        intent.productCategoryChips,
        previous.productCategoryChips,
        shouldRefreshPageColors
          ? deriveProductCategoryChipsFromPalette(palette)
          : null,
      ),
    });
  }

  if (normalizedTargetScope === 'palette') {
    const palette = resolvePalette(intent?.palette, previous.palette);
    const paletteSearchColors = deriveSearchDefaultsFromPalette(palette);

    return normalizePageStyle({
      palette,
      header: { ...previous.header, titleColorHex: palette.accentHex },
      search: {
        ...previous.search,
        borderColorHex: paletteSearchColors.borderColorHex,
      },
      categoryChips: {
        ...previous.categoryChips,
        ...deriveCategoryChipsFromPalette(palette),
      },
      productCategoryChips: {
        ...previous.productCategoryChips,
        ...deriveProductCategoryChipsFromPalette(palette),
      },
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
