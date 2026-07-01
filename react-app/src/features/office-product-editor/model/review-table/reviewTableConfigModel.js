export const MAX_WARNING_ROW_COUNT = 30;

const EXTENDED_ONLY_COLUMN_KEYS = new Set([
  'nutrient',
  'price_subsidy',
  'img_url',
  'product_url',
]);

export const FERTILIZER_TABLE_COLUMNS = [
  { key: 'product_code', label: '상품코드' },
  { key: 'product_name', label: '상품명' },
  { key: 'spec', label: '규격' },
  { key: 'sale_price_type_code', label: '유형코드' },
  { key: 'sale_price_type_name', label: '단가유형' },
  { key: 'zero_tax_price', label: '영세단가' },
  { key: 'tax_price', label: '과세단가' },
  { key: 'exempt_tax_price', label: '면세단가' },
  { key: 'price_subsidy', label: '보조금' },
  { key: 'note', label: '비고' },
  { key: 'nutrient', label: '성분' },
  { key: 'img_url', label: '이미지 URL' },
  { key: 'product_url', label: '상품 URL' },
  // { key: 'large_category', label: '대분류' },
  { key: 'medium_category', label: '중분류' },
  { key: 'small_category', label: '소분류' },
  { key: 'detail_category', label: '세분류' },
  { key: 'manufacturer_list', label: '제조업체' },
];

export const DEFAULT_TABLE_COLUMNS = FERTILIZER_TABLE_COLUMNS.filter(
  (column) => !EXTENDED_ONLY_COLUMN_KEYS.has(column.key),
);

export const PESTICIDE_TABLE_COLUMNS = [
  ...DEFAULT_TABLE_COLUMNS,
  { key: 'product_nutirent', label: '성분' },
  { key: 'product_category', label: '분류' },
  { key: 'product_usage', label: '사용법' },
  { key: 'indict_symbl', label: '작용기작' },
];

export function getTableColumnsByMode(tableNameMode) {
  if (tableNameMode === 'fertilizer') {
    return FERTILIZER_TABLE_COLUMNS;
  }

  if (tableNameMode === 'pesticide') {
    return PESTICIDE_TABLE_COLUMNS;
  }

  return DEFAULT_TABLE_COLUMNS;
}

export function createInitialSortState() {
  return {
    key: 'product_code',
    direction: 'asc',
  };
}
