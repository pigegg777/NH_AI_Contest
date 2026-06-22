# Storefront AI Adaptive Card Layout Design

## Goal

Allow Step 3 card-design AI to understand the current card style and the user's natural-language intent, then choose a better card layout automatically without requiring fixed prompt commands.

The system should feel flexible to the user, but the saved result must stay deterministic, preview-safe, and reusable across builder preview, saved drafts, and public storefront rendering.

## User-Approved Direction

- Users do not need to memorize command phrases.
- AI should infer layout intent from ordinary natural language.
- AI should inspect the current card style before deciding how to rearrange the card.
- The chosen approach is `intent interpretation + layout plan generation`.
- AI may decide both internal card layout and card density.
- The result must be stored as structured data rather than arbitrary JSX, HTML, or CSS.

## Problem

The current card-design flow is too constrained for layout editing.

- Structural changes resolve through a small preset list only.
- Some requested layout changes are not representable in the current intent schema.
- Renderer behavior is still partially hardcoded around a few preset branches.
- Title-line, image-position, and section-order changes are not modeled as first-class layout decisions.
- When the AI cannot map a request cleanly, the result often feels unchanged even if the user asked for a clear layout adjustment.

This creates the main user-facing failure mode: the prompt sounds natural, but the card does not visibly rearrange in the expected way.

## Constraints

- Product source data remains immutable.
- AI may edit presentation only, not raw product values.
- The card renderer must continue to produce deterministic React output.
- Saved drafts and public storefront pages must render the same layout plan consistently.
- Unsupported layout combinations must be normalized rather than partially applied in unsafe ways.
- The system must keep current category-scoped card editing boundaries.

## Recommended Approach

Introduce a dedicated `layoutPlan` layer for card AI.

Instead of asking AI to directly restyle JSX or infer everything from a narrow preset name, the system should ask AI to do two things:

1. Read the current card presentation state.
2. Produce a structured layout decision object that describes how the card should be rearranged.

The renderer and compiler then become responsible for turning that plan into the final card structure.

Why this approach:

- It preserves natural-language flexibility for the user.
- It gives AI more freedom than the current fixed-preset interpreter.
- It keeps rendering safe because the browser never executes arbitrary AI markup.
- It creates one stable saved format for preview, persistence, and public rendering.

## Design

### 1. Two-stage AI decision flow

Card AI should no longer behave like a narrow style patcher only.

The new flow:

1. Gather current card context.
2. Send the user's prompt plus the current card state to the card-layout interpreter.
3. Generate a structured `layoutPlan`.
4. Normalize unsupported or conflicting values.
5. Compile the normalized plan into renderable card configuration.
6. Render the updated card preview.

Current card context should include:

- current `cardsPerRow`
- current structural arrangement
- current title placement behavior
- current image presence and image fit
- current visible field set
- current field grouping state
- current section style state

This gives AI a real before-state so it can make adaptive decisions instead of trying to apply generic prompt heuristics blindly.

### 2. Layout plan model

`layoutPlan` becomes the canonical saved output for card arrangement.

Target concept:

```json
{
  "cardsPerRow": 2,
  "sectionOrder": ["header", "image", "info"],
  "imagePlacement": "right",
  "titleClamp": 1,
  "contentDensity": "compact",
  "emphasis": "image",
  "groupingHint": "summary-first"
}
```

Required meaning of each field:

- `cardsPerRow`
  - whether cards render in one-column or two-column mode
- `sectionOrder`
  - the visible order of `header`, `image`, and `info`
- `imagePlacement`
  - whether the image sits `top`, `left`, or `right`
- `titleClamp`
  - whether the title is visually clamped to `1` or `2` lines
- `contentDensity`
  - whether the info section renders in a `compact` or `comfortable` style
- `emphasis`
  - which area is visually prioritized: `title`, `image`, or `info`
- `groupingHint`
  - a safe grouping direction for product fields, such as summary-first or detail-first

This plan does not expose raw CSS. It captures layout intent only.

### 3. AI interpretation boundary

The AI should be free in language understanding, but bounded in output.

The interpreter should accept ordinary prompts such as:

- "The card feels too crowded, move the image to the side and tighten the details."
- "Make the product name feel more prominent and reduce visual noise."
- "This should look wider and more like a quick product comparison card."

The interpreter should convert those requests into structured decisions rather than keyword-only preset matching.

Important rule:

