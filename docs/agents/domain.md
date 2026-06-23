# Domain Docs

This repository should be treated as a single-context project.

## Before exploring, read these

1. `AiConetstPlan.md`
2. `프로젝트 설명.md`
3. `CONTEXT.md` at the repo root if it is added later
4. `docs/adr/` if ADRs are added later

If `CONTEXT.md` or `docs/adr/` do not exist yet, proceed silently and use the root planning documents above.

## File structure

Single-context repo:

```text
/
├── AiConetstPlan.md
├── 프로젝트 설명.md
├── CONTEXT.md                # optional, may be added later
├── docs/adr/                 # optional, may be added later
└── react-app/
```

## Vocabulary guidance

- Prefer the project terms already used in the root planning documents:
  - `login_users`
  - `office_product_datas`
  - `product_data_category_name`
  - `storefront`
  - `office product data`
  - `medium category`
- When discussing the storefront builder, use office-facing language rather than generic ecommerce vocabulary.
- If future ADRs conflict with older planning notes, surface the conflict explicitly instead of silently overriding it.
