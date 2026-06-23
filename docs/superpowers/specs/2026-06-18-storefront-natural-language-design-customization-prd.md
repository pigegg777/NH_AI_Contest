# Storefront Natural-Language Design Customization PRD

## Problem Statement

The current storefront builder can already save and reload office-facing storefront drafts, but its design flexibility is still too narrow for the workflow the team now wants.

Right now, the storefront draft model is limited to a small set of presentation controls such as:

- a few page tone directions
- a small card layout enum
- a small card field whitelist
- a small set of image, spacing, and shadow options

This works for basic AI-assisted drafting, but it does not yet support the level of design control that the office workflow now requires.

From the office user's perspective, the desired experience is:

- the user writes a natural-language request such as "make the card text darker, emphasize price in red, use a cleaner font, and move the image to the left"
- AI interprets that request into a storefront draft update
- the mobile preview updates immediately
- the resulting design settings are saved and reusable later

The current builder does not yet support this well because:

- text color changes are not first-class storefront settings
- typography is not modeled deeply enough to express heading/body style changes
- card detail layout is mostly fixed by one card structure
- AI suggestion output is constrained to a narrow schema that cannot describe richer design intent
- saving is based on a limited design settings model, so even if the AI understands the request, there is nowhere reliable to store many of those decisions

The team wants a storefront builder where office users can express design intent in natural language, get a trustworthy preview, and save that result without introducing arbitrary raw HTML or CSS into the saved data model.

## Solution

Expand the storefront draft model from a narrow preset-based presentation system into a richer structured design system that still saves as validated configuration data.

The storefront builder should support a natural-language design workflow where:

- the office user types a free-form request
- AI converts that request into a validated storefront patch
- the preview applies the patch immediately
- the same patch can be saved into the storefront draft and reloaded later

The expanded design system should add first-class support for:

- text color tokens
- richer typography tokens
- card template selection
- card detail layout composition
- field emphasis rules
- optional helper-block copy and tone changes

The key product decision is that this remains a structured storefront configuration system, not a raw HTML or raw CSS editor.

That means:

- AI may interpret natural language freely
- the applied patch must normalize into approved design tokens, approved layout templates, and approved slot compositions
- the preview and saved draft must stay deterministic and testable
- public storefront rendering must remain compatible with the current `pageConfig` and `categoryConfig` based model

This gives the office user much more expressive power while preserving the current advantages of structured save data:

- safe persistence
- predictable rendering
- schema validation
- backward compatibility with existing storefront drafts where practical

## User Stories

