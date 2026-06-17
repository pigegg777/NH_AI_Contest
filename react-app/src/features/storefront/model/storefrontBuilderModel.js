import { toTrimmedString } from '../../../common/utils/text';
import { DEFAULT_CARD_STYLE, normalizeCardStyle } from './cardStyleModel';

export const DEFAULT_CARD_FIELDS = ['product_name', 'spec', 'nutrient', 'tax_price'];

export const STOREFRONT_FIELD_OPTIONS = [
  'product_name',
  'spec',
  'large_category',
  'medium_category',
  'small_category',
  'detail_category',
  'nutrient',
  'product_url',
  'tax_price',
];

export const STOREFRONT_FIELD_LABELS = {
  product_name: 'Product',
  spec: 'Spec',
  large_category: 'Main category',
  medium_category: 'Medium category',
  small_category: 'Detail group',
  detail_category: 'Detail',
  nutrient: 'Nutrient',
  product_url: 'Link',
  tax_price: 'Price',
};

export const DEFAULT_NAV_CONFIG = {
  title: '',
  subtitle: '',
  brandColor: DEFAULT_CARD_STYLE.accentColor,
  searchPlaceholder: 'Search products',
  logoUrl: '',
  searchVariant: 'pill',
  categoryChipVariant: 'soft',
};

export const STOREFRONT_DESIGN_DIRECTIONS = [
  { id: 'friendly', label: 'Friendly', description: 'Clean and approachable for first-time visitors.' },
  { id: 'warm', label: 'Warm', description: 'Soft and welcoming with stronger storytelling.' },
  { id: 'green', label: 'Green', description: 'Nature-led and product-focused for agricultural products.' },
  { id: 'trust', label: 'Trust', description: 'Structured and confident for official office pages.' },
];

export const STOREFRONT_BACKGROUND_TONES = {
  friendly: 'mint',
  warm: 'apricot',
  green: 'forest',
  trust: 'sky',
};

export const DEFAULT_PAGE_CONFIG = {
  schemaVersion: 1,
  designDirection: 'friendly',
  theme: {
    brandColor: DEFAULT_CARD_STYLE.accentColor,
    backgroundTone: STOREFRONT_BACKGROUND_TONES.friendly,
  },
  nav: {
    title: '',
    subtitle: '',
    logoUrl: '',
  },
  searchSection: {
    enabled: true,
    placeholder: DEFAULT_NAV_CONFIG.searchPlaceholder,
    variant: DEFAULT_NAV_CONFIG.searchVariant,
  },
  categoryChips: {
    enabled: true,
    sticky: true,
    variant: DEFAULT_NAV_CONFIG.categoryChipVariant,
  },
};

function normalizeDesignDirection(designDirection) {
  const candidate = toTrimmedString(designDirection);

  return STOREFRONT_DESIGN_DIRECTIONS.some((option) => option.id === candidate)
    ? candidate
    : DEFAULT_PAGE_CONFIG.designDirection;
}

function normalizeMediumCategory(value) {
  return toTrimmedString(value);
}

function uniqueStrings(values) {
  return (Array.isArray(values) ? values : []).filter(
    (value, index, array) => value && array.indexOf(value) === index,
  );
}

export function normalizeNavConfig(navConfig) {
  const source = navConfig ?? {};

  return {
    title: toTrimmedString(source.title),
    subtitle: toTrimmedString(source.subtitle),
    brandColor: toTrimmedString(source.brandColor) || DEFAULT_NAV_CONFIG.brandColor,
    searchPlaceholder: toTrimmedString(source.searchPlaceholder) || DEFAULT_NAV_CONFIG.searchPlaceholder,
    logoUrl: toTrimmedString(source.logoUrl),
    searchVariant: ['pill', 'outlined', 'soft'].includes(source.searchVariant)
      ? source.searchVariant
      : DEFAULT_NAV_CONFIG.searchVariant,
    categoryChipVariant: ['filled', 'outline', 'soft'].includes(source.categoryChipVariant)
      ? source.categoryChipVariant
      : DEFAULT_NAV_CONFIG.categoryChipVariant,
  };
}

export function normalizeCardFields(fields) {
  const nextFields = Array.isArray(fields)
    ? fields.filter((field, index) => STOREFRONT_FIELD_OPTIONS.includes(field) && fields.indexOf(field) === index)
    : [];

  return nextFields.length > 0 ? nextFields : DEFAULT_CARD_FIELDS;
}

