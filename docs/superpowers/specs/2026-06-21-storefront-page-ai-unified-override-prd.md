# Storefront Page AI Unified Override Prompt PRD

## Problem Statement

The storefront page design settings currently ask office users to provide one main page prompt plus three separate override prompts for:

- header styling
- category chip styling
- search box styling

That split reflects the internal implementation, but it creates unnecessary decision work for office users. From the office user's perspective, the current workflow has three problems:

- the user must decide in advance which area a request belongs to
- a single natural-language request that touches multiple areas must be split manually
- the page design panel feels more technical than guided

This is especially awkward for common requests such as:

- "make the title bolder and the search border stronger"
- "keep the page blue, but make the chips darker"
- "make the search a little larger and make the header more formal"

In each of those cases, the user already knows the outcome they want, but the UI forces them to translate that request into the builder's internal override buckets.

The current saved output model does not have this problem. The compiled page style already stores a structured result by area:

- palette
- header
- category chips
- search

So the friction is in the authoring seam, not the persistence seam.

## Solution

Replace the three page-style override inputs with one unified override prompt input while keeping the existing compiled page-style output shape.

From the office user's perspective, the new workflow is:

1. Enter one main prompt for the overall page mood and palette direction.
2. Optionally enter one additional natural-language override prompt for targeted refinements.
3. Let AI determine whether the override prompt applies to:
   - header styling
   - category chip styling
   - search styling
   - or any combination of those areas
4. Apply the resulting area-specific overrides into preview immediately.
5. Save only the compiled `pageStyle`, not the transient page AI authoring session.

This keeps the authoring experience simpler without widening the style boundary:

- users write fewer prompts
- internal page-style boundaries remain enforced
- compile and save behavior stays deterministic
- preview and public render continue to consume the same compiled output

The main prompt remains separate from the unified override prompt. This preserves the existing "overall direction first, refinement second" model while removing the need for users to pre-classify refinements into three separate fields.

## User Stories

1. As an office user, I want to enter one main page prompt, so that I can define the overall storefront mood without navigating multiple controls.
2. As an office user, I want to enter one optional override prompt, so that I can refine the page without deciding in advance which internal style bucket it belongs to.
3. As an office user, I want one sentence to be able to affect multiple page areas, so that I can write naturally instead of splitting a request into multiple fields.
4. As an office user, I want header-related wording inside the unified override prompt to affect only header styling, so that my request remains targeted.
5. As an office user, I want category-chip-related wording inside the unified override prompt to affect only chip styling, so that the chips can be refined without touching unrelated areas.
6. As an office user, I want search-related wording inside the unified override prompt to affect only approved search properties, so that the builder stays predictable.
7. As an office user, I want a mixed request such as "make the title bolder and the search border stronger" to update both matching areas, so that I do not need to submit multiple prompts.
8. As an office user, I want requests with no recognized page-style target to be ignored safely, so that the builder does not invent changes from vague language.
9. As an office user, I want the preview to update immediately after applying the unified override prompt, so that I can see the actual result before saving.
10. As an office user, I want the last valid preview to remain if the unified override interpretation fails, so that a bad request does not destroy a good draft.
11. As an office user, I want saved page styles to remain identical to what I previewed, so that the public storefront reflects the approved result.
12. As an office user, I want the overall page palette flow to stay separate from targeted refinements, so that broad tone and local tweaks do not get mixed together.
13. As a maintainer, I want the authoring model to shrink from four prompt fields to two prompt fields, so that the page design session is easier to reason about.
14. As a maintainer, I want the compiled page-style output contract to stay unchanged, so that rendering and persistence do not require a larger migration.
15. As a maintainer, I want unified override interpretation to fan out into the existing area-specific intent shape, so that the compiler stays focused on compile work rather than prompt parsing.
16. As a maintainer, I want boundary enforcement for header, chips, and search to remain intact, so that a simpler UI does not open broader styling scope by accident.
17. As a maintainer, I want heuristic fallback behavior to keep working with the unified override prompt, so that the feature still behaves safely when the OpenAI key is absent.
18. As a maintainer, I want existing builder preview and save seams to keep using the same compiled page style, so that this change remains an authoring-only simplification.
19. As a maintainer, I want tests at the editor, hook, interpreter, and builder seams, so that the new input contract can change safely without regressions.
20. As a maintainer, I want legacy three-override session field names removed from the page AI authoring model, so that the codebase reflects the new UI contract clearly.

