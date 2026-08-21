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
      // True when the effective img_url is (still) the static registry's
      // value — the office-product-editor data table uses this to disable
      // editing that default image. This can't just check "row has no
      // img_url of its own": once a row is saved, the merged value gets
      // persisted onto the row itself, so on reload row.img_url is no
      // longer empty — it now literally equals the static value. Comparing
      // against the static value directly keeps the lock correct across a
      // save/reload, while a genuinely different (user-set) img_url still
      // unlocks it.
      img_url_is_static:
        Boolean(staticFertilizerRow.img_url) && effectiveImgUrl === staticFertilizerRow.img_url,
      product_url: staticFertilizerRow.product_url ?? null,
      nutrient: staticFertilizerRow.nutrient ?? null,
      price_subsidy: staticFertilizerRow.price_subsidy ?? null,
    };
  });
}
