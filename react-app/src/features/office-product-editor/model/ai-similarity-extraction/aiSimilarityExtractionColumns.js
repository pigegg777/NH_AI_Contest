export const AI_SIMILARITY_EXTRACTION_COMMON_COLUMN_KEYS = [
  'product_code',
  'product_name',
  'spec',
  'sale_price_type_name',
  'zero_tax_price',
  'tax_price',
  'exempt_tax_price',
];

export const AI_SIMILARITY_EXTRACTION_FERTILIZER_ONLY_COLUMN_KEYS = [
  'nutrient',
];

export const AI_SIMILARITY_EXTRACTION_PESTICIDE_ONLY_COLUMN_KEYS = [
  'product_category',
];

export function getAiSimilarityExtractionColumnKeys(tableNameMode) {
  if (tableNameMode === 'fertilizer') {
    return [
      ...AI_SIMILARITY_EXTRACTION_COMMON_COLUMN_KEYS,
      ...AI_SIMILARITY_EXTRACTION_FERTILIZER_ONLY_COLUMN_KEYS,
    ];
  }

  if (tableNameMode === 'pesticide') {
    return [
      ...AI_SIMILARITY_EXTRACTION_COMMON_COLUMN_KEYS,
      ...AI_SIMILARITY_EXTRACTION_PESTICIDE_ONLY_COLUMN_KEYS,
    ];
  }

  return [...AI_SIMILARITY_EXTRACTION_COMMON_COLUMN_KEYS];
}
