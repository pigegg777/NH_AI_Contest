import { toTrimmedString } from '../../../../common/utils/text';
import { normalizeInformationEntries } from './informationEntriesModel';
import { withPesticideInfoLink } from '../view/pesticideInfoLinkModel';
import {
  DEFAULT_CARD_FIELDS,
  deriveEffectiveScalarKeys,
} from './storefrontConfigModel';

const PESTICIDE_LARGE_CATEGORY = '농약';
const CATEGORY_SORT_PRIORITY = new Map([
  ['비료', 0],
  [PESTICIDE_LARGE_CATEGORY, 1],
]);
const KOREAN_CATEGORY_COLLATOR = new Intl.Collator('ko-KR');

function compareSectionsByCategory(left, right) {
  const leftName = toTrimmedString(left?.productCategoryName || left?.title);
  const rightName = toTrimmedString(right?.productCategoryName || right?.title);
  const leftPriority = CATEGORY_SORT_PRIORITY.get(leftName) ?? 2;
  const rightPriority = CATEGORY_SORT_PRIORITY.get(rightName) ?? 2;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return KOREAN_CATEGORY_COLLATOR.compare(leftName, rightName);
}

function normalizeSpec(spec) {
  return spec === undefined || spec === null ? null : spec;
}

function normalizeMediumCategories(values) {
  return (Array.isArray(values) ? values : []).filter(
    (value, index, array) => typeof value === 'string' && value && array.indexOf(value) === index,
  );
}

function matchesCategoryConfig(productRow, categoryConfigRow) {
  const productCategoryName = categoryConfigRow?.productCategoryName || categoryConfigRow?.product_category_name;
  const categoryConfig = categoryConfigRow?.categoryConfig ?? categoryConfigRow?.category_config ?? {};
  const sourceCategoryName = categoryConfig.sourceCategoryName || productCategoryName;
  const selectedMediumCategories = normalizeMediumCategories(categoryConfig.selectedMediumCategories);

  if (sourceCategoryName && productRow?.product_category_name !== sourceCategoryName) {
    return false;
  }

  if (selectedMediumCategories.length > 0) {
    return selectedMediumCategories.includes(productRow?.medium_category ?? '');
  }

  return true;
}

function matchesProductRef(productRow, productRef) {
  if (!productRef || typeof productRef !== 'object' || Array.isArray(productRef)) {
    return false;
  }

  if (typeof productRef.product_name !== 'string' || !productRow) {
    return false;
  }

  if (productRow.product_name !== productRef.product_name) {
    return false;
  }

  return normalizeSpec(productRow.spec) === normalizeSpec(productRef.spec);
}

export function filterHiddenProducts(productRows, hiddenProducts) {
  const rows = Array.isArray(productRows) ? productRows : [];
  const hidden = Array.isArray(hiddenProducts) ? hiddenProducts : [];

  if (hidden.length === 0) {
    return rows;
  }

  return rows.filter((row) => !hidden.some((productRef) => matchesProductRef(row, productRef)));
}

/**
 * 칩은 언제나 medium_category 로 만든다. 다만 large_category 가 농약인
 * 중분류를 앞으로 모으고, 각 그룹은 가나다순으로 정렬한다.
 *
 * 같은 중분류가 여러 행에 걸쳐 있으면 그중 하나라도 농약이면 농약으로 본다.
 */
export function buildUniqueMediumCategories(products) {
  const rows = Array.isArray(products) ? products : [];
  const pesticideMediumCategories = new Set();
  const seen = new Set();
  const ordered = [];

  for (const product of rows) {
    const value = toTrimmedString(product?.medium_category);

    if (!value) {
      continue;
    }

    if (toTrimmedString(product?.large_category) === PESTICIDE_LARGE_CATEGORY) {
      pesticideMediumCategories.add(value);
    }

    if (!seen.has(value)) {
      seen.add(value);
      ordered.push(value);
    }
  }

  return [
    ...ordered
      .filter((value) => pesticideMediumCategories.has(value))
      .sort(KOREAN_CATEGORY_COLLATOR.compare),
    ...ordered
      .filter((value) => !pesticideMediumCategories.has(value))
      .sort(KOREAN_CATEGORY_COLLATOR.compare),
  ];
}

/**
 * Product categories that have rows but no categoryConfig yet. Nothing in the
 * builder can mark a category as "do not publish", so a missing config only ever
 * means the merchant has not opened it in the storefront builder — not that they
 * chose to hide it. Left out, newly uploaded data is silently invisible to
 * shoppers until someone remembers to go and save the storefront.
 */
function findUnconfiguredCategoryNames(categoryConfigs, rows) {
  const configured = new Set(
    (Array.isArray(categoryConfigs) ? categoryConfigs : [])
      .map((row) => toTrimmedString(row?.productCategoryName || row?.product_category_name))
      .filter(Boolean),
  );
  const seen = new Set();
  const names = [];

  for (const row of rows) {
    const name = toTrimmedString(row?.product_category_name);

    if (!name || configured.has(name) || seen.has(name)) {
      continue;
    }

    seen.add(name);
    names.push(name);
  }

  return names;
}

/**
 * The default a category gets before anyone configures it: every scalar field
 * the rows actually carry, which is the same fallback normalizeCardFields
 * applies inside the builder.
 */
function buildDefaultSection(productCategoryName, rows) {
  const products = rows.filter(
    (row) => toTrimmedString(row?.product_category_name) === productCategoryName,
  );

  return {
    title: productCategoryName,
    productCategoryName,
    description: '',
    infoEntries: [],
    fields: deriveEffectiveScalarKeys(products) ?? DEFAULT_CARD_FIELDS,
    cardStyle: undefined,
    bodySlots: undefined,
    representativeMediumCategory: '',
    products,
  };
}

export function buildSections(categoryConfigs, productRows) {
  const rows = (Array.isArray(productRows) ? productRows : []).map(withPesticideInfoLink);

  const configuredSections = (Array.isArray(categoryConfigs) ? categoryConfigs : []).map(
    (categoryConfigRow) => {
      const categoryConfig = categoryConfigRow?.categoryConfig ?? {};
      const products = rows.filter((row) => matchesCategoryConfig(row, categoryConfigRow));

      return {
        title: categoryConfig.displayName || categoryConfigRow?.productCategoryName || 'Products',
        productCategoryName: categoryConfigRow?.productCategoryName || '',
        description: categoryConfig.description || '',
        infoEntries: normalizeInformationEntries(categoryConfig.info, {
          legacyText: categoryConfig.description,
        }),
        fields: categoryConfig.cardDesign?.visibleFields,
        cardStyle: categoryConfig.cardDesign?.cardStyle,
        bodySlots: categoryConfig.cardDesign?.bodySlots,
        representativeMediumCategory: categoryConfig.representativeMediumCategory || '',
        products,
      };
    },
  );

  const defaultSections = findUnconfiguredCategoryNames(categoryConfigs, rows).map((name) =>
    buildDefaultSection(name, rows),
  );

  return [...configuredSections, ...defaultSections]
    .filter((section) => section.products.length > 0)
    .sort(compareSectionsByCategory);
}