## Implementation Decisions

- The page AI authoring model will be reduced to two fields:
  - `mainPrompt`
  - `overridePrompt`
- The unified override prompt will remain session-only and will not be persisted in saved storefront configuration.
- The compiled page-style output contract will remain area-specific and unchanged at the persistence boundary:
  - palette
  - header
  - category chips
  - search
- The interpreter layer will become responsible for routing one unified override prompt into zero or more area-specific override intents.
- The interpreter may apply the unified override prompt to more than one page area in a single pass when the request clearly names multiple approved targets.
- The interpreter may not widen the existing allowed styling scope:
  - header remains limited to title color, letter spacing, and font weight
  - category chips remain limited to approved chip color properties
  - search remains limited to approved size and border-strength behavior
- The compiler layer will remain unchanged in responsibility. It will continue to receive structured intent and compile deterministic page-style output.
- The builder UI will keep the main prompt field and replace the three override textareas with one textarea dedicated to targeted refinements.
- The builder hook will expose one unified override setter instead of three area-specific override setters.
- The OpenAI interpretation prompt will be updated to explain that a single override request may target one or more approved areas.
- The heuristic fallback interpreter will run the same area detectors against the same unified override prompt instead of reading three separate override strings.
- Requests with no recognizable override property for an area should continue to resolve to `null` for that area rather than generating a no-op object.
- The preview/save flow will remain unchanged:
  - preview updates from compiled page style
  - save persists compiled page style only
  - transient page AI session state is discarded on save
- This change is authoring-contract simplification, not a page-style schema migration. Existing saved `pageStyle` data stays valid.

## Testing Decisions

- Good tests should verify externally observable behavior and stable contracts rather than implementation details such as specific local state shapes inside components.
- The page AI input model seam should be tested for:
  - default state with only `mainPrompt` and `overridePrompt`
  - trimming and normalization behavior
  - coercion of invalid values to empty strings
- The page design editor seam should be tested for:
  - rendering one main prompt field and one unified override field
  - wiring change handlers correctly
  - disabling apply while a request is in flight
- The page AI hook seam should be tested for:
  - resetting both prompt fields when hydrating page style
  - rejecting apply when the main prompt is missing
  - forwarding normalized `mainPrompt` and `overridePrompt` into interpretation
  - preserving the last valid compiled page style on failure
- The page-style interpreter seam should be tested for:
  - mapping a unified override prompt into header intent
  - mapping a unified override prompt into search intent
  - mapping a unified override prompt into category chip intent
  - allowing one unified override prompt to affect multiple areas
  - returning `null` for areas with no recognized request
- The builder integration seam should be tested for:
  - applying a page-level main prompt plus unified override prompt
  - previewing the resulting page style immediately
  - saving the compiled page style
  - ensuring transient prompt session data is not persisted
- Prior art already exists in the current storefront tests for:
  - page AI design model normalization
  - page design editor rendering
  - page-style interpreter behavior
  - builder-level page-style preview/save flow
- Those existing tests should be updated at the highest existing seam instead of replacing them with lower-level-only assertions.

## Out of Scope

- Changing the saved `pageStyle` schema
- Expanding search styling beyond the currently approved tokens and derived color fields
- Expanding category chip styling into structural layout, placement, or interaction changes
- Allowing AI to rewrite header title text
- Merging the main prompt and override prompt into a single total prompt field
- Changing card-level AI design, card layout AI, or data-selection flow
- Persisting page AI prompt session state in storefront configuration
- Reworking public storefront rendering beyond consuming the already compiled `pageStyle`

## Further Notes

- This PRD intentionally preserves the current page-style compiler contract and focuses only on simplifying the authoring seam.
- The recommended mental model for office users is:
  - main prompt = overall page direction
  - unified override prompt = focused refinement request
- The main technical boundary is that the unified override prompt is a routing concern for interpretation, not a persistence concern.
- This change should make the page design settings feel less form-heavy while keeping the same deterministic preview and save behavior.
