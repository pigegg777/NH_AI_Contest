# Storefront Card Layout And Override Design

## Overview

This design defines the next card-layout layer for the storefront builder after the data-selection boundary is established.

The goal is to let office users refine card layout and styling with natural language while keeping rendering deterministic, mobile-safe, and compatible with the existing storefront save model.

This design assumes the previously approved data-selection flow:

- data selection is confirmed before card design
- `visibleFields` remains the source of truth for which fields are shown
- card-design AI may not change data selection

This document only covers card layout, card styling, and card-scoped override behavior.

## Goals

- Let the user choose whether cards render one-per-row or two-per-row.
- Let the user refine card structure through natural language, but only inside approved structural presets.
- Treat the card as a composition of explicit sections rather than one undifferentiated block.
- Allow section-specific and field-specific styling without introducing arbitrary freeform layout behavior.
- Preserve existing styles unless the user explicitly targets a specific card area.
- Keep all saved card output deterministic and preview-safe.

## Non-Goals

- Arbitrary drag-and-drop card composition
- Absolute positioning of card content
- Freeform CSS persistence
- Category-chip spacing changes in this card-scope change
- AI-generated missing product images in this phase
- Font-family selection as a card-level styling feature

## Card Composition Model

The card is modeled as one outer shell with explicit internal sections:

- `card.shell`
- `card.header`
- `card.image`
- `card.info`
- `card.field`

Each layer has a different responsibility.

### `card.shell`

Owns the outer card frame and overall mood.

Allowed style surface:

- `backgroundColor`
- `borderColor`
- `shadow`
- `radius`
- `padding`

### `card.header`

Owns the dedicated title area when the card uses a visible header.

Default behavior:

- `product_name` is rendered here by default
- title text defaults to black
- header background defaults to a neutral gray-family resolved color only when no page-derived header treatment or explicit card override is present

Allowed style surface:

- `backgroundColor`
- `borderColor`
- `padding`
- `radius`
- title `fontSize`
- title `fontWeight`
- title `letterSpacing`
- title `color`

Header title rules:

- `product_name` may render in the header or inline inside the info section
- when inline mode is active, the header section is not rendered
- header style state is preserved but not applied while inline mode is active
- `product_name` uses a maximum two-line clamp in both header mode and inline mode

### `card.image`

Owns structural image behavior only.

Allowed style surface:

- structural position
- image-area size
- image fit

Not allowed:

- separate image-section background styling
- separate image-section border styling
- arbitrary image offsets

Image behavior rules:

- if `img_url` is missing, the image section is not rendered
- when no image renders, the card automatically reflows into an info-only variant
- the default image layout is structure-dependent rather than globally identical
- natural-language micro-adjustment for size applies only to the image area
- image size adjustment resolves to bounded numeric values with clamp rules

### `card.info`

Owns the main product-data area for all selected data fields other than the dedicated header title.

Allowed style surface:

- `backgroundColor`
- `borderColor`
- `padding`
- `radius`
- `fieldGap`
- `fieldGroupGap`
- `alignment`

### `card.field`

Owns individual data-item styling after field visibility has already been decided by `visibleFields`.

Allowed style surface:

- `fontSize`
- `fontWeight`
- `color`
- `letterSpacing`
- `emphasis`

Not allowed:

- font family selection
- independent line-height control
- arbitrary transform effects

## Structural Preset Model

Card structure is not freeform. AI may only switch between approved presets.

The user can request a structural change in natural language, but the result must resolve to one of the allowed presets for the current card density.

### Core Modes

Title mode:

- `header`
- `inline`

Rules:

- `header` means `product_name` renders in `card.header`
- `inline` means `product_name` renders as the first row in `card.info`
- `product_name` remains the highest-priority element in either mode

### Default Presets By Card Density

User-selected card density is authoritative:

- `cardsPerRow = 1`
- `cardsPerRow = 2`

AI may not change this value.

Default structural presets:

- `1-column default` = `header-top + image-left + info-right`
- `2-column default` = `header-top + image-top + info-bottom`

### Density-Specific Structural Limits

Allowed presets differ by density.

Rationale:

- two-column cards cannot safely support every large-layout arrangement
- one-column cards can support richer structures

The renderer and compiler must enforce preset eligibility based on `cardsPerRow`.

## Field Layout Model

`visibleFields` remains the source of truth for whether a field can appear.

Display order and grouping are separate from visibility.

### Visibility Versus Render Order

- `visibleFields` remains canonical and deterministic
- card render order is driven by compiled card body layout output
- changing card layout may reorder fields without changing `visibleFields`

