# Storefront Builder Mobile AI Studio PRD

## Problem Statement

The current storefront builder flow is too manual for the office-facing workflow that the team now wants.

Right now:

- Step 1 mixes product category selection with page-style inputs.
- Step 2 asks the user to choose medium categories manually.
- Step 3 asks the user to pick a first representative card manually.
- The builder still exposes `page title` and `subtitle` inputs even though the desired direction is AI-led drafting.
- The live preview is shown as a generic web panel instead of a mobile-shaped phone preview that matches the intended customer viewing context.

From the office user's perspective, this creates too many decision points before they can see a convincing draft. The desired flow is simpler: choose one uploaded product category first, then move into an AI conversation where recommendations appear as selectable suggestions, while the preview stays visible in a phone-shaped mobile frame on the same page.

## Solution

Rework the storefront builder into a two-step AI studio flow.

- `Step 1` becomes category selection only.
- `Step 2` becomes the main AI studio where the user refines tone, layout, field emphasis, and copy through conversational input plus recommended suggestion controls.
- Medium-category selection no longer appears as its own step. The builder should default to showing all medium categories available in the selected uploaded product category.
- The representative-card selection step is removed from the UI. Any compatibility field that still needs a representative medium category should be derived automatically from the first available visible medium category.
- `page title` and `subtitle` inputs are removed from the manual form. Those values are owned by the AI patch plus deterministic fallback copy rules.
- The live preview is always visible in a phone-shaped shell and should render as a mobile-first storefront on a single page.

This keeps the existing storefront config schema intact where practical, but changes the builder interaction model so the office user can reach a useful mobile storefront draft faster.

## User Stories

1. As an office user, I want Step 1 to only ask me for a product category page, so that I can begin with the simplest possible choice.
2. As an office user, I want uploaded product category options to remain visible as clear cards, so that I can tell whether I am adding a new page or editing an existing draft.
3. As an office user, I want the builder to move directly from category choice into AI refinement, so that I do not have to click through low-value setup steps.
4. As an office user, I want medium categories to be included by default, so that I see a complete storefront draft immediately.
5. As an office user, I do not want a separate medium-category selection step, so that the builder feels lighter.
6. As an office user, I do not want a representative-card selection step, so that I do not have to guess which category should anchor the page.
7. As an office user, I want AI recommendations to appear as selectable suggestions, so that I can refine the storefront without inventing every prompt from scratch.
8. As an office user, I want to still be able to type a free-form AI request, so that I can ask for a custom tone or layout change.
9. As an office user, I want the AI step to adjust the shared page style and card emphasis rather than product data itself, so that product rows stay trustworthy.
10. As an office user, I want page title and subtitle to be suggested automatically by AI, so that I do not need to write those fields manually.
11. As an office user, I want the preview to stay visible while I refine the draft, so that I can immediately judge the result.
12. As an office user, I want the preview to look like a phone, so that I can evaluate the customer-facing page in the intended reading format.
13. As an office user, I want the preview to render in a mobile-first width, so that spacing, card stacking, and search behavior look realistic.
14. As an office user, I want the storefront preview to remain on one page, so that I can scan the full composition without context switching.
15. As an office user, I want the search bar behavior to stay fixed in the public storefront preview, so that existing customer browsing behavior is preserved.
16. As an office user, I want `Save draft` to keep working after the new AI flow, so that I can reuse the storefront later.
17. As an office user, I want previously saved category drafts to still load into the new builder, so that the redesign does not discard existing work.
18. As an office user, I want the category-specific product scope to stay correct, so that a fertilizer page does not suddenly pull pesticide rows and vice versa.
19. As an office user, I want AI recommendations to start from the selected uploaded category, so that the page remains anchored to my office data.
20. As an office user, I want the builder wording to feel like an office storefront copilot rather than a generic card editor, so that the tool matches the project language.
21. As a maintainer, I want the existing storefront save schema to remain usable, so that this rework does not require a database migration.
22. As a maintainer, I want `selectedMediumCategories` to stay in the draft model even if the UI no longer exposes a dedicated step, so that saved drafts and preview filtering keep their current seam.
23. As a maintainer, I want `representativeMediumCategory` to be derived automatically for compatibility, so that downstream code does not break while the UI becomes simpler.
24. As a maintainer, I want AI patch handling to own title and subtitle updates, so that manual form inputs can be removed cleanly.
25. As a maintainer, I want page-level tests to verify the new two-step flow rather than old step sequencing, so that regressions are caught where users actually feel them.
26. As a maintainer, I want the preview renderer to support a mobile phone shell without changing product matching rules, so that rendering and data selection remain decoupled.
27. As a maintainer, I want the hook and model seams to stay clear, so that category defaults, AI patches, and save payload shaping remain testable.
28. As an AFK agent, I want the rework captured as one coherent PRD, so that implementation slices can be created without reopening the design discussion.

