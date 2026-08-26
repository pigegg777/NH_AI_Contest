# 스토어프론트 안내 항목(사무소 / 분류) 설계

**작성일:** 2026-08-26
**상태:** 사용자 검토 대기

## 한 줄 요약

사무소와 각 분류의 안내 문구를 `{ label, description }` 항목을 **여러 개** 담는 배열로 바꾸고, 대분류 칩에 `사무소 정보` 탭을 붙여 한 화면에서 전부 읽히게 한다. 이 문구들은 AI 디자인 대상에서 제외한다.

## 배경

현재 안내 문구는 두 곳에 흩어져 있다.

- **페이지 설명** — 히어로 h1 아래 한 줄. `navConfig.subtitle` 문자열 하나.
- **분류 설명** — 중분류 칩 맨 앞의 `{분류명} 정보` 칩을 누르면 뜨는 패널. `categoryConfig.description` 문자열 하나.

문제가 셋 있다.

1. **한 덩어리 문자열이라 구조가 없다.** 기본값 `영세가격 : 농업경영체 등록자 구매가격`은 라벨과 설명을 콜론으로 손수 붙인 것이다. 라벨만 굵게 하는 건 평문 필드에 마크업을 넣지 않는 한 불가능하다.
2. **항목이 하나뿐이다.** 사무소가 "영세가격 안내"와 "배송 안내"를 함께 쓰려면 한 문단에 욱여넣어야 한다.
3. **안내 문구가 AI 디자인 칩을 두 개 차지한다.** 판매자가 쓰는 글이지 디자인 대상이 아닌데 페이지 칩 6개 중 1개, 카드 칩 5개 중 1개를 쓰고 있다.

## 결정

| # | 결정 | 근거 |
| --- | --- | --- |
| 1 | 안내를 `{ id, label, description }` **배열**로 저장 | 항목 여러 개, 라벨/본문 분리를 한 번에 해결 |
| 2 | 대분류 칩에 `사무소 정보` 탭 추가 | 중분류의 `{분류명} 정보` 칩과 **같은 패턴**. 새 개념 없음 |
| 3 | 그 탭에 사무소 안내 + **모든 분류**의 안내를 나열 | 구매자가 한 화면에서 전부 읽는다 |
| 4 | page description을 히어로에서 **삭제** | 안내는 전부 정보 탭으로 모은다 |
| 5 | 안내 문구는 **AI 디자인 대상 제외** | 판매자가 쓰는 글. 칩 2개 회수 |
| 6 | 재정렬 UI 없음, 항목 상한 10개 | YAGNI. 무제한이면 패널이 페이지가 된다 |
| 7 | 분류명은 그룹 제목(자동), `label`은 항목 제목(판매자 작성) | 배열이 되면서 둘의 역할이 자연히 갈린다 |

## 데이터

```js
pageConfig.officeInfo = [
  { id: 'oi-1', label: '영세가격', description: '농업경영체 등록자 구매가격' },
  { id: 'oi-2', label: '배송 안내', description: '당일 15시 이전 주문 시…' },
];

categoryConfig.info = [
  { id: 'ci-1', label: '봄철 밑거름', description: '3월 중순부터…' },
];
```

- `id`는 생성값. 배열 인덱스를 React key로 쓰면 행을 지웠을 때 입력 중인 값이 옆 행으로 딸려간다.
- `label`, `description` 모두 빈 문자열 허용. **둘 다 비면 항목을 버린다.**
- `description`은 여러 줄. 줄바꿈은 `white-space: pre-line`으로 그대로 보인다.
- 항목 10개 초과분은 정규화 단계에서 잘라낸다.

### 기존 데이터

말끔한 마이그레이션은 하지 않는다(사용자 결정). 읽을 때 폴백만 둔다.

| 기존 | 읽는 방식 |
| --- | --- |
| `navConfig.subtitle` | `officeInfo`가 비면 `[{ label: '', description: subtitle }]` |
| `categoryConfig.description` | `info`가 비면 `[{ label: '', description }]` |

라벨은 비운다 — 콜론으로 자동 분리하면 본문에 콜론이 든 문장을 망가뜨린다. 판매자가 원할 때 직접 나눈다.

저장할 때는 항상 새 배열 형태로 쓴다. 옛 필드는 읽기 전용 폴백으로만 남는다.

## 화면

### 대분류 칩

`ProductCategoryNavBlock`의 칩 목록 맨 앞에 `사무소 정보` 칩을 끼운다. 중분류가 `categoryInformationItemId`로 하는 것과 같은 방식이다.

**안내 항목이 하나도 없으면 칩을 넣지 않는다.** 빈 패널로 가는 칩은 없느니만 못하다.

### 사무소 정보 패널

```
[사무소 정보] [비료] [농약] [자재]      ← 대분류 칩

┌────────────────────────────┐
│ 사무소 안내                      ← 고정 제목
│   영세가격                       ← label
│   농업경영체 등록자 구매가격       ← description
│   배송 안내                      ← label
│   당일 15시 이전 주문 시…         ← description
│────────────────────────────│
│ 비료                            ← 분류명 (자동)
│   봄철 밑거름                    ← label
│   3월 중순부터…                  ← description
│                                │
│ 농약                            ← 분류명
│   살포제 사용 주의…               ← description (label 없음)
└────────────────────────────┘
```

