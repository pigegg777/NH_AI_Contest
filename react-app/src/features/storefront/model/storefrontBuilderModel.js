import { toTrimmedString } from '../../../common/utils/text';
import { DEFAULT_CARD_STYLE, normalizeCardStyle } from './cardStyleModel';
import { DEFAULT_PAGE_STYLE, normalizePageStyle } from './pageStyleModel';
import {
  buildDefaultMobileUiTree,
  deriveCardElementConfig,
  normalizeCardElementConfig,
  normalizeMobileUiTree,
} from './storefrontUiModel';

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
  product_name: '상품명',
  spec: '규격',
  large_category: '대분류',
  medium_category: '중분류',
  small_category: '소분류',
  detail_category: '세부 분류',
  nutrient: '주요 성분',
  product_url: '상품 링크',
  tax_price: '과세가격',
  zero_tax_price: '영세가격',
  note: '비고',
  sale_price_type_name: '가격 유형',
  exempt_tax_price: '면세가격',
  price_subsidy: '보조금',
  product_nutirent: '성분',
  indict_symbl: '작용기작',
  product_usage: '작물별 용도',
};

// 상품명 -> 규격 -> 가격(영세/과세/면세/보조금) -> 분류(대/중/소/세) -> 성분 -> 링크
export const STOREFRONT_FIELD_DISPLAY_ORDER = [
  'product_name',
  'spec',
  'zero_tax_price',
  'tax_price',
  'exempt_tax_price',
  'price_subsidy',
  'large_category',
  'medium_category',
  'small_category',
  'detail_category',
  'nutrient',
  'product_nutirent',
  'product_url',
];

export function sortFieldKeysByDisplayOrder(keys) {
  const list = Array.isArray(keys) ? keys : [];

  return [...list].sort((a, b) => {
    const aIdx = STOREFRONT_FIELD_DISPLAY_ORDER.indexOf(a);
    const bIdx = STOREFRONT_FIELD_DISPLAY_ORDER.indexOf(b);

    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });
}

export const STOREFRONT_FIELD_TABLE_HIDDEN_KEYS = new Set([
  'sale_price_type_code',
  'product_type_variants',
  'product_category_name',
  'product_code',
  'warnings',
  'shadow',
  'row_id',
]);

export function isScalarFieldValue(value) {
  if (value === null || value === undefined || value === '') return true;
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}

export function collectCategoryFieldKeys(rows) {
  const keySet = new Set();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      Object.keys(row).forEach((key) => keySet.add(key));
    }
  });

  return [...keySet];
}

function getFieldExampleValue(key, rows) {
  for (const row of Array.isArray(rows) ? rows : []) {
    const value = row?.[key];

    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }

  return null;
}

function isFieldKeySelectable(key, rows) {
  for (const row of Array.isArray(rows) ? rows : []) {
    const value = row?.[key];

    if (value !== null && value !== undefined && value !== '' && !isScalarFieldValue(value)) {
      return false;
    }
  }

  return true;
}

export function deriveAvailableCategoryFields(rows) {
  const keys = sortFieldKeysByDisplayOrder(
    collectCategoryFieldKeys(rows).filter((key) => !STOREFRONT_FIELD_TABLE_HIDDEN_KEYS.has(key)),
  );

  return keys.map((key) => ({
    key,
    label: STOREFRONT_FIELD_LABELS[key] || key,
    exampleValue: getFieldExampleValue(key, rows),
    isSelectable: isFieldKeySelectable(key, rows),
  }));
}

export const DEFAULT_NAV_CONFIG = {
  title: '',
  subtitle: '',
  brandColor: DEFAULT_CARD_STYLE.accentColor,
  searchPlaceholder: '상품 검색',
  logoUrl: '',
  searchVariant: 'pill',
  categoryChipVariant: 'soft',
};

