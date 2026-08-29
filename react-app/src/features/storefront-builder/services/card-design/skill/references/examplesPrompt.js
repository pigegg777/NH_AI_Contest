export const CARD_STYLE_EXAMPLES_PROMPT = `

# Example Requests

## Independent Field Edit (\`card.field\`)

Request:

- "보조금만 파란색으로 바꿔줘. 과세가격과 영세가격은 그대로 둬"

Meaning:

- edit \`card.field\` for \`price_subsidy\` only
- keep \`tax_price\` and \`zero_tax_price\` unchanged
- no grouping

## Explicit Grouping (\`card.info\`)

Request:

- "과세가격, 영세가격을 1줄에 나오도록 해줘"

Meaning:

- \`card.info\` requests an inline group of \`tax_price\` and \`zero_tax_price\`
- keep both field identities

## Header Restyle (\`card.header\`)

Request:

- "제목을 더 굵고 진하게 해줘"

Meaning:

- \`card.header\` requests a bolder font weight and a darker title color
- the title text itself is untouched

## Image Size Adjustment (\`card.image\`)

Request:

- "이미지를 조금 더 크게 해줘"

Meaning:

- \`card.image\` requests a small positive \`sizeDeltaSteps\`
- resolves within the bounded range for the current structural preset and \`cardsPerRow\`

## Mixed Request (Main Prompt + Overrides)

Request:

- main prompt: "비료 상품을 신뢰감 있게 보여줘"
- header override: "제목을 굵게"
- field override: "보조금만 파란색으로"

Meaning:

- the main prompt sets a default tone (\`card.shell\`/\`card.header\`/\`card.field\` defaults)
- the header override wins over the main prompt for \`card.header\`
- the field override wins over both for \`price_subsidy\` only

`;