1. As an office user, I want to describe storefront design changes in natural language, so that I do not need to learn a technical card editor.
2. As an office user, I want to ask for text color changes such as darker title text or red price text, so that the storefront better matches the message I want to communicate.
3. As an office user, I want to ask for font style changes such as cleaner, softer, bolder, or more official-looking text, so that the storefront tone matches the office context.
4. As an office user, I want to ask for card detail layout changes such as image-left, price-first, or compact meta layout, so that the storefront card can match different product categories.
5. As an office user, I want AI to understand requests that combine multiple design changes at once, so that I can refine the storefront in one prompt.
6. As an office user, I want the preview to update immediately after AI applies the patch, so that I can judge the result without saving first.
7. As an office user, I want the saved storefront draft to preserve my AI-applied design changes, so that I can return later without losing work.
8. As an office user, I want the same natural-language workflow to work for fertilizer, pesticide, and future custom `product_category_name` pages, so that the builder stays office-data-driven.
9. As an office user, I want title, subtitle, and helper copy to stay editable through AI requests, so that the storefront can sound more customer-ready.
10. As an office user, I want AI to emphasize important fields such as `tax_price`, `nutrient`, or `spec` when I ask for them, so that the card hierarchy becomes clearer.
11. As an office user, I want AI to hide or de-emphasize less important card fields when needed, so that the storefront can look simpler on mobile.
12. As an office user, I want text color and typography changes to apply consistently across page title, card title, card body, and price emphasis, so that the storefront feels intentionally designed.
13. As an office user, I want image placement and card section ordering to change without breaking product matching or save behavior, so that I get more flexibility without losing trust.
14. As an office user, I want the AI result to remain within allowed storefront design rules, so that the saved page does not become unstable or broken.
15. As an office user, I want the builder to keep feeling like an office storefront copilot rather than a code editor, so that I stay focused on the page outcome.
16. As an office user, I want design changes to remain mobile-first, so that the saved storefront still reads well in the customer viewing context.
17. As an office user, I want previously saved storefront drafts to still load even if they use older style settings, so that the design expansion does not discard existing work.
18. As an office user, I want the builder to explain AI-applied changes in plain language, so that I can tell what changed before saving.
19. As an office user, I want to retry or refine the AI request when the first result is not right, so that the builder supports iterative design.
20. As an office user, I want AI to preserve my selected office product data scope while changing design, so that page styling never mutates the underlying `office_product_datas.product_data`.
21. As a maintainer, I want the storefront draft model to grow through structured tokens and templates rather than raw markup, so that rendering stays deterministic and safe.
22. As a maintainer, I want page-level design tokens such as color and typography to live in `pageConfig`, so that shared storefront presentation is reusable across category drafts.
23. As a maintainer, I want card-specific layout and emphasis settings to live in `categoryConfig`, so that card behavior can vary by `product_category_name`.
24. As a maintainer, I want AI output normalization to reject unsupported values and map free-form requests into allowed enums, tokens, or validated custom values, so that the system stays stable.
25. As a maintainer, I want card rendering to support multiple approved templates and slot compositions, so that layout depth increases without needing raw HTML editing.
26. As a maintainer, I want typography and text color settings to remain previewable and saveable through the same existing builder seam, so that the expansion does not create a parallel edit system.
27. As a maintainer, I want backward compatibility rules for legacy storefront drafts, so that older drafts still render with sensible defaults after schema expansion.
28. As a maintainer, I want the AI suggestion seam to remain the only place where natural language becomes structured configuration, so that validation stays concentrated in one module.
29. As a maintainer, I want the rendering seam to consume only normalized storefront config, so that preview and public storefront stay aligned.
30. As a maintainer, I want the persistence seam to keep saving JSON configuration in `office_page_config` and `office_page_category_configs`, so that the expansion builds on the existing save model.
31. As a maintainer, I want field emphasis rules to compose with the dynamic storefront field system, so that design expansion works with the current office product data shape.
32. As a maintainer, I want the AI schema to evolve without allowing arbitrary CSS injection, so that public storefront rendering remains safe and testable.
33. As a maintainer, I want preview tests to verify visible design behavior rather than internal state plumbing, so that the test surface matches the office workflow.
34. As an AFK agent, I want the natural-language design expansion captured as one coherent PRD, so that implementation slices can proceed without reopening the high-level product decision.

## Implementation Decisions

- The feature will use a structured storefront configuration approach rather than raw HTML or raw CSS persistence.
- The current split between office-wide `pageConfig` and category-specific `categoryConfig` will remain the main persistence seam.
- `pageConfig` will be expanded to support richer shared design tokens, including:
  - text color tokens
  - background and surface color tokens
  - typography tokens for heading and body presentation
  - shared tone and emphasis tokens used across the page
- `categoryConfig` will be expanded to support richer card-level design settings, including:
  - card template selection
  - card slot composition or section ordering
  - card text styling overrides where allowed
  - field emphasis rules for price, nutrient, spec, and other visible scalar fields
  - image placement and card detail density rules
- The system will introduce the idea of approved card templates instead of one effectively fixed card detail layout.
- A card template will describe the allowed high-level composition of a product card, such as:
  - image-top
  - image-left
  - price-focus
  - compact list
  - detail-first
- Slot composition will be configurable only through approved structures, not arbitrary DOM descriptions.
- AI output will remain a structured patch and will expand to include:
  - page text colors
  - page typography
  - card text colors
  - card typography emphasis
  - card template
  - card slot composition
  - helper-block copy adjustments where supported