## Implementation Decisions

- Keep the storefront configuration split between `pageConfig`, `navConfig`, `categoryConfigs`, and `hiddenProducts`.
- Keep the existing office/product-category save model rather than introducing a new schema.
- Reduce the builder wizard to two active steps:
  - category selection
  - AI studio and save
- Remove the dedicated medium-category selection screen from the UI.
- Default the selected medium-category set to all available medium categories for the chosen uploaded product category.
- Remove the representative-card selection screen from the UI.
- Preserve `representativeMediumCategory` as a compatibility field in the saved draft, but derive it automatically from the first visible selected medium category.
- Remove manual `page title` and `subtitle` inputs from the builder form.
- Make AI patch application the primary owner of `navConfig.title` and `navConfig.subtitle`, with deterministic fallback copy when AI does not provide custom wording.
- Keep free-form AI prompting, but add recommended selectable suggestions in the same step so users can drive refinement through guided choices.
- Keep category scoping strict: the preview and save payload must continue to use only rows from the selected uploaded product category.
- Keep the search bar contract intact in the public storefront preview.
- Change the preview shell to a phone-shaped frame that stays visible throughout the builder.
- Render the preview using a mobile-first composition so the office user can review a realistic customer-facing page without leaving the builder.
- Keep AI changes limited to storefront styling, field emphasis, and copy guidance. AI must not mutate underlying office product data rows.
- Treat `StorefrontBuilderPage` as the highest behavioral seam for flow verification.
- Keep `useStorefrontBuilder` and `storefrontBuilderModel` as the seams that own defaults, compatibility derivation, and save payload shaping.
- Keep `requestStorefrontAiSuggestion` as the seam that translates prompt intent into builder patches.
- Keep `StorefrontView` as the seam that owns mobile storefront rendering, not draft-state orchestration.
- Do not introduce a database migration for this change.

## Testing Decisions

- Good tests should verify external behavior that an office user can observe, not internal implementation details like exact state variable names.
- Page-level builder tests should remain the primary seam for verifying:
  - the two-step flow
  - category-only Step 1
  - AI studio Step 2
  - removal of manual medium-category and representative-card steps
  - AI-driven title/subtitle updates
  - successful save behavior
- Hook/model tests should verify deterministic defaults and payload shaping:
  - selecting a category defaults all available medium categories
  - representative medium category is derived automatically
  - title/subtitle fallback rules remain stable
- AI service tests should verify that recommendation patches normalize into allowed builder fields and compatible nav copy.
- Preview tests should verify mobile-first rendering behavior and correct category scoping rather than CSS implementation trivia.
- Prior art already exists in the current storefront builder page test and storefront config service test; those should be updated rather than bypassed.

## Out of Scope

- QR generation
- Customer page publishing beyond the existing preview/save flow
- A full chat-history system for AI storefront editing
- New database tables or schema migrations for storefront data
- Admin-side page approval workflows
- Manual medium-category multi-select as a dedicated standalone builder step
- Manual representative-card selection as a dedicated standalone builder step
- Freeform non-storefront content authoring unrelated to office product data

## Further Notes

- This PRD supersedes the old builder-flow assumptions where `Step 2` and `Step 3` were category-structure choices rather than AI refinement.
- The implementation should preserve compatibility with already saved storefront drafts wherever the current config schema allows it.
- The expected testing seams for implementation are:
  - `StorefrontBuilderPage`
  - `useStorefrontBuilder`
  - `storefrontBuilderModel`
  - `requestStorefrontAiSuggestion`
  - `StorefrontView`
