# Excel Review Inline Add Panel Design

## Goal

Make the custom table-name flow feel like the immediate next step after clicking `+ 추가`, so users do not confuse it with a separate save setting.

## Problem

The current UI shows the custom table-name input in a separate sidebar card below the catalog list.
That layout has two UX problems:

1. The input appears away from the `+ 추가` trigger, so the cause-and-effect relationship is weak.
2. The card title reads like a general setting area, not like the next step of the add flow.

Because of this, users can read the input as an unrelated configuration block instead of "`+ 추가` -> name input -> save".

## Product Rules

1. `비료` and `농약` remain the default selectable categories.
2. Clicking a default category keeps the existing default flow.
3. `+ 추가` remains the entry point for custom table names.
4. The custom-name UI appears only when `+ 추가` is active.
5. The custom-name UI is rendered directly under the `+ 추가` item, inside the same catalog area.
6. The custom-name value is preserved when switching between default categories and `+ 추가`.
7. Save stays disabled when custom mode is active and the custom name is empty.
8. Auto static merge remains enabled only for the default `비료` and `농약` modes.

## Recommended UX

### Default categories

- `비료` or `농약` behaves as it does now.
- No custom-name panel is shown.
- The selected card stays visually active.

### Add flow

- When the user clicks `+ 추가`, that item becomes active.
- An inline helper panel opens immediately below the `+ 추가` row.
- The panel includes:
  - a clear title such as `새 테이블 이름`
  - a short guide such as `추가할 테이블 이름을 입력한 뒤 저장하세요`
  - the text input itself
  - a small empty-state hint when the input is blank
- The input should receive focus immediately when the panel appears.

### Visual direction

- The inline panel should look like a child step of the selected row, not like a new standalone card.
- Use a slightly tinted background, a subtle inset border, and tighter spacing than the main sidebar cards.
- Keep the panel within the catalog card so the interaction reads top-to-bottom in one place.

## Architecture

### State

- Keep using the existing page-level state:
  - `tableNameMode`
  - `customTableName`
- Do not add a new hook for this UI refinement.
- Do not move save logic or merge logic.

### Rendering

- Keep `+ 추가` selectable through the existing catalog card selection flow.
- Render the inline add panel conditionally when `tableNameMode === 'custom'`.
- Place the panel right after the catalog list item group, within the same sidebar catalog card.

### Why this structure

- It follows the current page ownership of `tableNameMode` and `customTableName`.
- It avoids growing the save hook or pipeline hook with presentation concerns.
- It keeps the UI change local to the page and stylesheet.

## Error Handling And Status

- If custom mode is active and the input is empty, show a lightweight helper message instead of a hard error.
- The save button remains the main enforcement point by staying disabled.
- Existing save success and error messages remain unchanged.

## Testing

1. The custom-name input is hidden on initial render.
2. Clicking `+ 추가` shows the inline panel.
3. Clicking `비료` or `농약` hides the inline panel.
4. Returning to `+ 추가` restores the previous custom value.
5. Save remains disabled when custom mode is active and the name is empty.
6. Save still works for default categories.

## Scope Notes

- This change only adjusts the placement, labeling, and presentation of the custom-name UI.
- It does not change the save contract.
- It does not change the auto static merge rule.
- It does not introduce a new modal, drawer, or separate form flow.
