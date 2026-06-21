---
name: storefront-design-edit
description: Interpret natural-language storefront design edit requests into a structured edit plan for preview and persistence. Use when the user wants to modify page, search, category chips, card grid, card layout, or individual card fields by natural language.
---

# Storefront Design Edit Skill

## Core Goal

Interpret the user's natural-language storefront design request into a structured edit plan.

The result must:

- apply to preview immediately
- remain convertible to saved storefront data
- preserve source data values
- preserve field identity

## Workflow

1. Identify the requested editing scopes.
2. Classify the request into `page`, `search`, `category`, `cardGrid`, `card`, or `card.field`.
3. Check whether grouping was explicitly requested.
4. Preserve independent fields by default.
5. Convert the request into a structured edit plan.
6. If a request is not fully supported, convert it into the nearest-supported plan and record a warning.

## Non-Negotiable Rules

- Default rule is `independent-first`.
- Never auto-group price-like fields unless the user explicitly asks for grouping.
- Grouping is a presentation change, not a data merge.
- Preserve original field identity even inside a group.
- Keep grouping reversible.
- Record exact target paths for every change.

## Required References

- [references/scope-model.md](references/scope-model.md)
- [references/field-grouping-rules.md](references/field-grouping-rules.md)
- [references/editable-regions.md](references/editable-regions.md)
- [references/output-contract.md](references/output-contract.md)
- [references/examples.md](references/examples.md)
