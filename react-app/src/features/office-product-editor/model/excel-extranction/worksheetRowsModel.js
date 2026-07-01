import { toNullableTrimmedString } from '../../../../common/utils/text';

import {
  getCell,
  normalizeWorksheetNumber,
} from '../../utils/worksheetCellUtils';

const TRIMMED_STRING_FIELDS = [
  'product_code',
  'product_name',
  'sale_price_type_code',
  'sale_price_type_name',
  'product_type',
  'spec',
  'large_category',
  'medium_category',
  'small_category',
  'detail_category',
  'manufacturer_code',
  'manufacturer_name',
];

const COMMON_AGGREGATE_FIELDS = [
  'product_code',
  'product_name',
  'spec',
  'large_category',
  'medium_category',
  'small_category',
  'detail_category',
  'sale_price_type_code',
  'sale_price_type_name',
];

const PRICE_SLOT_DEFINITIONS = [
  {
    keyword: '영세',
    candidatesField: '_zeroTaxPriceCandidates',
    priceField: 'zero_tax_price',
    label: '영세',
  },
  {
    keyword: '과세',
    candidatesField: '_taxPriceCandidates',
    priceField: 'tax_price',
    label: '과세',
  },
  {
    keyword: '면세',
    candidatesField: '_exemptTaxPriceCandidates',
    priceField: 'exempt_tax_price',
    label: '면세',
  },
];

function normalizeWorksheetRow(row, columnMap) {
  const normalizedRow = {
    sale_price: normalizeWorksheetNumber(getCell(row, columnMap.sale_price)),
  };

  for (const field of TRIMMED_STRING_FIELDS) {
    normalizedRow[field] = toNullableTrimmedString(
      getCell(row, columnMap[field]),
    );
  }

  return normalizedRow;
}

function createAggregatedWorksheetRow(row, rowId) {
  const aggregate = {
    row_id: rowId,
    product_type_variants: [],
    tax_price: null,
    zero_tax_price: null,
    exempt_tax_price: null,
    manufacturer_list: null,
    warnings: [],
    _manufacturers: new Map(),
  };

  for (const { candidatesField } of PRICE_SLOT_DEFINITIONS) {
    aggregate[candidatesField] = [];
  }

  for (const field of COMMON_AGGREGATE_FIELDS) {
    aggregate[field] = row[field] ?? null;
  }

  return aggregate;
}

function mergeAggregateField(target, field, value) {
  if (value == null) {
    return;
  }

  if (target[field] == null) {
    target[field] = value;
    return;
  }

  if (target[field] !== value) {
    const warning = `${field} 값이 원본 행마다 달라 첫 번째 값을 유지했습니다.`;
    if (!target.warnings.includes(warning)) {
      target.warnings.push(warning);
    }
  }
}

function collectSalePriceCandidates(target, row) {
  if (row.sale_price == null) {
    const warning = '매출단가를 숫자로 해석할 수 없는 행이 있습니다.';
    if (!target.warnings.includes(warning)) {
      target.warnings.push(warning);
    }
    return;
  }

  const productType = row.product_type ?? '';
  const matchedTypes = PRICE_SLOT_DEFINITIONS.filter((definition) =>
    productType.includes(definition.keyword),
  );

  if (matchedTypes.length > 1) {
    const warning = `과세 구분에 ${matchedTypes.map((definition) => definition.label).join('와 ')}가 함께 포함되어 있습니다.`;
    if (!target.warnings.includes(warning)) {
      target.warnings.push(warning);
    }
    return;
  }

  if (matchedTypes.length === 1) {
    target[matchedTypes[0].candidatesField].push(row.sale_price);
    return;
  }

  const warning = '과세 구분을 과세/영세/면세로 해석할 수 없는 행이 있습니다.';
  if (!target.warnings.includes(warning)) {
    target.warnings.push(warning);
  }
}

function finalizeAggregatedWorksheetRow(target) {
  for (const { candidatesField, priceField, label } of PRICE_SLOT_DEFINITIONS) {
    const uniqueCandidates = [...new Set(target[candidatesField])];

    if (uniqueCandidates.length === 1) {
      target[priceField] = uniqueCandidates[0];
    } else if (uniqueCandidates.length > 1) {
      const warning = `${label} 매출단가가 ${uniqueCandidates.join('원, ')}원으로 서로 달라 어떤 값이 맞는지 확인이 필요합니다.`;
      if (!target.warnings.includes(warning)) {
        target.warnings.push(warning);
      }
    }

    delete target[candidatesField];
  }

  target.manufacturer_list =
    target._manufacturers.size > 0 ? [...target._manufacturers.values()] : null;

  delete target._manufacturers;

  return target;
}

export function buildAggregatedWorksheetRows(rows, structure) {
  const { columnMap, dataStartRowIndex, dataEndRowIndex } = structure;
  const groups = new Map();

  for (let index = dataStartRowIndex; index <= dataEndRowIndex; index += 1) {
    const row = normalizeWorksheetRow(rows[index] ?? [], columnMap);
    if (!row.product_code) {
      continue;
    }

    const rowId = `${row.product_code}__${
      row.sale_price_type_code ??
      row.sale_price_type_name ??
      '__missing_sale_price_type__'
    }`;
    const aggregate =
      groups.get(rowId) ?? createAggregatedWorksheetRow(row, rowId);

    for (const field of COMMON_AGGREGATE_FIELDS) {
      mergeAggregateField(aggregate, field, row[field]);
    }

    if (
      row.product_type != null &&
      !aggregate.product_type_variants.includes(row.product_type)
    ) {
      aggregate.product_type_variants.push(row.product_type);
    }

    collectSalePriceCandidates(aggregate, row);

    if (
      row.manufacturer_name &&
      !aggregate._manufacturers.has(row.manufacturer_name)
    ) {
      aggregate._manufacturers.set(row.manufacturer_name, {
        manufacturer_name: row.manufacturer_name,
      });
    }

    groups.set(rowId, aggregate);
  }

  return [...groups.values()].map(finalizeAggregatedWorksheetRow);
}
