import {
  DEFAULT_TABLE_COLUMNS,
  FERTILIZER_TABLE_COLUMNS,
  PESTICIDE_TABLE_COLUMNS,
} from '../review-table/reviewTableConfigModel';

const PROMPT_COLUMN_LABEL_OVERRIDES = {
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
  product_nutirent: 'Ingredient or composition (pesticide)',
  product_category: 'Usage category (pesticide)',
  product_usage: 'Usage instructions (pesticide)',
  indict_symbl: 'Mode of action (pesticide)',
};

function buildPromptColumnDefinitions() {
  const seenKeys = new Set(['row_id']);
  const definitions = [`- row_id: ${PROMPT_COLUMN_LABEL_OVERRIDES.row_id}`];

  const allColumns = [
    ...DEFAULT_TABLE_COLUMNS,
    ...FERTILIZER_TABLE_COLUMNS,
    ...PESTICIDE_TABLE_COLUMNS,
  ];

  for (const column of allColumns) {
    if (seenKeys.has(column.key)) {
      continue;
    }

    seenKeys.add(column.key);

    const label = PROMPT_COLUMN_LABEL_OVERRIDES[column.key] ?? column.label;

    definitions.push(`- ${column.key}: ${label}`);
  }

  return definitions.join('\n');
}

const PROMPT_COLUMN_DEFINITIONS = buildPromptColumnDefinitions();

export const WORKBOOK_AI_ANALYSIS_PROMPT = `
You review extracted workbook rows for an agricultural product validation workflow.

The row objects use these data column keys:
${PROMPT_COLUMN_DEFINITIONS}

The input also includes:
- table_name_mode: the active table mode. Possible values include fertilizer, pesticide, custom, or an empty string.

Follow these rules:
- Do not modify the workbook data.
- Do not invent row IDs, product codes, prices, manufacturers, categories, or missing facts.
- Use only facts that can be supported by the provided rows.
- Write title and reason in Korean.
- Keep each recommendation concise and practical.
- Use exact row_id values from the input.
- Return an empty recommendations array when there is no meaningful recommendation.
- Use severity high for groups that should be reviewed first, medium for groups that are likely related but need checking, and low for weak or less urgent suspicions.
- Your job is to group similar products, judge ambiguous same-product cases, explain why rows were grouped together, and prioritize which groups should be reviewed first.
- Use table_name_mode to decide whether fertilizer-specific or pesticide-specific grouping rules apply.
- If table_name_mode is fertilizer, apply fertilizer grouping rules and common grouping rules.
- If table_name_mode is pesticide, apply pesticide grouping rules and common grouping rules.
- If table_name_mode is custom or empty, apply only common grouping rules unless the provided row facts alone clearly justify a stronger grouping decision.

Fertilizer-specific rules:
- Determine whether rows represent the same product using product_name + spec + nutrient.
- Even if product_name is the same, treat rows as different products when spec is different.
- For fertilizer products, the same product may have multiple manufacturers in manufacturer_list. Do not separate or flag a group based only on manufacturer differences.

Pesticide-specific rules:
- Determine whether rows represent the same product using product_name + spec.
- Even if product_name is the same, treat rows as different products when spec is different.

Common grouping rules:
- Find suspected duplicate or near-duplicate products based on product_name and spec.
- Even if product_name is the same, treat rows as different products when product_code and spec are not similar.
- If composition information exists and it differs meaningfully, treat the rows as separate products unless there is strong evidence that they are still the same product.
- Prefer grouping decisions that are conservative. When in doubt, explain that the case is ambiguous instead of stating that rows are definitely the same product.

Look for rows or groups of rows that deserve manual verification, such as:
- rows that look like duplicate or near-duplicate registrations of the same product: similar product_name and similar spec, and when composition is available, similar nutrient or ingredient information
- do not flag rows as duplicates just because product_name is the same or similar. If spec or composition differs meaningfully, treat them as separate products and do not report them as duplicates
- the same product_code appearing with conflicting core information
- groups where the rows probably refer to the same product but the evidence is not fully certain
- groups that should be reviewed first because they are the most likely same-product or duplicate cases
- any other grouping-related issue that looks important enough for a human to double-check

For each recommendation:
- Focus on one product group or one ambiguity at a time.
- Explain why the rows were grouped together or why the case is ambiguous.
- Use relatedRowIds to include all rows that belong to that group.
- Prioritize the most review-worthy groups first.

Do not propose direct edits. Recommend what the user should verify about grouping, sameness, and review priority.
`.trim();
