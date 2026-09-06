import { toTrimmedString } from '../../../../common/utils/text';

/**
 * The only text columns a re-upload may inherit from the previous save. The hide
 * flag is inherited too, but separately — see SHADOW_FIELD. Everything else — the
 * three price columns above all — comes from the new workbook, since refreshing
 * prices is the whole point of re-uploading.
 */
export const CARRY_OVER_FIELDS = ['img_url', 'note'];

/**
 * 숨길 상품 표시. A boolean has no "blank", so it cannot ride along with the text
 * fields: `hasValue(false)` is true, which would read every unhidden row as one
 * the new workbook already filled in.
 */
export const SHADOW_FIELD = 'shadow';

function hasValue(value) {
  return toTrimmedString(value) !== '';
}

function indexPreviousRows(previousRows) {
  const byProductCode = new Map();

  for (const previousRow of Array.isArray(previousRows) ? previousRows : []) {
    const productCode = toTrimmedString(previousRow?.product_code);

    if (!productCode) {
      continue;
    }

    if (!byProductCode.has(productCode)) {
      byProductCode.set(productCode, []);
    }

    byProductCode.get(productCode).push(previousRow);
  }

  return byProductCode;
}

/**
 * Resolve one field for one new row. A product code can hold several rows (과세,
 * 영세, 면세), so an exact sale-price-type match wins first — otherwise a note
 * written on the 과세 row would leak onto the 영세 row. When the price type no
 * longer matches, fall back to any row of the same product code that still has a
 * value, so renumbered price types do not silently drop the carry-over.
 */
function resolvePreviousValue(candidates, salePriceTypeCode, field) {
  const exactMatch = candidates.find(
    (candidate) =>
      toTrimmedString(candidate?.sale_price_type_code) === salePriceTypeCode &&
      hasValue(candidate?.[field]),
  );

  if (exactMatch) {
    return exactMatch[field];
  }

  const fallback = candidates.find((candidate) => hasValue(candidate?.[field]));

  return fallback ? fallback[field] : null;
}

/**
 * Resolve the hide flag the same way, but reading "set" as "is a boolean" rather
 * than "is non-empty text". A previous row saved before the flag existed holds
 * null, which counts as unset and lets the fallback keep looking.
 */
function resolvePreviousShadow(candidates, salePriceTypeCode) {
  const exactMatch = candidates.find(
    (candidate) =>
      toTrimmedString(candidate?.sale_price_type_code) === salePriceTypeCode &&
      typeof candidate?.[SHADOW_FIELD] === 'boolean',
  );

  if (exactMatch) {
    return exactMatch[SHADOW_FIELD];
  }

  const fallback = candidates.find(
    (candidate) => typeof candidate?.[SHADOW_FIELD] === 'boolean',
  );

  return fallback ? fallback[SHADOW_FIELD] : null;
}

/**
 * Fill img_url, note and the hide flag on freshly extracted workbook rows from
 * the previously saved rows of the same category, matched on product_code.
 *
 * A value the new workbook already carries always wins — carrying over is for
 * filling blanks, not for overwriting what the merchant just uploaded.
 *
 * Only a flag that was on gets carried: writing false onto a row that is already
 * shown changes nothing, and counting it would inflate the dialog's tally.
 */
export function carryOverPreviousRows(newRows, previousRows) {
  const rows = Array.isArray(newRows) ? newRows : [];
  const byProductCode = indexPreviousRows(previousRows);

  if (byProductCode.size === 0) {
    return {
      rows,
      carriedImageCount: 0,
      carriedNoteCount: 0,
      carriedShadowCount: 0,
    };
  }

  const carriedCounts = { img_url: 0, note: 0, shadow: 0 };
  const nextRows = rows.map((newRow) => {
    const productCode = toTrimmedString(newRow?.product_code);
    const candidates = productCode ? byProductCode.get(productCode) : null;

    if (!candidates) {
      return newRow;
    }

    const salePriceTypeCode = toTrimmedString(newRow?.sale_price_type_code);
    const carried = {};

    for (const field of CARRY_OVER_FIELDS) {
      if (hasValue(newRow?.[field])) {
        continue;
      }

      const previousValue = resolvePreviousValue(
        candidates,
        salePriceTypeCode,
        field,
      );

      if (previousValue === null) {
        continue;
      }

      carried[field] = previousValue;
      carriedCounts[field] += 1;
    }

    if (
      typeof newRow?.[SHADOW_FIELD] !== 'boolean' &&
      resolvePreviousShadow(candidates, salePriceTypeCode) === true
    ) {
      carried[SHADOW_FIELD] = true;
      carriedCounts.shadow += 1;
    }

    return Object.keys(carried).length > 0 ? { ...newRow, ...carried } : newRow;
  });

  return {
    rows: nextRows,
    carriedImageCount: carriedCounts.img_url,
    carriedNoteCount: carriedCounts.note,
    carriedShadowCount: carriedCounts.shadow,
  };
}
