import { toTrimmedString } from '../../../../common/utils/text';
import {
  DEFAULT_CARD_FIELDS,
  deriveEffectiveScalarKeys,
} from './storefrontBuilderModel';

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

export function buildUniqueMediumCategories(products) {
  const seen = new Set();
  const values = [];

  for (const product of Array.isArray(products) ? products : []) {
    const value = typeof product?.medium_category === 'string' ? product.medium_category.trim() : '';

    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    values.push(value);
  }

  return values;
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
    fields: deriveEffectiveScalarKeys(products) ?? DEFAULT_CARD_FIELDS,
    cardStyle: undefined,
    bodySlots: undefined,
    representativeMediumCategory: '',
    products,
  };
}

export function buildSections(categoryConfigs, productRows) {
  const rows = Array.isArray(productRows) ? productRows : [];

  const configuredSections = (Array.isArray(categoryConfigs) ? categoryConfigs : []).map(
    (categoryConfigRow) => {
      const categoryConfig = categoryConfigRow?.categoryConfig ?? {};
      const products = rows.filter((row) => matchesCategoryConfig(row, categoryConfigRow));

      return {
        title: categoryConfig.displayName || categoryConfigRow?.productCategoryName || 'Products',
        productCategoryName: categoryConfigRow?.productCategoryName || '',
        description: categoryConfig.description || '',
        fields: categoryConfig.cardDesign?.visibleFields,
        cardStyle: categoryConfig.cardDesign?.cardStyle,
        bodySlots: categoryConfig.cardDesign?.bodySlots,
        representativeMediumCategory: categoryConfig.representativeMediumCategory || '',
        products,
      };
    },
  );

  // Appended after the configured ones so saving a storefront never reshuffles
  // the categories a shopper already knows the order of.
  const defaultSections = findUnconfiguredCategoryNames(categoryConfigs, rows).map((name) =>
    buildDefaultSection(name, rows),
  );

  return [...configuredSections, ...defaultSections].filter(
    (section) => section.products.length > 0,
  );
}
