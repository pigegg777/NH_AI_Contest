// const FERTILIZER_EXTENSION_INSERT_AFTER_KEY = 'exempt_tax_price';

export const DEFAULT_TABLE_COLUMNS = [
  { key: 'product_code', label: '상품코드' },
  { key: 'product_name', label: '상품명' },
  { key: 'spec', label: '규격' },
  // { key: 'sale_price_type_code', label: '유형코드' },
  { key: 'sale_price_type_name', label: '단가유형' },
  { key: 'zero_tax_price', label: '영세단가' },
  { key: 'tax_price', label: '과세단가' },
  { key: 'exempt_tax_price', label: '면세단가' },
  { key: 'note', label: '비고' },
  { key: 'medium_category', label: '중분류' },
  { key: 'small_category', label: '소분류' },
  { key: 'detail_category', label: '세분류' },
  { key: 'manufacturer_list', label: '제조업체' },
];

const FERTILIZER_ONLY_TABLE_COLUMNS = [
  { key: 'price_subsidy', label: '보조금' },
  { key: 'nutrient', label: '성분' },
  { key: 'img_url', label: '이미지 URL' },
  { key: 'product_url', label: '상품 URL' },
];

const PESTICIDE_ONLY_TABLE_COLUMNS = [
  { key: 'nutirent', label: '성분' },
  { key: 'product_category', label: '용도' },
  { key: 'product_usage', label: '사용법' },
  { key: 'indict_symbl', label: '작용기작' },
];

function insertColumnsAfter(columns, afterKey, columnsToInsert) {
  const insertIndex = columns.findIndex((column) => column.key === afterKey);

  if (insertIndex < 0) {
    return [...columns, ...columnsToInsert];
  }

  return [
    ...columns.slice(0, insertIndex + 1),
    ...columnsToInsert,
    ...columns.slice(insertIndex + 1),
  ];
}

export const FERTILIZER_TABLE_COLUMNS = [
  ...DEFAULT_TABLE_COLUMNS,
  // FERTILIZER_EXTENSION_INSERT_AFTER_KEY,
  ...FERTILIZER_ONLY_TABLE_COLUMNS,
];

export const PESTICIDE_TABLE_COLUMNS = [
  ...DEFAULT_TABLE_COLUMNS,
  ...PESTICIDE_ONLY_TABLE_COLUMNS,
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
