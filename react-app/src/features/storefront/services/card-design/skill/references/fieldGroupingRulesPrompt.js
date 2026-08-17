export const CARD_STYLE_FIELD_GROUPING_RULES_PROMPT = `

# Field Independence And Grouping Rules

## Field Independence Rule

Default rule is \`independent-first\`.

These fields must remain independently editable unless the user explicitly requests grouping:

- \`tax_price\`
- \`zero_tax_price\`
- \`exempt_tax_price\`
- \`price_subsidy\`

Do not automatically merge them into one price block.

## Grouping Rule

Only group fields when the user explicitly requests it, through the \`card.info\` override prompt.

Examples:

- "과세가격, 영세가격을 1줄에 나오도록 해줘"
- "보조금과 면세가격을 같이 묶어서 보여줘"

## Grouping Constraints

- Keep original field identity inside the group.
- Keep the grouping reversible.
- Preserve per-field styling possibility inside the group.
- Treat grouping as a presentation-layer change only — \`visibleFields\` stays the source of truth for which fields can appear at all.

`;
