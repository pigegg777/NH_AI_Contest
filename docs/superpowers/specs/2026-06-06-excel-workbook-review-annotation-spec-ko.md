# 엑셀 워크북 리뷰 Annotation Spec

## 목적

이 문서는 엑셀 추출 리뷰 화면에서 사용자가 직접 관리하는 리뷰 annotation 기능을 정의한다.

본 문서의 범위:

- `shadow` 체크 관리
- `note` 입력 및 수정
- 필터/정렬/세션 변화 중 annotation 유지
- 추출 결과와 annotation의 병합 규칙

본 문서의 범위 밖:

- 엑셀 헤더 탐지
- 데이터 범위 탐지
- 과세/영세 추출 규칙
- 상품 집계 규칙
- AI 기반 추출 판단 로직

위 항목은 추출 스킬과 추출 service 문서에서 관리한다.

## 핵심 원칙

1. 추출 결과와 리뷰 annotation은 분리한다.
2. 추출 결과는 불변 데이터처럼 취급한다.
3. `shadow`, `note`는 사용자의 리뷰 상태이므로 별도 state로 관리한다.
4. 최종 저장 또는 export 시점에만 추출 결과와 annotation을 병합한다.
5. 필터, 정렬, 검색으로 화면에 보이는 행이 바뀌어도 annotation은 유지되어야 한다.

## 데이터 모델

### 1. 추출 결과 row

추출기에서 반환하는 기본 row는 현재와 동일하게 유지한다.

추가 요구:

- 각 row는 안정적인 `row_id`를 가져야 한다.

예시:

```json
{
  "row_id": "2100031144112__TYPE-A",
  "product_code": "2100031144112",
  "product_name": "요소 플러스 NK",
  "sale_price_type_code": "TYPE-A",
  "sale_price_type_name": "기본단가",
  "tax_price": 14410,
  "zero_tax_price": 13100,
  "large_category": "비료",
  "medium_category": "무기질비료(일반)",
  "small_category": "단비",
  "detail_category": null,
  "spec": "20kg",
  "manufacturer_list": []
}
```

### 2. 리뷰 annotation

리뷰 annotation은 row 자체를 수정하지 않고 `row_id` 기준 map 구조로 관리한다.

예시:

```json
{
  "2100031144112__TYPE-A": {
    "shadow": true,
    "note": "유사 상품과 비교 필요"
  }
}
```

annotation 필드 규칙:

- `shadow`: boolean
- `note`: string

기본값:

- `shadow = false`
- `note = ""`

## 상태 관리 구조

추천 구조:

- `useWorkbookExtraction`: 파일 업로드 및 추출 결과 관리
- `useWorkbookTableModel`: 검색, 필터, 정렬, 가시 row 계산
- `useWorkbookReviewAnnotations`: `shadow`, `note`, 세션 복원/저장 관리

역할 분리:

- 추출 hook은 `file -> extracted result`까지만 담당
- table model hook은 행 표시 순서와 필터링만 담당
- annotation hook은 사용자 입력 상태와 persistence만 담당

## `row_id` 규칙

annotation 유지의 핵심은 안정적인 `row_id`다.

요구사항:

1. 같은 workbook을 같은 규칙으로 다시 추출했을 때 같은 row는 같은 `row_id`를 가져야 한다.
2. 필터/정렬과 무관하게 동일 row를 식별할 수 있어야 한다.
3. UI key, annotation key, 최종 export merge key를 모두 `row_id`로 통일한다.

초기 권장안:

- `row_id = product_code + "__" + sale_price_type_code`

단, 이 조합이 충돌할 수 있는 실제 케이스가 확인되면 다음 필드를 추가 포함한다.

- `spec`
- 원본 행 인덱스
- 내부 집계 키

## Shadow 기능

### 목적

`shadow`는 사용자가 특정 row를 검토 대상으로 표시하거나 후처리 대상으로 남기기 위한 리뷰용 플래그다.

### UI 규칙

1. 첫 번째 열에 checkbox를 둔다.
2. 사용자가 checkbox를 체크하면 해당 row의 annotation에 `shadow: true`를 반영한다.
3. `shadow` 텍스트 컬럼은 테이블에 렌더하지 않는다.
4. 사용자는 필터/정렬 후에도 이전 체크 상태를 그대로 볼 수 있어야 한다.

### 데이터 규칙

최종 데이터에서는 모든 row가 `shadow` 필드를 가진다.

예시:

```json
{
  "row_id": "2100031144112__TYPE-A",
  "product_code": "2100031144112",
  "shadow": true,
  "note": null
}
```

기본값:

- 체크하지 않은 row는 `shadow: false`

## Note 기능

### 목적

`note`는 사용자가 해당 비료 row에 자유 메모를 남기기 위한 필드다.

### UI 규칙

