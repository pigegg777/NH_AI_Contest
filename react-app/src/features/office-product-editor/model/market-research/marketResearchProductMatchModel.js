import { toTrimmedString } from '../../../../common/utils/text';
import { toNumberOrNull } from '../../../../common/utils/number';

const MAX_MATCHED_PRODUCTS = 3;

function normalizeForMatch(value) {
  return toTrimmedString(value).toLowerCase().replace(/\s+/g, '');
}

function pickRepresentativePrice(row) {
  return (
    toNumberOrNull(row?.tax_price) ??
    toNumberOrNull(row?.zero_tax_price) ??
    toNumberOrNull(row?.exempt_tax_price) ??
    null
  );
}

function scoreRow(row, queryTokens) {
  const normalizedName = normalizeForMatch(row?.product_name);
  const normalizedSpec = normalizeForMatch(row?.spec);

  return queryTokens.reduce((score, token) => {
    let tokenScore = 0;

    if (normalizedName && normalizedName.includes(token)) {
      tokenScore += 2;
    }

    if (normalizedSpec && normalizedSpec.includes(token)) {
      tokenScore += 1;
    }

    return score + tokenScore;
  }, 0);
}

export function findMatchingProducts(rows, query, { limit = MAX_MATCHED_PRODUCTS } = {}) {
  const queryTokens = toTrimmedString(query)
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!Array.isArray(rows) || queryTokens.length === 0) {
    return [];
  }

  return rows
    .map((row) => ({ row, score: scoreRow(row, queryTokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row }) => ({
      productName: toTrimmedString(row.product_name),
      spec: toTrimmedString(row.spec),
      priceKrw: pickRepresentativePrice(row),
    }));
}
