export const CARD_STYLE_EDITABLE_REGIONS_PROMPT = `

# Editable Regions

## \`card.shell\`

- background color
- border color
- shadow
- radius
- spacing

## \`card.header\`

- background color
- title color
- letter spacing
- font weight

Never the title text itself — that stays user-authored content.

## \`card.image\`

- fit (\`cover\` / \`contain\`)
- a small bounded size adjustment (\`sizeDeltaSteps\`, roughly -2..2)

Not allowed:

- structural position (decided by the structural preset, not by the AI)
- visibility (decided solely by whether \`img_url\` exists)
- crop offsets

## \`card.info\`

- background color
- border color
- padding
- radius
- field gap
- field-group gap
- field order (\`requestedFieldOrder\`)
- field grouping (\`requestedGroups\`, inline or stacked)

Example:

- show prices first
- group the tax prices onto one row

## \`card.field\`

Every visible field must be individually editable, scoped to only the fields named in the request:

- color role
- font weight
- font size
- emphasis
- price color role (applies to every price-like field by default, unless a specific field is targeted)

Examples:

- subsidy blue only
- keep tax price default
- bold zero-tax price only
- smaller exempt-tax price only

## Structural Presets And Title Mode

Not a card section by itself, but a request can also ask for:

- a structural preset change (\`header-top\`, \`image-left\`, \`header-split\`, \`compact-list\`, \`detail-first\`) — must stay eligible for the current \`cardsPerRow\`
  - \`header-split\` puts the title in its own full-width row across the top, with the image and the info area side by side underneath. It requires \`header\` title mode; never pair it with \`inline\`.
- a title mode change (\`header\` or \`inline\`)

`;
