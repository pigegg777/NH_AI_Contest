import { toNullableTrimmedString, toTrimmedString } from '../../../../common/utils/text';
import { readWorkbookSheet } from '../../services/workbookSheetReader';
import { sanitizeAiBulkNoteNewRows } from './aiBulkNoteNewRowModel';
import { AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS } from './aiBulkNoteRequestBodyModel';

const HEADER_SCAN_LIMIT = 30;
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

export const AI_BULK_NOTE_REFERENCE_SHEET_ERROR = {
  UNSUPPORTED_EXTENSION: 'unsupported-extension',
  UNREADABLE: 'unreadable',
  TOO_MANY_ROWS: 'too-many-rows',
};

function hasAllowedExtension(fileName) {
  const lowerName = toTrimmedString(fileName).toLowerCase();
  return ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

/**
 * 참고 엑셀 한 건을 읽어 검증까지 마친다. 성공하면 { referenceSheet },
 * 실패하면 { error } 를 돌려준다 — 문구는 호출자가 정한다.
 */
export async function readAiBulkNoteReferenceSheet(file) {
  if (!hasAllowedExtension(file?.name)) {
    return { error: AI_BULK_NOTE_REFERENCE_SHEET_ERROR.UNSUPPORTED_EXTENSION };
  }

  let sheetName;
  let sheetRows;

  try {
    ({ sheetName, sheetRows } = await readWorkbookSheet(file));
  } catch {
    return { error: AI_BULK_NOTE_REFERENCE_SHEET_ERROR.UNREADABLE };
  }

  if (sheetRows.length > AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS) {
    return {
      error: AI_BULK_NOTE_REFERENCE_SHEET_ERROR.TOO_MANY_ROWS,
      maxRows: AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS,
    };
  }

  return {
    referenceSheet: { fileName: file.name, sheetName, rows: sheetRows },
  };
}
const APPEND_INSTRUCTION_PATTERN = /(?:추가|신규\s*(?:상품|데이터)?\s*등록|(?:상품|제품|품목|데이터|엑셀).{0,8}등록|등록.{0,8}(?:상품|제품|품목|데이터|엑셀))/;

const FIELD_ALIASES = {
  product_code: ['상품코드', '제품코드', '품목코드', '자재코드'],
  product_name: ['상품명', '제품명', '품목명', '자재명'],
  spec: ['규격', '상품규격', '제품규격'],
  large_category: ['대분류'],
  medium_category: ['중분류'],
  small_category: ['소분류'],
  detail_category: ['세분류', '상세분류'],
  sale_price_type_code: ['단가유형코드', '가격유형코드'],
  sale_price_type_name: ['단가유형', '가격유형'],
  note: ['비고', '메모'],
  zero_tax_price: ['영세단가', '영세가격'],
  tax_price: ['과세단가', '과세가격'],
  exempt_tax_price: ['면세단가', '면세가격'],
};

const MEMBER_PRICE_ALIASES = ['조합원가격', '정상가', '판매단가'];
const TAX_TYPE_ALIASES = ['상품구분', '과세구분', '세금구분'];
const PRICE_LIKE_HEADER_PATTERN = /(?:가격|단가|정상가|판매가|공급가|공급액|금액)$/;
const SALE_PRICE_HEADER_PATTERN = /(?:가격|단가|정상가|판매가|공급가|공급액)$/;

function normalizeHeader(value) {
  return toTrimmedString(value)
    .toLowerCase()
    .replace(/[\s()[\]{}_.:/\\-]+/g, '');
}

function buildAliasSet(aliases) {
  return new Set(aliases.map(normalizeHeader));
}

const NORMALIZED_FIELD_ALIASES = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([field, aliases]) => [field, buildAliasSet(aliases)]),
);
const NORMALIZED_MEMBER_PRICE_ALIASES = buildAliasSet(MEMBER_PRICE_ALIASES);
const NORMALIZED_TAX_TYPE_ALIASES = buildAliasSet(TAX_TYPE_ALIASES);

function findHeaderRowIndex(rows) {
  const limit = Math.min(rows.length, HEADER_SCAN_LIMIT);

  for (let rowIndex = 0; rowIndex < limit; rowIndex += 1) {
    const cells = Array.isArray(rows[rowIndex]) ? rows[rowIndex].map(normalizeHeader) : [];
    const hasProductCode = cells.some((cell) => NORMALIZED_FIELD_ALIASES.product_code.has(cell));
    const hasProductName = cells.some((cell) => NORMALIZED_FIELD_ALIASES.product_name.has(cell));

    if (hasProductCode && hasProductName) {
      return rowIndex;
    }
  }

  return -1;
}

function findExplicitPriceColumnIndex(headerRow, instruction) {
  const normalizedInstruction = normalizeHeader(instruction);

  if (normalizedInstruction === '') {
    return null;
  }

  const matchingIndexes = headerRow
    .map((header, columnIndex) => ({
      columnIndex,
      normalizedHeader: normalizeHeader(header),
    }))
    .filter(({ normalizedHeader }) =>
      PRICE_LIKE_HEADER_PATTERN.test(normalizedHeader) &&
      normalizedInstruction.includes(normalizedHeader),
    )
    .map(({ columnIndex }) => columnIndex);

  return matchingIndexes.length === 1 ? matchingIndexes[0] : null;
}

