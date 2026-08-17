export const CARD_STYLE_OUTPUT_CONTRACT_PROMPT = `

# Output Contract

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

`;
