import supabase from '../../../../lib/supabaseClient';
import { toTrimmedString } from '../../../../common/utils/text';
import { removeProductUsageFromRows } from '../../utils/officeProductDataUtils';

export async function fetchAllOfficeProductRows({ officeCode }) {
  const normalizedOfficeCode = toTrimmedString(officeCode);
  if (!normalizedOfficeCode) return [];
  const { data, error } = await supabase.rpc('get_public_store_products', {
    p_office_code: normalizedOfficeCode,
  });

  if (error) {
    throw new Error(error.message || '상품 정보를 불러오지 못했습니다.');
  }

  return removeProductUsageFromRows(data);
}

export async function fetchPublicOfficeIdentity({ officeCode }) {
  const normalizedOfficeCode = toTrimmedString(officeCode);

  const { data, error } = await supabase
    .rpc('get_public_office_identity', { p_office_code: normalizedOfficeCode })
    .maybeSingle();

  if (error) {
    throw new Error(error.message || '매장 정보를 불러오지 못했습니다.');
  }

  if (!data) {
    return null;
  }
  return {
    officeName: toTrimmedString(data.office_name),
    nhName: toTrimmedString(data.nh_name),
    // Null until the migration adding this column has been applied, which the
    // storefront treats the same as "no product data yet": it renders nothing.
    productUpdatedAt: data.product_updated_at ?? null,
  };
}
