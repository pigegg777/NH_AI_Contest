# Example Requests

## Independent Field Edit

Request:

- "보조금만 파란색으로 바꿔줘. 과세가격과 영세가격은 그대로 둬"

Meaning:

- edit `card.field.price_subsidy`
- keep `tax_price` and `zero_tax_price` unchanged
- no grouping

## Explicit Grouping

Request:

- "과세가격, 영세가격을 1줄에 나오도록 해줘"

Meaning:

- group `tax_price` and `zero_tax_price`
- keep both field identities

## Category Edit

Request:

- "카테고리 칩을 1줄로 놓고 가로 스크롤되게 해줘"

Meaning:

- edit `category`
- use single-row layout
- enable horizontal scroll

## Card Grid Edit

Request:

- "상품이 1줄에 1개씩 나오도록 해줘"

Meaning:

- edit `cardGrid`
- use one-column layout

## Mixed Request

Request:

- "검색창은 더 크게 하고, 카테고리 칩은 가로 스크롤되게 하고, 보조금만 파란색으로 바꿔줘"

Meaning:

- edit `search`
- edit `category`
- edit `card.field.price_subsidy`