export function normalizePageConfig(pageConfig) {
  const source = pageConfig ?? {};
  const designDirection = normalizeDesignDirection(source.designDirection);
  const sourceTheme = source.theme ?? {};
  const sourceNav = source.nav ?? {};
  const sourceSearchSection = source.searchSection ?? {};
  const sourceCategoryChips = source.categoryChips ?? {};

  return {
    schemaVersion: Number.isFinite(source.schemaVersion) ? source.schemaVersion : DEFAULT_PAGE_CONFIG.schemaVersion,
    designDirection,
    theme: {
      brandColor: toTrimmedString(sourceTheme.brandColor) || DEFAULT_PAGE_CONFIG.theme.brandColor,
      backgroundTone:
        toTrimmedString(sourceTheme.backgroundTone) || STOREFRONT_BACKGROUND_TONES[designDirection],
    },
    nav: {
      title: toTrimmedString(sourceNav.title),
      subtitle: toTrimmedString(sourceNav.subtitle),
      logoUrl: toTrimmedString(sourceNav.logoUrl),
    },
    searchSection: {
      enabled: sourceSearchSection.enabled ?? true,
      placeholder: toTrimmedString(sourceSearchSection.placeholder) || DEFAULT_PAGE_CONFIG.searchSection.placeholder,
      variant: ['pill', 'outlined', 'soft'].includes(sourceSearchSection.variant)
        ? sourceSearchSection.variant
        : DEFAULT_PAGE_CONFIG.searchSection.variant,
    },
    categoryChips: {
      enabled: sourceCategoryChips.enabled ?? true,
      sticky: sourceCategoryChips.sticky ?? true,
      variant: ['filled', 'outline', 'soft'].includes(sourceCategoryChips.variant)
        ? sourceCategoryChips.variant
        : DEFAULT_PAGE_CONFIG.categoryChips.variant,
    },
  };
}

export function normalizeCategoryConfig(categoryConfig, productCategoryName = '') {
  const source = categoryConfig ?? {};
  const sourceCardDesign = source.cardDesign ?? {};
  const selectedMediumCategories = uniqueStrings(
    (Array.isArray(source.selectedMediumCategories) ? source.selectedMediumCategories : []).map(normalizeMediumCategory),
  );
  const representativeMediumCategory = normalizeMediumCategory(source.representativeMediumCategory);

  return {
    schemaVersion: Number.isFinite(source.schemaVersion) ? source.schemaVersion : 1,
    displayName: toTrimmedString(source.displayName) || toTrimmedString(productCategoryName),
    sourceCategoryName:
      toTrimmedString(source.sourceCategoryName) || toTrimmedString(productCategoryName),
    selectedMediumCategories,
    representativeMediumCategory:
      representativeMediumCategory && selectedMediumCategories.includes(representativeMediumCategory)
        ? representativeMediumCategory
        : selectedMediumCategories[0] || '',
    layoutStyle: {
      variant: toTrimmedString(source.layoutStyle?.variant) || 'card-grid',
    },
    cardDesign: {
      visibleFields: normalizeCardFields(sourceCardDesign.visibleFields),
      style: normalizeCardStyle(sourceCardDesign.style),
    },
  };
}

export function normalizeCategoryConfigRow(row) {
  const productCategoryName = toTrimmedString(row?.productCategoryName ?? row?.product_category_name);

  return {
    officeCode: toTrimmedString(row?.officeCode ?? row?.office_code),
    productCategoryName,
    sortOrder: Number.isFinite(Number(row?.sortOrder ?? row?.sort_order))
      ? Number(row?.sortOrder ?? row?.sort_order)
      : 0,
    categoryConfig: normalizeCategoryConfig(row?.categoryConfig ?? row?.category_config, productCategoryName),
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
  };
}

export function findCategoryConfigRow(categoryConfigs, productCategoryName) {
  const normalizedProductCategoryName = toTrimmedString(productCategoryName);

  return (Array.isArray(categoryConfigs) ? categoryConfigs : []).find(
    (row) => toTrimmedString(row?.productCategoryName) === normalizedProductCategoryName,
  );
}

export function deriveProductCategoryOptions(productEntries, existingConfig) {
  const draftedNames = new Set(
    (Array.isArray(existingConfig?.categoryConfigs) ? existingConfig.categoryConfigs : [])
      .map((row) => toTrimmedString(row?.productCategoryName))
      .filter(Boolean),
  );

  return (Array.isArray(productEntries) ? productEntries : []).map((entry) => ({
    categoryName: toTrimmedString(entry?.categoryName),
    rowCount: Number.isFinite(entry?.rowCount) ? entry.rowCount : 0,
    hasDraft: draftedNames.has(toTrimmedString(entry?.categoryName)),
  }));
}

export function deriveMediumCategoryOptions(rows) {
  const options = uniqueStrings(
    (Array.isArray(rows) ? rows : []).map((row) => normalizeMediumCategory(row?.medium_category)),
  );

  return options;
}

export function resolveCategoryDraft({
  productCategoryName,
  productEntries,
  existingConfig,
}) {
  const entry = (Array.isArray(productEntries) ? productEntries : []).find(
    (candidate) => toTrimmedString(candidate?.categoryName) === toTrimmedString(productCategoryName),
  );
  const mediumCategoryOptions = deriveMediumCategoryOptions(entry?.rows);
  const existingRow = findCategoryConfigRow(existingConfig?.categoryConfigs, productCategoryName);
  const existingCategoryConfig = normalizeCategoryConfig(existingRow?.categoryConfig, productCategoryName);
  const selectedMediumCategories = uniqueStrings(mediumCategoryOptions);
  const representativeMediumCategory =
    existingCategoryConfig.representativeMediumCategory &&
    selectedMediumCategories.includes(existingCategoryConfig.representativeMediumCategory)
      ? existingCategoryConfig.representativeMediumCategory
      : selectedMediumCategories[0] || mediumCategoryOptions[0] || '';

  return {
    entry: entry ?? null,
    mediumCategoryOptions,
    selectedMediumCategories,
    representativeMediumCategory,
    cardFields: normalizeCardFields(existingCategoryConfig.cardDesign.visibleFields),
    cardStyle: normalizeCardStyle(existingCategoryConfig.cardDesign.style),
  };
}

