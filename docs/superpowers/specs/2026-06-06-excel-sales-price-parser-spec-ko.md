# 엑셀 판매단가 추출기 스펙

## 문서 목적

이 문서는 `react-app` 내부에 판매단가 엑셀 추출 코드를 추가하기 위한 구현 기준을 정의한다.  
범위는 `.claude/skills/excel-sales-price-extract/`에 정리된 규칙을 실제 코드로 옮기는 데 한정한다.

이 문서가 다루는 것:

- 엑셀 파일 읽기
- 헤더 행 탐지
- 데이터 범위 탐지
- 컬럼 매핑
- 원본 행 정규화
- `product_code + sale_price_type` 기준 집계
- `tax_price` / `zero_tax_price` 분기
- `manufacturer_list` 집계
- 경고 정보 반환
- 테스트 전략

이 문서가 다루지 않는 것:

- 유사행 판단
- 유사행 병합
- AI 추천
- Supabase 저장
- 업로드 UI 완성
- 최종 검토 화면 UX

## 목표

사용자가 업로드한 판매단가 엑셀 파일을 `xlsx`로 읽고, 원본 값을 훼손하지 않으면서 앱에서 바로 사용할 수 있는 정규화된 결과 행 배열을 반환한다.

핵심 목표:

1. 헤더 위치가 고정되지 않은 엑셀도 읽을 수 있어야 한다.
2. 원본 행이 과세/영세로 나뉘어 있어도 결과는 한 행으로 접어야 한다.
3. 같은 `product_code`라도 `sale_price_type`이 다르면 별도 결과 행이어야 한다.
4. 제조업체는 단일 문자열이 아니라 리스트로 누적해야 한다.
5. AI 없이도 동작해야 하며, AI 연동이 생겨도 값 수정은 절대 하지 않아야 한다.

## 구현 위치

초기 구현은 React UI와 분리된 순수 추출 모듈로 만든다.

예상 파일 구조:

```text
react-app/src/features/excel-extract/
  services/
    salesPriceWorkbookExtractor.js
  utils/
    salesPriceColumnMap.js
    salesPriceHeaderDetection.js
    salesPriceNormalization.js
  __tests__/
    salesPriceWorkbookExtractor.test.js
```

초기에는 파일 수를 과도하게 늘리지 말고, 필요한 경우 `services/salesPriceWorkbookExtractor.js` 한 파일에서 시작한 뒤 커지면 분리한다.

## 공개 API

첫 구현은 아래 함수 하나를 공개한다.

```js
async function extractSalesPriceWorkbook(input)
```

입력:

- `File`
- `ArrayBuffer`
- `Uint8Array`

반환값:

```js
{
  sheetName: string,
  headerRowIndex: number,
  dataStartRowIndex: number,
  dataEndRowIndex: number,
  rows: ExtractedSalesPriceRow[],
  warnings: string[],
}
```

`ExtractedSalesPriceRow` 예시:

```js
{
  product_code: "2100031144112",
  sale_price_type_code: "01",
  sale_price_type_name: "조합원정상가",
  product_name: "엔케이플러스인(NK+인)",
  product_type_variants: ["중본-과세-수탁매취", "중본-영세-수탁매취"],
  spec: "20kg",
  large_category: "비료",
  medium_category: "무기질비료(원예용)",
  small_category: "원예용비료",
  detail_category: "원예용비료",
  manufacturer_display: "남해화학",
  manufacturer_list: [
    {
      manufacturer_code: "2910000206952",
      manufacturer_name: "남해화학"
    }
  ],
  tax_price: 14410,
  zero_tax_price: 13100,
  warnings: []
}
```

## 처리 흐름

구현 흐름은 아래 순서를 따른다.

1. `xlsx`로 첫 번째 시트를 읽는다.
2. 시트를 2차원 배열로 변환한다.
3. 헤더 후보 행을 찾는다.
4. 헤더를 기준으로 컬럼 인덱스를 매핑한다.
5. 실제 데이터 범위를 확정한다.
6. 데이터 행을 원본 기반 객체로 정규화한다.
7. `product_code + sale_price_type` 기준으로 집계한다.
8. `product_type`을 해석해 `tax_price`, `zero_tax_price`를 채운다.
9. 제조업체를 dedupe 후 `manufacturer_list`로 누적한다.
10. 행 단위 경고와 전체 경고를 반환한다.

