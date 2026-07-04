import { hasTrimmedText } from '../../../../common/utils/text';
import { getCell, normalizeHeaderCell } from '../../utils/worksheetCellUtils';

const HEADER_SCAN_LIMIT = 30;
const DATA_END_BLANK_ROW_STREAK = 2;
const HEADER_CONFIDENCE_THRESHOLD = 8;

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

const SALE_PRICE_TYPE_LABEL = '매출단가유형';

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

function detectHeaderRow(rows) {
  let bestIndex = 0;
  let bestScore = -1;

  for (
    let index = 0;
    index < Math.min(rows.length, HEADER_SCAN_LIMIT);
    index += 1
  ) {
    const normalizedCells = (rows[index] ?? []).map(normalizeHeaderCell);
    let score = 0;
    for (const cell of normalizedCells) {
      score += HEADER_WEIGHTS.get(cell) ?? 0;
    }
    const nextNonEmptyRow = rows
      .slice(index + 1, Math.min(rows.length, HEADER_SCAN_LIMIT))
      .find((row) =>
        (row ?? []).some((cell) => normalizeHeaderCell(cell) !== ''),
      );

    if (nextNonEmptyRow) {
      let nextRowScore = 0;
      for (const cell of nextNonEmptyRow.map(normalizeHeaderCell)) {
        nextRowScore += HEADER_WEIGHTS.get(cell) ?? 0;
      }

      if (nextRowScore >= HEADER_CONFIDENCE_THRESHOLD) {
        score -= HEADER_CONFIDENCE_THRESHOLD;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return {
    headerRowIndex: bestIndex,
    isLowConfidence: bestScore < HEADER_CONFIDENCE_THRESHOLD,
  };
}

function buildColumnMap(headerRow) {
  const columnMap = {};
  const salePriceTypeIndexes = [];

  headerRow.forEach((value, index) => {
    const normalized = normalizeHeaderCell(value);

    if (normalized === SALE_PRICE_TYPE_LABEL) {
      salePriceTypeIndexes.push(index);
      return;
    }

    for (const rule of COLUMN_RULES) {
      if (rule.labels.includes(normalized) && columnMap[rule.field] == null) {
        columnMap[rule.field] = index;
        break;
      }
    }
  });

  if (salePriceTypeIndexes.length >= 2) {
    columnMap.sale_price_type_code = salePriceTypeIndexes[0];
    columnMap.sale_price_type_name = salePriceTypeIndexes[1];
  } else if (salePriceTypeIndexes.length === 1) {
    columnMap.sale_price_type_name = salePriceTypeIndexes[0];
  }

  return columnMap;
}

function detectDataRange(rows, headerRowIndex, columnMap) {
  let dataStartRowIndex = headerRowIndex + 1;

  while (dataStartRowIndex < rows.length) {
    const row = rows[dataStartRowIndex] ?? [];
    const hasDataCandidate = Boolean(
      hasTrimmedText(getCell(row, columnMap.product_code)) ||
      hasTrimmedText(getCell(row, columnMap.product_name)),
    );

    if (hasDataCandidate) {
      break;
    }

    dataStartRowIndex += 1;
  }

  let dataEndRowIndex = dataStartRowIndex - 1;
  let blankRowStreak = 0;

  for (let index = dataStartRowIndex; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const hasDataCandidate = Boolean(
      hasTrimmedText(getCell(row, columnMap.product_code)) ||
      hasTrimmedText(getCell(row, columnMap.product_name)),
    );

    if (hasDataCandidate) {
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

function buildWorkbookWarnings(isLowConfidence, columnMap, dataRange) {
  const warnings = [];
  const requiredFields = [
    'product_code',
    'product_name',
    'sale_price',
    'product_type',
  ];

  if (isLowConfidence) {
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

export function analyzeWorksheetStructure(rows) {
  const { headerRowIndex, isLowConfidence } = detectHeaderRow(rows);
  const columnMap = buildColumnMap(rows[headerRowIndex] ?? []);
  const dataRange = detectDataRange(rows, headerRowIndex, columnMap);

  return {
    headerRowIndex,
    columnMap,
    dataStartRowIndex: dataRange.dataStartRowIndex,
    dataEndRowIndex: dataRange.dataEndRowIndex,
    warnings: buildWorkbookWarnings(isLowConfidence, columnMap, dataRange),
  };
}
