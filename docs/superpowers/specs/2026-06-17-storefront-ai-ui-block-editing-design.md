# Storefront AI UI Block Editing Design

## Goal

Allow storefront AI editing to add, remove, reorder, and restyle mobile UI blocks while keeping source product data immutable and keeping the editor easy for non-technical users to operate.

## User-Approved Direction

- Scope is mobile only. Desktop-specific behavior is out of scope.
- AI may modify both page-level UI and card-level presentation.
- Source product data is read-only. AI must not edit product names, prices, categories, or any other raw values.
- AI should support deletion and addition of UI, not just color or copy tweaks.
- The chosen architecture is a validated UI tree, not a small set of booleans and not freeform raw HTML.
- Additional UI should come from a predefined block set.
- Allowed insertion positions are limited to safe mobile slots:
  - `top`
  - `afterSearch`
  - `beforeChips`
  - `afterChips`
  - `beforeProducts`
  - `sectionHeaderBelow`
  - `bottom`
- The experience must remain usable even without prompting AI. People should be able to edit the result directly through clear controls.

## Problem

The current storefront AI flow can only patch a narrow set of fields such as `designDirection`, `selectedMediumCategories`, `cardFields`, `cardStyle`, and `navConfig`.

That is not enough for the requested behavior:

- AI cannot add or remove page blocks.
- AI cannot reorder the mobile page structure.
- AI cannot manage predefined helper blocks such as banners, highlight boxes, dividers, or CTA buttons.
- AI cannot express card-level element visibility with a dedicated, user-friendly model.
- The current editing experience is too dependent on prompt input instead of direct manual controls.

## Constraints

- Office product source rows remain the single source of truth for product data.
- `medium_category` options remain derived from the current dataset only.
- `productSections` stays mandatory because the page must still render the actual products.
- AI output must be normalized, bounded, and reject unknown block types, slots, and props.
- React component code and CSS may change freely in the repo, but runtime AI output must not inject arbitrary HTML, CSS, or JavaScript.

## Recommended Approach

Represent the mobile storefront as a validated UI tree plus a separate card element config.

Why this approach:

- It gives AI enough freedom to add, remove, hide, and reorder UI.
- It stays compatible with the current config-driven rendering model.
- It keeps the rendering layer safe because all output flows through known React components.
- It scales better than continuously adding one-off flags like `showSearch`, `showChips`, and `showBanner`.
- It is still understandable for manual editing because each editable thing maps to a visible, named control.

## Design

### 1. Immutable data boundary

AI edits only presentation-layer config. It may not mutate the underlying product rows or category taxonomy.

Allowed:

- show or hide the product image
- change image size and fit
- show or hide price, spec, nutrient, badge, and other card elements
- add or remove predefined helper blocks
- move allowed blocks to allowed slots
- rewrite page copy for UI blocks

Not allowed:

- edit product names
- edit raw prices
- invent new product categories
- inject arbitrary new data fields
- inject raw HTML, CSS, or JS as runtime content

### 2. Page-level UI tree

Add `mobileUiTree` under `pageConfig`.

Each block entry uses a normalized structure:

```json
{
  "id": "search-box-primary",
  "type": "searchBox",
  "slot": "top",
  "enabled": true,
  "props": {}
}
```

Supported block types:

- `hero`
- `productCategoryNav`
- `mobileCategoryBar`
- `searchBox`
- `categoryChips`
- `noticeBanner`
- `highlightBox`
- `ctaButton`
- `divider`
- `productSections`
- `emptyState`

Supported block slots:

- `top`
- `afterSearch`
- `beforeChips`
- `afterChips`
- `beforeProducts`
- `sectionHeaderBelow`
- `bottom`

Rules:

- `productSections` is required and cannot be removed.
- Unknown block types are discarded during normalization.
- Unknown slots fall back to a safe default per block type.
- Duplicate singleton blocks such as `searchBox` or `categoryChips` are collapsed to one normalized entry.
- Additional helper blocks such as `noticeBanner`, `highlightBox`, `ctaButton`, and `divider` may appear multiple times within bounded limits if needed.

### 3. Card-level element config

Add a separate `cardElementConfig` to the storefront category config so card content visibility is expressed directly rather than inferred only through the old `cardFields` array.

Target shape:

```json
{
  "showImage": true,
  "showProductName": true,
  "showSpec": true,
  "showNutrient": true,
  "showPrice": true,
  "showBadge": true,
  "imageSize": "md",
  "imageFit": "cover",
  "metaDensity": "comfortable"
}
```

