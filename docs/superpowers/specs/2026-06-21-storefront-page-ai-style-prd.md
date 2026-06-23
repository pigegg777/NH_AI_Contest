# Storefront Page AI Style PRD

## Problem Statement

The current storefront builder supports office-facing draft creation, category selection, card-field visibility, and AI-assisted card presentation changes, but page-level styling is still too preset-driven for the workflow the team now wants.

Today, page presentation is still anchored to a small set of legacy style controls such as:

- a `designDirection` family
- limited `theme` tokens
- fixed search and category chip variants
- page-level text styling that is constrained to a few enums

From the office user's perspective, this creates several problems:

- page-wide color direction cannot be described naturally and trusted to render consistently
- the header title text can be entered, but its styling cannot be shaped in a focused AI workflow
- category chips and search box styling still feel like fixed UI presets instead of guided design controls
- the preview and saved data model do not yet have a dedicated page-level AI seam similar to the category-level `aiDesign` seam

The requested workflow is more specific than "general design freedom." The team wants office users to:

- start from a white default page style
- describe overall page color in natural language
- let AI choose a full page palette as resolved hex values
- enter header title text directly through input
- let AI style the header text through natural-language instructions
- let AI derive category chip colors from the page palette by default
- allow category chip override prompts only within an approved property range
- allow search override prompts only for approved size and border changes
- preview the result immediately
- save only the compiled page style, not the transient AI authoring state

At the same time, the system must remain safe and deterministic:

- no arbitrary raw CSS persistence
- no raw AI-authored markup
- no runtime legacy-branch rendering after rollout
- deterministic migration of existing stored page configs
- no silent fallback when AI generation fails

Without a dedicated page-style architecture, these goals would either overload the existing builder hook with mixed responsibilities or keep page design trapped inside preset variants that no longer match the team's workflow.

## Solution

Introduce a dedicated page-style authoring architecture for storefront pages built around a session-only `pageAiDesign` input model, a separate page-style compiler, and a resolved `pageConfig.pageStyle` persistence shape.

From the office user's perspective, the new workflow is:

1. Enter or edit header title text directly through input.
2. Provide one main natural-language page prompt for overall tone and page color direction.
3. Optionally provide focused override prompts for:
   - header styling
   - category chip styling
   - search box styling
4. Let AI interpret those prompts into a structured page AI design model.
5. Compile that model into a resolved `pageStyle` object:
   - free hex palette values
   - approved size tokens
   - approved border strength tokens
   - contrast-corrected final values
6. Apply the compiled `pageStyle` to preview immediately.
7. On save, persist only the compiled `pageConfig.pageStyle`.
8. Discard the transient `pageAiDesign` session state after save.

The architecture separates page AI authoring from page persistence:

- `pageAiDesign` exists only during the builder session
- `pageStyle` is the only saved style result
- header text remains user-authored content, not AI-authored copy
- overrides are restricted to approved property boundaries for each area

This keeps the storefront safe and predictable while still feeling flexible to the office user:

- natural language stays first-class
- preview stays immediate
- saved data stays deterministic
- rendering stays structured
- migration away from legacy page style fields becomes possible without keeping parallel runtime branches

## User Stories

