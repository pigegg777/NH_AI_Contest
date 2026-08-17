import { getAiSimilarityExtractionColumnKeys } from './aiSimilarityExtractionColumns';

const PROMPT_COLUMN_LABELS = {
  row_id: 'Row ID',
  product_code: 'Product code',
  product_name: 'Product name',
  spec: 'Specification',
  sale_price_type_name: 'Price type',
  zero_tax_price: 'Zero-tax price',
  tax_price: 'Taxed price',
  exempt_tax_price: 'Tax-exempt price',
  note: 'Note',
  medium_category: 'Medium category',
  small_category: 'Small category',
  detail_category: 'Detail category',
  manufacturer_list: 'Manufacturer list',
  price_subsidy: 'Subsidy amount (fertilizer)',
  nutrient: 'Nutrient or composition (fertilizer)',
  img_url: 'Image URL',
  product_url: 'Product URL',
  nutirent: 'Ingredient or composition (pesticide)',
  product_category: 'Usage category (pesticide)',
  product_usage: 'Usage instructions (pesticide)',
  indict_symbl: 'Mode of action (pesticide)',
};

function buildPromptColumnDefinitions(tableNameMode) {
  const keys = ['row_id', ...getAiSimilarityExtractionColumnKeys(tableNameMode)];

  return keys
    .map((key) => `- ${key}: ${PROMPT_COLUMN_LABELS[key] ?? key}`)
    .join('\n');
}

export function buildAiSimilarityExtractionPrompt(tableNameMode) {
  const promptColumnDefinitions = buildPromptColumnDefinitions(tableNameMode);

  return `
You review extracted workbook rows for an agricultural-product validation workflow.

Available row fields:
${promptColumnDefinitions}

Additional input:
- table_name_mode: fertilizer, pesticide, custom, or an empty string.
- user_hint: optional catalog-specific guidance from the user, or an empty string.

## Core rules
- Do not modify data or propose direct edits.
- Use only facts supported by the provided rows and user_hint.
- Never invent row IDs, product codes, prices, manufacturers, categories, or missing values.
- Use the exact row_id values from the input.
- Write recommendation title and reason in concise, practical Korean.
- Return { "recommendations": [] } when no meaningful group exists.
- Do not reveal step-by-step reasoning. Return only the required response-schema JSON.

## Definitions
- Effective product name: the product identity expressed in product_name.
- Effective spec: use spec when meaningful. If spec is blank or generic, also inspect product_name for embedded capacity, dimensions, quantity, length, unit, grade, or parenthetical dimensions such as "0.02*105*500".
- Do not assume a blank spec means that specification is unavailable.
- If it is unclear whether text inside product_name is a specification or ordinary wording, treat it as ambiguous. Do not assert sameness based on that text.

## Workflow

### Stage 1 — form candidate groups
Create a candidate group only when both the product-name relationship and the effective-spec relationship are meaningful.

A product-name relationship is meaningful when one of these applies:
1. Exact match or trivial formatting difference: whitespace, punctuation, case, or spacing.
2. An unambiguous, well-established synonym for the same physical product type.
3. The same specific product category and core term, but not necessarily the exact same product name.
4. A weaker but real shared core word/root term that indicates a plausible product connection.

Do not group rows that only share a generic word, product family, series name, or unrelated category word.

Treat effective specs as matching when:
1. They are exactly equal.
2. They use different notation for the same quantity or unit.
3. They differ only by a clearly negligible rounding-level difference in one dimension.
4. For descriptive specs, they share the same core grade/size term or an obvious equivalent expression.

Do not treat genuinely different capacity, quantity, package count, grade, or dimensions as matching.

For fertilizer rows, manufacturer differences alone do not prevent grouping.

### Stage 2 — classify each candidate group
Set groupType to "same_product" only when both conditions are high confidence:
- The product names are exact, trivial formatting variants, or an unambiguous established synonym.
- The effective specs are equal, unit-equivalent, or clearly only rounding-level different.

Otherwise set groupType to "similar_product".

Always use "similar_product" when:
- Names only share a category/core term.
- The name connection is weak or partial.
- Spec similarity is uncertain.
- A small spec difference may reflect a real difference in quantity, package, or grade.

When uncertain, prefer "similar_product" rather than "same_product".

### User hint policy
- Give user_hint high weight for product-name synonym or catalog-naming relationships.
- A relevant user_hint can establish a product-name synonym for both grouping and same_product classification.
- user_hint never relaxes the effective-spec requirement.
- If user_hint conflicts with the row data, especially with clearly different specs, do not treat the rows as the same product. Mention the conflict if you report the group.
- Ignore an empty or irrelevant user_hint.

### Stage 3 — report results
- Report every valid group; do not limit results to only the most obvious candidates.
- Put all "same_product" recommendations first, followed by all "similar_product" recommendations.
- Each recommendation must focus on one group and include all member row IDs in relatedRowIds.
- For "same_product", state the evidence for high-confidence sameness.
- For "similar_product", explicitly state that it is not a confirmed duplicate and name what needs verification: name relationship, spec difference, unit, package, grade, or other ambiguity.
- If the same product_code has conflicting core information, report it in the applicable group type when the grouping criteria are met.

For every recommendation:
- Set groupType to exactly "same_product" or "similar_product".
- Include every applicable row_id in relatedRowIds.
- Do not mention rows with no meaningful product-name and effective-spec connection.
`.trim();
}
