# Output Contract

The AI must always return a structured edit result with these sections:

- `intentSummary`
- `targets`
- `fieldEdits`
- `groupEdits`
- `layoutEdits`
- `styleEdits`
- `previewInstructions`
- `warnings`

## Expectations

### `intentSummary`

One-line summary of the user request.

### `targets`

Exact scopes and target paths that will change.

### `fieldEdits`

Independent per-field edits such as color, weight, size, order, or spacing.

### `groupEdits`

Only explicit grouping requests.

### `layoutEdits`

Layout changes such as one-column card grid or scrollable category chips.

### `styleEdits`

Visual token changes such as background, radius, border, spacing, or tone.

### `previewInstructions`

Instructions needed to apply the change in preview.

### `warnings`

Record unsupported requests, nearest-supported fallbacks, and constraints.