1. As an office user, I want a white default page style when starting a new storefront draft, so that I begin from a neutral baseline.
2. As an office user, I want to describe the overall page color in natural language, so that I do not need to pick from a small fixed tone menu.
3. As an office user, I want AI to choose a full page palette instead of just one background color, so that the storefront remains visually consistent.
4. As an office user, I want the page palette to be saved as the final resolved result, so that reopening the storefront keeps the exact style I approved.
5. As an office user, I want to type the header title text directly, so that the main message on the page stays under my control.
6. As an office user, I want AI to style the header title without changing the text itself, so that I can improve presentation without losing the intended wording.
7. As an office user, I want header styling prompts to affect color, letter spacing, and font weight, so that I can tune the tone of the title.
8. As an office user, I want one main prompt plus focused overrides, so that I can define the overall direction first and then refine only specific areas.
9. As an office user, I want the main prompt to control the overall page mood, so that the storefront feels coherent rather than patched together.
10. As an office user, I want category chips to inherit a sensible default style from the page palette, so that I do not need to manually restyle them every time.
11. As an office user, I want to override category chips through natural language within a controlled range, so that I can refine them without breaking the UI.
12. As an office user, I want category chip overrides to change background, text, and border styling, so that chip emphasis can match the page intent.
13. As an office user, I want search box overrides to stay constrained, so that I can make useful refinements without causing layout instability.
14. As an office user, I want search box overrides to change size and border styling only, so that the builder remains predictable.
15. As an office user, I want search size requests such as "slightly larger" to map to known size levels, so that the search box stays mobile-safe.
16. As an office user, I want search border requests such as "stronger border" to map to known strength levels, so that the result remains consistent.
17. As an office user, I want AI-generated colors to stay readable, so that customers can still scan the storefront on mobile.
18. As an office user, I want preview updates immediately after AI applies the page style, so that I can decide whether to keep the result before saving.
19. As an office user, I want the last valid preview to remain visible if AI fails, so that the builder never replaces a good result with a broken one.
20. As an office user, I want a clear error message when AI page styling cannot be applied, so that I know why nothing changed.
21. As an office user, I want saved page styling to render the same way in the public storefront as it does in preview, so that QR visitors see the approved design.
22. As an office user, I want page-level AI styling to remain separate from card-level product layout AI, so that page polish does not unexpectedly change product card structure.
23. As an office user, I want office product data and medium category selection to stay untouched while page styling changes, so that design prompts never mutate underlying data.
24. As an office user, I want natural-language page styling to feel less like preset switching and more like guided design assistance, so that the storefront builder feels more capable.
25. As a maintainer, I want page AI authoring state to remain session-only, so that saved configuration contains only deterministic render data.
26. As a maintainer, I want the compiler to produce resolved hex-centered output, so that runtime rendering remains simple and explicit.
27. As a maintainer, I want the renderer to consume only the new page style schema after rollout, so that there is no long-term legacy rendering branch to maintain.
28. As a maintainer, I want migration from existing page configs to be deterministic, so that rollout is auditable and repeatable.
29. As a maintainer, I want override scopes to be property-bounded, so that natural language cannot escape into unsupported layout changes.
30. As a maintainer, I want header text to remain in the existing content seam rather than inside AI style metadata, so that user-authored copy stays explicit.
31. As a maintainer, I want contrast correction to happen during compile rather than ad hoc in the renderer, so that preview and save stay aligned.
32. As a maintainer, I want the builder hook to orchestrate state rather than own all styling logic, so that page AI work does not turn the hook into a monolith.
33. As a maintainer, I want page AI interpretation, page style compile, and page style migration to be separate seams, so that each layer can be tested independently.
34. As a maintainer, I want the new page style schema to coexist with current storefront content fields but replace legacy style fields after migration, so that runtime logic becomes simpler.
35. As a maintainer, I want good tests to prove page preview, save, migration, and public render behavior from the outside, so that the feature stays trustworthy for office users and AFK agents.

## Implementation Decisions

- The implementation will follow the page-specific modular approach rather than extending all logic inline inside the existing builder hook.
- A session-only page AI authoring model will be introduced as the page-level equivalent of structured AI input. It will represent:
  - the main page prompt
  - the header override prompt
  - the category chips override prompt
  - the search override prompt
- The saved storefront configuration will not persist this page AI authoring model. Only compiled page style output will be persisted.
- A new `pageStyle` object will be added under `pageConfig` as the canonical page-style persistence seam.
- The saved `pageStyle` shape will store final resolved values rather than semantic placeholders. Color fields should be stored as resolved hex values, and approved non-color fields should be stored as their final allowed token values.
- The new page style schema should be versioned explicitly so that deterministic migration and future expansion remain manageable.
- The page style schema will be organized around page-facing areas rather than generic token bags. At minimum it should cover:
  - page palette
  - header styling
  - search styling
  - category chip styling
- The main page prompt will generate a full page palette rather than a single background value.
- AI may generate free hex color candidates, but the compiler must run contrast correction before preview and save.
- Header title text will remain user-authored content. The input field remains the source of truth for the title string.
- Header override behavior is limited to styling only. It may affect:
  - title color
  - letter spacing
  - font weight
- Header override behavior may not rewrite header text.
- Category chip default styling will be derived from the compiled page palette.
- Category chip override behavior may only affect approved chip styling properties. It may adjust:
  - background color
  - text color
  - border color or tone
  - active-state equivalents where required for rendering consistency
- Category chip override behavior may not change chip structure, chip interaction model, or chip placement rules.
- Search override behavior is intentionally narrower than category chip behavior. It may only affect:
  - size
  - border color or tone
  - border strength
  - focus-border tone where needed for accessibility and clarity
