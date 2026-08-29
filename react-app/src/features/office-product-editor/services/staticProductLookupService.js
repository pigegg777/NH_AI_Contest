import { toTrimmedString } from '../../../common/utils/text';
import supabase from '../../../lib/supabaseClient';

const STATIC_LOOKUP_SOURCE = {
  fertilizer: {
    tableName: 'static_fertilizers',
    select: 'product_code,img_url,product_url,nutrient,price_subsidy',
    errorMessage: '정적 비료 데이터 조회에 실패했습니다.',
    normalizeRow(row, productCode) {
      return {
        product_code: productCode,
        img_url: row.img_url ?? null,
        product_url: row.product_url ?? null,
        nutrient: row.nutrient ?? null,
        price_subsidy: row.price_subsidy ?? null,
      };
    },
  },
  pesticide: {
    tableName: 'static_pesticide',
    select: 'product_code,nutirent,product_category,indict_symbl',
    errorMessage: '정적 농약 데이터 조회에 실패했습니다.',
    normalizeRow(row, productCode) {
      return {
        product_code: productCode,
        nutirent: row.nutirent ?? null,
        product_category: row.product_category ?? null,
        indict_symbl: row.indict_symbl ?? null,
      };
    },
  },
};

export async function fetchStaticProductLookup(kind, productCodes) {
  const source = STATIC_LOOKUP_SOURCE[kind];
  const normalizedProductCodes = Array.isArray(productCodes)
    ? [
        ...new Set(
          productCodes
            .map((productCode) => toTrimmedString(productCode))
            .filter(Boolean),
        ),
      ]
    : [];

  if (!source || normalizedProductCodes.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from(source.tableName)
    .select(source.select)
    .in('product_code', normalizedProductCodes);

  if (error) {
    throw new Error(error.message || source.errorMessage);
  }

  return (data ?? []).reduce((lookup, row) => {
    const productCode = toTrimmedString(row?.product_code);

    if (!productCode || productCode in lookup) {
      return lookup;
    }

    return {
      ...lookup,
      [productCode]: source.normalizeRow(row, productCode),
    };
  }, {});
}
