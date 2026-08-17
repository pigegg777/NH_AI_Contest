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
