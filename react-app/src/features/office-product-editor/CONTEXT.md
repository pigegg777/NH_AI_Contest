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

### 예외: 도메인 변환이 없는 저장소 I/O

`hooks/ai-image-apply/` 두 훅은 `services/ai-image-apply/aiImageApplyClient`
를 직접 부른다. 이미지 생성·목록·업로드 호출부는 `await` 뒤에 setState 만
하고 도메인 판단이 없어서, model 로 감싸면 interface 가 implementation 과
같아진다 — 지워도 복잡도가 어디에도 다시 나타나지 않는 얕은 모듈이 된다.

**규칙보다 깊이가 우선이다.** 감싸는 쪽이 진짜 무언가를 숨길 때만 model 을
만든다. 정규화·순서·실패 정책 중 하나라도 옮겨갈 것이 있으면 감싸고,
없으면 그대로 둔다.

## 옮기지 않은 것

- `services/office-product-data/officeProductDataRowService.js` 는 read 와
  mutation 서비스가 함께 쓰는 내부 seam 이다(호출 6곳). 한쪽으로 흡수하면
  "영업점의 상품 데이터 행 하나를 가져온다"가 두 곳에 복제된다.
- `utils/officeProductDataUtils.js` 는 `services/` 만 쓴다. `model/` 로
  옮기면 services -> model 이 되어 층이 뒤집힌다.
