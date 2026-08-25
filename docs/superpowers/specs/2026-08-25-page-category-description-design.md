# 페이지·분류 설명문 설정 (page_title / page_description / category_description)

2026-08-25

## 문제

스토어프론트 상단 문구를 사장님이 바꿀 수 없다. 제목은 코드가 조립하고
(`${농협명} ${사무소명} 농자재 정보`), 그 아래 설명 자리는 스키마에만 있고 입력
경로가 없어 항상 비어 있다. 분류별 안내 문구는 아예 개념이 없다.

손님 입장에서 가장 아쉬운 건 "영세가격이 뭔가"처럼 매장이 한 줄만 적어주면 풀리는
질문을 아무도 적어줄 수 없다는 점이다.

## 지금 상태

히어로에는 텍스트 슬롯이 셋 있다.

| 슬롯 | 출처 | 상태 |
| --- | --- | --- |
| eyebrow | `navConfig.title` | 편집 UI 없음. 항상 빈 값 |
| h1 | 코드 조립 `headerOrgLine` | 편집 불가 |
| subtitle | `navConfig.subtitle` | 편집 UI 없음. 항상 빈 값 |

`setNavConfig`는 로드/저장 왕복만 하고 값을 작성하는 UI가 없다. 즉 두 필드 모두
실제 데이터에 값이 들어있을 수 없다.

AI 페이지 디자인은 문구를 바꾸지 못한다. 응답 스키마에 텍스트 필드가 없고
시스템 프롬프트에 `Never rewrite the title text`가 명시돼 있다.

## 결정 사항

브레인스토밍에서 확정한 항목이다. 이후 설계는 전부 이 위에 선다.

1. **page_title은 h1을 대체한다.** 쓰지 않는 eyebrow 슬롯은 제거한다.
2. **page_title 기본값은 현재 파생 문구를 그대로 쓴다.** `농자재 정보` 접미사 포함.
3. **page_title이 비면 파생 문구로 폴백한다.** 화면이 빈 제목으로 뜨는 경우는 없다.
4. **page_description은 입력칸 예시문구(placeholder)만 갖는다.** 안 적으면 손님
   화면에 줄 자체가 안 나온다. 배포로 기존 매장 화면이 바뀌지 않는다.
5. **category_description은 선택된 분류의 카드 목록 바로 위에 놓는다.** 분류 칩을
   바꾸면 설명도 같이 바뀐다.
6. **AI는 문구를 바꾸지 않는다.** 스타일(글자색·굵기·크기·자간)만 만진다.
   `Never rewrite the title text` 규칙은 그대로 유지하고 설명문까지 확장한다.
7. **AI 스코프 칩은 6개로 늘린다.** page_description 전용 칩을 신설한다.
8. **category_description은 AI 대상이 아니다.**

## 스키마

기존 `navConfig`를 재사용한다. `subtitle`은 렌더 위치가 이미 맞고, `title`은
아무도 안 쓰는 데다 eyebrow를 없애기로 했으므로 용도 변경 비용이 없다. 새 최상위
필드도, 마이그레이션도 필요 없다.

```
navConfig.title      → page_title        (h1)
navConfig.subtitle   → page_description  (h1 아래)
categoryConfig.description → category_description  (신규)
```

`pageStyle`에는 설명문 스타일 절을 신설한다. 제목의 스타일이
`pageStyle.header`에 있는 것과 같은 구조다.

```js
pageStyle.description = {
  colorHex: '#5f6d5b',
  letterSpacing: 'normal',
  fontWeight: 500,
  fontSizeToken: 'sm',
}
```

토큰 집합은 제목이 쓰는 `PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS`를 그대로 쓴다.

텍스트는 `navConfig`, 스타일은 `pageStyle`에 나뉘어 산다. 어색해 보이지만 제목이
이미 그렇게 나뉘어 있고(텍스트 `navConfig.title`, 스타일 `pageStyle.header`),
설명문만 다르게 두면 규칙이 둘이 된다.

## 데이터 입력 — field-selection

표시항목 선택 독에 문구 입력을 얹는다. 지금은 카테고리 탭이 분류만 나열하고
본문은 표시항목 표 3개를 그린다.

**카테고리 탭에 `공통 요소`를 추가한다.** 디자인 모드 탭이 이미 같은 구성이라
사장님이 두 모드에서 같은 탭 줄을 보게 된다.

| 탭 | 본문 |
| --- | --- |
| 공통 요소 | page_title 입력 + page_description 입력 |
| 각 분류 | category_description 입력 + 표시항목 표 3개 (기존) |

page_title 입력칸은 비었을 때 파생 문구를 placeholder로 보여준다. 사장님이 뭘
지우고 있는지 알 수 있어야 한다.

page_description placeholder는 `영세가격 : 농업경영체 등록자 구매가격`이다.
한 번 눌러 채우는 버튼을 옆에 둔다. 예시문구를 그대로 쓰고 싶은 매장이 직접
타이핑할 이유가 없다.

