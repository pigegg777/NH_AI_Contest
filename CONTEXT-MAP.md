# Context Map

## Contexts

- [Storefront](./CONTEXT.md) — 영업점이 공개 판매 페이지를 만들고 손님이 그 페이지를 본다. `features/storefront-view`, `storefront-builder`, `storefront-config`, `public-storefront`
- [Office product editor](./react-app/src/features/office-product-editor/CONTEXT.md) — 판매단가 엑셀을 검토해 카테고리별 상품 데이터로 등록한다. `features/office-product-editor`

## Relationships

- **Office product editor → Storefront**: 등록한 상품 행이 storefront view 가 그리는 재료다. Storefront builder 는 `officeProductDataReadService.fetchOfficeProductDataEntries` 로, 공개 페이지는 `publicOfficeProductService` 로 읽는다.
- **Office product editor → Storefront config**: 카테고리 데이터를 지우면 그 카테고리로 키가 걸린 디자인도 지워야 한다. `officeProductDataWriteModel.deleteOfficeProductCategory` 가 `storefrontConfigOrchestrator.removeStorefrontCategoryConfig` 를 부른다.
- 두 맥락 모두 `officeCode` 를 영업점 식별자로 쓴다.

## 층 규칙

지향하는 방향은 `hooks → model → services` 이고, 다른 feature 를 부를 때는 그 feature 의 `model/` 을 통한다. 예외와 미달 지점은 각 CONTEXT.md 에 적는다.

Office product editor 는 2026-08-29 에 이 방향으로 정리했다(남은 예외는 그쪽 CONTEXT.md 참고). **Storefront 쪽은 아직 아니다** — 확인된 곳:

- `storefront-builder/hooks/useStorefrontBuilder.js` 가 `office-product-editor/services/office-product-data/officeProductDataReadService` 를 직접 부른다
- `public-storefront/pages/PublicStorefrontPage.jsx` 가 `office-product-editor/services/office-product-data/publicOfficeProductService` 를 직접 부른다

둘 다 office product editor 의 `model/office-product-data/` 를 경유하도록 옮길 수 있지만, 그 판단은 아직 하지 않았다.