export const STOREFRONT_DESIGN_DIRECTIONS = [
  { id: 'friendly', label: '친근함', description: '처음 방문한 고객도 편하게 둘러볼 수 있는 깔끔한 분위기.' },
  { id: 'warm', label: '따뜻함', description: '이야기가 느껴지는 부드럽고 정감 있는 분위기.' },
  { id: 'green', label: '그린', description: '농산물·비료 등 상품 중심의 자연스러운 분위기.' },
  { id: 'trust', label: '신뢰', description: '관공서 페이지에 어울리는 정돈되고 신뢰감 있는 분위기.' },
  { id: 'white', label: '화이트', description: '강조 색 없이 깔끔한 기본 화이트 테마.' },
];

export const STOREFRONT_BACKGROUND_TONES = {
  friendly: 'mint',
  warm: 'apricot',
  green: 'forest',
  trust: 'sky',
  white: 'paper',
};

export const STOREFRONT_DESIGN_ACCENT_COLORS = {
  friendly: '#2f9e6e',
  warm: '#ea580c',
  green: '#1d4a2e',
  trust: '#2563eb',
  white: '#52525b',
};

export const TITLE_TEXT_COLOR_OPTIONS = ['default', 'ink', 'charcoal', 'brand'];

export const TITLE_TEXT_COLOR_VALUES = {
  default: '#173223',
  ink: '#0f172a',
  charcoal: '#27272a',
};

export function resolveTitleTextColor(titleTextColor, brandColor) {
  if (titleTextColor === 'brand') {
    return brandColor || TITLE_TEXT_COLOR_VALUES.default;
  }

  return TITLE_TEXT_COLOR_VALUES[titleTextColor] || TITLE_TEXT_COLOR_VALUES.default;
}

export const TYPOGRAPHY_TONE_OPTIONS = ['standard', 'clean', 'soft', 'bold', 'official'];

export const TYPOGRAPHY_TONE_VALUES = {
  standard: { headingWeight: 800, bodyWeight: 600, letterSpacing: 'normal' },
  clean: { headingWeight: 700, bodyWeight: 500, letterSpacing: '0.01em' },
  soft: { headingWeight: 600, bodyWeight: 500, letterSpacing: 'normal' },
  bold: { headingWeight: 800, bodyWeight: 700, letterSpacing: '-0.01em' },
  official: { headingWeight: 700, bodyWeight: 600, letterSpacing: '0.02em' },
};

export const CARD_TEMPLATE_OPTIONS = ['card-grid', 'image-left', 'price-focus', 'compact-list', 'detail-first'];

