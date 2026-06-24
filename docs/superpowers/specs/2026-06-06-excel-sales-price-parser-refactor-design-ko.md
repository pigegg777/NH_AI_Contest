# 엑셀 판매단가 추출기 파일 분리 설계

## 목적

`react-app/src/features/excel-extract/services/salesPriceWorkbookExtractor.js` 는 현재 너무 많은 책임을 한 파일에 담고 있다.

이 설계 목표:

- 공개 인터페이스는 유지
- 동작은 그대로 유지
- 책임을 작은 모듈로 분리
- 테스트 표면은 그대로 유지
- 이후 AI가 탐색하기 쉬운 구조로 정리

## 현재 문제

현재 파일은 아래 책임을 모두 가진다.

1. workbook 입력 정규화
2. sheet -> 2차원 배열 변환
3. 헤더 행 탐지
4. 데이터 범위 탐지
5. 컬럼 매핑
6. 원본 행 정규화
7. 집계 키 생성
8. 과세/영세 접기
9. 제조업체 dedupe/누적
10. 경고 생성
11. 최종 결과 조립

즉 인터페이스는 작지만 구현 내부 locality 가 낮다.  
헤더 로직 수정, 집계 로직 수정, 입력 처리 수정이 모두 같은 파일에서 충돌한다.

## 목표 구조

```text
react-app/src/features/excel-extract/services/
  salesPriceWorkbookExtractor.js
  salesPriceWorkbook/
    constants.js
    readWorkbook.js
    headerDetection.js
    rowNormalization.js
    rowAggregation.js
```

## 모듈별 책임

### 1. `salesPriceWorkbookExtractor.js`

역할:

- 외부 공개 함수 유지
- 전체 파이프라인 조립

가질 것:

- `extractSalesPriceWorkbook(input)`

가지지 않을 것:

- 헤더 점수 계산 상세
- 컬럼 매핑 상세
- 집계 상세

### 2. `salesPriceWorkbook/constants.js`

역할:

- 헤더 탐지 상수
- 헤더 weight
- 컬럼 규칙

가질 것:

- `HEADER_SCAN_LIMIT`
- `DATA_END_BLANK_ROW_STREAK`
- `HEADER_WEIGHTS`
- `COLUMN_RULES`

### 3. `salesPriceWorkbook/readWorkbook.js`

역할:

- 입력 타입 정규화
- workbook 읽기
- 첫 시트 선택
- sheet rows 추출

가질 것:

- `toWorkbookInput`
- `sheetToRows`
- 필요 시 `readWorkbookSheet`

### 4. `salesPriceWorkbook/headerDetection.js`

역할:

- 헤더 점수 계산
- 헤더 행 선택
- 컬럼 매핑
- 데이터 범위 탐지
- workbook-level warnings 생성

가질 것:

- `normalizeHeaderCell`
- `scoreHeaderRow`
- `detectHeaderRow`
- `buildColumnMap`
- `detectDataRange`
- `buildWorkbookWarnings`

### 5. `salesPriceWorkbook/rowNormalization.js`

역할:

- raw row -> normalized row 변환
- 텍스트/숫자 정규화

가질 것:

- `normalizeText`
- `normalizeNumber`
- `buildNormalizedRow`

### 6. `salesPriceWorkbook/rowAggregation.js`

역할:

- canonical key 생성
- 공통 필드 병합
- `product_type_variants` 수집
- `tax_price`, `zero_tax_price` 접기
- `manufacturer_list` 누적
- row warnings 생성

가질 것:

- `aggregateRows`
- 내부 helper 들

## 유지해야 할 인터페이스

아래 반환 shape 는 바꾸지 않는다.

```js
{
  sheetName,
  headerRowIndex,
  dataStartRowIndex,
  dataEndRowIndex,
  rows,
  warnings,
}
```

아래 공개 함수명도 유지한다.

```js
extractSalesPriceWorkbook(input)
```

## 테스트 전략

기존 테스트 파일 유지:

- `react-app/src/features/excel-extract/__tests__/salesPriceWorkbookExtractor.test.js`

검증 목표:

- 실제 fixture pass 유지
- `sale_price_type` 분리 유지
- `manufacturer_list` 누적/null 유지

필요하면 테스트는 import 경로만 유지하고 내부 구현 분리 사실을 모르게 둔다.

## 비목표

이번 리팩터 범위 밖:

- 새 기능 추가
- warning 문구 변경
- AI 연동
- UI 연결
- 파일명/도메인명 대규모 변경

## 추천 구현 순서

1. `constants.js` 분리
2. `readWorkbook.js` 분리
3. `headerDetection.js` 분리
4. `rowNormalization.js` 분리
5. `rowAggregation.js` 분리
6. `salesPriceWorkbookExtractor.js` 를 얇은 조립 파일로 축소
7. 테스트 실행

## 승인 기준

아래면 완료:

1. 기존 테스트 전부 pass
2. 공개 함수 시그니처 유지
3. `salesPriceWorkbookExtractor.js` 가 orchestration 위주로 얇아짐
4. 헤더/정규화/집계 관심사가 파일 단위로 분리됨
