# Storefront Data Selection Step Separation PRD

## Problem Statement

The current storefront builder still mixes data-shape choices and card-design choices too closely for the office-facing workflow the team now wants.

Today, the builder has a live preview and dynamic field selection, but the interaction boundary is weak:

- field visibility changes and card design changes happen in the same editing surface
- users can adjust design first and then add or remove data fields later
- the builder immediately reuses those changed fields in preview and save shaping
- medium-category inclusion settings still exist in the builder state even though the desired direction is "show all by default"
- legacy card element toggles overlap with `visibleFields`, so there is more than one source of truth for what data appears on cards

From the office user's perspective, this creates a specific problem:

- after refining card design, adding or removing data can break the card composition
- it is hard to tell whether the current preview is showing temporary selection changes or the final confirmed data contract for the page
- the builder asks the user to think about data structure and visual styling at the same time
- the current step flow does not make a clear "data first, design second" contract visible

The requested workflow is more constrained and more explicit:

- `Data Selection` must be separated from `Card Design`
- data changes should be reviewed in a card-only neutral preview before entering design
- the user must explicitly confirm data selection before moving to design
- reconfirming data should reset only the card-design output, not page-level basic settings
- the saved source of truth should remain a single canonical `visibleFields` array rather than a new grouped persistence schema
- AI in the design step must not be allowed to change data selection

Without a dedicated confirmation boundary, the storefront builder keeps reintroducing the same class of instability: card design is applied to a moving data shape.

## Solution

Rework the storefront builder into a three-step flow with an explicit separation between basic setup, data confirmation, and card design.

The office-facing workflow becomes:

1. `Basic Settings`
   - choose the storefront product category
   - adjust page-level basic settings that are independent from card data shape
2. `Data Selection`
   - configure which product data fields appear on cards
   - review a neutral, card-only preview using the full product set
   - confirm the data selection before moving on
3. `Card Design`
   - design the fully confirmed page and cards
   - use AI only for design and presentation changes
   - save only from this final step

The key architectural boundary is the introduction of:

- `draftDataSelection`
- `committedDataSelection`

The user edits `draftDataSelection` inside the data step. The builder keeps `committedDataSelection` as the last confirmed contract that card design depends on. When the user chooses `Confirm and Next`, the draft becomes committed and card-design output is reset. Until then, the design contract remains unchanged.

The data-selection UI is grouped for usability but persists to the existing canonical seam:

- description selection
- price selection
- category selection

These groups are a UI concern only. Persistence remains a single flat `visibleFields` array in deterministic canonical order.

This keeps the workflow stable and simpler:

- the data contract is confirmed before design work begins
- the design step becomes presentation-only
- legacy overlapping display toggles are removed as sources of truth
- previously saved drafts continue to load
- new categories start from "all selected" defaults without forcing old drafts to change behavior

## User Stories