- **항목이 0개인 분류는 블록째 안 나온다.** 제목만 떠 있는 걸 막는다.
- `label`이 빈 항목은 description만 나온다.
- 분류 순서는 대분류 칩 순서와 같다.

### 히어로

`HeroBlock`에서 description `<p>`, `--page-description-*` 변수, `.description` CSS를 걷어낸다. 히어로에는 로고 + h1 + 검색만 남는다.

### 중분류 `{분류명} 정보` 칩

**그대로 둔다.** 사무소 정보 탭과 내용이 겹치지만, 특정 분류를 보고 있는 구매자가 그 분류 안내만 바로 볼 수 있는 경로다. 그 패널도 배열을 읽도록 함께 고친다.

## 빌더 입력

표시항목 선택의 각 탭에서 항목을 추가·삭제한다.

```
분류 설명
┌──────────────┬────────────────────────┬──────┐
│ 라벨          │ 설명 (여러 줄)            │ 삭제 │
├──────────────┼────────────────────────┼──────┤
│ 봄철 밑거름    │ 3월 중순부터…            │  ×   │
│ 보관 방법      │ 직사광선을 피해…          │  ×   │
└──────────────┴────────────────────────┴──────┘
[+ 항목 추가]
```

- 공통 요소 탭 → `officeInfo`, 분류 탭 → 그 분류의 `info`.
- 항목이 10개면 추가 버튼을 감춘다.
- 항목이 0개면 빈 행 하나를 자동으로 보여준다 — 빈 목록에 추가 버튼만 있으면 뭘 하는 화면인지 알기 어렵다.
- 미리보기는 타이핑하는 대로 갱신된다(기존 `draftNavConfig` 경로와 동일).

기존 `StorefrontTextFields`는 페이지 제목 전용으로 남는다. 반복 행은 별도 컴포넌트로 만든다 — 한 컴포넌트가 단일 필드와 반복 목록을 겸하면 양쪽 다 읽기 나빠진다.

## AI 디자인에서 제거

| 대상 | 지금 | 이후 |
| --- | --- | --- |
| 페이지 칩 `상단 설명 글자` (`pageDescription`) | 6칩 중 1개 | **삭제** → 5칩 |
| 카드 칩 `분류 설명 글자` (`description`) | 5칩 중 1개 | **삭제** → 4칩 |

각각 스코프 옵션, 스키마 절, 노멀라이저, 컴파일러 분기, 스코프 가이드, 프롬프트 문구, CSS 변수, 관련 테스트가 함께 빠진다.

`pageStyle.description` / `cardStyle.description` 절도 지운다. 정규화가 모르는 키를 버리므로 이미 저장된 값은 다음 저장 때 조용히 사라진다 — 이 필드들은 최근에 들어왔고 아무도 실제로 쓰지 않았다.

패널의 label/description 스타일은 CSS 클래스로만 구분한다. "label과 description을 별도 디자인" 요구는 두 요소가 각자 클래스를 갖는 것으로 충족된다.

## 파일

| 파일 | 하는 일 |
| --- | --- |
| `model/storefront-config/informationEntriesModel.js` (신규) | 항목 배열 정규화, 옛 문자열 폴백, 상한 적용 |
| `model/storefront-config/storefrontBuilderModel.js` | 저장 페이로드에 `officeInfo` / `info` |
| `model/storefront-config/sectionMatching.js` | 섹션에 `infoEntries` 실어 보내기 |
| `hooks/useStorefrontView.js` | `officeInformation*` 상태, 대분류 칩 선택 |
| `components/storefront-page/category-nav/ProductCategoryNavBlock.jsx` | `사무소 정보` 칩 |
| `components/storefront-page/category-nav/OfficeInformationPanel.jsx` (신규) | 사무소 + 전체 분류 패널 |
| `components/storefront-page/category-nav/CategoryInformationPanel.jsx` | 배열 읽도록 수정 |
| `components/storefront-page/hero/HeroBlock.jsx` + CSS | description 제거 |
| `components/builder-workspace/field-selection/InformationEntryFields.jsx` (신규) | 반복 행 입력 |
| `components/builder-workspace/field-selection/FieldSelectionDock.jsx` | 위 컴포넌트 배선 |
| `hooks/useStorefrontBuilder.js` | `textDraft`를 항목 배열로 |
| 페이지/카드 AI 6파일 | 스코프 제거 |

## 테스트

- **정규화** — 옛 문자열 폴백, 빈 항목 버리기, 10개 상한, id 유지.
- **패널** — 항목 0개 분류는 안 나온다. label 없는 항목은 description만. 항목이 전무하면 칩 자체가 없다.
- **빌더** — 추가/삭제가 배열을 바꾸고, 삭제해도 남은 행의 값이 안 섞인다(= id key가 실제로 필요함을 보이는 테스트).
- **회귀** — 히어로에 description이 더는 없다. 두 AI 칩이 목록에서 사라졌다.
- **브라우저** — 공개 스토어프론트에서 탭 전환, 줄바꿈 보존, 모바일 가로 스크롤 없음.

## 하지 않는 것

- 항목 드래그 재정렬
- 안내 문구의 AI 디자인
- 옛 필드의 파괴적 마이그레이션 (읽기 폴백만)
- 항목별 개별 스타일 지정 (전 항목 공통 CSS)
