const COMMON_AGGREGATE_FIELDS = [
  'product_name',
  'spec',
  'large_category',
  'medium_category',
  'small_category',
  'detail_category',
  'sale_price_type_code',
  'sale_price_type_name',
];

function getSalePriceTypeKey(row) {
  return (
    row.sale_price_type_code ??
    row.sale_price_type_name ??
    '__missing_sale_price_type__'
  );
}

function buildAggregateRowId(row) {
  return `${row.product_code}__${getSalePriceTypeKey(row)}`;
}

function addWarning(target, warning) {
  if (!target.includes(warning)) {
    target.push(warning);
  }
}

const PRICE_TYPE_DEFINITIONS = [
  { keyword: '영세', field: '_zeroTaxPriceCandidates', label: '영세' },
  { keyword: '과세', field: '_taxPriceCandidates', label: '과세' },
  { keyword: '면세', field: '_exemptTaxPriceCandidates', label: '면세' },
];

function initAggregate(row, rowId) {
  return {
    row_id: rowId,
    product_code: row.product_code,
    sale_price_type_code: row.sale_price_type_code,
    sale_price_type_name: row.sale_price_type_name,
    product_name: row.product_name,
    product_type_variants: [],
    spec: row.spec,
    large_category: row.large_category,
    medium_category: row.medium_category,
    small_category: row.small_category,
    detail_category: row.detail_category,
    tax_price: null,
    zero_tax_price: null,
    exempt_tax_price: null,
    manufacturer_list: null,
    warnings: [],
    _manufacturers: new Map(),
    _taxPriceCandidates: [],
    _zeroTaxPriceCandidates: [],
    _exemptTaxPriceCandidates: [],
  };
}

function pushUnique(list, value) {
  if (value != null && !list.includes(value)) {
    list.push(value);
  }
}

function mergeCommonField(target, field, value) {
  if (value == null) {
    return;
  }

  if (target[field] == null) {
    target[field] = value;
    return;
  }

  if (target[field] !== value) {
    addWarning(
      target.warnings,
      `${field} 값이 원본 행마다 달라 첫 번째 값을 유지했습니다.`,
    );
  }
}

function collectPriceCandidates(target, row) {
  if (row.sale_price == null) {
    addWarning(
      target.warnings,
      '매출단가를 숫자로 해석할 수 없는 행이 있습니다.',
    );
    return;
  }

  const productType = row.product_type ?? '';
  const matchedTypes = PRICE_TYPE_DEFINITIONS.filter((definition) =>
    productType.includes(definition.keyword),
  );

  if (matchedTypes.length > 1) {
    addWarning(
      target.warnings,
      `과세 구분에 ${matchedTypes.map((definition) => definition.label).join('와 ')}가 함께 포함되어 있습니다.`,
    );
    return;
  }

  if (matchedTypes.length === 1) {
    target[matchedTypes[0].field].push(row.sale_price);
    return;
  }

  addWarning(
    target.warnings,
    '과세 구분을 과세/영세/면세로 해석할 수 없는 행이 있습니다.',
  );
}

function finalizePriceSlot(target, field, candidates, label) {
  const uniqueCandidates = [...new Set(candidates)];

  if (uniqueCandidates.length === 1) {
    target[field] = uniqueCandidates[0];
    return;
  }

  if (uniqueCandidates.length > 1) {
    addWarning(
      target.warnings,
      `${label} 매출단가가 ${uniqueCandidates.join('원, ')}원으로 서로 달라 어떤 값이 맞는지 확인이 필요합니다.`,
    );
  }
}

function finalizeAggregate(target) {
  finalizePriceSlot(target, 'tax_price', target._taxPriceCandidates, '과세');
  finalizePriceSlot(
    target,
    'zero_tax_price',
    target._zeroTaxPriceCandidates,
    '영세',
  );
  finalizePriceSlot(
    target,
    'exempt_tax_price',
    target._exemptTaxPriceCandidates,
    '면세',
  );
  target.manufacturer_list =
    target._manufacturers.size > 0 ? [...target._manufacturers.values()] : null;

  delete target._manufacturers;
  delete target._taxPriceCandidates;
  delete target._zeroTaxPriceCandidates;
  delete target._exemptTaxPriceCandidates;

  return target;
}

export function aggregateWorksheetRows(rows) {
  const groups = new Map();

  for (const row of rows) {
    if (!row.product_code) {
      continue;
    }

    const rowId = buildAggregateRowId(row);
    const aggregate = groups.get(rowId) ?? initAggregate(row, rowId);

    COMMON_AGGREGATE_FIELDS.forEach((field) => {
      mergeCommonField(aggregate, field, row[field]);
    });

    pushUnique(aggregate.product_type_variants, row.product_type);
    collectPriceCandidates(aggregate, row);

    if (row.manufacturer_name && !aggregate._manufacturers.has(row.manufacturer_name)) {
      aggregate._manufacturers.set(row.manufacturer_name, {
        manufacturer_name: row.manufacturer_name,
      });
    }

    groups.set(rowId, aggregate);
  }

  return [...groups.values()].map(finalizeAggregate);
}