## 헤더 행 탐지 규칙

헤더 탐지는 룰 기반으로 구현한다.

후보 판단 기준:

- 한 행 안에 `상품코드`, `상품명`, `매출단가`, `상품구분` 같은 대표 헤더가 여러 개 있어야 한다.
- `매출단가유형`이 2번 등장하면 강한 신호로 본다.
- 데이터 행처럼 숫자/상품값 위주가 아니라 헤더 문자열 비율이 높아야 한다.

추천 구현:

- 시트 상단 30행까지만 검사한다.
- 각 행에 대해 헤더 점수를 계산한다.
- 가장 점수가 높은 행을 `headerRowIndex`로 선택한다.
- 최소 점수 미달이면 오류 대신 `warnings`를 남기고 가장 가능성 높은 후보를 택한다.

## 데이터 범위 탐지 규칙

헤더 다음 행부터 아래로 내려가며 실제 데이터 범위를 찾는다.

시작 규칙:

- 헤더 바로 다음 행부터 검사한다.
- `product_code`나 `product_name` 위치에 값이 있으면 데이터 행 후보로 본다.

종료 규칙:

- 완전히 빈 행이 연속 2개 이상 나오면 종료한다.
- `번호`, `합계`, `출력일시` 같은 후행 메타데이터 패턴이 나오면 종료한다.

## 컬럼 매핑 규칙

우선순위:

1. 정확한 헤더명 일치
2. 사전 정의 동의어 매핑
3. 중복 헤더 위치 규칙

기본 매핑 대상:

- `상품코드` -> `product_code`
- `상품명` -> `product_name`
- 첫 번째 `매출단가유형` -> `sale_price_type_code`
- 두 번째 `매출단가유형` -> `sale_price_type_name`
- `상품구분` -> `product_type`
- `매출단가` -> `sale_price`
- `규격` -> `spec`
- `대분류` -> `large_category`
- `중분류` -> `medium_category`
- `소분류` -> `small_category`
- `세분류` -> `detail_category`
- `상품제조업체코드` -> `manufacturer_code`
- `상품제조업체명` -> `manufacturer_name`

매핑 실패 시 동작:

- 필수 컬럼이 없으면 전체 `warnings`에 누락 사실을 남긴다.
- 해당 컬럼이 없더라도 가능한 범위까지는 추출한다.

## 정규화 규칙

정규화 단계에서는 원본 값을 직접 덮어쓰지 않는다.

기본 규칙:

- 문자열은 `trim()` 적용
- 빈 문자열은 `null` 처리
- 숫자 필드는 숫자로 변환
- 변환 실패 시 원본 문자열은 버리지 말고 경고를 남긴다

특별 규칙:

- `sale_price_type_code`가 비어 있으면 `sale_price_type_name`을 대체 키로 사용한다.
- `product_type` 원본 값은 추후 추적을 위해 보존한다.

## 집계 규칙

### 결과 행 키

집계 키는 아래 조합이다.

- `product_code`
- `sale_price_type`

여기서 `sale_price_type`은:

- 우선 `sale_price_type_code`
- 없으면 `sale_price_type_name`

### 집계 동작

같은 키의 원본 행들은 하나의 결과 행으로 합친다.

공통 복사 필드:

- `product_code`
- `product_name`
- `spec`
- `large_category`
- `medium_category`
- `small_category`
- `detail_category`

공통 필드가 서로 다르면:

- 첫 번째 값을 유지한다.
- 불일치 사실을 해당 행 `warnings`에 기록한다.

## 과세/영세 분기 규칙

같은 집계 키 안에서 `product_type`을 검사한다.

규칙:

- `과세` 포함 -> `tax_price`
- `영세` 포함 -> `zero_tax_price`

예외:

- 둘 다 없으면 경고
- 둘 다 포함되면 경고
- 같은 슬롯 값이 여러 개면 경고