저장은 기존 `applyChanges` 경로를 쓴다. 지금 `cardFields`만 싣는 것을 문구 3종도
함께 싣도록 넓힌다. 미리보기는 표시항목 토글과 마찬가지로 입력 즉시 반영한다.

## 렌더

**히어로** — eyebrow를 지우고 두 줄만 남긴다.

```
발안농협 영농센터 농자재 정보      ← page_title (없으면 파생 문구)
영세가격 : 농업경영체 등록자 구매가격  ← page_description (없으면 줄 자체가 없음)
```

**분류 설명** — 선택된 분류의 카드 그리드 바로 위. 값이 없으면 요소를 그리지
않는다. 빈 자리도 남기지 않는다.

두 문구 모두 매장 테마 화면이므로 `--corp-*` 토큰이 아니라 하드코딩 hex를 쓴다.
한글이므로 `word-break: keep-all`.

## AI 디자인

**스코프 칩을 6개로 늘린다.** 신설 칩은 `상단 설명 글자`이며 `pageDescription`
스코프를 갖는다. 기존 `상단 제목 글자` 칩은 그대로 둔다.

응답 스키마에 `description` 절을 추가한다. 제목 절과 같은 네 항목이다.

```
colorHex / letterSpacing / fontWeight / fontSizeToken
```

**텍스트 필드는 넣지 않는다.** 시스템 프롬프트의 `Never rewrite the title text`를
`Never rewrite the title or description text`로 넓힌다. 사장님이 적은 문구를 AI가
말없이 고쳐 쓰는 일이 없어야 한다.

스코프 가이드에도 항목을 추가한다. 예시는 `상단 설명을 조금 작게 해줘`,
`설명 글씨를 연한 회색으로 해줘` 수준.

## 파일

| 파일 | 변경 |
| --- | --- |
| `model/storefront-config/storefrontBuilderModel.js` | `categoryConfig.description` 정규화, 저장 페이로드에 문구 3종 |
| `model/page-design/style/pageStyleModel.js` | `pageStyle.description` 절 신설 + 정규화 |
| `model/page-design/style/pageStyleCompiler.js` | `pageDescription` 스코프 분기 |
| `model/page-design/ai-request/pageAiDesignModel.js` | 스코프 옵션 6번째 추가 |
| `model/page-design/ai-request/pageDesignScopeGuide.js` | 가이드 항목 추가 |
| `model/page-design/ai-request/pageStyleAiPrompt.js` | 텍스트 금지 규칙 확장, 설명 절 규칙 |
| `model/page-design/ai-response/pageStyleAiResponseSchema.js` | `description` 절 |
| `model/page-design/ai-response/pageStyleAiResponseNormalizer.js` | `description` 정규화 + 스코프 제한 |
| `model/storefront-view/storefrontViewStyleModel.js` | 설명문 CSS 변수 |
| `hooks/useStorefrontView.js` | `pageTitle` / `pageDescription` / 분류 설명 노출 |
| `hooks/useStorefrontBuilder.js` | 문구 상태 + 저장 배선 |
| `components/storefront-page/hero/HeroBlock.jsx` + css | eyebrow 제거, 두 줄 렌더 |
| `components/storefront-page/product-cards/CardGridSection.jsx` + css | 분류 설명 렌더 |
| `components/builder-workspace/field-selection/FieldSelectionDock.jsx` + css | 공통 요소 탭 + 입력칸 |
| 신규 `components/builder-workspace/field-selection/StorefrontTextFields.jsx` | 문구 입력 컴포넌트 |

## 테스트

**모델**

- `page_title`이 비면 파생 문구로 폴백하고, 있으면 그것을 쓴다
- 파생 문구는 `농자재 정보` 접미사를 유지한다
- `page_description`이 비면 빈 문자열을 돌려주고 렌더가 생략된다
- `categoryConfig.description`이 정규화·왕복 저장된다
- `pageStyle.description`이 기본값으로 채워지고 잘못된 값은 되돌아간다

**AI 계약**

- `pageDescription` 스코프가 `description` 외 모든 절을 null로 만든다
- 응답 스키마에 텍스트 필드가 없다 — 프롬프트에 문구 금지 규칙이 있다
- 기존 5개 스코프 동작이 안 변한다

**렌더**

- 히어로에 eyebrow가 없다
- `page_description`이 없으면 요소 자체가 없다
- 분류 설명이 카드 그리드 바로 위에 있고, 분류를 바꾸면 따라 바뀐다
- 설명 없는 분류는 요소를 그리지 않는다

**field-selection**

- 공통 요소 탭이 카테고리 탭 줄에 있다
- 공통 요소 탭은 문구 입력 2개, 분류 탭은 설명 입력 + 표시항목 표
- 저장이 문구 3종을 함께 싣는다
- placeholder가 파생 문구/예시문구로 뜬다

## 범위 밖

- `category_description`의 AI 편집
- 문구의 다국어·리치텍스트
- 문구 길이 제한 (일단 두고, 실사용에서 문제되면 추가)