function findUnambiguousSalePriceColumnIndex(headerRow) {
  const matchingIndexes = headerRow
    .map((header, columnIndex) => ({
      columnIndex,
      normalizedHeader: normalizeHeader(header),
    }))
    .filter(({ normalizedHeader }) => SALE_PRICE_HEADER_PATTERN.test(normalizedHeader))
    .map(({ columnIndex }) => columnIndex);

  return matchingIndexes.length === 1 ? matchingIndexes[0] : null;
}

function buildColumnMap(headerRow, instruction = '') {
  const columnMap = {};

  headerRow.forEach((header, columnIndex) => {
    const normalizedHeader = normalizeHeader(header);

    for (const [field, aliases] of Object.entries(NORMALIZED_FIELD_ALIASES)) {
      if (!(field in columnMap) && aliases.has(normalizedHeader)) {
        columnMap[field] = columnIndex;
      }
    }

    if (columnMap.member_price == null && NORMALIZED_MEMBER_PRICE_ALIASES.has(normalizedHeader)) {
      columnMap.member_price = columnIndex;
    }
    if (columnMap.tax_type == null && NORMALIZED_TAX_TYPE_ALIASES.has(normalizedHeader)) {
      columnMap.tax_type = columnIndex;
    }
  });

  if (columnMap.member_price == null) {
    columnMap.member_price =
      findExplicitPriceColumnIndex(headerRow, instruction) ??
      findUnambiguousSalePriceColumnIndex(headerRow);
  }

  return columnMap;
}

function readCell(row, columnIndex) {
  return columnIndex == null ? null : row[columnIndex];
}

function normalizeCategory(value) {
  const text = toNullableTrimmedString(value);
  return text ? toNullableTrimmedString(text.replace(/^\[[^\]]*\]\s*/, '')) : null;
}

function applyMemberPrice(newRow, row, columnMap) {
  const memberPrice = readCell(row, columnMap.member_price);

  if (memberPrice == null || memberPrice === '') {
    return;
  }

  const taxType = toTrimmedString(readCell(row, columnMap.tax_type));

  if (taxType.includes('영세')) {
    newRow.zero_tax_price = memberPrice;
  } else if (taxType.includes('면세')) {
    newRow.exempt_tax_price = memberPrice;
  } else if (taxType.includes('과세')) {
    newRow.tax_price = memberPrice;
  }
}

export function isReferenceSheetAppendInstruction(instruction) {
  return APPEND_INSTRUCTION_PATTERN.test(toTrimmedString(instruction));
}

export function requiresAiPriceColumnMapping(referenceSheet, instruction = '') {
  const rows = Array.isArray(referenceSheet?.rows) ? referenceSheet.rows : [];
  const headerRowIndex = findHeaderRowIndex(rows);

  if (headerRowIndex < 0) {
    return false;
  }

  const headerRow = Array.isArray(rows[headerRowIndex]) ? rows[headerRowIndex] : [];
  const columnMap = buildColumnMap(headerRow, instruction);
  const recognizedPriceIndexes = new Set([
    columnMap.member_price,
    columnMap.zero_tax_price,
    columnMap.tax_price,
    columnMap.exempt_tax_price,
  ].filter((index) => index != null));
  const normalizedInstruction = normalizeHeader(instruction);
  const unknownPriceHeaders = headerRow
    .map((header, columnIndex) => ({
      columnIndex,
      normalizedHeader: normalizeHeader(header),
    }))
    .filter(({ columnIndex, normalizedHeader }) =>
      !recognizedPriceIndexes.has(columnIndex) &&
      PRICE_LIKE_HEADER_PATTERN.test(normalizedHeader),
    );

  if (unknownPriceHeaders.length === 0) {
    return false;
  }

  return recognizedPriceIndexes.size === 0 || unknownPriceHeaders.some(
    ({ normalizedHeader }) => normalizedInstruction.includes(normalizedHeader),
  );
}

export function extractRecognizedReferenceSheetRows(referenceSheet, instruction = '') {
  const rows = Array.isArray(referenceSheet?.rows) ? referenceSheet.rows : [];
  const headerRowIndex = findHeaderRowIndex(rows);

  if (headerRowIndex < 0) {
    return [];
  }

  const headerRow = Array.isArray(rows[headerRowIndex]) ? rows[headerRowIndex] : [];
  const columnMap = buildColumnMap(headerRow, instruction);
  const newRows = [];

  for (const rawRow of rows.slice(headerRowIndex + 1)) {
    if (!Array.isArray(rawRow)) {
      continue;
    }

    const newRow = {
      product_code: readCell(rawRow, columnMap.product_code),
      product_name: readCell(rawRow, columnMap.product_name),
      spec: readCell(rawRow, columnMap.spec),
      large_category: normalizeCategory(readCell(rawRow, columnMap.large_category)),
      medium_category: normalizeCategory(readCell(rawRow, columnMap.medium_category)),
      small_category: normalizeCategory(readCell(rawRow, columnMap.small_category)),
      detail_category: normalizeCategory(readCell(rawRow, columnMap.detail_category)),
      sale_price_type_code: readCell(rawRow, columnMap.sale_price_type_code),
      sale_price_type_name:
        readCell(rawRow, columnMap.sale_price_type_name) ?? readCell(rawRow, columnMap.tax_type),
      note: readCell(rawRow, columnMap.note),
      zero_tax_price: readCell(rawRow, columnMap.zero_tax_price),
      tax_price: readCell(rawRow, columnMap.tax_price),
      exempt_tax_price: readCell(rawRow, columnMap.exempt_tax_price),
    };

    applyMemberPrice(newRow, rawRow, columnMap);
    newRows.push(newRow);
  }

  return sanitizeAiBulkNoteNewRows({ action: 'append_rows', new_rows: newRows });
}