- Search override behavior may not affect:
  - search background
  - search text color
  - radius
  - icon position
  - layout structure
- Search size must normalize to approved tokens: `sm`, `md`, `lg`, `xl`.
- Search border strength must normalize to approved tokens: `soft`, `normal`, `strong`.
- The compiler must enforce precedence in this order:
  - explicit user-entered content values
  - area override prompts
  - main page prompt
  - initial authored page style seed for new drafts
- The "white default" is an explicit initial authored state for new drafts, not a hidden AI fallback branch.
- If AI page generation or compile fails, the system must:
  - keep the last valid preview unchanged
  - surface an error message
  - block invalid save output
- The builder preview seam and public storefront seam must both consume the same compiled `pageStyle` output so that preview and published rendering stay aligned.
- Existing non-style page concerns such as structural enablement, mobile UI block placement, and office product data scope remain outside this PRD unless they are required to read or display the new page style.
- The renderer should no longer depend on runtime interpretation of legacy page style fields after rollout.
- Existing stored storefront configs must be migrated in bulk before rollout through a deterministic migration path.
- The migration path must translate legacy page presentation fields into the new page style schema without using AI reinterpretation.
- After migration, page runtime rendering should read only the new page style schema for page-level presentation behavior.
- The page AI interpretation seam, the page style compile seam, and the page style migration seam should remain separate modules so their responsibilities stay testable and replaceable.
- Page AI design behavior should remain distinct from category-level card `aiDesign`. This PRD changes page styling, not card render-spec composition.

## Testing Decisions

- Good tests should verify externally visible storefront behavior and persisted configuration outcomes rather than helper internals or implementation-specific state plumbing.
- The page AI input seam should be tested for normalization of:
  - main prompt presence and trimming
  - override prompt boundaries
  - rejection or ignore behavior for unsupported override requests
- The page style compiler seam should be tested for:
  - resolved hex output generation
  - contrast correction behavior
  - precedence rules between main prompt, overrides, and user-entered header text
  - approved token normalization for search size and border strength
  - property-boundary enforcement for header, chips, and search overrides
- The deterministic migration seam should be tested with representative legacy storefront configs and expected compiled page-style outputs.
- Builder-level tests should cover:
  - editing header title text through input
  - applying a page AI prompt
  - applying override prompts
  - previewing the compiled page style immediately
  - keeping the last valid preview on AI failure
  - surfacing an error when page AI application fails
  - saving compiled `pageStyle` only
- Persistence tests should verify that saved storefront configs contain the new page style schema and do not persist transient page AI authoring state.
- Public storefront render tests should verify:
  - page background rendering
  - header title style rendering
  - search size and border rendering
  - category chip default derivation from palette
  - category chip override rendering
  - parity between preview and public render outcomes
- Migration rollout tests should verify that previously stored storefront configs can be upgraded in bulk and continue to render correctly after the runtime legacy branch is removed.
- Prior art already exists in the storefront builder model tests, storefront config service tests, storefront AI service tests, builder page tests, and public storefront page tests. These should be extended as the highest existing seams rather than replaced with lower-level-only coverage.

## Out of Scope

- Arbitrary raw CSS authoring for storefront pages
- Arbitrary raw HTML authoring for storefront pages
- AI-generated structural page rewrites outside approved page areas
- Search box radius control
- Search box background-color control
- Search box icon-position changes
- Header text rewriting by AI
- Persisting `pageAiDesign` in saved storefront configuration
- Using AI to migrate legacy page configs
- Maintaining long-term runtime rendering support for the pre-migration page style schema
- Redesigning card-level render-spec composition in this same change
- Editing office product data through page styling prompts
- Theme marketplace, prompt library management, or collaborative design review workflow

## Further Notes

- The key product boundary is that page styling becomes more expressive through structured AI interpretation and a compiler, not through unrestricted markup or CSS.
- This PRD intentionally keeps page content and page style separate:
  - header text remains explicit content
  - page palette and local page-area styling become compiled style output
- The "one main prompt plus area overrides" model is the center of the user experience and should remain visible in the UI design.
- The recommended module boundaries for implementation are:
  - page AI input model
  - page AI interpretation
  - page style compiler
  - page style migration
  - builder preview orchestration
  - public storefront render consumption
- A future follow-up can reuse the same architecture if the team later wants structured AI styling for additional page areas such as helper blocks or footer treatments.