- AI normalization will map natural-language phrases such as "darker text", "clean font", "image on the left", or "make price stand out" into approved design fields.
- The AI suggestion seam remains responsible for natural-language interpretation, schema validation, normalization, and fallback behavior.
- The rendering seam will consume only normalized config and should not need to understand raw prompt text.
- The public storefront and the builder preview must use the same normalized design model so that the saved result matches what the office user sees before saving.
- Existing dynamic storefront field behavior should continue to work. The design expansion changes how visible fields are presented, not how office product data is selected.
- The feature must keep office product data immutable from the storefront design workflow. AI may change styling, copy, and card emphasis, but it must not rewrite `office_product_datas.product_data`.
- The save model remains JSON-based and continues to write through the current office-facing storefront config tables.
- Schema evolution should be versioned through the existing config versioning approach so that legacy drafts can be upgraded during normalization.
- Backward compatibility defaults should ensure that older drafts without new color, typography, or template settings still render predictably.
- The builder flow remains AI-led and preview-first. The expansion increases expressive depth inside the existing AI studio rather than reintroducing a large manual design form.
- Manual fine-tuning controls may exist for a small number of high-value settings, but the primary workflow remains user natural language followed by AI-structured patch application.
- The office-facing language of the feature should stay aligned with existing project vocabulary:
  - `storefront`
  - `office product data`
  - `product_category_name`
  - `medium category`
  - `office_page_config`
  - `office_page_category_configs`

## Testing Decisions

- Good tests should verify external storefront behavior that an office user or maintainer can observe, not implementation details such as local state names or helper function structure.
- Builder page tests should remain the highest seam for user workflow validation, including:
  - entering a natural-language design request
  - applying an AI patch
  - seeing preview changes immediately
  - saving the resulting draft successfully
  - reloading a saved draft with the same visible design outcome
- AI suggestion tests should verify that natural-language requests normalize into valid structured patches and reject unsupported or unsafe outputs.
- Normalization tests should verify:
  - backward compatibility with older drafts
  - fallback defaults for missing new design settings
  - rejection or coercion of invalid color, typography, and template values
  - stability of schema-version upgrade behavior
- Rendering tests should verify:
  - text color changes are visible in the preview
  - typography changes affect the intended text groups
  - card template changes affect card composition
  - field emphasis changes affect visible hierarchy
  - slot composition changes render approved layouts only
- Persistence tests should verify that expanded `pageConfig` and `categoryConfig` values round-trip through save and load without losing meaning.
- Public storefront tests should verify that the saved design config renders consistently outside the builder and remains correctly scoped to the saved office storefront draft.
- Prior art already exists in the storefront builder tests, storefront config service tests, storefront AI service tests, and public storefront tests. Those seams should be extended rather than replaced.

## Out of Scope

- Free-form raw HTML editing by office users
- Free-form raw CSS editing by office users
- Arbitrary JavaScript execution in saved storefront drafts
- A full theme marketplace or end-user template store
- QR generation changes
- New publishing or approval workflows outside the current storefront draft flow
- Rewriting underlying office product data values through design prompts
- WYSIWYG block-level drag-and-drop page composition across the full storefront
- Supporting every possible typography or CSS property in the first iteration

## Further Notes

- The core product decision in this PRD is that design freedom grows through a deeper structured schema, not through unrestricted markup storage.
- This PRD assumes the current AI studio remains the main interaction model and that the office user should continue to work from natural language plus immediate preview.
- If the team later wants a raw HTML or CSS escape hatch, that should be treated as a separate product decision with separate safety, persistence, and rendering rules.
- The expected implementation seams for this work are:
  - the AI suggestion seam
  - the rendering seam
  - the persistence seam
  - the validation seam
- The first implementation slice should prefer a small but meaningful expansion:
  - text color tokens
  - typography tokens
  - three to five approved card templates
  - slot-based card detail composition
  - AI patch normalization for the new fields
