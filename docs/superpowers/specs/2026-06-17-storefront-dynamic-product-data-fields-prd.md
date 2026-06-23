# Storefront Builder Dynamic Product Data Field Selection PRD

## Problem Statement

현재 storefront 빌더의 `상품카드에 보여줄 내용` 설정은 고정된 필드 목록만 전제로 하고 있다.

하지만 실제 office-facing workflow에서는 `office_product_datas.product_data` 안의 row 구조가 카테고리마다 다를 수 있고, 사용자는 선택한 `product_category_name`에 들어 있는 실제 column 기준으로 카드 노출 항목을 고르고 싶어 한다.

예를 들어 같은 office product data 안에서도 row에는 `note`, `row_id`, `product_code`, `sale_price_type_name`, `shadow`, `manufacturer_list`, `product_type_variants` 같은 key가 들어 있을 수 있다. 지금 구조에서는 이런 key들이 Step 2 테이블에 모두 드러나지 않거나, 저장과 AI patch가 고정 whitelist만 허용하기 때문에 사용자가 새 필드를 골라도 draft와 preview에 안정적으로 반영되지 않는다.

사용자 관점에서 필요한 것은 다음과 같다.

- 선택한 `product_category_name`의 실제 row에 있는 모든 key를 Step 2 테이블에서 볼 수 있어야 한다.
- 카드에 넣을 수 있는 값과 넣을 수 없는 값을 한눈에 구분할 수 있어야 한다.
- 선택 가능한 필드를 체크하면 preview와 saved draft에 그대로 반영되어야 한다.
- 배열과 객체 값도 데이터에 존재한다는 사실은 보여야 하지만, 카드에는 무리하게 노출하지 않아야 한다.

## Solution

storefront 빌더의 Step 2 `상품카드에 보여줄 내용` 테이블을 고정 필드 목록 기반에서 동적 column 탐색 기반으로 바꾼다.

선택된 `product_category_name`에 대응하는 `office_product_datas.product_data` row들을 기준으로 모든 key를 수집하고, 테이블에는 모든 key를 보여준다. 다만 카드에 실제로 선택 가능한 필드는 `string`, `number`, `boolean`, `null` 계열의 스칼라 값으로 제한한다. `array`와 `object` 계열의 값은 테이블에 표시하되 카드 선택은 비활성화한다.

이 변경은 단순 UI 추가에 그치지 않고 다음까지 포함한다.

- 동적 key 수집
- scalar field 판별
- preview 반영
- saved draft 정규화
- AI patch 허용 필드 정규화
- 기존 legacy field behavior와의 호환 유지

결과적으로 office user는 선택한 product category의 실제 office product data 구조를 기준으로 카드 구성을 직접 고를 수 있고, 유지보수자는 storefront draft가 고정 field schema에 묶이지 않으면서도 안전한 저장 규칙을 유지할 수 있다.

## User Stories

1. As an office user, I want the Step 2 field table to be generated from the selected `product_category_name`, so that I configure cards from the actual office product data I uploaded.
2. As an office user, I want every key that exists in the selected `product_data` rows to appear in the table, so that I can understand what data is available for the storefront.
3. As an office user, I want fields like `note`, `row_id`, `product_code`, and `sale_price_type_name` to appear without extra setup, so that newly uploaded schemas are usable immediately.
4. As an office user, I want the table to show an example value for each key, so that I can decide quickly whether that field is useful on a product card.
5. As an office user, I want the example value to come from the currently selected office product category context, so that the preview settings reflect the real data I am editing.
6. As an office user, I want scalar fields to be selectable for card display, so that I can build a useful storefront card without waiting for new hardcoded options.
7. As an office user, I want array and object fields to still be visible in the table, so that I know those values exist in the office product data.
8. As an office user, I want array and object fields to be disabled for card display, so that I am not allowed to choose values that would render poorly on a storefront card.
9. As an office user, I want disabled fields to explain why they cannot be selected, so that the UI feels intentional rather than broken.
10. As an office user, I want checkbox changes in the table to update the mobile storefront preview immediately, so that I can judge the card composition without saving.
11. As an office user, I want selected dynamic fields to persist in the storefront draft, so that I do not lose my card choices when I return later.
12. As an office user, I want dynamic field selection to work for fertilizer, pesticide, and future custom categories alike, so that the builder adapts to office-specific uploads.
13. As an office user, I want the storefront card to keep its product-focused presentation, so that extra fields do not break the visual hierarchy.
14. As an office user, I want `product_name` to continue behaving like the primary card identity field, so that the storefront still reads like a product page.
15. As an office user, I want price-like values such as `tax_price` to keep a human-readable format in preview, so that the storefront remains understandable to customers.
16. As an office user, I want fallback labels to work for unknown keys, so that even brand-new upload columns are understandable in the table and preview.
17. As an office user, I want dynamic fields to remain scoped to the selected `product_category_name`, so that fields from unrelated uploads do not leak into the current page.
18. As a maintainer, I want `office_product_datas.product_data` to remain the single source of truth for available card fields, so that the storefront builder stays aligned with uploaded office product data.
19. As a maintainer, I want the draft model to stop assuming a fixed global storefront field list, so that category-specific fields can be saved safely.
20. As a maintainer, I want scalar field eligibility to be determined deterministically from row values, so that UI behavior does not depend on ad hoc exceptions.
21. As a maintainer, I want AI patch handling to normalize card fields against the currently allowed scalar keys, so that AI cannot inject unsupported array or object fields into the storefront draft.
22. As a maintainer, I want legacy storefront drafts with older fixed fields to keep loading correctly, so that this change does not break existing saved category configs.
23. As a maintainer, I want preview rendering to support dynamic scalar fields without special-case branching for every new upload column, so that future field additions remain cheap.
24. As a maintainer, I want tests to verify behavior from the page, hook, model, and AI seams, so that regressions are caught close to user-visible outcomes.
25. As an AFK agent, I want the change captured as a dedicated PRD, so that implementation can proceed without reopening the design decision around dynamic fields versus fixed field lists.

