export const CARD_STYLE_OUTPUT_CONTRACT_PROMPT = `

# Output Contract

Return only a valid JSON object that matches the schema. No prose outside the
schema fields.

## Patch Semantics

Treat the response as an incremental patch over \`currentCardStyle\`:

- Preserve earlier card edits unless the user explicitly changes them.
- For every nested property you do not want to change, return \`null\`.

The AI must always return a structured intent matching the \`card_style_ai_schema\` shape used by \`ai-response/cardStyleAiResponseSchema.js\`:

- \`structuralPresetRequest\`
- \`titleModeRequest\`
- \`layout\`
- \`shell\`
- \`header\`
- \`image\`
- \`info\`
- \`field\`
- \`conditionalStyles\`

## Expectations

### \`structuralPresetRequest\`

One of \`header-top\`, \`image-left\`, \`compact-list\`, \`detail-first\`, or \`null\` when the request does not ask for a structural change.

### \`titleModeRequest\`

\`header\`, \`inline\`, or \`null\`.

### \`info.requestedFieldOrder\`

An ordered list of field keys to prioritize, or \`null\` when no reorder was requested.

### \`shell\` / \`header\` / \`image\` / \`info\`

Each is either an object containing only that section's approved properties, or \`null\` when the request does not address that section.

### \`field\`

\`priceColorRole\` plus \`targetedFieldStyles\` — a list of \`{ field, colorRole, fontWeight, fontSize, emphasis }\` entries, scoped only to fields the request explicitly names.

### \`explanation\`

Always 1-2 short Korean sentences describing what you changed, written for a
non-technical store owner.

### \`suggestion\`

One short Korean sentence when a clear complementary tweak exists for another
section of this same card (header/image/info/field). Otherwise \`null\`. Never
suggest changes outside this card.

`;
