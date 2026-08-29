import { toTrimmedString } from '../../../../common/utils/text';
import { categoryConfigNeedsCardStyleMigration, migrateLegacyCategoryConfigToCardStyle } from '../card-style/cardStyleMigration';
import { normalizeCardStyle } from '../card-style/cardStyleModel';
import { DEFAULT_PAGE_STYLE, normalizePageStyle } from '../page-style/pageStyleModel';
import {
  normalizeInformationEntries,
  replaceLegacyInformationEntry,
} from './informationEntriesModel';
import { buildDefaultMobileUiTree, normalizeMobileUiTree } from './mobileUiTreeModel';

export const DEFAULT_CARD_FIELDS = ['product_name', 'spec', 'nutrient', 'tax_price'];

export const STOREFRONT_FIELD_LABELS = {
  product_name: '상품명',
  img_url: '상품 이미지',
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
  nutirent: '성분',
  indict_symbl: '작용기작',
  product_usage: '작물별 용도',
  product_category: '용도',
  manufacturer_list: '업체',
};

// 상품명 -> 이미지 -> 규격 -> 가격(영세/과세/면세/보조금) -> 분류(대/중/소/세) -> 성분 -> 링크
export const STOREFRONT_FIELD_DISPLAY_ORDER = [
  'product_name',
  'img_url',
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
  'nutirent',
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

const STOREFRONT_FIELD_TABLE_HIDDEN_KEYS = new Set([
  'sale_price_type_code',
  'product_type_variants',
  'product_category_name',
  'product_code',
  'warnings',
  'shadow',
  'row_id',
]);

function isScalarFieldValue(value) {
  if (value === null || value === undefined || value === '') return true;
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}

function collectCategoryFieldKeys(rows) {
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

// Structured fields the card-render layer already knows how to flatten into text
// (see cardFieldRenderModel.js), so they're selectable despite failing the scalar check.
const STRUCTURED_FIELD_KEYS_WITH_DISPLAY_SUPPORT = new Set(['manufacturer_list']);

function isFieldKeySelectable(key, rows) {
  if (STRUCTURED_FIELD_KEYS_WITH_DISPLAY_SUPPORT.has(key)) {
    return true;
  }

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

export function deriveEffectiveScalarKeys(rows) {
  const scalarKeys = deriveAvailableCategoryFields(rows)
    .filter((field) => field.isSelectable)
    .map((field) => field.key);

  return scalarKeys.length > 0 ? scalarKeys : undefined;
}

export const DEFAULT_NAV_CONFIG = {
  title: '',
  subtitle: '',
  brandColor: DEFAULT_PAGE_STYLE.palette.accentHex,
  searchPlaceholder: '찾으시는 자재를 입력하세요',
  logoUrl: '',
  searchVariant: 'pill',
};

export const DEFAULT_PAGE_CONFIG = {
  schemaVersion: 1,
  pageStyle: DEFAULT_PAGE_STYLE,
  theme: {
    brandColor: DEFAULT_PAGE_STYLE.palette.accentHex,
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
  },
  mobileUiTree: buildDefaultMobileUiTree(),
};

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
  };
}

export function normalizeCardFields(fields, allowedScalarKeys) {
  const hasAllowedKeys = Array.isArray(allowedScalarKeys) && allowedScalarKeys.length > 0;
  let nextFields;

  if (hasAllowedKeys) {
    nextFields = Array.isArray(fields)
      ? fields.filter((field, index) => allowedScalarKeys.includes(field) && fields.indexOf(field) === index)
      : [];

    if (nextFields.length === 0) {
      nextFields = allowedScalarKeys;
    }
  } else {
    nextFields = Array.isArray(fields)
      ? fields.filter(
          (field, index) => typeof field === 'string' && field.trim() !== '' && fields.indexOf(field) === index,
        )
      : [];

    if (nextFields.length === 0) {
      nextFields = DEFAULT_CARD_FIELDS;
    }
  }

  const isProductNameAllowed = !hasAllowedKeys || allowedScalarKeys.includes('product_name');
  const withMandatoryField =
    isProductNameAllowed && !nextFields.includes('product_name') ? ['product_name', ...nextFields] : nextFields;

  return sortFieldKeysByDisplayOrder(withMandatoryField);
}

export function normalizePageConfig(pageConfig) {
  const source = pageConfig ?? {};
  const sourceTheme = source.theme ?? {};
  const sourceNav = source.nav ?? {};
  const sourceSearchSection = source.searchSection ?? {};
  const sourceCategoryChips = source.categoryChips ?? {};
  const isSearchEnabled = sourceSearchSection.enabled ?? true;
  const areCategoryChipsEnabled = sourceCategoryChips.enabled ?? true;

  return {
    schemaVersion: Number.isFinite(source.schemaVersion) ? source.schemaVersion : DEFAULT_PAGE_CONFIG.schemaVersion,
    pageStyle: normalizePageStyle(source.pageStyle),
    theme: {
      brandColor: toTrimmedString(sourceTheme.brandColor) || DEFAULT_PAGE_CONFIG.theme.brandColor,
    },
    nav: {
      title: toTrimmedString(sourceNav.title),
      subtitle: toTrimmedString(sourceNav.subtitle),
      logoUrl: toTrimmedString(sourceNav.logoUrl),
    },
    officeInfo: normalizeInformationEntries(source.officeInfo, {
      legacyText: sourceNav.subtitle,
    }),
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
  const normalizedCardStyle = categoryConfigNeedsCardStyleMigration(source)
    ? migrateLegacyCategoryConfigToCardStyle(source)
    : normalizeCardStyle(sourceCardDesign.cardStyle);
  const normalizedCardFields = normalizeCardFields(sourceCardDesign.visibleFields, allowedScalarKeys);
  const bodySlots = Array.isArray(sourceCardDesign.bodySlots) ? sourceCardDesign.bodySlots : [];
  const selectedMediumCategories = uniqueStrings(
    (Array.isArray(source.selectedMediumCategories) ? source.selectedMediumCategories : []).map(normalizeMediumCategory),
  );
  const representativeMediumCategory = normalizeMediumCategory(source.representativeMediumCategory);

  return {
    schemaVersion: Number.isFinite(source.schemaVersion) ? source.schemaVersion : 1,
    displayName: toTrimmedString(source.displayName) || toTrimmedString(productCategoryName),
    sourceCategoryName:
      toTrimmedString(source.sourceCategoryName) || toTrimmedString(productCategoryName),
    description: typeof source.description === 'string' ? toTrimmedString(source.description) : '',
    info: normalizeInformationEntries(source.info, { legacyText: source.description }),
    selectedMediumCategories,
    representativeMediumCategory:
      representativeMediumCategory && selectedMediumCategories.includes(representativeMediumCategory)
        ? representativeMediumCategory
        : selectedMediumCategories[0] || '',
    cardDesign: {
      visibleFields: normalizedCardFields,
      cardStyle: normalizedCardStyle,
      bodySlots,
    },
  };
}

export function normalizeCategoryConfigRow(row) {
  const productCategoryName = toTrimmedString(row?.productCategoryName ?? row?.product_category_name);

  return {
    productCategoryName,
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

function deriveMediumCategoryOptions(rows) {
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
  const effectiveScalarKeys = deriveEffectiveScalarKeys(rows);
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
    cardStyle: normalizeCardStyle(existingCategoryConfig.cardDesign.cardStyle),
    bodySlots: existingCategoryConfig.cardDesign.bodySlots,
  };
}

export function buildCategoryConfigRow({
  productCategoryName,
  existingConfig,
  selectedMediumCategories,
  representativeMediumCategory,
  cardFields,
  cardStyle,
  bodySlots,
  categoryDescription,
  categoryInfoEntries,
  allowedScalarKeys,
}) {
  const normalizedProductCategoryName = toTrimmedString(productCategoryName);
  const existingRow = findCategoryConfigRow(existingConfig?.categoryConfigs, normalizedProductCategoryName);
  const previousCategoryDescription = existingRow?.categoryConfig?.description;
  // 항목 목록을 명시적으로 받았다면 이 저장은 새 편집기가 낸 것이고, 그 목록이
  // 유일한 진실이다.
  const ownsCategoryInfo = categoryInfoEntries !== undefined;
  const nextCategoryInfoEntries = ownsCategoryInfo
    ? categoryInfoEntries
    : replaceLegacyInformationEntry(existingRow?.categoryConfig?.info, {
        previousLegacyText: previousCategoryDescription,
        nextLegacyText:
          categoryDescription === undefined
            ? previousCategoryDescription
            : categoryDescription,
      });
  // 옛 description 은 목록이 없던 시절 설정을 위한 읽기 폴백이다. 편집기가 목록을
  // 쓴 순간 할 일이 끝나므로 여기서 비운다. 남겨두면 normalizeCategoryConfig 가
  // 빈 목록을 보고 이 문자열로 항목을 되살려, 판매자가 마지막 항목을 지울 수 없다.
  const nextCategoryDescription = ownsCategoryInfo
    ? ''
    : categoryDescription === undefined
      ? previousCategoryDescription
      : categoryDescription;
  const nextCategoryConfig = normalizeCategoryConfig(
    {
      ...(existingRow?.categoryConfig ?? {}),
      displayName: normalizedProductCategoryName,
      sourceCategoryName: normalizedProductCategoryName,
      selectedMediumCategories,
      representativeMediumCategory,
      cardDesign: {
        visibleFields: cardFields,
        cardStyle,
        bodySlots,
      },
      description: nextCategoryDescription,
      info: nextCategoryInfoEntries,
    },
    normalizedProductCategoryName,
    allowedScalarKeys,
  );

  return {
    productCategoryName: normalizedProductCategoryName,
    categoryConfig: nextCategoryConfig,
  };
}

function mergeCategoryConfigRows(existingRows, nextRow) {
  const rows = (Array.isArray(existingRows) ? existingRows : [])
    .map((row) => normalizeCategoryConfigRow(row))
    .filter((row) => row.productCategoryName);
  const normalizedNextRow = normalizeCategoryConfigRow(nextRow);
  const existingIndex = rows.findIndex(
    (row) => row.productCategoryName === normalizedNextRow.productCategoryName,
  );

  if (existingIndex === -1) {
    rows.push(normalizedNextRow);
  } else {
    rows[existingIndex] = normalizedNextRow;
  }

  return rows.map((row) => ({
    productCategoryName: row.productCategoryName,
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

/**
 * 사무소 안내 목록과 옛 nav.subtitle 을 함께 정한다.
 *
 * 옛 문자열은 항목 목록이 생기기 전에 저장된 설정을 위한 읽기 폴백이다. 편집기가
 * 목록을 넘겼다면 그 목록이 유일한 진실이므로 문자열은 은퇴한다 — 남겨두면
 * normalizePageConfig 의 폴백이 빈 목록을 보고 그 문자열로 항목을 되살려, 판매자가
 * 마지막 항목을 지울 수 없다. 목록을 넘기지 않은 호출은 편집기가 건드린 적 없는
 * 설정이므로 폴백을 그대로 살려 둔다.
 *
 * 저장 경로와 미리보기가 규칙을 각자 구현하면 한쪽만 고쳐지므로 여기 한곳에 둔다.
 */
export function resolveOfficeInfoOwnership({
  savedOfficeInfo,
  navSubtitle,
  previousNavSubtitle = navSubtitle,
  officeInfoEntries,
}) {
  if (officeInfoEntries === undefined) {
    return {
      officeInfo: replaceLegacyInformationEntry(savedOfficeInfo, {
        previousLegacyText: previousNavSubtitle,
        nextLegacyText: navSubtitle,
      }),
      navSubtitle,
    };
  }

  return { officeInfo: officeInfoEntries, navSubtitle: '' };
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
  bodySlots,
  categoryDescription,
  officeInfoEntries,
  categoryInfoEntries,
  navConfig,
  mobileUiTree,
  pageStyle,
  allowedScalarKeys,
}) {
  const basePageConfig = normalizePageConfig(existingConfig?.pageConfig);
  const resolvedNavConfig = normalizeNavConfig({ ...(existingConfig?.navConfig ?? {}), ...(navConfig ?? {}) });
  const previousPageDescription =
    existingConfig?.navConfig?.subtitle ??
    existingConfig?.pageConfig?.nav?.subtitle ??
    basePageConfig.nav.subtitle;
  const { officeInfo: nextOfficeInfoEntries, navSubtitle: nextNavSubtitle } =
    resolveOfficeInfoOwnership({
      savedOfficeInfo: existingConfig?.pageConfig?.officeInfo,
      navSubtitle: resolvedNavConfig.subtitle,
      previousNavSubtitle: previousPageDescription,
      officeInfoEntries,
    });
  const nextNavConfig = { ...resolvedNavConfig, subtitle: nextNavSubtitle };
  const nextMobileUiTree = normalizeMobileUiTree(mobileUiTree ?? basePageConfig.mobileUiTree, {
    searchEnabled: basePageConfig.searchSection.enabled,
    categoryChipsEnabled: basePageConfig.categoryChips.enabled,
  });
  const searchBlock = nextMobileUiTree.find((block) => block.type === 'searchBox');
  const categoryChipsBlock = nextMobileUiTree.find((block) => block.type === 'categoryChips');
  const nextPageConfig = normalizePageConfig({
    ...basePageConfig,
    pageStyle: pageStyle ?? basePageConfig.pageStyle,
    theme: {
      ...basePageConfig.theme,
      brandColor: nextNavConfig.brandColor,
    },
    nav: {
      ...basePageConfig.nav,
      title: nextNavConfig.title,
      subtitle: nextNavConfig.subtitle,
      logoUrl: nextNavConfig.logoUrl,
    },
    officeInfo: nextOfficeInfoEntries,
    searchSection: {
      ...basePageConfig.searchSection,
      enabled: searchBlock ? searchBlock.enabled : basePageConfig.searchSection.enabled,
      placeholder: nextNavConfig.searchPlaceholder,
      variant: nextNavConfig.searchVariant,
    },
    categoryChips: {
      ...basePageConfig.categoryChips,
      enabled: categoryChipsBlock ? categoryChipsBlock.enabled : basePageConfig.categoryChips.enabled,
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
    bodySlots,
    categoryDescription,
    categoryInfoEntries,
    allowedScalarKeys,
  });

  return {
    officeCode,
    navConfig: nextNavConfig,
    pageConfig: nextPageConfig,
    categoryConfigs: mergeCategoryConfigRows(existingConfig?.categoryConfigs, nextCategoryRow),
    hiddenProducts: Array.isArray(hiddenProducts) ? hiddenProducts : [],
  };
}
