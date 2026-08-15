import { getAiReviewColumnKeys } from './workbookAiReviewColumns';

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
  const keys = ['row_id', ...getAiReviewColumnKeys(tableNameMode)];

  return keys
    .map((key) => `- ${key}: ${PROMPT_COLUMN_LABELS[key] ?? key}`)
    .join('\n');
}

export function buildWorkbookAiAnalysisPrompt(tableNameMode) {
  const promptColumnDefinitions = buildPromptColumnDefinitions(tableNameMode);

  return `
You review extracted workbook rows for an agricultural product validation workflow.

The row objects use these data column keys:
${promptColumnDefinitions}

The input also includes:
- table_name_mode: the active table mode. Possible values include fertilizer, pesticide, custom, or an empty string.
- user_hint: optional free-text guidance from the person running this analysis, or an empty string.

General rules:
- Do not modify the workbook data.
- Do not invent row IDs, product codes, prices, manufacturers, categories, or missing facts. Use only facts that can be supported by the provided rows.
- Write title and reason in Korean. Keep each recommendation concise and practical.
- Use exact row_id values from the input.
- Return an empty recommendations array when there is no meaningful recommendation.

Your job has three stages, always in this order. Do not narrate field-by-field matching logic in your output — apply the stages and report the result.
1. Extract "similar product groups" using product_name and spec together.
2. Within those groups, judge which ones are the exact same product ("same_product") versus merely similar ("similar_product").
3. Report both — same_product groups first, then similar_product groups after them.

Effective spec:
- Some rows record the specification inside product_name itself instead of the separate spec field — for example, product_name "강선 10자" with spec left blank or generic, or product_name "저밀도흑색필름(0.02*105*500)/타조" with the dimensions embedded in parentheses (dimension values separated by "*"). Do not assume spec information is missing just because the spec field is blank: read product_name for a trailing or embedded size/length/quantity/unit token — including parenthetical dimension notation — and treat it as that row's effective spec throughout stages 1 and 2.
- If you cannot confidently tell whether part of product_name is a spec token or just wording, do not guess — treat it as ambiguous rather than asserting sameness or difference.
- Example: a row with product_name "강선" and spec "10자" and another row with product_name "강선 10자" and a blank spec field describe the same effective spec ("10자") and the same base product_name ("강선") — judge them the same way you would judge two rows that both used the separate spec field.

Stage 1 — similar product groups (product_name + spec):
- product_name in this dataset frequently uses a synonym or interchangeable term rather than being character-for-character identical (e.g. "필름" (film) and "비닐" (vinyl sheeting) for the same kind of product) — this is the common, expected case, not an edge case. Treat product_name as matching whenever it is exactly equal, a trivial formatting variation (whitespace, case, punctuation, spacing), OR a known synonym/interchangeable term for the same physical product type, with the rest of product_name otherwise the same or a trivial variation.
- Judge effective spec similarity using BOTH lenses, not numbers alone:
  - Numeric/dimensional: exactly equal, a trivial unit-notation variation of the exact same quantity, OR extremely close — e.g. a small rounding-level difference in a single dimension token — but not a genuinely different quantity, packaging, or grade.
  - Word-level: when spec is descriptive rather than purely numeric (e.g. a size or grade word like "특대"/"특대형", "대"/"대형"), treat it as matching when it shares the same core descriptive word or an obvious synonym/equivalent expression, the same way you judge product_name synonyms below — do not require numeric closeness for specs that aren't dimensional numbers in the first place.
- Form a similar product group whenever product_name matches (per above) AND effective spec matches under either lens above.
- product_name that is not a synonym match but shares the same specific product category and core term (e.g. "마늘비닐" and "마늘멀칭유공", both garlic mulching film) is an actively valid path, not just an edge case: when product_name shares the core term/category AND effective spec is also similar (per either lens above), form the group — this reliably lands as groupType "similar_product" (see stage 2), so use it whenever you see it.
- You may also form a group on a weaker product_name connection — e.g. sharing a core word or root term without being a full synonym or clean category match — as long as effective spec is also similar (per either lens above). This weaker-name path always lands as groupType "similar_product" (never same_product, see stage 2) — use it rather than excluding a row outright when there's a real but partial name connection, so the user can still see it and judge for themselves.
- Do not form a group when there is no real product_name connection at all — e.g. the names only share a generic, common word with no other relation (like two unrelated items that both happen to contain "농약" or "비료"). A concrete connection is required, but it does not need to be a clean synonym or category match — partial/weaker overlaps are fine per the point above.
- Example: rows with product_name "강선" and spec "10자", "6자", and "7자" do NOT form a group — the name is identical but the spec clearly differs, with no unit-notation equivalence and no rounding-level closeness. Treat them as three unrelated rows.
- For fertilizer products specifically, the same product may legitimately have multiple manufacturers in manufacturer_list — manufacturer differences alone are not a sign of a different product and never block a group.
- Do not form a group just because rows seem to belong to the same product line, series, or family without a concrete product_name+spec connection as described above — that kind of loose grouping is out of scope.
- Rows with no real product_name+spec connection are not worth mentioning at all — leave them out of the recommendations array entirely.

Stage 2 — which stage 1 groups are the same product (high-confidence promotion only):
- Promote a stage 1 group to groupType "same_product" when BOTH signals are high-confidence: product_name is an exact match, a trivial formatting variant, or an unambiguous, well-established synonym — AND effective spec is a strong match: exactly equal, a trivial unit-notation variant of the exact same quantity, OR extremely close (the rounding-level tier from stage 1, e.g. a small difference in a single dimension token).
- Keep groupType "similar_product" when product_name only shares the same specific product category rather than being an exact match or a well-established synonym (the category-sharing path from stage 1) — that name relationship alone is not high-confidence enough to promote, even when spec matches exactly.
- Also keep groupType "similar_product" when you are not confident the spec closeness is genuinely rounding-level noise rather than a real (if small) difference in quantity, packaging, or grade — when in doubt, do not promote.
- Every other stage 1 group is groupType "similar_product" — still worth surfacing, but not confirmed identical.

Stage 3 — reporting:
- Report every same_product group you identify.
- Report every similar_product group too. State explicitly in the reason that this is a similar-product-group candidate, not a confirmed duplicate, and specifically what still needs verifying (e.g. product_name relies on a synonym/shared category rather than an exact match, or spec is only approximately the same).
- Always place every similar_product group after every same_product group in your response array — same_product groups are the priority; similar_product groups are secondary, lower-confidence leads.
- Report every group you identify in both categories — do not limit yourself to a small subset or only the most obvious ones. The purpose of this feature is to give the user visibility into every candidate that met the stage 1 bar, including lower-confidence ones, not just a top few.

What else to look for:
- The same product_code appearing with conflicting core information — report as same_product if the rows otherwise meet the stage 2 promotion bar, or as similar_product otherwise.
- Groups where the rows probably refer to the same product but the evidence is not fully certain belong in similar_product, not same_product.

User-supplied hint:
- The input may include a user_hint field — optional free-text guidance from the person running this analysis, such as naming synonyms or grouping intent specific to their own catalog (for example, "필름과 비닐은 같은 상품으로 봐줘").
- Give user_hint high weight for product_name judgment specifically: when it states a naming/synonym/grouping relationship relevant to a candidate pair, treat that relationship as an established synonym for both stage 1 (group formation) and stage 2 (same_product promotion) — this is the person who owns the catalog telling you what their naming means, so trust it more than a pattern you'd have to infer yourself.
- This elevated weight applies only to product_name. It does NOT relax the spec requirement in either stage — effective spec must still independently satisfy the stage 1/stage 2 bar (exact, unit-notation equivalent, or extremely close) for the group to form or be promoted.
- If user_hint conflicts with what the row data actually shows (for example, it claims two things are the same but spec clearly differs), do not silently follow it — spec still gates the outcome regardless of the hint, and if you still report something related to the conflict, note the conflict in the reason.
- If user_hint is empty or not relevant to a given group, ignore it and rely on the rules above.

For each recommendation:
- Focus on one product group at a time.
- Set groupType to "same_product" or "similar_product" per stage 2.
- Explain why the rows were grouped together (which stage 1 condition applied).
- Use relatedRowIds to include all rows that belong to that group.
- Order your response with every same_product group first, followed by every similar_product group.

Do not propose direct edits. Recommend what the user should verify about grouping, sameness, and review priority.
`.trim();
}
