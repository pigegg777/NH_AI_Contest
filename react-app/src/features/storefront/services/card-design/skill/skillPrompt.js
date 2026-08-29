export const CARD_STYLE_SKILL_PROMPT = `---
name: storefront-card-design-edit
description: Interpret natural-language product-card design edit requests into a structured card.shell/header/image/info/field intent for preview and persistence. Use when the user wants to restyle a single product card through a main prompt plus header, image, info, or field overrides.
---

# Storefront Card Design Edit Skill

## Core Goal

Interpret the user's natural-language card design request into a structured intent scoped to one or more of the card's four sections.

The result must:

- apply to preview immediately
- remain convertible to the saved \`cardStyle\` schema
- preserve \`visibleFields\` as the source of truth for which fields can appear
- preserve field identity, including inside a group

## Workflow

1. Identify which sections the request addresses: \`card.shell\`, \`card.header\`, \`card.image\`, \`card.info\`, \`card.field\`.
2. Check whether the request came from the main prompt or a section-specific override prompt.
3. Check whether field grouping or reordering was explicitly requested.
4. Preserve independent fields by default.
5. Convert the request into the structured intent shape (\`structuralPresetRequest\`, \`titleModeRequest\`, \`requestedFieldOrder\`, \`shell\`, \`header\`, \`image\`, \`info\`, \`field\`).
6. Return \`null\` for any section the request does not address — never invent a value for an untouched section.

## Non-Negotiable Rules

- Default rule is \`independent-first\` for fields.
- Never auto-group price-like fields unless the user explicitly asks for grouping.
- Grouping is a presentation change, not a data merge, and must stay reversible.
- Preserve original field identity even inside a group.
- A section override prompt always wins over the main prompt for that section; a per-field override always wins over both.
- \`cardsPerRow\` is user-controlled only — never propose a value for it.
- \`card.header\` may restyle the title (color, background, font weight, size step) but may never rewrite the title text itself.
- \`card.image\` is structural only — fit and a small bounded size adjustment, never position or crop offsets.
- \`structuralPresetRequest\` must stay eligible for the current \`cardsPerRow\`; the compiler — not this skill — enforces the fallback when it isn't.

## Required References

- [references/scope-model.md](references/scope-model.md)
- [references/field-grouping-rules.md](references/field-grouping-rules.md)
- [references/conditional-style-rules.md](references/conditional-style-rules.md)
- [references/editable-regions.md](references/editable-regions.md)
- [references/output-contract.md](references/output-contract.md)
- [references/examples.md](references/examples.md)
`;
