# Storefront AI Style Boundary Design

## Goal

Allow AI-assisted storefront editing to change presentation freely enough for practical design work while keeping source product data immutable.

## User-Approved Direction

- Original product data stays read-only.
- AI may change presentation-layer behavior such as image size, card spacing, radius, shadow, chip/search styling, copy, and layout emphasis.
- Category chips stay derived from current product data's `medium_category` values.
- We do not introduce arbitrary persisted raw HTML execution against source data.

## Problem

Current storefront AI only patches a small structured set:

- `designDirection`
- `selectedMediumCategories`
- `representativeMediumCategory`
- `cardFields`
- `cardStyle`
- `navConfig`

This is safe, but too narrow for the requested design freedom. It also does not support richer card sizing and UI treatment controls that already exist visually in the storefront view layer.

## Constraints

- Source product rows fetched from office product data remain unchanged.
- AI must not edit raw product field values such as product name, spec, nutrient, price, or category taxonomy.
- Medium-category selection must remain limited to categories present in current data.
- Existing React rendering path remains the source of truth for storefront output.

## Recommended Approach

Extend the existing structured style model rather than storing freeform HTML/CSS text.

Why:

- Fits current config-driven architecture.
- Keeps rendering safe and predictable.
- Avoids storing unbounded HTML/CSS that can drift from component structure.
- Lets AI produce richer visual changes without touching source data.

## Design

### 1. Immutable data boundary

Storefront AI continues to receive current product data as read-only context. The apply step may only update storefront config fields. No service or hook in the AI path will write back into office product data rows.

### 2. Expanded presentation config

Broaden `cardStyle` and related presentation config so AI can control more visible aspects of the page. Target controls:

- image presentation: width/height ratio, fit mode, thumbnail prominence
- card container: radius, border, shadow, padding, gap
- layout density: compact/comfortable/prominent
- card emphasis: title weight, price emphasis, metadata visibility tone
- search box variant: pill/outlined/soft
- category chip variant: filled/outline/soft
- section spacing and cards-per-row behavior

These remain normalized enumerations or bounded numeric options, not arbitrary CSS strings.

### 3. Render-layer markup flexibility

`StorefrontView.jsx` and card-section components may change internal markup and CSS modules to express richer layouts. This counts as free HTML/CSS work in code, but it is controlled by React component logic rather than user-supplied raw markup.

### 4. AI patch boundary

AI suggestions may update:

- page copy in `navConfig`
- selected medium categories within current allowed options
- representative medium category within selected options
- expanded presentation config fields

AI suggestions may not update:

- original product objects
- category taxonomy outside current dataset
- arbitrary unknown config fields

## Data Flow

1. Builder loads source product entries and existing storefront config.
2. Builder derives valid `medium_category` options from current product rows.
3. AI request receives prompt, current draft, allowed categories, and allowed presentation fields.
4. AI returns a structured patch.
5. Client normalizes the patch.
6. Builder applies patch only to storefront config state.
7. Preview re-renders using same source product rows plus updated presentation config.

## Error Handling

- Invalid AI style values fall back through normalizers.
- Invalid medium categories are dropped.
- Empty or partial AI responses do not mutate source data.
- If AI is unavailable, heuristic fallback still obeys the same immutable boundary.

## Testing

- Add model tests for expanded style normalization.
- Add AI payload normalization tests to prove disallowed values are ignored.
- Add builder tests proving source product rows are unchanged after AI apply.
- Update page/view tests for richer card, search, and chip variants.

## Non-Goals

- Editing source product master data
- Generating or persisting arbitrary raw HTML
- Saving arbitrary raw CSS text from AI
- Allowing AI to invent new medium categories not present in current data

## Result

User gets broad storefront design control in preview and saved config. Data integrity stays protected because only presentation-layer config changes, never the original product dataset.
