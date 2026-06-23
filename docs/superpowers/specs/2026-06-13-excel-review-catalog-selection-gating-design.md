# Excel Review Catalog Selection Gating Design

## Goal

Prevent the custom table-name input from changing the active category directly.
Only sidebar clicks should change the active category and page content.

## Problem

The current custom category flow mixes three different concerns too closely:

1. input draft text
2. validation rules
3. active category selection

Because those concerns are partially coupled, typing an existing category name can feel like it is selecting that category, and creating a custom category can move the page forward too early.

This makes the interaction ambiguous:

- Is the input a selector?
- Is the input just a draft field?
- Does `만들기` create only, or create and select?

The product intent is stricter:

- selection happens only through sidebar clicks
- input is only for draft creation
- `만들기` only adds a sidebar entry

## Product Rules

1. `비료` and `농약` are default categories.
2. Default categories are selected only by clicking the sidebar.
3. Typing `비료` or `농약` into the input must never select them.
4. If the user clicks `만들기` with `비료` or `농약` in the input, show an error:
   `기본 카테고리는 사이드바에서 선택하세요`
5. Existing custom categories are also selected only by clicking the sidebar.
6. Typing an existing custom category name into the input must never load that category.
7. If the user clicks `만들기` with an existing custom category name, show an error:
   `이미 있는 카테고리입니다. 사이드바에서 선택하세요`
8. A valid new custom category can be added by clicking `만들기`.
9. After `만들기`, the new category is added to the sidebar but is not auto-selected.
10. The user must click the new sidebar entry to move into that category.
11. Upload, saved-data loading, and active content changes must all continue to depend on the active sidebar selection only.

## Recommended UX

### Sidebar selection

- `비료`, `농약`, and saved custom categories all behave the same in one important way:
  they become active only when clicked in the sidebar.
- The sidebar remains the single source of truth for what the user is currently editing or viewing.

### Input behavior

- The table-name input behaves as a draft field only.
- Typing does not trigger category switching.
- Typing does not trigger data loading.
- Typing does not trigger upload activation beyond the create-flow rules already tied to valid draft creation.

### Create behavior

- `만들기` is not a navigation action.
- `만들기` only attempts to create a new pending custom category entry.
- Success result:
  - the new category appears in the sidebar
  - the current page does not move into that category automatically
- The user then clicks the new sidebar item to actually enter it.

## Architecture

## Hook / Model / Object Boundaries

This change should make the boundaries clearer, not blur them further.

### Hook responsibility

`useWorkbookCatalogSelection.js` should own transient UI state only:

- current sidebar selection mode
- current input draft
- pending custom category list
- selected custom category name
- event handlers that wire UI actions to model decisions

The hook should not contain inline business-rule branching that can live in model helpers.

### Model responsibility

Catalog-selection rules should be extracted or kept in model-level helpers under the catalog/save model area.
These helpers should answer questions like:

- is this a default category name?
- is this a duplicate custom category name?
- can this draft be created?
- what error message should be shown on create attempt?
- what active category name should be resolved from the current selection state?

The model should contain deterministic rule evaluation.
The hook should call the model and store results.

### Object responsibility

Use explicit small objects instead of loosely coupled primitive branching where helpful.
For example, a validation result object may describe:

- `isValid`
- `reason`
- `message`
- `normalizedCategoryName`

This keeps handler code short and predictable.

### Boundary rule

Typing in the input must not directly mutate the active-category object.
The active-category state must stay separate from the draft-category state.

## Data Flow

1. User clicks `+ 추가`
2. Hook enters custom draft mode
3. User types a draft name
4. Hook asks model helpers whether the draft is:
   - empty
   - default
   - duplicate
   - creatable
5. User clicks `만들기`
6. Hook uses model result:
   - invalid -> show error only
   - valid -> append sidebar entry only
7. User clicks a sidebar item
8. Only then does active category change
9. Active category change drives upload state, saved-data fetch, and visible content

## Error Handling

- Empty draft:
  - keep current guidance behavior
- Default category draft:
  - show `기본 카테고리는 사이드바에서 선택하세요`
- Existing custom category draft:
  - show `이미 있는 카테고리입니다. 사이드바에서 선택하세요`
- Invalid draft should never trigger active category change
- Invalid draft should never trigger saved-data loading

## Testing

1. Typing `비료` then clicking `만들기` shows the default-category error and does not select `비료`.
2. Typing `농약` then clicking `만들기` shows the default-category error and does not select `농약`.
3. Typing an existing custom category name then clicking `만들기` shows the duplicate error and does not select it.
4. Typing a new custom category and clicking `만들기` adds a sidebar entry only.
5. After creation, page content does not switch until the new sidebar entry is clicked.
6. Clicking the new sidebar entry switches into that category.
7. Default categories still switch only on sidebar click.
8. Saved custom categories still switch only on sidebar click.

## Scope Notes

- This change is about selection gating and state separation.
- It does not change save payload format.
- It does not change static merge rules.
- It does not change registered-data fetch semantics except to make selection timing stricter.