Rules:

- The normalized config remains bounded to known enum values.
- Raw product values are still sourced from the original product rows.
- Existing `cardFields` can stay for backward compatibility during migration, but new rendering should prefer `cardElementConfig`.

### 4. AI patch boundary

Expand the AI patch schema so it can return:

- `designDirection`
- `selectedMediumCategories`
- `representativeMediumCategory`
- `cardStyle`
- `navConfig`
- `mobileUiTree`
- `cardElementConfig`
- `uiChangeSummary`

`uiChangeSummary` is a human-readable list of applied changes such as:

- `Hide search box`
- `Add notice banner above product list`
- `Increase card image size`

This summary is for user feedback and undo confidence. It does not need to be the source of truth for rendering.

### 5. User-facing editing UX

The editor should feel like an easy mobile page editor with AI assistance, not a prompt-only tool.

Required manual controls:

- page block visibility toggles
- block add buttons from a predefined block library
- block remove actions for removable helper blocks
- card element visibility toggles
- image size and fit selectors
- simple copy inputs for text-based helper blocks
- a clear indicator that source product data is fixed

Recommended editing groups:

- `Visible Elements`
- `Add Blocks`
- `Card Elements`
- `AI Change Summary`

UX rules:

- Users must be able to make key edits without writing prompts.
- Inputs for raw product name or raw price editing should not exist.
- Helper blocks should be added from a small, named list instead of arbitrary type input.
- AI changes should be immediately understandable through a summary panel.

### 6. Apply, preview, save, and undo flow

AI apply flow:

1. Send prompt, current draft, allowed block definitions, allowed slots, and allowed categories.
2. Receive a structured patch only.
3. Normalize the patch.
4. Drop unsupported blocks, unsupported slots, and unsupported props.
5. Restore required blocks such as `productSections` if missing.
6. Apply the result to local builder state.
7. Show updated preview and change summary.

Undo flow:

- Store one pre-AI snapshot of the relevant presentation state.
- Provide a one-tap AI undo action.
- Undo restores the prior preview state without touching source data.

Save flow:

- Save the normalized presentation config with the rest of the storefront config.
- Keep the current behavior of preview-first editing.
- If save fails, retain the visible preview state and show a save failure message so the user can still inspect the result.

### 7. Rendering model

`StorefrontView.jsx` should stop depending only on a fixed hardcoded block order and instead render from the normalized `mobileUiTree`.

Rendering expectations:

- Known block types map to known React subcomponents.
- Product data rendering stays inside the `productSections` block.
- `emptyState` remains driven by filtered product results, but whether and where it appears can still be controlled through the normalized tree.
- Mobile layout remains the design target throughout.

### 8. Migration and compatibility

Existing saved storefront configs should continue to render.

Compatibility strategy:

- If `mobileUiTree` is missing, generate a default tree from the current layout.
- If `cardElementConfig` is missing, derive defaults from current `cardFields` and `cardStyle`.
- Preserve current saved data until the new structure is normalized in memory and re-saved.

## Testing

### Model tests

- normalize `mobileUiTree`
- reject unsupported block types
- reject unsupported slots
- restore required `productSections`
- normalize `cardElementConfig`
- derive defaults from legacy config

### AI service tests

- normalize AI patch responses with `mobileUiTree`
- ensure unknown blocks are removed
- ensure unknown props do not survive
- ensure `uiChangeSummary` is always usable

### Hook tests

- apply AI patch to preview state
- preserve source product rows
- restore previous state with undo
- keep preview visible when save fails

### UI tests

- manual block add and remove controls render on mobile
- search box, category chips, banners, CTA, and divider can be toggled or inserted
- card image, spec, nutrient, and price visibility respond to config
- raw data editing inputs do not appear

### Manual verification

- a user can edit the page without prompting AI
- AI suggestions remain understandable through the summary panel
- long text in helper blocks does not break the mobile layout

## Non-Goals

- desktop layout redesign
- arbitrary runtime HTML authoring
- arbitrary runtime CSS text storage
- direct editing of source product data
- unrestricted freeform block creation

## Result

The storefront builder becomes a safer but much more capable mobile AI editor. AI can add, remove, reorder, and restyle validated UI blocks and card elements, while users can still understand and override those changes directly through simple controls. The source product dataset remains protected throughout.