export const DEFAULT_PAGE_CONFIG = {
  schemaVersion: 1,
  designDirection: 'friendly',
  pageStyle: DEFAULT_PAGE_STYLE,
  theme: {
    brandColor: DEFAULT_CARD_STYLE.accentColor,
    backgroundTone: STOREFRONT_BACKGROUND_TONES.friendly,
    titleTextColor: 'default',
    typographyTone: 'standard',
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
  mobileUiTree: buildDefaultMobileUiTree(),
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

export function normalizeCardFields(fields, allowedScalarKeys) {
  if (Array.isArray(allowedScalarKeys) && allowedScalarKeys.length > 0) {
    const nextFields = Array.isArray(fields)
      ? fields.filter((field, index) => allowedScalarKeys.includes(field) && fields.indexOf(field) === index)
      : [];

    if (nextFields.length > 0) return nextFields;

    const fallback = DEFAULT_CARD_FIELDS.filter((f) => allowedScalarKeys.includes(f));
    return fallback.length > 0 ? fallback : [allowedScalarKeys[0]];
  }

  const nextFields = Array.isArray(fields)
    ? fields.filter(
        (field, index) =>
          typeof field === 'string' && field.trim() !== '' && fields.indexOf(field) === index,
      )
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
  const isSearchEnabled = sourceSearchSection.enabled ?? true;
  const areCategoryChipsEnabled = sourceCategoryChips.enabled ?? true;

  return {
    schemaVersion: Number.isFinite(source.schemaVersion) ? source.schemaVersion : DEFAULT_PAGE_CONFIG.schemaVersion,
    designDirection,
    pageStyle: normalizePageStyle(source.pageStyle),
    theme: {
      brandColor: toTrimmedString(sourceTheme.brandColor) || DEFAULT_PAGE_CONFIG.theme.brandColor,
      backgroundTone:
        toTrimmedString(sourceTheme.backgroundTone) || STOREFRONT_BACKGROUND_TONES[designDirection],
      titleTextColor: TITLE_TEXT_COLOR_OPTIONS.includes(sourceTheme.titleTextColor)
        ? sourceTheme.titleTextColor
        : DEFAULT_PAGE_CONFIG.theme.titleTextColor,
      typographyTone: TYPOGRAPHY_TONE_OPTIONS.includes(sourceTheme.typographyTone)
        ? sourceTheme.typographyTone
        : DEFAULT_PAGE_CONFIG.theme.typographyTone,
    },
    nav: {
      title: toTrimmedString(sourceNav.title),
      subtitle: toTrimmedString(sourceNav.subtitle),
      logoUrl: toTrimmedString(sourceNav.logoUrl),
    },
    searchSection: {
      enabled: isSearchEnabled,
      placeholder: toTrimmedString(sourceSearchSection.placeholder) || DEFAULT_PAGE_CONFIG.searchSection.placeholder,
      variant: ['pill', 'outlined', 'soft'].includes(sourceSearchSection.variant)
        ? sourceSearchSection.variant
        : DEFAULT_PAGE_CONFIG.searchSection.variant,
    },
    categoryChips: {
      enabled: areCategoryChipsEnabled,
      sticky: sourceCategoryChips.sticky ?? true,
      variant: ['filled', 'outline', 'soft'].includes(sourceCategoryChips.variant)
        ? sourceCategoryChips.variant
        : DEFAULT_PAGE_CONFIG.categoryChips.variant,
    },
    mobileUiTree: normalizeMobileUiTree(source.mobileUiTree, {
      searchEnabled: isSearchEnabled,
      categoryChipsEnabled: areCategoryChipsEnabled,
    }),
  };
}

export function normalizeCategoryConfig(categoryConfig, productCategoryName = '', allowedScalarKeys) {
  const source = categoryConfig ?? {};
  const sourceCardDesign = source.cardDesign ?? {};
  const normalizedCardStyle = normalizeCardStyle(sourceCardDesign.style);
  const normalizedCardFields = normalizeCardFields(sourceCardDesign.visibleFields, allowedScalarKeys);
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
      variant: CARD_TEMPLATE_OPTIONS.includes(source.layoutStyle?.variant) ? source.layoutStyle.variant : 'card-grid',
    },
    cardDesign: {
      visibleFields: normalizedCardFields,
      style: normalizedCardStyle,
      elementConfig: normalizeCardElementConfig(
        sourceCardDesign.elementConfig ??
          deriveCardElementConfig(normalizedCardFields, normalizedCardStyle, sourceCardDesign.elementConfig),
      ),
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
  const rows = Array.isArray(entry?.rows) ? entry.rows : [];
  const availableFields = deriveAvailableCategoryFields(rows);
  const availableScalarKeys = availableFields.filter((f) => f.isSelectable).map((f) => f.key);
  const effectiveScalarKeys = availableScalarKeys.length > 0 ? availableScalarKeys : undefined;
  const mediumCategoryOptions = deriveMediumCategoryOptions(entry?.rows);
  const existingRow = findCategoryConfigRow(existingConfig?.categoryConfigs, productCategoryName);
  const existingCategoryConfig = normalizeCategoryConfig(existingRow?.categoryConfig, productCategoryName, effectiveScalarKeys);
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
    cardFields: normalizeCardFields(existingCategoryConfig.cardDesign.visibleFields, effectiveScalarKeys),
    cardStyle: normalizeCardStyle(existingCategoryConfig.cardDesign.style),
    cardElementConfig: normalizeCardElementConfig(existingCategoryConfig.cardDesign.elementConfig),
    cardTemplate: existingCategoryConfig.layoutStyle.variant,
  };
}

export function buildCategoryConfigRow({
  productCategoryName,
  existingConfig,
  selectedMediumCategories,
  representativeMediumCategory,
  cardFields,
  cardStyle,
  cardElementConfig,
  cardTemplate,
  allowedScalarKeys,
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
        variant: CARD_TEMPLATE_OPTIONS.includes(cardTemplate)
          ? cardTemplate
          : existingRow?.categoryConfig?.layoutStyle?.variant || 'card-grid',
      },
      cardDesign: {
        visibleFields: cardFields,
        style: cardStyle,
        elementConfig: cardElementConfig,
      },
    },
    normalizedProductCategoryName,
    allowedScalarKeys,
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
  cardElementConfig,
  navConfig,
  designDirection,
  titleTextColor,
  typographyTone,
  mobileUiTree,
  cardTemplate,
  aiDesign,
  pageStyle,
  allowedScalarKeys,
}) {
  const basePageConfig = normalizePageConfig(existingConfig?.pageConfig);
  const resolvedNavConfig = normalizeNavConfig({ ...(existingConfig?.navConfig ?? {}), ...(navConfig ?? {}) });
  const nextDesignDirection = normalizeDesignDirection(designDirection ?? basePageConfig.designDirection);
  const nextMobileUiTree = normalizeMobileUiTree(mobileUiTree ?? basePageConfig.mobileUiTree, {
    searchEnabled: basePageConfig.searchSection.enabled,
    categoryChipsEnabled: basePageConfig.categoryChips.enabled,
  });
  const searchBlock = nextMobileUiTree.find((block) => block.type === 'searchBox');
  const categoryChipsBlock = nextMobileUiTree.find((block) => block.type === 'categoryChips');
  const nextPageConfig = normalizePageConfig({
    ...basePageConfig,
    designDirection: nextDesignDirection,
    pageStyle: pageStyle ?? basePageConfig.pageStyle,
    theme: {
      ...basePageConfig.theme,
      brandColor: resolvedNavConfig.brandColor,
      backgroundTone: STOREFRONT_BACKGROUND_TONES[nextDesignDirection],
      titleTextColor: TITLE_TEXT_COLOR_OPTIONS.includes(titleTextColor) ? titleTextColor : basePageConfig.theme.titleTextColor,
      typographyTone: TYPOGRAPHY_TONE_OPTIONS.includes(typographyTone) ? typographyTone : basePageConfig.theme.typographyTone,
    },
    nav: {
      ...basePageConfig.nav,
      title: resolvedNavConfig.title,
      subtitle: resolvedNavConfig.subtitle,
      logoUrl: resolvedNavConfig.logoUrl,
    },
    searchSection: {
      ...basePageConfig.searchSection,
      enabled: searchBlock ? searchBlock.enabled : basePageConfig.searchSection.enabled,
      placeholder: resolvedNavConfig.searchPlaceholder,
      variant: resolvedNavConfig.searchVariant,
    },
    categoryChips: {
      ...basePageConfig.categoryChips,
      enabled: categoryChipsBlock ? categoryChipsBlock.enabled : basePageConfig.categoryChips.enabled,
      variant: resolvedNavConfig.categoryChipVariant,
    },
    mobileUiTree: nextMobileUiTree,
  });
  const nextCategoryRow = buildCategoryConfigRow({
    productCategoryName: selectedProductCategoryName,
    existingConfig,
    selectedMediumCategories,
    representativeMediumCategory,
    cardFields: normalizeCardFields(cardFields, allowedScalarKeys),
    cardStyle: normalizeCardStyle(cardStyle),
    cardElementConfig: normalizeCardElementConfig(cardElementConfig),
    cardTemplate,
    allowedScalarKeys,
  });

  return {
    officeCode,
    navConfig: resolvedNavConfig,
    pageConfig: nextPageConfig,
    categoryConfigs: mergeCategoryConfigRows(existingConfig?.categoryConfigs, nextCategoryRow),
    hiddenProducts: Array.isArray(hiddenProducts) ? hiddenProducts : [],
  };
}