### Grouping Types

Allowed body composition forms:

- single field
- inline group
- stack group

Not allowed:

- arbitrary grid-inside-grid field composition
- overlapping field placement
- absolute-position field widgets

### Reordering Rules

AI may reorder fields when the user requests a layout change such as:

- show prices first
- place nutrient under spec
- keep categories together

Hard rule:

- `product_name` always stays first
  - header mode: in `card.header`
  - inline mode: first row of `card.info`

## Prompt And Override Model

Card editing follows the same high-level authoring pattern as page editing:

- one main card prompt
- area-specific overrides

Approved override scopes:

- `card main prompt`
- `header override`
- `image override`
- `info override`
- `field override`

The compiled result stores resolved layout and style decisions, not open-ended prompt semantics.

### Override Precedence

More specific targets override broader ones.

Precedence:

1. `field override`
2. `section override`
3. `main card prompt`

Behavior rule:

- by default, only explicitly targeted regions are modified
- the only automatic cross-target adjustment allowed is contrast correction

## Color And Contrast Rules

Default card colors derive from the page palette when no card-specific instruction is present.

Fallback behavior:

- page palette is the first styling source
- neutral fallback values are used only when no card instruction exists

Header contrast correction priority:

1. adjust title text color first
2. if still unreadable, slightly adjust header background
3. if the user strongly specified both colors, keep the closest possible result and surface a warning rather than silently overriding both

Saved colors must be resolved values rather than vague semantic placeholders.

## Image Size Adjustment Model

Natural-language image edits are allowed only for the image area.

Examples:

- make the image a little larger
- shrink the image slightly
- let the image fill more space

Internal behavior:

- the system resolves the request into small bounded numeric adjustments
- the adjustment meaning depends on structural preset

Examples:

- left-image presets adjust width-like area values
- top-image presets adjust height-like area values

Clamp behavior is required:

- one-column cards allow larger image ranges
- two-column cards use smaller maximum image ranges
- each preset family has its own min/max envelope

## Persistence Model

Card output should remain compatible with deterministic storefront rendering.

Recommended compiled structure concept:

- card shell style
- card header style
- card image style
- card info style
- field styles
- structural preset
- body slot composition

The important design rule is separation of concerns:

- field visibility comes from `visibleFields`
- field order and grouping come from the card render composition
- section styling comes from resolved section style objects

## Existing Style Preservation

The system should preserve prior styling unless the user explicitly targets a region.

Examples:

- asking for blue subsidy text should not rewrite all field colors
- asking for a stronger header should not restyle the info section
- asking for image enlargement should not change card density

This is a core product rule, not just an implementation detail.

## Public Rendering Rules

The public storefront renderer must support:

- one-column and two-column cards
- header mode and inline-title mode
- image-present and image-missing reflow behavior
- field grouping and reordering
- section-level backgrounds and borders
- field-level text emphasis

The renderer must not require dynamic interpretation of unsupported freeform layout instructions.

## Testing Strategy

Highest-value seams:

- builder flow that applies card prompts and overrides
- card layout compiler / normalization seam
- public card renderer

Behavior to verify:

- `cardsPerRow` is user-selected and AI cannot override it
- default presets differ correctly between one-column and two-column cards
- AI structural changes only resolve inside the allowed preset list
- `product_name` stays top-priority in both header and inline modes
- inline mode suppresses header rendering while preserving stored header style state
- missing `img_url` removes the image section and reflows safely
- image natural-language enlargement and reduction stay inside clamp limits
- section-specific overrides affect only the requested target
- field-specific overrides win over broader prompts
- contrast correction only affects readability-related conflicts
- `visibleFields` and render order remain separate concerns
- inline groups and stack groups render deterministically

## Risks To Watch

- current renderer logic still treats header/image/body order as partially hardcoded, so structural preset expansion must avoid creating contradictory state
- existing legacy card element toggles should not become a second source of truth after the new section model is introduced
- numeric image-size resolution must be bounded early enough that preview and saved render stay aligned
- two-column structural presets need stricter validation than one-column presets or cards will become visually dense too quickly

## Scope Exclusions For This Design

- category chip margin editing
- page-wide spacing work beyond what the page layer already owns
- generated fallback images by category
- font-family customization
- arbitrary raw size input for every section
- drag-and-drop layout authoring

## Final Rule

The card-design system should feel flexible in natural language, but every result must compile into a bounded preset-based structure with resolved section styles and deterministic field rendering.