- AI may decide the layout plan.
- AI may not emit arbitrary JSX, CSS text, HTML fragments, or runtime scripts.

### 4. Normalization and safety rules

Normalization is required because some AI decisions will still conflict with viewport or rendering limits.

Examples of normalization rules:

- two-column layouts may reject section combinations that become unreadable
- image-right and image-left layouts may require a minimum card width
- title clamp defaults to `2` if the current data shape makes `1` line unsafe
- unsupported `groupingHint` values fall back to a safe default
- if no valid image exists, image placement is ignored and the card reflows to text-first output

Normalization should minimize surprise:

- keep as much of the AI decision as possible
- only change the part that violates a hard rule
- preserve prior style values unless the layout plan directly affects them

### 5. Compiler and renderer responsibilities

The compiler should stop treating card structure as a side-effect of only a small preset list.

Compiler responsibilities:

- merge current card state and AI layout plan
- validate allowed combinations
- derive final section arrangement
- derive final field grouping order
- preserve unrelated styling
- produce one render-safe card configuration object

Renderer responsibilities:

- render cards from the compiled structure rather than hardcoded branch logic
- support section reordering for `header`, `image`, and `info`
- support image `top`, `left`, and `right`
- support title clamp changes
- support density-aware layout differences between one-column and two-column cards

The renderer should not reinterpret the original natural-language prompt.

### 6. Existing-style preservation

The product rule remains: preserve current styling unless the user intent clearly implies a related layout change.

Examples:

- asking for a more compact layout should not rewrite all section colors
- moving the image to the right should not reset title styling
- switching to two columns should not silently remove visible fields

This matters because the user expectation is "adjust this card" rather than "regenerate a new card from scratch."

### 7. Persistence and compatibility

The stored storefront category config should retain deterministic card output.

Compatibility strategy:

- if legacy card data exists without `layoutPlan`, derive a default plan from the current saved structure
- existing card style objects remain valid and continue to store section styling
- `layoutPlan` becomes the arrangement source of truth
- section style objects remain the appearance source of truth

This separation is important:

- `layoutPlan` answers where things go
- card style objects answer how they look

### 8. Scoped editing boundary

This feature should stay inside the current card-editing boundary.

The AI may rearrange only the card layout for the active category draft.

It may not:

- rewrite page-level header layout
- reorder page sections outside the card area
- edit product data values
- alter unrelated categories unless the active editing flow explicitly applies there

This keeps Step 3 behavior predictable and matches the user's expectation that card editing changes the card, not the entire storefront.

## Error Handling

- If AI interpretation fails, preserve the previous card layout and show a failure message.
- If AI returns partial layout data, normalize the missing fields from the current card state.
- If the plan contains unsupported values, drop only the invalid values and continue with the rest.
- If the plan cannot be compiled safely, restore the prior compiled card config instead of rendering a broken preview.

## Testing

### Model and interpreter tests

- interpret freeform natural language into a valid `layoutPlan`
- preserve current-state context during interpretation
- reject arbitrary raw markup output
- normalize invalid or incomplete layout-plan fields

### Compiler tests

- compile `layoutPlan` into a valid render structure
- preserve existing non-targeted styles
- reflow safely when image data is missing
- enforce density-specific layout limits

### Renderer tests

- render all supported section orders
- render image placement at top, left, and right
- apply one-line and two-line title clamp
- keep one-column and two-column outputs visually consistent with compiled config

### Integration tests

- Step 3 prompt updates the active category card only
- saved drafts preserve `layoutPlan`
- public storefront rendering matches builder preview
- layout changes survive reload and re-edit flow

## Risks To Watch

- the current renderer has hardcoded layout assumptions that will need to be removed carefully
- current AI schema gaps can cause layout intent loss during normalization
- density switching and section reordering can create edge cases for small mobile widths
- legacy saved card configs must derive stable defaults or the first migration pass will feel inconsistent

## Non-Goals

- arbitrary drag-and-drop authoring
- freeform HTML or CSS persistence
- per-card absolute-position editing
- product data mutation
- page-wide layout redesign outside the card editing scope

## Result

The Step 3 card editor becomes a true natural-language layout tool.

Users can describe the card they want in ordinary language. AI reads the current card state, decides on an adaptive layout plan, and the storefront renderer applies that plan through safe structured rendering. The result is much more flexible than the current preset-only behavior, while still staying deterministic and maintainable.
