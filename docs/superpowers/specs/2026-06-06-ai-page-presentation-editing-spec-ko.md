# AI 페이지 표현 수정 표준안 및 지침

## 문서 목적

이 문서는 농협 직원이 상품 페이지를 생성한 뒤, AI를 이용해 페이지의 **표현만 안전하게 수정**하는 기능의 표준안과 운영 지침을 정의한다.

이 문서가 다루는 범위:

- 기본 페이지를 기준으로 한 AI 표현 수정
- 수정 가능 영역과 수정 불가 영역 정의
- AI 출력 형식 표준
- 시스템 검증 규칙
- 사용자 승인 및 미리보기 흐름

이 문서가 다루지 않는 범위:

- 엑셀 원본 데이터 수정
- 상품 가격, 과세/영세, 제조사 등 데이터 값 변경
- 카테고리 구조 변경
- 관리자 권한, QR 배포, 인증 정책 상세 구현
- 비료 추천 로직 자체

## 핵심 목표

1. AI는 페이지의 표현만 수정하고 데이터는 절대 수정하지 않는다.
2. AI는 핵심 코드나 임의 JSX/JS를 생성하지 않는다.
3. AI는 허용된 영역 안에서만 수정 제안을 반환한다.
4. 사용자는 수정 결과를 즉시 미리보기로 확인하고 승인할 수 있어야 한다.
5. 시스템은 허용되지 않은 수정 요청을 거절하거나 축소 적용해야 한다.

## 제품 맥락

기본 흐름은 아래와 같다.

1. 농협 직원이 엑셀 데이터를 업로드한다.
2. 시스템이 데이터를 검증/정리한다.
3. 시스템이 기본 상품 페이지를 생성한다.
4. 직원이 AI에게 표현 수정 요청을 한다.
5. AI가 허용된 범위의 페이지 설정값 패치를 반환한다.
6. 시스템이 패치를 검증한 뒤 미리보기에 반영한다.
7. 직원이 승인하면 최종 페이지에 반영한다.

즉, AI의 역할은 **페이지 편집 보조자**이며 데이터 편집자나 코드 생성기가 아니다.

## 수정 대상 영역

### 수정 가능 영역

- `searchBox`
- `cardList`
- `card`

### 수정 불가 영역

- `categorySelector`
- 엑셀 원본 데이터
- 데이터 정제/집계 결과
- 상품 분류 구조
- 핵심 컴포넌트 로직
- 라우팅, 인증, 권한, QR 로직
- 임의 코드 생성 결과물

## 설계 원칙

### 1. 데이터 레이어와 표현 레이어 분리

데이터 수정은 별도 데이터 수정 화면 또는 데이터 검토 흐름에서만 처리한다.  
AI 페이지 수정 기능은 표현 레이어만 다룬다.

### 2. 코드 직접 수정 금지

AI는 React 컴포넌트 코드를 직접 작성하거나 수정하지 않는다.  
AI는 오직 사전에 정의된 `page presentation config patch`만 반환한다.

### 3. 허용된 영역만 수정

AI는 `searchBox`, `cardList`, `card` 외 영역을 수정할 수 없다.  
특히 `categorySelector`는 항상 잠금 상태로 유지한다.

### 4. 작은 수정 우선

AI는 한 번에 페이지 전체를 뒤집는 대형 변경보다, 목적이 분명한 작은 변경을 우선 제안해야 한다.

### 5. 사용자 승인 전 저장 금지

AI 수정 결과는 기본적으로 미리보기 상태이며, 사용자가 승인하기 전까지 영구 저장하지 않는다.

## 허용 필드 표준

카드에 노출 가능한 필드는 아래 whitelist 안에서만 선택한다.

- `product_name`
- `img_url`
- `nutrient`
- `price_subsidy`
- `tax_price`
- `zero_tax_price`
- `manufacturer_list`
- `product_url`

없는 필드명은 AI가 새로 만들거나 추측해서 사용할 수 없다.

## 수정 가능 속성 표준

### `searchBox`

- `variant`: `default | compact | prominent`
- `align`: `left | center | right`
- `width`: `sm | md | lg | full`
- `fontScale`: `sm | md | lg`
- `placeholder`
- `borderStyle`: `soft | strong`

### `cardList`

- `columnsDesktop`: `2 | 3 | 4`
- `columnsTablet`: `1 | 2 | 3`
- `columnsMobile`: `1 | 2`
- `gap`: `sm | md | lg`
- `density`: `compact | comfortable`
- `cardSize`: `sm | md | lg`
- `alignment`: `left | center`
- `highlightStyle`: `none | badge | border`

### `card`

- `theme`: `agri-clean | agri-bold | subsidy-focus | nutrient-focus`
- `fontScale`: `sm | md | lg`
- `imageRatio`: `square | landscape`
- `visibleFields`
- `fieldOrder`
- `emphasisFields`
- `badgeFields`
- `titleLines`: `1 | 2`
- `priceStyle`: `normal | strong`
- `cornerStyle`: `soft | sharp`

## 금지 규칙

AI와 시스템은 아래 동작을 허용하지 않는다.

- 임의 CSS 문자열 주입
- 임의 DOM selector 지정
- 자유 좌표 기반 absolute positioning
- `categorySelector` 이동, 숨김, 수정
- 데이터 값 직접 변경
- 새 JSX/JS 코드 생성
- 비허용 필드 사용
- 허용 zone 밖 요소 변경

## AI 출력 표준

AI는 자연어 설명만 반환하지 않고, 아래 구조의 JSON 패치를 반환해야 한다.

