import { hasTrimmedText, toNullableTrimmedString } from '../../../../../common/utils/text';

const HEADER_SCAN_LIMIT = 30;
const DATA_END_BLANK_ROW_STREAK = 2;

const HEADER_WEIGHTS = new Map([
  ['상품코드', 4],
  ['상품명', 3],
  ['매출단가', 3],
  ['상품구분', 3],
  ['매출단가유형', 2],
  ['규격', 1],
  ['대분류', 1],
  ['중분류', 1],
  ['소분류', 1],
  ['세분류', 1],
  ['상품제조업체코드', 1],
  ['상품제조업체명', 1],
]);

const COLUMN_RULES = [
  { field: 'product_code', labels: ['상품코드'] },
  { field: 'product_name', labels: ['상품명'] },
  { field: 'product_type', labels: ['상품구분'] },
  { field: 'sale_price', labels: ['매출단가'] },
  { field: 'spec', labels: ['규격'] },
  { field: 'large_category', labels: ['대분류'] },
  { field: 'medium_category', labels: ['중분류'] },
  { field: 'small_category', labels: ['소분류'] },
  { field: 'detail_category', labels: ['세분류'] },
  { field: 'manufacturer_code', labels: ['상품제조업체코드'] },
  { field: 'manufacturer_name', labels: ['상품제조업체명'] },
];

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

function getCell(row, index) {
  if (index == null || index < 0) {
    return null;
  }

  return row[index] ?? null;
}

function normalizeHeaderCell(value) {
  if (value == null) {
    return '';
  }

  return String(value).replace(/\r?\n/g, '').replace(/\s+/g, '').trim();
}

