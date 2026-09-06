# Office product editor

영업점 담당자가 판매단가 엑셀을 올려 검토하고, 카테고리별 상품 데이터로 등록하는 맥락. 여기서 등록한 데이터가 [Storefront](../../../../CONTEXT.md)의 재료가 된다.

## Language

### 층

**Model**:
도메인 연산. 무엇을 계산하고 어떤 순서로 부르고 실패하면 어떻게 하는지를 안다. 이 feature 밖으로 나가는 유일한 정문이기도 하다.
_Avoid_: 서비스, 비즈니스 로직, 헬퍼

**Service**:
전송. HTTP 요청, Supabase 질의, xlsx 읽기처럼 바깥 세계와 닿는 부분만 담당한다. 도메인 판단을 하지 않는다.
_Avoid_: API, 클라이언트, 게이트웨이(파일명으로는 쓰되 층 이름으로는 쓰지 않는다)

**Hook**:
React 상태와 화면 문구. 도메인 규칙을 갖지 않는다.

### 데이터

**Office product data**:
한 영업점이 한 카테고리로 등록한 상품 행 묶음. 영업점당 한 행(row)에 카테고리별 묶음이 들어 있다.
_Avoid_: 상품 목록, 등록 데이터(구어로는 쓰되 코드에서는 쓰지 않는다)

**Catalog**:
영업점이 등록해 둔 카테고리들의 목록. 카테고리명·행 수·갱신 시각을 갖는다.
_Avoid_: 사이드바 목록

**Review table**:
엑셀에서 뽑아낸 행을 등록 전에 확인·수정하는 표. 주석(annotation)과 정적 데이터 병합이 여기 얹힌다.

**Static data merge**:
비료·농약처럼 외부 기준 데이터가 있는 카테고리에서, 상품코드로 조회한 정적 데이터를 검토 행에 덧붙이는 것.

## 층 규칙

```
hooks/*  ->  model/*  ->  services/*  ->  Supabase · HTTP · xlsx
```

`hooks/` 하위는 `model/` 만 참조한다. 다른 feature 를 부를 때도 그 feature 의
`model/` 을 통한다 — 남의 `services/` 를 직접 부르지 않는다.

2026-08-29 기준 `hooks/` 하위에서 `services/` 를 부르는 곳은 없다.

### 감쌀 때 무엇을 함께 내리는가

`model/ai-image-apply/aiImageStorageModel` 을 만들 때 처음에는 "감싸도
숨길 게 없다"고 판단했었다. 호출부의 `await` 줄만 봤기 때문이고, 틀렸다.
한 화면 넓게 보니 업로드 허용 형식·크기 상한·파일을 data URI 로 바꾸는
일이 훅에 앉아 있었다.

**호출 줄만 보고 판단하지 않는다.** 그 호출을 감싸고 있는 검증·변환·
응답 해체까지 함께 보고, 옮겨갈 것이 있으면 감싼다. 진짜로 아무것도
없다면 그대로 두는 편이 낫다 — 규칙보다 깊이가 우선이다.

## 옮기지 않은 것

- `services/office-product-data/officeProductDataRowService.js` 는 read 와
  mutation 서비스가 함께 쓰는 내부 seam 이다(호출 6곳). 한쪽으로 흡수하면
  "영업점의 상품 데이터 행 하나를 가져온다"가 두 곳에 복제된다.
- `utils/officeProductDataUtils.js` 는 `services/` 만 쓴다. `model/` 로
  옮기면 services -> model 이 되어 층이 뒤집힌다.