이 단계에서 유사행 비교나 병합 판단은 하지 않는다.

## 제조업체 집계 규칙

같은 집계 키 안의 제조업체는 리스트로 수집한다.

필드 구조:

```js
manufacturer_list: [
  {
    manufacturer_code,
    manufacturer_name,
  },
];
```

규칙:

- `manufacturer_code + manufacturer_name` 기준 dedupe
- 둘 다 비어 있으면 후보에서 제외
- 결과가 비면 `manufacturer_list = null`

## 경고 규칙

경고는 실패가 아니라 “검토 필요” 신호로 다룬다.

전체 경고 예시:

- 헤더 행 신뢰도 낮음
- 필수 컬럼 일부 누락
- 데이터 범위 종료가 불명확함

행 경고 예시:

- `product_type` 해석 불가
- `tax_price` 후보 중복
- `zero_tax_price` 후보 중복
- 공통 필드 값 불일치

## AI 연동 경계

초기 구현에서는 AI를 실제 호출하지 않는다.  
대신 이후 연동 가능 지점을 분리해 둔다.

AI가 개입할 수 있는 유일한 영역:

- 헤더 행 후보 선택
- 컬럼 매핑 후보 추천
- 데이터 범위 후보 추천

AI가 절대 하면 안 되는 것:

- 셀 값 수정
- 가격 보정
- 분류 보정
- 제조업체 수정
- 유사행 판단
- 병합 결정

즉, 현재 코드 기준으로는 모든 추출 결과가 deterministic rule 기반이어야 한다.

## React 통합 방식

파서는 React 컴포넌트 밖의 순수 함수로 둔다.

이유:

- 테스트가 쉬움
- 브라우저 업로드 UI와 분리 가능
- 추후 서버 재검증 로직과 공유하기 쉬움
- React 렌더링과 무관한 순수 계산 로직을 컴포넌트에서 분리 가능

향후 UI 연동 시 예상 호출 방식:

```js
const result = await extractSalesPriceWorkbook(file);
```

컴포넌트는 이 결과를 받아 상태에 저장하고 화면에 그리기만 한다.

## 오류 처리

에러와 경고를 구분한다.

에러로 던질 경우:

- 파일이 비어 있음
- 시트를 읽을 수 없음
- `xlsx` 파싱 자체 실패

경고로 남길 경우:

- 헤더 탐지가 애매함
- 일부 컬럼 누락
- 일부 값 형식 이상
- 과세/영세 슬롯 중복

## 테스트 전략

테스트는 `vitest`로 작성한다.

우선순위:

1. 단위 테스트
2. 실제 엑셀 fixture 기반 테스트

필수 테스트 케이스:

1. `취급 비료 매출단가.xlsx`를 읽으면 헤더 행을 올바르게 찾는다.
2. 같은 `product_code`의 과세/영세 2행이 1행으로 접힌다.
3. `tax_price`, `zero_tax_price`가 올바르게 채워진다.
4. 같은 `product_code`라도 `sale_price_type`이 다르면 별도 행으로 남는다.
5. 제조업체가 여러 개면 `manufacturer_list`로 dedupe 누적된다.
6. 제조업체가 없으면 `manufacturer_list = null`이 된다.
7. 필수 컬럼 일부가 빠진 mock sheet에서도 경고와 함께 동작한다.

## 구현 순서

1. 추출 모듈 파일 생성
2. 헤더 탐지 로직 구현
3. 컬럼 매핑 로직 구현
4. 정규화 로직 구현
5. 집계 로직 구현
6. 경고 로직 구현
7. fixture 기반 테스트 작성
8. 필요 시 이후 UI 연결

## 승인 기준

아래 조건을 만족하면 1차 구현 완료로 본다.

1. 실제 엑셀 파일을 읽어 `rows` 배열을 반환한다.
2. `product_code + sale_price_type` 집계가 동작한다.
3. `tax_price` / `zero_tax_price` 접기가 동작한다.
4. `manufacturer_list` 누적이 동작한다.
5. AI 관련 로직 없이도 안정적으로 동작한다.
6. 테스트가 통과한다.
