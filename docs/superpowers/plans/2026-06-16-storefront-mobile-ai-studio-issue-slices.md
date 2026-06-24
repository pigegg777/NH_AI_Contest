# Storefront Mobile AI Studio Issue Slice Draft

Parent PRD target:

- `Storefront Builder 재구성: 2-step AI 스튜디오와 모바일 프리뷰 고정`

## Proposed vertical slices

1. **Title:** Storefront builder: category-only Step 1 and default full-category draft
   **Type:** AFK
   **Blocked by:** None - can start immediately
   **User stories covered:** 1, 2, 3, 4, 5, 6, 17, 18, 21, 22, 23, 27
   **What to build:** Compress the builder entry flow so Step 1 only chooses an uploaded product category page. When a category is selected, default all medium categories automatically, derive the compatibility representative category automatically, and remove the dedicated manual category-structure steps from the UI while preserving save compatibility.

2. **Title:** Storefront builder: AI studio recommendations and auto copy patching
   **Type:** AFK
   **Blocked by:** Slice 1
   **User stories covered:** 7, 8, 9, 10, 15, 16, 19, 20, 24, 25
   **What to build:** Turn the second step into the main AI studio. Add guided recommendation controls alongside free-form prompting, remove manual page title/subtitle inputs, and let the AI patch plus fallback copy rules update shared page copy, card emphasis, and page tone while preserving product data integrity.

3. **Title:** Storefront preview: persistent phone-frame mobile rendering
   **Type:** AFK
   **Blocked by:** Slice 1
   **User stories covered:** 11, 12, 13, 14, 15, 26
   **What to build:** Keep the preview visible throughout the builder, wrap it in a phone-shaped shell, and render the storefront with mobile-first spacing and one-page scrolling while preserving the existing search and section behavior.

## Publishing note

These slices are intentionally thin and demoable:

- Slice 1 proves the new builder flow and compatibility defaults.
- Slice 2 proves the AI-first editing experience.
- Slice 3 proves the mobile preview shell and customer-facing rendering quality.

Publish child issues only after the user confirms that this granularity and dependency order are correct.
