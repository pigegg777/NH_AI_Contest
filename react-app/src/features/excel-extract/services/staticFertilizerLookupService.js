import supabase from '../../../lib/supabaseClient';
import { toTrimmedString } from '../../../common/utils/text';
import { getStaticFertilizerProductCodes } from '../model/enrichment/staticFertilizerMergeModel';

const STATIC_FERTILIZER_SELECT =
  'product_code,img_url,product_url,nutrient,price_subsidy';

function normalizeProductCode(productCode) {
  return toTrimmedString(productCode);
}

function normalizeLookupRow(row) {
  const normalizedCode = normalizeProductCode(row?.product_code);

  if (!normalizedCode) {
    return null;
  }

  return {
    product_code: normalizedCode,
    img_url: row.img_url ?? null,
    product_url: row.product_url ?? null,
    nutrient: row.nutrient ?? null,
    price_subsidy: row.price_subsidy ?? null,
  };
}

export async function fetchStaticFertilizerLookup(productCodes) {
  const normalizedProductCodes = getStaticFertilizerProductCodes(
    productCodes.map((productCode) => ({ product_code: productCode })),
  );

  if (normalizedProductCodes.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('static_fertilizers')
    .select(STATIC_FERTILIZER_SELECT)
    .in('product_code', normalizedProductCodes);

  if (error) {
    throw new Error(error.message || '정적 비료 데이터 조회에 실패했습니다.');
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

