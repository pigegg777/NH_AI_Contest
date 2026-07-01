import supabase from '../../../../lib/supabaseClient';
import { toTrimmedString } from '../../../../common/utils/text';

export async function fetchOfficeProductDataRow(officeCode) {
  const normalizedOfficeCode = toTrimmedString(officeCode);

  if (!normalizedOfficeCode) {
    return null;
  }

  const { data, error } = await supabase
    .from('office_product_datas')
    .select('id, office_code, office_name, product_data')
    .eq('office_code', normalizedOfficeCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || '등록 데이터를 불러오지 못했습니다.');
  }

  return data;
}