export function buildCategoryConfigRow({
  productCategoryName,
  existingConfig,
  selectedMediumCategories,
  representativeMediumCategory,
  cardFields,
  cardStyle,
}) {
  const normalizedProductCategoryName = toTrimmedString(productCategoryName);
  const existingRow = findCategoryConfigRow(existingConfig?.categoryConfigs, normalizedProductCategoryName);
  const nextCategoryConfig = normalizeCategoryConfig(
    {
      ...(existingRow?.categoryConfig ?? {}),
      displayName: normalizedProductCategoryName,
      sourceCategoryName: normalizedProductCategoryName,
      selectedMediumCategories,
      representativeMediumCategory,
      layoutStyle: {
        variant: existingRow?.categoryConfig?.layoutStyle?.variant || 'card-grid',
      },
      cardDesign: {
        visibleFields: cardFields,
        style: cardStyle,
      },
    },
    normalizedProductCategoryName,
  );

  return {
    productCategoryName: normalizedProductCategoryName,
    sortOrder:
      existingRow?.sortOrder ??
      (Array.isArray(existingConfig?.categoryConfigs) ? existingConfig.categoryConfigs.length : 0),
    categoryConfig: nextCategoryConfig,
  };
}

export function mergeCategoryConfigRows(existingRows, nextRow) {
  const rows = (Array.isArray(existingRows) ? existingRows : [])
    .map((row) => normalizeCategoryConfigRow(row))
    .filter((row) => row.productCategoryName);
  const normalizedNextRow = normalizeCategoryConfigRow(nextRow);
  const nextRows = rows.filter(
    (row) => row.productCategoryName !== normalizedNextRow.productCategoryName,
  );

  nextRows.push(normalizedNextRow);

  return nextRows
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((row, index) => ({
      productCategoryName: row.productCategoryName,
      sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : index,
      categoryConfig: row.categoryConfig,
    }));
}

export function flattenProductEntries(productEntries) {
  return (Array.isArray(productEntries) ? productEntries : []).flatMap((entry) =>
    (Array.isArray(entry?.rows) ? entry.rows : []).map((row) => ({
      ...(row ?? {}),
      product_category_name: toTrimmedString(row?.product_category_name) || toTrimmedString(entry?.categoryName),
    })),
  );
}

export function buildStorefrontSavePayload({
  officeCode,
  existingConfig,
  hiddenProducts,
  selectedProductCategoryName,
  selectedMediumCategories,
  representativeMediumCategory,
  cardStyle,
  cardFields,
  navConfig,
  designDirection,
}) {
  const basePageConfig = normalizePageConfig(existingConfig?.pageConfig);
  const resolvedNavConfig = normalizeNavConfig({ ...(existingConfig?.navConfig ?? {}), ...(navConfig ?? {}) });
  const nextDesignDirection = normalizeDesignDirection(designDirection ?? basePageConfig.designDirection);
  const nextPageConfig = normalizePageConfig({
    ...basePageConfig,
    designDirection: nextDesignDirection,
    theme: {
      ...basePageConfig.theme,
      brandColor: resolvedNavConfig.brandColor,
      backgroundTone: STOREFRONT_BACKGROUND_TONES[nextDesignDirection],
    },
    nav: {
      ...basePageConfig.nav,
      title: resolvedNavConfig.title,
      subtitle: resolvedNavConfig.subtitle,
      logoUrl: resolvedNavConfig.logoUrl,
    },
    searchSection: {
      ...basePageConfig.searchSection,
      placeholder: resolvedNavConfig.searchPlaceholder,
      variant: resolvedNavConfig.searchVariant,
    },
    categoryChips: {
      ...basePageConfig.categoryChips,
      variant: resolvedNavConfig.categoryChipVariant,
    },
  });
  const nextCategoryRow = buildCategoryConfigRow({
    productCategoryName: selectedProductCategoryName,
    existingConfig,
    selectedMediumCategories,
    representativeMediumCategory,
    cardFields: normalizeCardFields(cardFields),
    cardStyle: normalizeCardStyle(cardStyle),
  });

  return {
    officeCode,
    navConfig: resolvedNavConfig,
    pageConfig: nextPageConfig,
    categoryConfigs: mergeCategoryConfigRows(existingConfig?.categoryConfigs, nextCategoryRow),
    hiddenProducts: Array.isArray(hiddenProducts) ? hiddenProducts : [],
  };
}
