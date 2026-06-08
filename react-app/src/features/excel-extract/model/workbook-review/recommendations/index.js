import { toLowerTrimmedString, toTrimmedString } from '../../../../../common/utils/text';

function normalizeManufacturerList(manufacturerList) {
  if (!Array.isArray(manufacturerList) || manufacturerList.length === 0) {
    return '';
  }

  return manufacturerList
    .map((manufacturer) =>
      [manufacturer?.manufacturer_name, manufacturer?.manufacturer_code]
        .map(toLowerTrimmedString)
        .filter(Boolean)
        .join(':'),
    )
    .filter(Boolean)
    .sort()
    .join('|');
}

function normalizeRelatedRowIds(relatedRowIds) {
  if (!Array.isArray(relatedRowIds)) {
    return [];
  }

  return [...new Set(relatedRowIds.filter((rowId) => typeof rowId === 'string' && rowId !== ''))];
}

function buildRecommendationId(input) {
  const relatedRowIds = normalizeRelatedRowIds(input.relatedRowIds);
  return input.id ?? `${input.kind ?? 'recommendation'}:${relatedRowIds.join(',')}`;
}

export function createAiRecommendation(input) {
  return {
    id: buildRecommendationId(input),
    kind: toTrimmedString(input.kind),
    severity: toTrimmedString(input.severity) || 'medium',
    title: toTrimmedString(input.title),
    reason: toTrimmedString(input.reason),
    actionText: toTrimmedString(input.actionText),
    relatedRowIds: normalizeRelatedRowIds(input.relatedRowIds),
  };
}

function buildSameProductSignature(row) {
  const productName = toLowerTrimmedString(row.product_name);
  const nutrient = toLowerTrimmedString(row.nutrient);
  const spec = toLowerTrimmedString(row.spec);
  const manufacturer = normalizeManufacturerList(row.manufacturer_list);

  if (!productName) {
    return null;
  }

  if (!nutrient && !spec && !manufacturer) {
    return null;
  }

  return [productName, nutrient, spec, manufacturer].join('||');
}

function groupRowsBySameProductSignature(rows) {
  return rows.reduce((groups, row) => {
    const signature = buildSameProductSignature(row);

    if (!signature || !row.row_id) {
      return groups;
    }

    const nextGroup = groups.get(signature) ?? [];
    nextGroup.push(row);
    groups.set(signature, nextGroup);

    return groups;
  }, new Map());
}

function collectUniqueNumberValues(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter((value) => typeof value === 'number'))];
}

function createZeroTaxHigherThanTaxRecommendations(rows) {
  return rows
    .filter(
      (row) =>
        typeof row.tax_price === 'number' &&
        typeof row.zero_tax_price === 'number' &&
        row.zero_tax_price > row.tax_price,
    )
    .map((row) =>
      createAiRecommendation({
        kind: 'zero-tax-higher-than-tax',
        severity: 'high',
        title: '영세단가가 과세단가보다 높습니다',
        reason: `${row.product_name || row.product_code || '행'}에서 영세단가가 과세단가보다 크게 잡혀 있습니다.`,
        actionText: '가격 기준 재확인',
        relatedRowIds: [row.row_id],
      }),
    );
}

function createSameProductDifferentCodeRecommendations(rows) {
  const groupedRows = groupRowsBySameProductSignature(rows);

  const recommendations = [];

  groupedRows.forEach((groupRows) => {
    const productCodes = [...new Set(groupRows.map((row) => toTrimmedString(row.product_code)).filter(Boolean))];

    if (productCodes.length < 2) {
      return;
    }

    recommendations.push(
      createAiRecommendation({
        kind: 'same-product-different-code',
        severity: 'medium',
        title: '같은 상품으로 보이는데 상품코드가 다릅니다',
        reason: `${groupRows[0]?.product_name || '동일 상품'}의 성분/규격/제조사 정보가 유사하지만 상품코드가 ${productCodes.join(', ')}로 나뉩니다.`,
        actionText: '코드 중복 여부 확인',
        relatedRowIds: groupRows.map((row) => row.row_id),
      }),
    );
  });

  return recommendations;
}

function createSameProductPriceMismatchRecommendations(rows) {
  const groupedRows = groupRowsBySameProductSignature(rows);
  const recommendations = [];

  groupedRows.forEach((groupRows) => {
    if (groupRows.length < 2) {
      return;
    }

    const uniqueTaxPrices = collectUniqueNumberValues(groupRows, 'tax_price');
    const uniqueZeroTaxPrices = collectUniqueNumberValues(groupRows, 'zero_tax_price');
    const hasTaxMismatch = uniqueTaxPrices.length > 1;
    const hasZeroTaxMismatch = uniqueZeroTaxPrices.length > 1;

    if (!hasTaxMismatch && !hasZeroTaxMismatch) {
      return;
    }

    const mismatchLabels = [];

    if (hasTaxMismatch) {
      mismatchLabels.push(`과세단가 ${uniqueTaxPrices.join(', ')}`);
    }

    if (hasZeroTaxMismatch) {
      mismatchLabels.push(`영세단가 ${uniqueZeroTaxPrices.join(', ')}`);
    }

    recommendations.push(
      createAiRecommendation({
        kind: 'same-product-price-mismatch',
        severity: 'medium',
        title: '유사 상품인데 가격이 다릅니다',
        reason: `${groupRows[0]?.product_name || '유사 상품'}에서 ${mismatchLabels.join(' / ')} 값이 서로 다릅니다.`,
        actionText: '가격 기준 비교',
        relatedRowIds: groupRows.map((row) => row.row_id),
      }),
    );
  });

  return recommendations;
}

function createSameCodeInconsistentInfoRecommendations(rows) {
  const groupedRows = rows.reduce((groups, row) => {
    const productCode = toTrimmedString(row.product_code);

    if (!productCode || !row.row_id) {
      return groups;
    }

    const nextGroup = groups.get(productCode) ?? [];
    nextGroup.push(row);
    groups.set(productCode, nextGroup);

    return groups;
  }, new Map());

  const recommendations = [];

  groupedRows.forEach((groupRows, productCode) => {
    if (groupRows.length < 2) {
      return;
    }

    const productNames = new Set(groupRows.map((row) => toLowerTrimmedString(row.product_name)).filter(Boolean));
    const nutrients = new Set(groupRows.map((row) => toLowerTrimmedString(row.nutrient)).filter(Boolean));
    const specs = new Set(groupRows.map((row) => toLowerTrimmedString(row.spec)).filter(Boolean));
    const hasMismatch = productNames.size > 1 || nutrients.size > 1 || specs.size > 1;

    if (!hasMismatch) {
      return;
    }

    recommendations.push(
      createAiRecommendation({
        kind: 'same-code-inconsistent-info',
        severity: 'medium',
        title: '같은 상품코드인데 핵심 정보가 다릅니다',
        reason: `${productCode} 코드 안에서 상품명, 성분, 규격 정보가 일치하지 않는 행이 있습니다.`,
        actionText: '원본 행 비교',
        relatedRowIds: groupRows.map((row) => row.row_id),
      }),
    );
  });

  return recommendations;
}

export function buildRuleBasedAiRecommendations(rows) {
  return [
    ...createZeroTaxHigherThanTaxRecommendations(rows),
    ...createSameProductDifferentCodeRecommendations(rows),
    ...createSameProductPriceMismatchRecommendations(rows),
    ...createSameCodeInconsistentInfoRecommendations(rows),
  ];
}
