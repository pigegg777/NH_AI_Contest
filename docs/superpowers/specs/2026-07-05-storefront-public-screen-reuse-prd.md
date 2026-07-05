# Storefront Public Screen Reuse PRD

## Problem Statement

The team wants the storefront builder preview to show the same public storefront experience that customers will see, while also continuing to reflect unsaved draft changes immediately.

Today, the public storefront route and the storefront builder preview are close, but they do not share a clear seam.

The public storefront currently combines two responsibilities in one place:

- loading storefront config, public office product rows, and public office identity
- rendering the ready-state customer-facing storefront

At the same time, the storefront builder preview already owns draft-first preview data such as:

- preview config
- preview product rows
- office-facing identity values
- unsaved page and card changes

Because of this, the builder cannot safely reuse the current public storefront page as-is. If it imports the full public route module, the preview risks re-fetching saved public data instead of rendering the current unsaved draft. If it continues to bypass the public storefront feature entirely, the team will keep two ownership stories for the same customer-facing screen.

This becomes especially painful now that the team wants to separate `publicstorefront` as its own feature area. Without a cleaner seam, the refactor is likely to produce one of two bad outcomes:

- duplicated public storefront rendering logic
- a builder preview that depends on a fetch-oriented public route adapter

From the office user's perspective, the desired behavior is simpler:

- the builder preview should look like the public storefront
- the preview should reflect unsaved draft edits immediately
- the published public route should keep loading and error behavior appropriate for direct customer entry

The current structure does not yet isolate those needs cleanly enough.

## Solution

Introduce a dedicated public storefront screen module that represents only the ready-state customer-facing storefront, and make both the public route and the storefront builder preview consume that same screen.

The solution has two layers:

- a public storefront route adapter
- a pure public storefront screen

The public storefront route adapter will remain responsible for:

- receiving the public entry input such as office code
- fetching storefront config, public office product rows, and public office identity
- handling loading, error, and placeholder states

The public storefront screen will be responsible only for rendering the public storefront when all required data is already available. It will accept ready-state props such as:

- storefront config
- product rows
- office name
- NH identity name

The storefront builder preview will stop rendering its own separate customer-facing view ownership path and will instead import this same public storefront screen directly. The builder will pass its current draft-first preview props into the screen so that:

- page AI changes are visible immediately
- card AI changes are visible immediately
- data-selection changes are visible immediately
- unsaved category and helper-block changes are visible immediately

The key product decision is that the builder reuses only the ready-state public storefront screen, not the full public route adapter.

That keeps the preview aligned with the published experience while preserving the builder's draft-first behavior. It also gives the planned `publicstorefront` split a stable interface:

- the public feature owns the customer-facing screen
- the builder reuses that screen
- data loading remains outside the screen

## User Stories

1. As an office operator, I want the builder preview to match the public storefront screen, so that I can trust what customers will see after publishing.
2. As an office operator, I want unsaved draft edits to appear in the preview immediately, so that I can evaluate the result before saving.
3. As an office operator, I want page-style changes to appear in the preview through the same public screen, so that preview and published appearance stay aligned.
4. As an office operator, I want card-style changes to appear in the preview through the same public screen, so that layout and emphasis decisions do not drift between builder and public output.
5. As an office operator, I want data-selection changes to affect the preview without saving first, so that I can compare field choices quickly.
6. As an office operator, I want helper blocks and other public-facing presentation changes to render the same way in preview and in the public route, so that the storefront feels predictable.
7. As an office operator, I want the builder preview to avoid reloading saved public data over my draft, so that I do not lose confidence in the preview.
8. As an office operator, I want direct public entry to keep its own loading, error, and placeholder behavior, so that customers still get a safe route experience.
9. As an office operator, I want the builder to reuse the public storefront presentation rather than an almost-identical copy, so that visual regressions are less likely.
10. As a maintainer, I want one customer-facing storefront screen module, so that public rendering rules live in one place.
11. As a maintainer, I want the public route adapter to own fetching and route-entry concerns, so that the rendering screen stays pure and reusable.
12. As a maintainer, I want the builder to depend only on a ready-state screen interface, so that it does not accidentally inherit public fetch behavior.
13. As a maintainer, I want the public screen interface to be simple and explicit, so that future feature splits remain navigable.
14. As a maintainer, I want the planned `publicstorefront` feature to own the customer-facing screen, so that the folder structure matches the product language.
15. As a maintainer, I want existing storefront config, page-style, card-style, and section-building logic to continue driving both preview and public rendering, so that this refactor does not change the save model.
16. As a maintainer, I want tests to prove that builder preview uses draft props instead of re-fetching public data, so that the preview seam remains trustworthy.
17. As a maintainer, I want tests to prove that the public route still handles loading and error states correctly, so that separating the screen does not break direct entry.
18. As a maintainer, I want the public screen extraction to be usable as the first step in a broader `publicstorefront` feature split, so that the refactor can proceed incrementally.
19. As an AFK agent, I want this split documented as a product and architecture decision, so that later implementation slices do not re-open the ownership question.
20. As a future contributor, I want to understand that the builder is reusing the public storefront screen on purpose, so that I do not accidentally fork the rendering path again.

