import supabase from '../../../../lib/supabaseClient';
import { toTrimmedString } from '../../../../common/utils/text';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export async function fetchOfficeConfigRows({ officeCode }) {
  const normalizedOfficeCode = toTrimmedString(officeCode);

  if (!normalizedOfficeCode) {
    return { officeRow: null, categoryRows: [] };
  }

  const { data: officeRow, error } = await supabase
    .from('office_page_config')
    .select('office_code, page_config, hidden_products, category_detail_config, updated_at')
    .eq('office_code', normalizedOfficeCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load storefront config.');
  }

  if (!officeRow) {
    return { officeRow: null, categoryRows: [] };
  }

  return { officeRow, categoryRows: toArray(officeRow.category_detail_config) };
}

/**
 * Drops one category's saved storefront design. Called when the category's product
 * data is deleted, so a later re-upload of the same name starts from the defaults
 * instead of inheriting the design of a category that no longer exists.
 */
export async function removeCategoryDetailConfig({ officeCode, categoryName }) {
  const normalizedOfficeCode = toTrimmedString(officeCode);
  const normalizedCategoryName = toTrimmedString(categoryName);

  if (!normalizedOfficeCode || !normalizedCategoryName) {
    return false;
  }

  const { data: officeRow, error: selectError } = await supabase
    .from('office_page_config')
    .select('category_detail_config')
    .eq('office_code', normalizedOfficeCode)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message || 'Failed to load storefront config.');
  }

  const categoryRows = toArray(officeRow?.category_detail_config);
  // Rows have carried both spellings of the name over time, so match on either.
  const nextCategoryRows = categoryRows.filter(
    (row) =>
      toTrimmedString(row?.product_category_name || row?.productCategoryName) !==
      normalizedCategoryName,
  );

  if (nextCategoryRows.length === categoryRows.length) {
    return false;
  }

  const { error } = await supabase
    .from('office_page_config')
    .update({ category_detail_config: nextCategoryRows })
    .eq('office_code', normalizedOfficeCode);

  if (error) {
    throw new Error(error.message || 'Failed to save storefront config.');
  }

  return true;
}

export async function saveOfficeConfigRows({
  officeCode,
  pageConfigPayload,
  hiddenProducts,
  categoryRows,
}) {
  const normalizedOfficeCode = toTrimmedString(officeCode);

  if (!normalizedOfficeCode) {
    throw new Error('officeCode is required.');
  }

  const { error } = await supabase.from('office_page_config').upsert(
    {
      office_code: normalizedOfficeCode,
      page_config: pageConfigPayload,
      hidden_products: toArray(hiddenProducts),
      category_detail_config: toArray(categoryRows),
    },
    { onConflict: 'office_code' },
  );

  if (error) {
    throw new Error(error.message || 'Failed to save storefront config.');
  }
}
