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
    const staticImgUrl = toTrimmedString(staticFertilizerRow.img_url);
    const hadPersistedStaticImg = row?.img_url_is_static === true;
    const effectiveImgUrl = hadPersistedStaticImg
      ? staticImgUrl || null
      : ownImgUrl || staticImgUrl || null;
    // Saving persists the merged img_url onto the row itself, so on the next
    // load a static image is no longer distinguishable by an empty
    // row.img_url alone — an own URL equal to the registry's counts as
    // static too, or the lock would fall off after the first save.
    const isStaticImgUrl =
      staticImgUrl !== '' &&
      (hadPersistedStaticImg || ownImgUrl === '' || ownImgUrl === staticImgUrl);

    return {
      ...row,
      // img_url can already be set on the row itself — either from the
      // uploaded excel or from a user applying an AI-generated/uploaded
      // image (see ai-image-apply) — and that must win over the static
      // registry's value. The other static fields have no such live
      // override path, so they keep being unconditionally refreshed.
      img_url: effectiveImgUrl,
      // An image the merchant never supplied belongs to the static registry:
      // the cell hides its delete and picker buttons, and ai-image-apply
      // skips the row.
      img_url_is_static: isStaticImgUrl,
      product_url: staticFertilizerRow.product_url ?? null,
      nutrient: staticFertilizerRow.nutrient ?? null,
      price_subsidy: staticFertilizerRow.price_subsidy ?? null,
    };
  });
}
