// Single source of truth for which row fields the AI recommendation prompt
// is told about AND actually receives. Edit these lists directly to change
// what the AI reviews — both the prompt's column definitions and the row
// payload sent to OpenAI are derived from them, so they can never drift.

export const AI_REVIEW_COMMON_COLUMN_KEYS = [
  'product_code',
  'product_name',
  'spec',
  'sale_price_type_name',
  'zero_tax_price',
  'tax_price',
  'exempt_tax_price',
];

export const AI_REVIEW_FERTILIZER_ONLY_COLUMN_KEYS = ['nutrient'];

export const AI_REVIEW_PESTICIDE_ONLY_COLUMN_KEYS = ['product_category'];

export function getAiReviewColumnKeys(tableNameMode) {
  if (tableNameMode === 'fertilizer') {
    return [
      ...AI_REVIEW_COMMON_COLUMN_KEYS,
      ...AI_REVIEW_FERTILIZER_ONLY_COLUMN_KEYS,
    ];
  }

  if (tableNameMode === 'pesticide') {
    return [
      ...AI_REVIEW_COMMON_COLUMN_KEYS,
      ...AI_REVIEW_PESTICIDE_ONLY_COLUMN_KEYS,
    ];
  }

  return [...AI_REVIEW_COMMON_COLUMN_KEYS];
}