function normalizeNumber(value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = String(value).replace(/,/g, '').trim();
  if (text === '') {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function scoreHeaderRow(row) {
  const normalizedCells = row.map(normalizeHeaderCell);
  let score = 0;

  for (const cell of normalizedCells) {
    score += HEADER_WEIGHTS.get(cell) ?? 0;
  }

  const salePriceTypeCount = normalizedCells.filter((cell) => cell === '매출단가유형').length;
  if (salePriceTypeCount >= 2) {
    score += 3;
  }

  return score;
}

function detectHeaderRow(rows) {
  let bestIndex = 0;
  let bestScore = -1;

  for (let index = 0; index < Math.min(rows.length, HEADER_SCAN_LIMIT); index += 1) {
    const score = scoreHeaderRow(rows[index] ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return { headerRowIndex: bestIndex, headerScore: bestScore };
}

function buildColumnMap(headerRow) {
  const columnMap = {};
  const priceTypeColumns = [];

  headerRow.forEach((value, index) => {
    const normalized = normalizeHeaderCell(value);

    if (normalized === '매출단가유형') {
      priceTypeColumns.push(index);
      return;
    }

    for (const rule of COLUMN_RULES) {
      if (rule.labels.includes(normalized) && columnMap[rule.field] == null) {
        columnMap[rule.field] = index;
        break;
      }
    }
  });

  if (priceTypeColumns[0] != null) {
    columnMap.sale_price_type_code = priceTypeColumns[0];
  }

  if (priceTypeColumns[1] != null) {
    columnMap.sale_price_type_name = priceTypeColumns[1];
  }

  return columnMap;
}

function isDataCandidate(row, columnMap) {
  return Boolean(
    hasTrimmedText(getCell(row, columnMap.product_code)) ||
    hasTrimmedText(getCell(row, columnMap.product_name)),
  );
}

function detectDataRange(rows, headerRowIndex, columnMap) {
  let dataStartRowIndex = headerRowIndex + 1;

  while (
    dataStartRowIndex < rows.length &&
    !isDataCandidate(rows[dataStartRowIndex] ?? [], columnMap)
  ) {
    dataStartRowIndex += 1;
  }

  let dataEndRowIndex = dataStartRowIndex - 1;
  let blankRowStreak = 0;

  for (let index = dataStartRowIndex; index < rows.length; index += 1) {
    const row = rows[index] ?? [];

    if (isDataCandidate(row, columnMap)) {
      blankRowStreak = 0;
      dataEndRowIndex = index;
      continue;
    }

    if (!row.some(hasTrimmedText)) {
      blankRowStreak += 1;
      if (blankRowStreak >= DATA_END_BLANK_ROW_STREAK) {
        break;
      }
      continue;
    }

    blankRowStreak = 0;
  }

  return { dataStartRowIndex, dataEndRowIndex };
}

function buildWorkbookWarnings(headerScore, columnMap, dataRange) {
  const warnings = [];
  const requiredFields = ['product_code', 'product_name', 'sale_price', 'product_type'];

  if (headerScore < 8) {
    warnings.push('헤더 행 탐지 신뢰도가 낮습니다.');
  }

  for (const field of requiredFields) {
    if (columnMap[field] == null) {
      warnings.push(`필수 컬럼이 누락되었습니다: ${field}`);
    }
  }

  if (dataRange.dataEndRowIndex < dataRange.dataStartRowIndex) {
    warnings.push('데이터 범위를 찾지 못했습니다.');
  }

  return warnings;
}

function analyzeWorksheetStructure(rows) {
  const { headerRowIndex, headerScore } = detectHeaderRow(rows);
  const columnMap = buildColumnMap(rows[headerRowIndex] ?? []);
  const dataRange = detectDataRange(rows, headerRowIndex, columnMap);

  return {
    headerRowIndex,
    headerScore,
    columnMap,
    dataStartRowIndex: dataRange.dataStartRowIndex,
    dataEndRowIndex: dataRange.dataEndRowIndex,
    warnings: buildWorkbookWarnings(headerScore, columnMap, dataRange),
  };
}

function buildNormalizedRow(row, columnMap, sourceRowIndex) {
  return {
    source_row_index: sourceRowIndex,
    product_code: toNullableTrimmedString(getCell(row, columnMap.product_code)),
    product_name: toNullableTrimmedString(getCell(row, columnMap.product_name)),
    sale_price_type_code: toNullableTrimmedString(getCell(row, columnMap.sale_price_type_code)),
    sale_price_type_name: toNullableTrimmedString(getCell(row, columnMap.sale_price_type_name)),
    product_type: toNullableTrimmedString(getCell(row, columnMap.product_type)),
    sale_price: normalizeNumber(getCell(row, columnMap.sale_price)),
    spec: toNullableTrimmedString(getCell(row, columnMap.spec)),
    large_category: toNullableTrimmedString(getCell(row, columnMap.large_category)),
    medium_category: toNullableTrimmedString(getCell(row, columnMap.medium_category)),
    small_category: toNullableTrimmedString(getCell(row, columnMap.small_category)),
    detail_category: toNullableTrimmedString(getCell(row, columnMap.detail_category)),
    manufacturer_code: toNullableTrimmedString(getCell(row, columnMap.manufacturer_code)),
    manufacturer_name: toNullableTrimmedString(getCell(row, columnMap.manufacturer_name)),
  };
}

function normalizeDataRows(rows, columnMap, dataStartRowIndex, dataEndRowIndex) {
  const normalizedRows = [];

  for (let index = dataStartRowIndex; index <= dataEndRowIndex; index += 1) {
    const row = buildNormalizedRow(rows[index] ?? [], columnMap, index);
    if (!row.product_code && !row.product_name) {
      continue;
    }

    normalizedRows.push(row);
  }

  return normalizedRows;
}

function getSalePriceTypeKey(row) {
  return row.sale_price_type_code ?? row.sale_price_type_name ?? '__missing_sale_price_type__';
}

function buildAggregateRowId(row) {
  return `${row.product_code}__${getSalePriceTypeKey(row)}`;
}

function addWarning(target, warning) {
  if (!target.includes(warning)) {
    target.push(warning);
  }
}

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
    manufacturer_list: null,
    warnings: [],
    _manufacturers: new Map(),
    _taxPriceCandidates: [],
    _zeroTaxPriceCandidates: [],
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
    addWarning(target.warnings, `${field} 값이 원본 행마다 달라 첫 번째 값을 유지했습니다.`);
  }
}

function collectPriceCandidates(target, row) {
  if (row.sale_price == null) {
    addWarning(target.warnings, '매출단가를 숫자로 해석할 수 없는 행이 있습니다.');
    return;
  }

  const productType = row.product_type ?? '';
  if (productType.includes('과세') && productType.includes('영세')) {
    addWarning(target.warnings, '과세 구분에 과세와 영세가 함께 포함되어 있습니다.');
    return;
  }

  if (productType.includes('과세')) {
    target._taxPriceCandidates.push(row.sale_price);
    return;
  }

  if (productType.includes('영세')) {
    target._zeroTaxPriceCandidates.push(row.sale_price);
    return;
  }

  addWarning(target.warnings, '과세 구분을 과세/영세로 해석할 수 없는 행이 있습니다.');
}

function finalizePriceSlot(target, field, candidates, label) {
  const uniqueCandidates = [...new Set(candidates)];

  if (uniqueCandidates.length === 1) {
    target[field] = uniqueCandidates[0];
    return;
  }

  if (uniqueCandidates.length > 1) {
    addWarning(target.warnings, `${label} 매출단가 2개 이상여서 해당 데이터는 불러오지 않았습니다.`);
  }
}

function finalizeAggregate(target) {
  finalizePriceSlot(target, 'tax_price', target._taxPriceCandidates, '과세');
  finalizePriceSlot(target, 'zero_tax_price', target._zeroTaxPriceCandidates, '영세');
  target.manufacturer_list =
    target._manufacturers.size > 0 ? [...target._manufacturers.values()] : null;

  delete target._manufacturers;
  delete target._taxPriceCandidates;
  delete target._zeroTaxPriceCandidates;

  return target;
}

function aggregateRows(rows) {
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

    if (row.manufacturer_code || row.manufacturer_name) {
      const manufacturerKey = `${row.manufacturer_code ?? ''}::${row.manufacturer_name ?? ''}`;
      if (!aggregate._manufacturers.has(manufacturerKey)) {
        aggregate._manufacturers.set(manufacturerKey, {
          manufacturer_code: row.manufacturer_code,
          manufacturer_name: row.manufacturer_name,
        });
      }
    }

    groups.set(rowId, aggregate);
  }

  return [...groups.values()].map(finalizeAggregate);
}

export function extractSalesPriceSheetData(sheetRows) {
  const structure = analyzeWorksheetStructure(sheetRows);
  const normalizedRows = normalizeDataRows(
    sheetRows,
    structure.columnMap,
    structure.dataStartRowIndex,
    structure.dataEndRowIndex,
  );

  return {
    headerRowIndex: structure.headerRowIndex,
    dataStartRowIndex: structure.dataStartRowIndex,
    dataEndRowIndex: structure.dataEndRowIndex,
    rows: aggregateRows(normalizedRows),
    warnings: structure.warnings,
  };
}
