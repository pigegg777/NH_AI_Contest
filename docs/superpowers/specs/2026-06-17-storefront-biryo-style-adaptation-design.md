# Storefront Biryo-Style Adaptation Design

## Goal

Apply design language from `NH-AGri_Web-React` fertilizer pages to the current storefront public/preview UI without replacing the storefront data model or builder flow.

Target files:

- `react-app/src/features/storefront/components/StorefrontView.jsx`
- `react-app/src/features/storefront/components/StorefrontView.module.css`
- `react-app/src/features/storefront/components/CardGridSection.jsx`
- `react-app/src/features/storefront/components/CardGridSection.module.css`
- `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

## Current Context

The current storefront already has:

- configurable page title/subtitle/logo/search placeholder
- section generation driven by saved `categoryConfigs`
- search filtering across visible product rows
- card layout driven by saved field visibility and card style config
- shared use in both builder preview and public storefront page

The reference project contributes three reusable visual patterns:

- fertilizer-style card hierarchy from `features/biryo/components/BiryoCardList.*`
- boxed search field from `common/components/SearchInput.*`
- underline-tab category chips from `common/components/CategoryChipGroup.*` plus `BiryoInfoPage.*`

## Constraints

- Keep existing storefront save payload and schema unchanged.
- Keep current `categoryConfigs` section boundaries unchanged.
- Do not make category chips AI-generated.
- Category chips must be built from current data's `medium_category` values and stay fixed to that rule.
- Search and category filtering must work together.
- Builder preview and public page must both benefit from same component updates.

## User-Approved Direction

Adopt same visual feel as the reference project, but adapt it to storefront structure rather than cloning the fertilizer page exactly.

Approved behavior:

- category chips support both filter and navigation behavior
- chip source is fixed to unique `medium_category` values in current data
- section titles remain driven by current storefront config

## Design

### 1. StorefrontView structure

`StorefrontView` will keep the current hero/header structure, but the internal controls will change:

- remove the old top navigation button row
- keep title/subtitle/logo area
- replace the current plain search input with a boxed search shell styled after the reference `SearchInput`
- add category chips under the search area

This avoids duplicated navigation because category chips will now handle both discovery and movement.

### 2. Category chip source and behavior

Chip items will be derived from unique non-empty `medium_category` values from the current visible product dataset after hidden products are removed, but before search and chip filtering are applied.

Chip list:

- `전체`
- each unique `medium_category` in stable first-seen order

Chip click behavior:

- `전체` clears category filter
- a specific chip filters cards to rows whose `medium_category` matches exactly
- after activating a specific chip, the page scrolls to the first rendered section that contains at least one matching row

Reasoning:

- chips should not disappear as search text changes
- chips must reflect actual uploaded office data, not section labels or AI copy
- filtering and scrolling together satisfy the approved "both" behavior without adding duplicated controls

### 3. Search behavior

Existing text search logic remains, but the filtered result set becomes:

1. hidden-product filtered rows
2. search-matching rows
3. chip-filter matching rows

Search and chip filter are conjunctive. A row must satisfy both to render.

### 4. Section behavior

Section generation remains driven by `buildSections(config.categoryConfigs, filteredRows)`.

This preserves:

- saved product-category scope
- selected medium-category scope from builder config
- section titles from `displayName` / `productCategoryName`
- builder/public consistency

No changes will be made to section-matching rules or save-time category config normalization.

### 5. Card adaptation

`CardGridSection` will keep existing data-driven field selection, but card markup will be reorganized to match the fertilizer card feel:

- card shell gets stronger border radius, shadow, hover lift
- optional top header strip
- product name becomes primary headline
- badge area shows `medium_category` first, with fallback to another category label when empty
- image gets framed presentation instead of bare square slot
- price field receives stronger highlight treatment
- remaining selected fields render as compact label/value rows

This keeps storefront flexibility while making hierarchy feel closer to the reference design.

### 6. Responsive behavior

Responsive rules stay compatible with current storefront card-column config.

Planned behavior:

- desktop: respect configured card column count
- tablet/mobile: collapse to simpler readable layout
- chips wrap or grid naturally on narrow screens
- search field remains full width and touch-friendly

### 7. Empty states

When filtering leaves no products:

- show empty-state message in same storefront tone
- distinguish only by message text, not separate layout systems

This keeps public page behavior simple and predictable.

## File-by-File Change Plan

### `StorefrontView.jsx`

- add `activeMediumCategory` state
- derive chip items from current dataset
- compute filtered rows from search + chip state
- remove old section nav buttons
- render biryo-style search shell and chip bar
- keep smooth-scroll helper and reuse it for chip navigation

### `StorefrontView.module.css`

- restyle header panel spacing and surface
- add search shell, icon, focus styles
- add underline-tab chip styles adapted to current green storefront palette
- remove obsolete old nav button styling if unused
- refine empty-state styling

### `CardGridSection.jsx`

- reorganize card markup for headline/badge/image/meta hierarchy
- preserve field-driven rendering
- preserve image optionality
- preserve price formatting

### `CardGridSection.module.css`

- add fertilizer-inspired card surface and hover behavior
- style header strip, badge, image frame, price emphasis, compact metadata rows
- keep responsive behavior aligned with storefront config

### `PublicStorefrontPage.test.jsx`

- verify medium-category chip rendering
- verify chip filtering
- verify search + chip combined filtering
- verify scoped-source-category behavior still holds
- verify hidden products remain excluded

## Testing Plan

Primary verification:

- `npm run test:run -- storefront`
- `npm run build`

At minimum, tests covering `PublicStorefrontPage` will be updated and production build must pass.

## Risks

- current storefront preview width is narrow, so copied spacing from reference project cannot be transferred 1:1
- some rows may not have `medium_category`; chip derivation must ignore empty values cleanly
- card field visibility is configurable, so card hierarchy must degrade gracefully when fields are missing

## Out of Scope

- changing builder save schema
- changing AI prompt behavior
- adding new DB fields
- rewriting section matching rules
- cloning the entire fertilizer page layout exactly

## Implementation Recommendation

Proceed with targeted component adaptation inside the existing storefront component pair (`StorefrontView` and `CardGridSection`) and validate with storefront tests plus build verification. This gives the requested visual lift with low structural risk.
