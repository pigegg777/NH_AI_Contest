# Storefront 하위 안내 탐색 설계

## 목적

고객용 storefront의 안내 정보를 한 계층으로 모은다. 최상위 `안내`를 parent로 두고, 그 안에서 사무소 안내와 각 상품 대분류 안내를 child category로 선택한다. 상품 대분류 화면의 중분류 탐색에는 상품 탐색 항목만 남긴다.

## 사용자 경험

- 최상위 상품 분류 탐색은 `안내`, `비료`, `농약`, `일반자재` 순서로 표시한다.
- `안내`는 사무소 안내나 상품 대분류 안내가 하나라도 있을 때만 표시한다.
- `안내`를 선택하면 다음 child category 중 데이터가 있는 항목만 표시한다.
  - `사무소 안내`
  - `{대분류} 안내` — 예: `비료 안내`, `농약 안내`
- child category 순서는 사무소 안내가 먼저이고, 이후 상품 대분류의 storefront 순서를 따른다.
- `안내`에 처음 진입했거나 기존 선택이 사라졌다면 첫 번째 유효 child category를 선택한다.
- 안내 탭을 나갔다 돌아올 때 기존 child 선택이 여전히 유효하면 유지한다.
- 선택한 child category의 안내 패널 하나만 표시한다.
- 상품 대분류를 선택하면 해당 화면은 `전체` 상품을 기본으로 표시한다.
- 상품 대분류의 중분류 칩에는 `전체`와 실제 중분류만 표시하며 `{대분류} 안내`는 표시하지 않는다.
- 검색을 시작하면 안내 화면을 닫고 상품 검색 결과를 표시한다.

## Architecture

### Deep 안내 탐색 Module

새 `informationNavigationModel` Module이 안내 탐색 규칙을 소유한다.

Interface:

```js
buildInformationNavigationItems({ officeEntries, catalogSectionEntries })
resolveActiveInformationItem(items, requestedId)
```

`buildInformationNavigationItems`는 ID, label, kind, categoryName, entries를 갖는 child item을 반환한다. 이 Interface 뒤에 빈 항목 제거, 사무소 우선순위, storefront 대분류 순서, 안정적인 ID 규칙을 숨긴다.

`resolveActiveInformationItem`은 요청한 ID가 유효하면 해당 item을, 아니면 첫 번째 item을 반환한다. 빈 목록이면 `null`을 반환한다.

이 Module을 삭제하면 ID·정렬·fallback 규칙이 hook과 렌더 Module 및 테스트에 다시 분산되므로 충분한 Depth가 있다. 하나의 Interface를 미리보기와 Public storefront가 공유해 Leverage를 얻고, 안내 탐색 오류를 한 구현에 집중해 Locality를 높인다.

### 상태 불변식

- `activeSectionName`은 최상위 `안내` sentinel 또는 상품 대분류만 표현한다.
- `activeMediumCategory`는 `전체` 또는 실제 중분류만 표현한다. 안내 sentinel을 담지 않는다.
- `activeInformationItemId`는 최상위 안내 안의 child 선택만 표현한다.
- 안내 parent가 활성이고 검색어가 없을 때만 child navigation과 안내 패널을 표시한다.
- 안내 화면에서는 상품 목록과 empty state를 숨긴다.
- 상품 대분류 선택과 Builder의 외부 대분류 변경은 `activeMediumCategory`를 `전체`로 설정한다.

## 렌더 Module

- `InformationNavigationBlock`: 안내 child category 칩을 렌더하고 선택 Interface를 호출한다.
- `OfficeInformationPanel`: 사무소 안내 항목만 렌더한다. 모든 대분류를 한 화면에 모으는 Interface는 제거한다.
- `CategoryInformationPanel`: 선택된 대분류 안내만 렌더한다.
- `CategoryChipsBlock`: 상품 중분류만 렌더한다.
- `ProductCategoryNavBlock`: 최상위 `안내` parent와 상품 대분류를 계속 렌더한다.
- `DesktopCategoryRail`: 상품 탐색 전용으로 유지하며 안내 child category를 중복하지 않는다.

## 데이터 흐름

1. `useStorefrontView`가 사무소 안내와 storefront 대분류 section을 정규화한다.
2. `informationNavigationModel`이 child items를 생성한다.
3. hook이 `activeInformationItemId`로 유효한 child item을 해석한다.
4. `StorefrontView`가 안내 parent 활성 시 child navigation과 선택한 패널 하나를 렌더한다.
5. 상품 대분류 선택 시 안내 상태와 독립적으로 상품 목록을 렌더한다.

## 오류와 빈 데이터

- 안내 데이터가 전혀 없으면 최상위 `안내`를 표시하지 않는다.
- 사무소 안내 없이 대분류 안내만 있으면 첫 대분류 안내를 기본 선택한다.
- 선택된 안내가 설정 변경으로 사라지면 첫 유효 안내로 fallback한다.
- 빈 label 또는 description 정규화는 기존 information entries Module의 Interface를 재사용한다.

## 테스트

- 안내 탐색 model: 정렬, 빈 데이터 제거, 사무소 우선, stale ID fallback, 빈 목록.
- Product category: `{대분류} 안내` 칩 제거, `전체/중분류` 유지.
- 안내 integration: 사무소 기본 선택, category-only fallback, child 전환 시 패널 하나만 표시.
- 왕복 탐색: 상품 대분류로 이동 후 안내 재진입 시 유효한 child 선택 유지.
- 상품 복귀: 상품 대분류 선택 시 `전체`와 상품 표시.
- 검색: 안내 화면에서 검색 시 상품 결과와 empty-state 규칙 유지.
- Builder preview와 Public storefront가 동일한 탐색 동작을 공유하는지 검증.

## 범위 제외

- 안내 데이터 저장 형식 변경
- page description 및 category description 편집 Interface 변경
- Desktop category rail에 안내 계층 중복 표시
- 안내 패널의 시각 스타일 전면 재설계
