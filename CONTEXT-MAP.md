# Context Map

## Contexts

- [Storefront](./CONTEXT.md) — 영업점이 공개 판매 페이지를 만들고 손님이 그 페이지를 본다. `features/storefront-view`, `storefront-builder`, `storefront-config`, `public-storefront`
- [Office product editor](./react-app/src/features/office-product-editor/CONTEXT.md) — 판매단가 엑셀을 검토해 카테고리별 상품 데이터로 등록한다. `features/office-product-editor`

## Relationships

- **Office product editor → Storefront**: 등록한 상품 행이 storefront view 가 그리는 재료다. Storefront builder 는 `loadOfficeProductEntries` 로, 공개 페이지는 `loadPublicOfficeProducts` 로 읽는다.
- **Office product editor → Storefront config**: 카테고리 데이터를 지우면 그 카테고리로 키가 걸린 디자인도 지워야 한다. `officeProductDataWriteModel.deleteOfficeProductCategory` 가 `storefrontConfigOrchestrator.removeStorefrontCategoryConfig` 를 부른다.
- 두 맥락 모두 `officeCode` 를 영업점 식별자로 쓴다.

## 층 규칙

방향은 `hooks → model → services` 이고, 다른 feature 를 부를 때는 그 feature 의 `model/` 을 통한다.

2026-08-29 기준 **남의 feature 의 `services/` 를 직접 부르는 곳은 없다.** feature 안에서의 예외는 각 CONTEXT.md 에 적는다(현재는 office product editor 의 ai-image-apply 한 건).

feature 사이를 잇는 model 함수:

| 부르는 쪽 | 함수 |
|---|---|
| `storefront-builder/hooks/useStorefrontBuilder` | `officeProductDataReadModel.loadOfficeProductEntries` |
| `public-storefront/pages/PublicStorefrontPage` | `publicOfficeProductModel.loadPublicOfficeProducts` |
| `office-product-editor` 삭제 흐름 | `storefrontConfigOrchestrator.removeStorefrontCategoryConfig` |
