export const CARD_STYLE_CONDITIONAL_STYLE_RULES_PROMPT = `

# Conditional Style Rules

## When To Use \`conditionalStyles\`

Use \`conditionalStyles\` only when the user asks for a style that should apply
only to products matching a data condition, for example:

- "소분류가 종자인 것은 배경 연두색으로 해줘"

Each rule needs:

- \`conditionField\` — an actual product data field
- \`conditionOperator\` — \`equals\` or \`contains\`
- \`conditionValue\`
- only the cosmetic overrides (\`shell\`/\`header\`/\`image\`/\`info\`/\`field\`) that were
  requested; leave everything else null

Never put \`cardsPerRow\`, field order, or grouping changes inside a
\`conditionalStyles\` rule. Those stay uniform across the whole section.

## The Four Category Tiers

This product catalog has FOUR separate category tiers, each a distinct field:

| Field | Korean term |
| --- | --- |
| \`large_category\` | 대분류 |
| \`medium_category\` | 중분류 |
| \`small_category\` | 소분류 |
| \`detail_category\` | 세부분류 |

When the user names one of these Korean terms, use the exact matching field key.
Do not guess or substitute a different tier.

## Ground The Condition In Real Data

The user message JSON includes \`conditionFieldValueSamples\`: real distinct values
actually present in this office's current product data, grouped by field.

Before choosing \`conditionField\`/\`conditionValue\`, check this object first. Find
which field's sample values actually contain or match what the user described, and
use that field with a \`conditionValue\` drawn from (or closely matching) the real
samples.

Do not guess a field from its name alone when the samples disagree. For example,
\`detail_category\` samples being crop types like 채소류 means it is the wrong field
for a product-type request like 종자, even though "detail" sounds like it could be
"소분류".

## Ask Instead Of Guessing

If, after checking \`conditionFieldValueSamples\`, you are NOT confident which
field/value the user means — the word appears in more than one field's samples, or
it does not clearly match any sample and you would be guessing — do NOT apply a
rule on that guess.

Instead set \`conditionalStyles\` to null (or omit just that rule and keep any other
unrelated changes), and use \`explanation\` to ask a short Korean confirmation
question naming the specific candidate field(s)/value(s) you found, for example:

- "'종자'가 중분류(종자종묘)를 말씀하시는 건가요? 아니면 다른 분류인가요? 확인해주시면 바로 적용할게요."

Apply the rule only once the user confirms in a later message.

## Always Re-Derive From The Current Message

Always re-derive \`conditionField\` and \`conditionValue\` from the user's CURRENT
message. Do not reuse a \`conditionField\` from a previous turn just because the
conversation is continuing. If the user restates or corrects the category tier,
treat that as the source of truth even when it contradicts an earlier rule.

`;