## Implementation Decisions

- The builder will derive available card fields from the selected `product_category_name` entry inside `office_product_datas.product_data`.
- The field table will be populated from the union of keys found across the selected category's rows, not from a fixed global storefront field constant.
- Field metadata will be derived per key:
  - display label
  - example value
  - value type classification
  - selectability for card display
- A field is selectable only when its value shape is scalar across the selected category context:
  - `string`
  - `number`
  - `boolean`
  - `null` or empty values that belong to an otherwise scalar field
- `array` and `object` fields, including cases like `manufacturer_list`, `product_type_variants`, and `warnings`, will appear in the table but will not be selectable for card display.
- The table will continue to live in Step 2 of the storefront builder and remain coupled to the always-visible mobile preview.
- Example values should come from the representative row logic already used by the builder, with fallback to the first row in the selected category when needed.
- Existing known labels such as `product_name`, `spec`, and `tax_price` should keep their friendly labels. Unknown keys should fall back to their raw key names rather than disappearing.
- The storefront draft model will allow `visibleFields` to contain dynamic scalar keys from the selected category, rather than limiting values to the previous fixed field whitelist.
- Draft normalization must remain defensive:
  - unknown fields not present in the selected category should be removed
  - non-scalar fields should not be stored as visible card fields
  - empty field sets should fall back to a safe default card field set
- Preview rendering should treat dynamic scalar fields generically in the card body, while preserving existing special presentation behavior for key product fields such as `product_name`, `spec`, `nutrient`, and `tax_price`.
- Existing card element compatibility behavior should remain intact where practical, but it should no longer block generic dynamic scalar fields from rendering in the card body.
- AI patch normalization will be updated so `cardFields` can only resolve to scalar fields allowed by the currently selected office product data category.
- The AI suggestion layer should remain allowed to recommend field emphasis, but it must not output non-selectable array or object fields into the applied patch.
- No database migration is required. The change is contained within builder derivation, normalization, preview rendering, and AI-field validation.
- The office-facing language should remain consistent with existing project vocabulary:
  - `office_product_datas`
  - `product_data`
  - `product_category_name`
  - `storefront`
  - `office product data`
  - `medium category`

## Testing Decisions

- Good tests should verify user-observable behavior and stable external contracts, not internal implementation details such as exact local variable names or incidental helper structure.
- Page-level tests should remain the highest seam for the main behavior:
  - the Step 2 table shows all keys from the selected `product_category_name`
  - scalar fields are selectable
  - array and object fields are visible but disabled
  - selecting a scalar field updates the mobile preview
  - selected dynamic fields survive save payload generation
- Hook and model tests should verify deterministic shaping logic:
  - key union across selected category rows
  - scalar versus non-scalar classification
  - example value derivation
  - visible field normalization against currently available category keys
  - fallback behavior when no valid selected field remains
- Preview-level tests should verify that dynamic scalar fields render in the storefront card body with stable formatting, while non-selected fields do not appear.
- AI service tests should verify that the normalized AI patch accepts valid dynamic scalar fields and rejects array or object fields.
- Prior art for these tests already exists in the current storefront page tests, builder tests, config-model tests, and storefront AI service tests. Those seams should be extended rather than bypassed.

## Out of Scope

- Rendering arrays or objects as rich multi-line card blocks
- Introducing a separate schema registry for office product data fields
- Migrating `office_product_datas` into a new normalized relational field-definition table
- Redesigning the public storefront card layout beyond what is required to support dynamic scalar fields
- Editing raw office product data values from inside the storefront builder
- AI-generated transformation of `array` or `object` fields into custom card widgets
- Changes to QR generation, publishing workflows, or storefront approval flows

## Further Notes

- This PRD assumes the user-approved rule that all row keys should be shown in the table, but only scalar fields should be selectable for card display.
- The implementation should preserve compatibility with previously saved storefront drafts that still rely on the earlier fixed field defaults.
- The dynamic field derivation must stay category-scoped. A storefront page for one `product_category_name` must never borrow available card fields from a different upload category.
- The expected seams for implementation and regression coverage are:
  - `StorefrontBuilderPage`
  - `useStorefrontBuilder`
  - `storefrontBuilderModel`
  - `CardGridSection`
  - `StorefrontView`
  - `requestStorefrontAiSuggestion`
