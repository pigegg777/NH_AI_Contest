import { toTrimmedString } from '../../../common/utils/text';
import supabase from '../../../lib/supabaseClient';

const STATIC_PESTICIDE_SELECT =
  'product_code,product_nutirent,product_category,product_usage,indict_symbl';

function normalizeProductCode(productCode) {
  return toTrimmedString(productCode);
}

function normalizeProductCodes(productCodes) {
  if (!Array.isArray(productCodes)) {
    return [];
  }

  return [...new Set(productCodes.map(normalizeProductCode).filter(Boolean))];
}

function normalizeLookupRow(row) {
  const normalizedCode = normalizeProductCode(row?.product_code);

  if (!normalizedCode) {
    return null;
  }

  return {
    product_code: normalizedCode,
    product_nutirent: row.product_nutirent ?? null,
    product_category: row.product_category ?? null,
    product_usage: Array.isArray(row.product_usage) ? row.product_usage : [],
    indict_symbl: row.indict_symbl ?? null,
  };
}

export async function fetchStaticPesticideLookup(productCodes) {
  const normalizedProductCodes = normalizeProductCodes(productCodes);

  if (normalizedProductCodes.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('static_pesticide')
    .select(STATIC_PESTICIDE_SELECT)
    .in('product_code', normalizedProductCodes);

  if (error) {
    throw new Error(error.message || '정적 농약 데이터 조회에 실패했습니다.');
  }

  return (data ?? []).reduce((lookup, row) => {
    const normalizedRow = normalizeLookupRow(row);

    if (!normalizedRow || normalizedRow.product_code in lookup) {
      return lookup;
    }

    return {
      ...lookup,
      [normalizedRow.product_code]: normalizedRow,
    };
  }, {});
}