1. As an office user, I want data selection to be its own storefront builder step, so that I can confirm the card data contract before I start visual design.
2. As an office user, I want the builder to keep basic page settings separate from card data selection, so that I do not lose unrelated setup work when I revisit fields.
3. As an office user, I want a dedicated data-confirmation action before entering card design, so that the builder makes the workflow order obvious.
4. As an office user, I want new storefront categories to start with all available fields selected by default, so that I begin from a complete draft instead of a sparse one.
5. As an office user, I want existing saved storefront drafts to keep their saved field visibility, so that reopening a draft does not unexpectedly change my page.
6. As an office user, I want the data-selection UI to be grouped into description, price, and category sections, so that a long dynamic field table feels easier to scan.
7. As an office user, I want only fields with actual values in the current office product data category to appear in the table, so that I do not waste time on empty schema noise.
8. As an office user, I want `product_name` to remain mandatory, so that every product card keeps a stable identity.
9. As an office user, I want the rest of the field groups to be freely reducible to zero selections, so that I can make minimalist product cards when needed.
10. As an office user, I want `img_url` to behave as image on or off for the card, so that image display is easy to understand.
11. As an office user, I want `manufacturer_list` to be usable in selection even though it originates as structured data, so that manufacturer information can appear on cards when helpful.
12. As an office user, I want manufacturer values flattened into short readable text, so that they fit product cards without breaking layout.
13. As an office user, I want long notes to be visually constrained, so that choosing `note` does not explode card height.
14. As an office user, I want product links to render as a single link action instead of a raw URL string, so that the card stays readable on mobile.
15. As an office user, I want nutrient-like fields to feel like one "important ingredient" choice in the UI, so that category differences do not create duplicate decisions.
16. As an office user, I want a neutral card-only preview while selecting data, so that I focus on data shape rather than full-page styling.
17. As an office user, I want the data preview to render the full product set rather than a tiny sample, so that I can catch layout issues caused by real variation.
18. As an office user, I want the data step preview to hide empty values per product card, so that "all selected" still produces clean cards.
19. As an office user, I want the builder to block moving forward when I have unconfirmed data changes, so that I cannot accidentally design against stale committed data.
20. As an office user, I want reconfirming data to reset only the card-design result, so that I do not lose basic page settings I already decided.
21. As an office user, I want design AI to stop touching data field selection, so that the page does not silently change product facts while I style it.
22. As an office user, I want save to remain available only from the final card-design step, so that half-confirmed draft state is never treated as a finished storefront draft.
23. As an office user, I want public medium-category chips to keep working as customer-facing browsing controls, so that simplifying the builder does not remove customer navigation.
24. As an office user, I want the builder to stop asking me which medium categories to include, so that the page starts from the full product category by default.
25. As a maintainer, I want `visibleFields` to remain the only persisted source of truth for card data visibility, so that rendering and save behavior stay deterministic.
26. As a maintainer, I want the grouped data-selection tables to remain a presentation concern only, so that persistence does not splinter into multiple overlapping schemas.
27. As a maintainer, I want the field order to be canonical rather than click-order dependent, so that preview behavior and saved diffs stay stable.
28. As a maintainer, I want legacy display toggles such as image, spec, nutrient, and price visibility to be derived from `visibleFields`, so that old overlapping rules do not continue to conflict.
29. As a maintainer, I want `selectedMediumCategories` and representative medium-category builder choices removed from the office-facing editing flow, so that the data-selection surface reflects the new full-category default.
30. As a maintainer, I want unconfirmed data selection to be session-only, so that saved storefront drafts contain only committed field choices.
31. As a maintainer, I want empty-value hiding, note truncation, manufacturer flattening, and link rendering to be deterministic card-render rules, so that dynamic field support remains stable across categories.
32. As a maintainer, I want AI normalization to reject any attempt to mutate data selection from the card-design step, so that design prompts stay within presentation boundaries.
33. As a maintainer, I want the highest existing storefront seams to remain the main regression targets, so that implementation stays aligned with current tests and public behavior.
34. As an AFK agent, I want the data-selection redesign captured as a dedicated PRD, so that implementation can proceed without reopening the workflow decisions one by one.

## Implementation Decisions

- The storefront builder flow will expand from the current basic setup plus AI studio shape into three explicit steps:
  - basic settings
  - data selection
  - card design
- Basic settings will continue to own storefront category choice and page-level settings that are independent from card data shape.
- Data selection and card design will no longer share one undifferentiated editing state. The builder will track both:
  - draft data selection
  - committed data selection
- Card design behavior, preview shaping, and final save shaping must depend on committed data selection only.
- Changing a checkbox in the data step marks the draft as unconfirmed and disables forward navigation until the user confirms again.
- The confirm action in the data step must:
  - promote draft selection into committed selection
  - reset card-design-step output
  - move the user into the card-design step
- Reconfirming data must not reset basic page settings from the first step.
- Save remains available only from the card-design step. The system does not persist unconfirmed data-selection draft state.
- The data-selection UI will present three field groups:
  - description selection
  - price selection
  - category selection