```json
{
  "target": "page_presentation",
  "changes": [
    {
      "zone": "searchBox",
      "action": "update",
      "props": {
        "variant": "compact",
        "align": "left",
        "width": "md",
        "placeholder": "비료명, 성분, 제조사 검색"
      }
    },
    {
      "zone": "cardList",
      "action": "update",
      "props": {
        "columnsDesktop": 3,
        "columnsTablet": 2,
        "columnsMobile": 1,
        "gap": "md",
        "density": "comfortable"
      }
    },
    {
      "zone": "card",
      "action": "update",
      "props": {
        "theme": "subsidy-focus",
        "visibleFields": ["product_name", "nutrient", "price_subsidy"],
        "fieldOrder": ["product_name", "nutrient", "price_subsidy"],
        "emphasisFields": ["price_subsidy"],
        "badgeFields": ["price_subsidy"],
        "fontScale": "md",
        "priceStyle": "strong"
      }
    }
  ],
  "reason": "보조금 중심 정보 가독성을 높이기 위한 카드 강조 수정",
  "lockedWarnings": []
}
```

## 시스템 검증 지침

시스템은 AI가 반환한 패치를 그대로 반영하지 않고 반드시 검증한다.

### 1. zone 검증

- 허용 zone은 `searchBox`, `cardList`, `card`만 가능하다.
- 그 외 zone이 포함되면 해당 변경은 거절한다.

### 2. 속성 검증

- zone별 허용 속성만 수용한다.
- 정의되지 않은 속성 키는 거절한다.

### 3. enum 검증

- 미리 정의한 enum 값만 허용한다.
- enum 불일치 시 해당 변경은 거절한다.

### 4. 필드 whitelist 검증

- `visibleFields`
- `fieldOrder`
- `emphasisFields`
- `badgeFields`

위 속성은 반드시 허용 필드 목록 안에서만 선택해야 한다.

### 5. 변경 규모 제한

- 한 번에 너무 많은 변경이 들어오면 축소 적용하거나 재요청한다.
- 첫 버전에서는 zone당 1회 `update`만 허용하는 것도 가능하다.

### 6. 미리보기 안전성 검증

- 모바일 1열, 태블릿 2열, 데스크톱 3열 이상에서 레이아웃이 깨지지 않아야 한다.
- 렌더 불가 상태가 발생하면 해당 패치는 적용하지 않는다.

## AI 응답 지침

AI는 아래 원칙을 따라 응답해야 한다.

1. 표현 수정만 수행한다.
2. 데이터 수정 요청은 거절하고 데이터 수정 화면으로 유도한다.
3. `categorySelector` 수정 요청은 거절하고 잠금 사유를 설명한다.
4. 허용 속성만 사용한다.
5. 변경 이유를 한 줄로 요약한다.
6. 가능하면 가장 작은 수정부터 제안한다.
7. 불확실한 필드명을 추측하지 않는다.

## 사용자 경험 지침

### 기본 흐름

1. 시스템이 기본 페이지를 먼저 보여준다.
2. 사용자가 자연어로 수정 요청을 입력한다.
3. AI가 안전한 표현 패치를 생성한다.
4. 시스템이 패치를 검증한다.
5. 통과한 경우 미리보기에 즉시 반영한다.
6. 사용자가 `적용`, `되돌리기`, `취소` 중 하나를 선택한다.

### 화면 원칙

- `categorySelector locked` 상태를 명확히 보여준다.
- `AI는 데이터가 아니라 표현만 수정합니다` 안내 문구를 노출한다.
- 가능하면 `before / after` 비교를 제공한다.
- `undo`를 항상 제공한다.

## 사용자 요청 예시

허용되는 좋은 요청 예시:

- `카드를 더 크게 보여줘`
- `검색창을 더 작고 깔끔하게 바꿔줘`
- `보조금 정보를 더 눈에 띄게 강조해줘`
- `제조사보다 성분을 먼저 보여줘`
- `모바일에서 카드 한 줄에 하나씩 보이게 해줘`

거절 또는 우회 안내가 필요한 예시:

- `카테고리 탭을 숨겨줘`
- `영세 가격을 과세 가격으로 바꿔줘`
- `이 상품명을 더 짧게 데이터 자체를 수정해줘`
- `새로운 섹션을 코드로 추가해줘`

## 구현 권장 구조

권장 구조는 아래와 같다.

```text
pageData
  -> extractedRows / mergedRows

pageConfig
  -> 기본 페이지 표현 설정

aiPatch
  -> AI가 제안한 표현 변경

validatedPatch
  -> 시스템 검증을 통과한 patch

previewState
  -> validatedPatch가 반영된 미리보기 상태
```

즉, 렌더러는 원본 데이터를 직접 바꾸지 않고 `pageConfig + validatedPatch`를 조합해 최종 화면을 만든다.

## 대회 발표용 설명 문구

이 기능은 상품 데이터를 변경하지 않고, 농협 직원이 AI와 대화하며 카드형 상품 페이지의 표현을 즉시 수정하도록 돕는 안전한 AI 편집 보조 기능이다.

## 결론

이 표준안의 핵심은 아래 두 가지다.

1. AI는 데이터가 아니라 표현만 수정한다.
2. AI는 자유 코드 생성이 아니라 제한된 설정값 패치만 반환한다.

이 원칙을 지키면 대회 데모에서 즉시성이 보이면서도, 실제 서비스 관점에서 안정성과 통제 가능성을 함께 가져갈 수 있다.