1. 테이블에 `비고` 열을 추가한다.
2. 기본 상태에서는 note 텍스트 또는 빈 상태를 보여준다.
3. 해당 셀을 클릭하면 input 또는 textarea 편집 모드로 전환한다.
4. 사용자가 편집을 완료하면 annotation에 즉시 반영한다.

초기 권장 편집 규칙:

- `blur` 시 저장
- `Enter` 저장
- `Esc` 취소

### 데이터 규칙

- UI 내부 상태에서는 빈 값은 `""`로 관리
- 최종 export 시 빈 문자열이면 `note: null`로 변환 가능

## 세션 유지 규칙

요구사항:

1. 필터를 적용해도 annotation이 유지되어야 한다.
2. 정렬을 변경해도 annotation이 유지되어야 한다.
3. 같은 세션 안에서 화면을 다시 렌더해도 annotation이 유지되어야 한다.

추가 권장안:

- `sessionStorage`를 사용해 새로고침 후에도 복원

세션 저장 key는 workbook 단위로 구분한다.

권장 key 조합:

- `file.name`
- `file.size`
- `file.lastModified`

예시:

`excel-review:annotations:<fingerprint>`

동작 규칙:

1. 파일 업로드 후 fingerprint 계산
2. 기존 session annotation이 있으면 복원
3. annotation 변경 시 sessionStorage 갱신
4. 다른 파일 업로드 시 기존 annotation과 분리

## 필터/정렬/검색과 annotation의 관계

annotation은 현재 보이는 row 집합이 아니라 전체 row 집합에 대해 관리한다.

즉:

- 필터로 숨겨진 row의 `shadow`는 유지된다.
- 정렬 순서가 바뀌어도 `note`는 유지된다.
- 검색 결과에서 사라졌다가 다시 나타난 row도 기존 annotation을 그대로 가져야 한다.

초기 버전 권장 범위:

- `note`를 검색 대상에 포함하지 않는다.
- `shadow` 전용 필터는 아직 추가하지 않는다.

위 기능은 추후 별도 확장으로 둔다.

## 최종 데이터 병합 규칙

최종 데이터는 추출 결과 row에 annotation을 merge해서 만든다.

병합 규칙:

1. 원본 row 복사
2. 해당 `row_id` annotation 조회
3. annotation이 없으면 기본값 적용
4. `shadow`, `note` 필드 추가

예시:

```json
{
  "row_id": "2100031144112__TYPE-A",
  "product_code": "2100031144112",
  "product_name": "요소 플러스 NK",
  "tax_price": 14410,
  "zero_tax_price": 13100,
  "shadow": false,
  "note": null
}
```

## 저장 시점

annotation은 아래 시점마다 반영되어야 한다.

1. checkbox 토글 직후
2. note 입력 저장 직후
3. sessionStorage 동기화 시점
4. 최종 export 직전

UI 반응성 원칙:

- 사용자의 입력은 즉시 local state에 반영한다.
- 저장 또는 export 전까지 extractor 재실행은 필요하지 않다.

## 에러 및 예외 처리

### 1. row_id 누락

- annotation 기능을 비활성화하거나
- fallback key를 만들지 말고 개발 단계에서 오류로 드러내는 것을 권장

이유:

- 불안정한 key는 필터/정렬 후 잘못된 row에 annotation이 붙을 수 있다.

### 2. sessionStorage 복원 실패

- annotation만 빈 상태로 시작
- 추출 결과 자체는 그대로 표시
- 필요하면 경고 메시지를 노출

### 3. 다른 파일 업로드

- 기존 annotation은 다른 workbook fingerprint에 묶여 있으므로 자동 혼합하지 않는다.

## 테스트 요구사항

최소 테스트 범위:

1. `shadow` 체크 후 필터 변경 시 유지되는지
2. `shadow` 체크 후 정렬 변경 시 유지되는지
3. `note` 입력 후 필터 변경 시 유지되는지
4. `note` 입력 후 정렬 변경 시 유지되는지
5. sessionStorage에서 복원되는지
6. 다른 workbook 업로드 시 annotation이 분리되는지
7. 최종 데이터에 `shadow`, `note`가 정확히 병합되는지

## 구현 우선순위

1. extractor 결과에 `row_id` 추가
2. annotation state hook 추가
3. checkbox 기반 `shadow` UI 추가
4. 클릭 편집 기반 `note` UI 추가
5. sessionStorage 복원/저장 추가
6. 최종 export merge 추가

## 결정 사항

- `shadow`는 추출 데이터가 아니라 리뷰 annotation이다.
- `note`는 추출 데이터가 아니라 리뷰 annotation이다.
- `shadow` 열은 데이터에는 존재하지만 테이블의 일반 컬럼으로 렌더하지 않는다.
- annotation은 `row_id` 기준으로 관리한다.
- 추출 로직은 annotation 로직을 알지 않아야 한다.
