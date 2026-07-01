import { toTrimmedString } from '../../../../common/utils/text';

const EMPTY_STATIC_FERTILIZER_FIELDS = Object.freeze({
  img_url: null,
  product_url: null,
  nutrient: null,
  price_subsidy: null,
});

export function getStaticFertilizerProductCodes(rows) {
  const seen = new Set();
  const productCodes = [];

  rows.forEach((row) => {
    const normalizedCode = toTrimmedString(row?.product_code);

    if (!normalizedCode || seen.has(normalizedCode)) {
      return;
    }

    seen.add(normalizedCode);
    productCodes.push(normalizedCode);
  });

  return productCodes;
}

export function mergeRowsWithStaticFertilizer(rows, lookup) {
  return rows.map((row) => {
    const normalizedCode = toTrimmedString(row?.product_code);
    const staticFertilizerRow =
      normalizedCode && lookup?.[normalizedCode]
        ? lookup[normalizedCode]
        : EMPTY_STATIC_FERTILIZER_FIELDS;

    return {
      ...row,
      img_url: staticFertilizerRow.img_url ?? null,
      product_url: staticFertilizerRow.product_url ?? null,
      nutrient: staticFertilizerRow.nutrient ?? null,
      price_subsidy: staticFertilizerRow.price_subsidy ?? null,
    };
  });
}
