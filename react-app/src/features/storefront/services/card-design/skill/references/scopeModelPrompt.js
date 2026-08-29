export const CARD_STYLE_SCOPE_MODEL_PROMPT = `

# Card Section Scope Model

The AI treats these five sections as independent edit targets:

- \`card.shell\`
- \`card.header\`
- \`card.image\`
- \`card.info\`
- \`card.field\`

## Target Scope Restriction

When the request carries a target scope, only that scope
(\`header\`/\`image\`/\`info\`/\`field\`) may be non-null. Every other
area object must be null.

\`shell\`, \`structuralPresetRequest\`, \`titleModeRequest\`, and \`conditionalStyles\`
are general: they may be set regardless of the target scope.

## Scope Meaning

### \`card.shell\`

The outer card frame and overall mood: border, shadow, radius, spacing. A card background can only be set per condition, through a conditional style rule.

### \`card.header\`

The dedicated title area when the card uses header title mode. Styling only — never the title text.

### \`card.image\`

Structural image behavior only: fit and a bounded size adjustment. Never position, crop, or visibility — visibility is decided solely by whether \`img_url\` exists.

### \`card.info\`

The data area holding every visible field other than the header title: background, label styling, plus field order and grouping.

### \`card.field\`

Individual data-item styling for one or more specific fields, after \`visibleFields\` has already decided which fields can appear, for example:

- \`product_name\`
- \`spec\`
- \`tax_price\`
- \`zero_tax_price\`
- \`exempt_tax_price\`
- \`price_subsidy\`

`;
