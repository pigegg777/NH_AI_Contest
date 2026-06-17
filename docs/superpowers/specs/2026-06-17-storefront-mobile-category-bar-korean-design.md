# Storefront Mobile Category Bar And Korean UI Design

## Goal

Refine the public storefront mobile view so the top area clearly shows the current product category context and all fixed UI copy is presented in Korean.

## Approved Scope

- Mobile-first only. No desktop sidebar work.
- Show the current `product_category_name` in the top storefront area.
- Show the matching `medium_category` values for the first visible section in a compact mobile info bar.
- Keep category chips, but reduce their visual size.
- Translate all fixed English storefront UI text to Korean.
- Do not modify source product data values.
- Do not change DB schema or saved config shape for this request.

## Current Context

- `StorefrontView.jsx` already renders hero, search, chips, and product sections.
- Section rows are derived from existing storefront config plus source product rows.
- Chips are already generated from current product rows.
- The first visible section can be resolved from `buildSections(...)` output without touching source data.

## Recommended Approach

Use a pure render-layer change in `StorefrontView` and related label/CSS files.

Why:

- No schema churn.
- No AI/save-path changes needed.
- Lowest-risk way to add category context and Korean UI.
- Keeps existing filtering behavior intact.

## Design

### 1. Mobile category info bar

Add a compact info block in the hero area for the first visible section:

- primary text: current `product_category_name`
- secondary row: unique `medium_category` values from that section's visible products

Rules:

- if there are no visible sections, hide the block
- if a product has no `medium_category`, skip that value
- dedupe while preserving visible order

### 2. Smaller category chips

Keep the existing category chip filter interaction, but reduce:

- height
- horizontal padding
- font size
- gap between chips

This is a style-only refinement. Filtering behavior stays unchanged.

### 3. Korean UI copy

Translate fixed storefront UI strings to Korean, including:

- hero eyebrow/title fallback copy
- search placeholder fallback copy
- search helper text
- empty-state text
- card field labels such as product/spec/price/link/category labels

Do not translate:

- source product names
- source category values from data rows
- saved user-authored titles/subtitles already stored in config

## Data Flow

1. Product rows are filtered as before.
2. Visible sections are built as before.
3. The first visible section becomes the source for the mobile category info bar.
4. UI renders `product_category_name` and deduped visible `medium_category` values.
5. Chips continue filtering the same visible rows.

## Error Handling

- No sections -> hide the mobile category info bar.
- No medium categories -> render category title only.
- Missing saved nav strings -> use Korean fallback copy.

## Testing

- Update `PublicStorefrontPage.test.jsx` to assert:
  - mobile category info bar renders from the first visible section
  - section category name appears
  - visible medium categories appear
  - chips still filter correctly
  - fixed fallback UI strings are Korean

## Non-Goals

- Desktop sidebar
- Changing source product data
- Changing AI prompt/save schema
- Translating user data values

## Result

Public storefront mobile view becomes clearer and more localized: users see which product category they are browsing, which middle categories belong to it, and all fixed interface copy is presented in Korean.