## Implementation Decisions

- The refactor will introduce a public storefront route adapter module and a separate ready-state public storefront screen module.
- The public storefront route adapter will keep ownership of fetch orchestration, direct-entry status handling, and route-level placeholder behavior.
- The public storefront screen will accept already-resolved render inputs and will not fetch data on its own.
- The builder preview will import the ready-state public storefront screen directly rather than importing the full public route adapter.
- The builder preview will continue to source its preview data from the existing builder draft flow, including preview config, preview product rows, and office identity values.
- The preview seam must remain draft-first. Unsaved builder changes always win over saved public data while the user is editing.
- The public route seam must remain publish-first. It continues to load the saved storefront for a direct public entry.
- The extracted public storefront screen should be the single owner of the customer-facing storefront rendering contract.
- The existing storefront rendering implementation may be renamed, wrapped, or moved behind the new public screen interface, but the refactor should avoid duplicating the customer-facing render logic.
- Loading, error, and placeholder UI are intentionally not part of the reusable public screen interface. They remain responsibilities of the public route adapter.
- The public screen interface should stay narrow and stable, centered on ready-state props such as storefront config, product rows, office name, and NH identity name.
- The builder must not depend on public route-fetch assumptions such as office-code-only rendering.
- The public feature split should remain compatible with the current office-facing storefront save model and the current public data-loading path.
- Existing normalization, section-building, page-style, card-style, and mobile UI-tree behavior should continue to drive the screen. This refactor changes module ownership and reuse, not the storefront schema itself.
- The first implementation slice should optimize for safe extraction rather than large redesign. The goal is to establish the seam first, then continue the broader folder split with less risk.
- The public storefront screen should remain suitable for mobile preview framing inside the builder, even though it is also used for the full public route.
- The team may keep a deeper internal render module beneath the public screen if that improves locality, but the builder-facing reuse seam should still be the public storefront screen rather than a generic builder-owned renderer.

## Testing Decisions

- Good tests should verify externally visible behavior and module ownership at the seam, not just internal refactor mechanics.
- Public route tests should verify that direct public entry still handles loading, error, placeholder, and ready states correctly after the screen extraction.
- Public screen tests should verify that the ready-state storefront renders correctly when given already-resolved props.
- Builder preview tests should verify that the preview renders through the reused public storefront screen while still reflecting unsaved draft state.
- Builder preview tests should verify that draft changes to page style, card style, visible fields, and selected categories remain visible before save.
- Regression tests should verify that builder preview does not accidentally fall back to saved public fetch behavior while editing.
- Regression tests should verify that the public route adapter still requests storefront config, public office product rows, and public office identity through the existing public-loading seam.
- Rendering tests should continue to assert customer-visible storefront output such as category chips, search behavior, card layout, and helper blocks.
- Existing storefront builder tests and public storefront tests are the right prior art and should be extended rather than replaced.
- The highest-value seam tests are:
  - public adapter to public screen handoff
  - builder preview to public screen handoff
  - draft-first preview correctness
  - direct public-entry correctness

## Out of Scope

- A redesign of the storefront save schema
- Changes to office product data loading contracts
- Changes to the public route URL format or public entry query structure
- A new publishing workflow
- A rewrite of AI page-style or card-style generation
- A full relocation of every storefront model and service in the same slice
- New customer-facing loading or error copy beyond what is needed to preserve current behavior
- Replacing the mobile preview shell design in the builder
- Broad UI redesign unrelated to establishing the new public-screen seam

## Further Notes

- This PRD intentionally treats the public storefront screen extraction as the first stable seam in the broader `publicstorefront` split.
- The most important rule is that the builder reuses the public ready-state screen, not the public fetching page.
- If the team later wants a deeper split between public rendering core and public route concerns, this PRD still supports that evolution because the screen interface remains the stable handoff point.
- Naming is flexible as long as the responsibilities stay clear. The customer-facing ready-state module may wrap the existing storefront rendering implementation rather than replacing it outright.
