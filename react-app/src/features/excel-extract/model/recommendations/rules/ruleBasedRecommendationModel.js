import { toTrimmedString } from '../../../../../common/utils/text';
import { createAiRecommendation } from '../core/aiRecommendationModel';

function buildTaxHigherThanZeroTaxRecommendations(rows) {
  return rows
    .filter(
      (row) =>
        typeof row.tax_price === 'number' &&
        typeof row.zero_tax_price === 'number' &&
        row.tax_price > row.zero_tax_price,
    )
    .map((row) =>
      createAiRecommendation({
        severity: 'high',
        title: '과세단가가 영세단가보다 높습니다',
        reason: `${row.product_name || row.product_code || '행'}에서 과세단가가 영세단가보다 높게 책정되어 있습니다.`,
        relatedRowIds: [row.row_id],
      }),
    );
}

function normalizeProductName(productName) {
  return toTrimmedString(productName).replace(/\s+/g, '');
}

function normalizeManufacturerList(manufacturerList) {
  if (!Array.isArray(manufacturerList)) {
    return [];
  }

  return manufacturerList
    .map((manufacturer) => toTrimmedString(manufacturer?.manufacturer_code) || toTrimmedString(manufacturer?.manufacturer_name))
    .filter(Boolean);
}

function hasManufacturerOverlap(left, right) {
  const leftKeys = normalizeManufacturerList(left);
  const rightKeys = normalizeManufacturerList(right);

  if (leftKeys.length === 0 || rightKeys.length === 0) {
    return null;
  }

  return leftKeys.some((key) => rightKeys.includes(key));
}

function compareOptionalField(left, right) {
  const leftValue = toTrimmedString(left);
  const rightValue = toTrimmedString(right);

  if (leftValue === '' || rightValue === '') {
    return null;
  }

  return leftValue === rightValue;
}

function looksLikeSameProduct(left, right) {
  const signals = [
    compareOptionalField(left.nutrient, right.nutrient),
    compareOptionalField(left.spec, right.spec),
    hasManufacturerOverlap(left.manufacturer_list, right.manufacturer_list),
  ];

  if (signals.some((signal) => signal === false)) {
    return false;
  }

  return signals.some((signal) => signal === true);
}

function buildSameProductDifferentCodeRecommendations(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const normalizedName = normalizeProductName(row.product_name);

    if (!normalizedName) {
      return;
    }

    if (!groups.has(normalizedName)) {
      groups.set(normalizedName, []);
    }

    groups.get(normalizedName).push(row);
  });

  const recommendations = [];

  groups.forEach((groupRows, normalizedName) => {
    const productCodes = [...new Set(groupRows.map((row) => row.product_code))];

    if (productCodes.length < 2) {
      return;
    }

    const isSameProduct = groupRows.every((row, index) => {
      if (index === 0) {
        return true;
      }

      return looksLikeSameProduct(groupRows[0], row);
    });

    if (!isSameProduct) {
      return;
    }

    const productName = groupRows[0].product_name || normalizedName;
    const relatedRowIds = groupRows.map((row) => row.row_id);

    recommendations.push(
      createAiRecommendation({
        severity: 'medium',
        title: '동일 상품으로 보이나 상품코드가 다릅니다',
        reason: `"${productName}" 상품이 상품코드 ${productCodes.join(', ')}로 나뉘어 등록되어 있습니다. 동일 상품인지 확인해 주세요.`,
        relatedRowIds,
      }),
    );
  });

  return recommendations;
}

export function buildRuleBasedAiRecommendations(rows) {
  return [
    ...buildTaxHigherThanZeroTaxRecommendations(rows),
    ...buildSameProductDifferentCodeRecommendations(rows),
  ];
}
