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

export function matchesProductRef(productRow, productRef) {
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

export function buildSections(categoryConfigs, productRows) {
  const rows = Array.isArray(productRows) ? productRows : [];

  return (Array.isArray(categoryConfigs) ? categoryConfigs : [])
    .map((categoryConfigRow) => {
      const categoryConfig = categoryConfigRow?.categoryConfig ?? {};
      const products = rows.filter((row) => matchesCategoryConfig(row, categoryConfigRow));

      return {
        title: categoryConfig.displayName || categoryConfigRow?.productCategoryName || 'Products',
        productCategoryName: categoryConfigRow?.productCategoryName || '',
        displayVariant: categoryConfig.layoutStyle?.variant || 'card-grid',
        fields: categoryConfig.cardDesign?.visibleFields,
        style: categoryConfig.cardDesign?.style,
        elementConfig: categoryConfig.cardDesign?.elementConfig,
        representativeMediumCategory: categoryConfig.representativeMediumCategory || '',
        products,
      };
    })
    .filter((section) => section.products.length > 0);
}
