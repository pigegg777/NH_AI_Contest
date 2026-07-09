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

  const { data: officeRow, error: officeError } = await supabase
    .from('office_page_config')
    .select('office_code, page_config, hidden_products, updated_at')
    .eq('office_code', normalizedOfficeCode)
    .maybeSingle();

  if (officeError) {
    throw new Error(officeError.message || 'Failed to load storefront config.');
  }

  if (!officeRow) {
    return { officeRow: null, categoryRows: [] };
  }

  const { data: categoryRows, error: categoryError } = await supabase
    .from('office_page_category_configs')
    .select('office_code, product_category_name, category_config, sort_order, updated_at')
    .eq('office_code', normalizedOfficeCode)
    .order('sort_order', { ascending: true });

  if (categoryError) {
    throw new Error(categoryError.message || 'Failed to load storefront category config.');
  }

  return { officeRow, categoryRows: toArray(categoryRows) };
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

  const { error: officeError } = await supabase.from('office_page_config').upsert(
    {
      office_code: normalizedOfficeCode,
      page_config: pageConfigPayload,
      hidden_products: toArray(hiddenProducts),
    },
    { onConflict: 'office_code' },
  );

  if (officeError) {
    throw new Error(officeError.message || 'Failed to save storefront config.');
  }

  const { data: existingCategoryRows, error: existingCategoryError } = await supabase
    .from('office_page_category_configs')
    .select('product_category_name')
    .eq('office_code', normalizedOfficeCode);

  if (existingCategoryError) {
    throw new Error(existingCategoryError.message || 'Failed to load existing storefront category config.');
  }

  const normalizedCategoryRows = toArray(categoryRows);

  if (normalizedCategoryRows.length > 0) {
    const { error: categoryUpsertError } = await supabase.from('office_page_category_configs').upsert(normalizedCategoryRows, {
      onConflict: 'office_code,product_category_name',
    });

    if (categoryUpsertError) {
      throw new Error(categoryUpsertError.message || 'Failed to save storefront category config.');
    }
  }

  const nextCategoryNames = new Set(normalizedCategoryRows.map((row) => row.product_category_name));
  const staleCategoryNames = toArray(existingCategoryRows)
    .map((row) => toTrimmedString(row?.product_category_name))
    .filter((productCategoryName) => productCategoryName && !nextCategoryNames.has(productCategoryName));

  if (staleCategoryNames.length > 0) {
    const { error: categoryDeleteError } = await supabase
      .from('office_page_category_configs')
      .delete()
      .eq('office_code', normalizedOfficeCode)
      .in('product_category_name', staleCategoryNames);

    if (categoryDeleteError) {
      throw new Error(categoryDeleteError.message || 'Failed to remove stale storefront category config.');
    }
  }
}
