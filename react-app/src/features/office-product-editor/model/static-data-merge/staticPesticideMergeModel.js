import { toTrimmedString } from '../../../../common/utils/text';

const EMPTY_STATIC_PESTICIDE_FIELDS = Object.freeze({
  nutirent: null,
  product_category: null,
  product_usage: [],
  indict_symbl: null,
});

export function getStaticPesticideProductCodes(rows) {
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

export function mergeRowsWithStaticPesticide(rows, lookup) {
  return rows.map((row) => {
    const normalizedCode = toTrimmedString(row?.product_code);
    const staticPesticideRow =
      normalizedCode && lookup?.[normalizedCode]
        ? lookup[normalizedCode]
        : EMPTY_STATIC_PESTICIDE_FIELDS;

    return {
      ...row,
      nutirent: staticPesticideRow.nutirent ?? null,
      product_category: staticPesticideRow.product_category ?? null,
      product_usage: staticPesticideRow.product_usage ?? [],
      indict_symbl: staticPesticideRow.indict_symbl ?? null,
    };
  });
}
