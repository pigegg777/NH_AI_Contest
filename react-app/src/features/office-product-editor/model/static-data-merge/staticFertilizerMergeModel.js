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

    const ownImgUrl = toTrimmedString(row?.img_url);
    const effectiveImgUrl = ownImgUrl || staticFertilizerRow.img_url || null;

    return {
      ...row,
      // img_url can already be set on the row itself — either from the
      // uploaded excel or from a user applying an AI-generated/uploaded
      // image (see ai-image-apply) — and that must win over the static
      // registry's value. The other static fields have no such live
      // override path, so they keep being unconditionally refreshed.
      img_url: effectiveImgUrl,
      // Fertilizer images must remain editable regardless of whether the
      // effective URL came from the static lookup.
      img_url_is_static: false,
      product_url: staticFertilizerRow.product_url ?? null,
      nutrient: staticFertilizerRow.nutrient ?? null,
      price_subsidy: staticFertilizerRow.price_subsidy ?? null,
    };
  });
}