- Those groups are not a new storage schema. Persistence remains the existing flat `visibleFields` seam.
- `visibleFields` must be normalized into a fixed canonical order rather than preserving click order.
- Existing saved storefront drafts keep their stored `visibleFields`. The "all selected" default applies only when starting a new category draft with no existing field selection.
- The builder will continue to derive field availability from the currently selected office product data category.
- The field-selection UI should show only fields that have actual values in the current category context.
- `product_name` remains mandatory and cannot be deselected.
- All other grouped selections may be reduced to zero fields.
- Builder-side medium-category inclusion controls are removed from the office workflow. The builder defaults to showing the full selected product category.
- Public storefront medium-category chips remain customer-facing browsing controls and are not removed by this PRD.
- Data-selection preview is a neutral card-only preview. It does not use the full card-design styling layer.
- The neutral preview still renders the full product set for the selected category rather than a capped sample set.
- Per-card rendering rules in the new data-selection contract are:
  - if a selected field is empty for a product, hide it on that card
  - `product_url` renders as a single link action rather than a raw URL string
  - `note` renders with two-line truncation
  - `manufacturer_list` is flattened into readable text and shortened to at most two visible names plus `and N more` semantics
  - `img_url` controls whether an image region appears when a usable image exists
- The UI concept of "important ingredient" should consolidate nutrient-like fields into one office-facing choice. While long-term data normalization may standardize on `nutrient`, the selection experience should not show duplicate nutrient decisions.
- Card-design AI is explicitly presentation-only in this workflow. It may style cards and page presentation, but it may not mutate committed or draft data selection.
- Legacy card-element visibility toggles are no longer independent editing controls. They should be derived from `visibleFields` and treated as compatibility output, not an input source of truth.
- Existing storefront drafts that contain both `visibleFields` and legacy visibility toggles should resolve conflicts by treating `visibleFields` as authoritative.
- The implementation should prefer existing high-level seams instead of introducing new low-level orchestration layers unless a new boundary is necessary to represent draft-versus-committed data state cleanly.

## Testing Decisions

- Good tests should verify external behavior and stable data contracts, not incidental implementation details like local state variable names or helper structure.
- The highest behavioral seam should remain the storefront builder page flow:
  - the builder shows three steps in the new order
  - field changes in the data step mark the state as unconfirmed
  - forward navigation is blocked until confirmation
  - confirmation resets only card-design output and advances to design
  - save remains final-step only
- Builder-state tests should verify:
  - draft versus committed data selection boundaries
  - canonical field ordering
  - new-category all-selected defaults
  - existing-draft compatibility behavior
  - design-reset scope on reconfirm
- Model-level tests should verify:
  - field grouping metadata
  - field availability from real category values
  - mandatory `product_name`
  - legacy visibility toggle derivation from `visibleFields`
  - removal of unsupported builder-side medium-category selection behavior
- Card-render tests should verify:
  - empty selected values are hidden per card
  - note truncation behavior
  - manufacturer flattening and shortening
  - product-link button rendering
  - image on or off behavior through `img_url`
  - nutrient-like field consolidation behavior where applicable
- Public storefront tests should verify that customer-facing medium-category chips still work even though builder-side inclusion controls are removed.
- AI tests should verify that card-design AI patches can still style the page and cards but cannot alter data selection.
- Persistence tests should verify that:
  - only committed `visibleFields` are saved
  - unconfirmed draft data selection is not persisted
  - existing drafts with legacy visibility toggles still normalize correctly
- Prior art for these tests already exists in the current storefront builder page tests, builder-model tests, public storefront page tests, storefront config service tests, and storefront AI service tests. Those seams should be extended rather than replaced.

## Out of Scope

- Persisting grouped data-selection objects instead of a flat `visibleFields` array
- Restoring unconfirmed data-selection drafts after leaving the builder
- Reworking customer-facing medium-category chips into a new public navigation system
- Reintroducing builder-side medium-category inclusion selection
- Saving from the data-selection step
- Letting card-design AI rewrite field visibility
- Arbitrary transformation of structured fields into custom rich widgets beyond the approved display rules
- A new database schema for grouped storefront field selection
- Automatic AI image generation for missing product images
- Broader public-storefront layout redesign outside what is required to preserve behavior under the new data-selection contract

## Further Notes

- This PRD refines and partially supersedes earlier storefront assumptions where dynamic field selection and AI studio editing happened in one mixed step.
- The intended testing seams, using existing high-level boundaries where possible, are:
  - storefront builder page flow
  - builder state orchestration
  - storefront builder normalization model
  - card rendering
  - public storefront rendering
  - storefront AI patch normalization
- The core rule of this PRD is simple: the storefront builder must establish a stable data contract before card design begins, and every compatibility behavior should reinforce that boundary rather than blur it.
