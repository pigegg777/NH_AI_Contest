# 프로젝트 설명

## 1. 프로젝트 개요

- 프로젝트명: 사무소 농자재 정보 페이지 및 QR 배포 지원 시스템
- 대상 사용자: 농협 사무소 직원
- 핵심 목표:
  - 직원이 보유한 매출단가 엑셀 파일을 업로드한다.
  - 시스템이 엑셀 데이터를 정규화하고, 정적 농자재 정보와 병합한다.
  - 사무소별 상품 데이터를 저장하고 재사용할 수 있게 한다.
  - 향후 고객용/관리자용 페이지와 QR 코드 자동 생성으로 확장한다.

## 2. 현재 구현 범위와 추후 범위

### 2.1 현재 구현 범위

- 로그인 / 회원가입
- 사무소별 사용자 식별
- 엑셀 업로드 및 표준 컬럼 추출
- 과세/영세 가격 병합
- 정적 농자재 정보 병합
- 사무소별 상품 데이터 저장 / 재불러오기
- AI 분석 보조 기능

### 2.2 추후 확장 범위

- 고객용 상품 소개 페이지 자동 생성
- 관리자용 상세 페이지 자동 생성
- QR 코드 자동 생성 및 배포
- 생성된 페이지 템플릿 편집 기능

현재 저장소 기준으로는 "엑셀 데이터 정제 및 저장"이 1차 구현 범위이며, QR 코드와 페이지 자동 생성은 차기 범위로 본다.

## 3. 사용자 흐름

### 3.1 로그인

- 로그인 입력값
  - 사번
  - 비밀번호
- 사용자는 사번과 비밀번호로 로그인한다.
- 실제 인증은 Supabase Auth가 처리한다.
- 화면에는 이메일을 직접 입력하지 않지만, 내부적으로는 사번 기반의 내부 식별 이메일을 만들어 Auth에 전달한다.

### 3.2 회원가입

- 회원가입 입력값
  - 농협명
  - 사무소명
  - 사업장 코드
  - 이름
  - 사번
  - 비밀번호
- 이메일 인증은 사용하지 않는다.
- Supabase Auth의 Confirm Email은 꺼진 상태를 전제로 한다.
- 회원가입이 완료되면 `auth.users`와 `login_users`가 연결된다.

### 3.3 데이터 작업

- 로그인 후 대시보드에서 데이터 설정/수정 기능으로 이동한다.
- 사용자는 엑셀 파일을 업로드한다.
- 업로드된 데이터는 행 단위로 정규화된 뒤 상품코드 기준으로 묶인다.
- 사용자가 기본 카테고리인 `비료` 또는 `농약`을 선택하면 정적 데이터 병합이 자동으로 수행된다.
- 사용자가 `+ 추가`를 선택하면 사용자 정의 카테고리 이름을 입력해 저장할 수 있다.
- 저장 시 사무소별 데이터가 `office_product_datas`에 upsert 된다.

## 4. 인증 및 권한 구조

## 4.1 인증 구조

- 인증 주체: Supabase Auth
- 프로필 저장 테이블: `public.login_users`
- 비밀번호 저장 위치: `auth.users`
- `login_users.password` 컬럼은 사용하지 않는다.
- 회원가입 시 `auth.users`에 계정이 생성되고, 트리거가 `login_users` 프로필을 생성 또는 연결한다.

## 4.2 사용자 식별 규칙

- `login_users.id`
  - 내부 숫자 PK
  - 다른 테이블에서 참조할 때 사용한다.
- `login_users.auth_user_id`
  - `auth.users.id`와 연결되는 키
  - RLS 정책에서 현재 로그인 사용자 식별에 사용한다.
- `login_users.employee_id`
  - 업무상 로그인 식별값
  - 사용자 입력 기반 고유값으로 관리한다.
- `login_users.office_code`
  - 사무소 데이터 범위를 구분하는 핵심 키
  - 저장된 상품 데이터 조회와 권한 범위 판별에 사용한다.

## 4.3 권한 정책

### `login_users`

- `authenticated` 사용자만 자신의 행을 조회할 수 있다.
- 정책 기준은 `auth.uid() = auth_user_id`이다.

### `static_fertilizers`

- 정적 참조 데이터 테이블이다.
- 읽기 전용으로 사용한다.
- 현재 구조상 `anon`, `authenticated` 조회 허용이 가능하다.

### `office_product_datas`

- `authenticated` 사용자만 접근한다.
- 같은 `office_code`에 속한 데이터만 조회/입력/수정 가능하다.
- 저장 시 `updated_who`는 현재 로그인한 `login_users.id`와 일치해야 한다.

## 5. 데이터 모델

## 5.1 `login_users`

역할:

- 회원가입 후 사용자 프로필 저장
- 로그인 후 사무소 권한 판단
- 저장 작업 시 작성자 정보 제공

주요 컬럼:

- `id`: bigint PK
- `auth_user_id`: uuid, `auth.users.id` 참조
- `nh_name`: 농협명
- `office_name`: 사무소명
- `office_code`: 사업장 코드
- `name`: 사용자 이름
- `employee_id`: 사번
- `created_at`: 생성 일시

제약:

- `auth_user_id`는 nullable일 수 있으나, 연결되면 unique로 관리한다.
- `employee_id`는 업무상 중복되지 않도록 운영 정책상 unique로 관리하는 것이 바람직하다.

## 5.2 `static_fertilizers`

역할:

- 공통 정적 상품 정보 테이블
- 엑셀 데이터와 병합해 화면 표시용 정보를 보강한다.

주요 컬럼:

- `product_code`: 상품코드, 병합 기준
- `product_name`: 상품명
- `img_url`: 상품 이미지 URL
- `product_url`: 상품 상세 페이지 URL
- `nutrient`: 비료 성분 정보
- `price_subsidy`: 보조금 또는 지원가 정보

비고:

- 현재 병합은 `product_code` 기준이다.
- 동일 `product_code`가 여러 건 있으면 안 된다.

## 5.3 `office_product_datas`

역할:

- 사무소별 상품 데이터를 저장하는 업무 테이블

저장 단위:

- `office_code + product_data_category_name` 조합당 1행
- 즉, "사무소당 1행"이 아니라 "사무소 + 카테고리당 1행"이다.

주요 컬럼:

- `id`: bigint PK
- `office_code`: 사무소 코드
- `office_name`: 사무소명
- `product_data_category_name`: 저장 카테고리명
  - 예: `비료`, `농약`, `종자`, `자재`
- `product_data`: JSON 배열
- `row_count`: 저장된 행 수
- `source_file_name`: 원본 업로드 파일명
- `updated_who`: `login_users.id` 참조
- `created_at`: 생성 일시
- `updated_at`: 수정 일시

고유 조건:

- `(office_code, product_data_category_name)` unique

## 5.4 `product_data` JSON 구조

`product_data`는 배열이며, 배열의 각 원소는 화면에서 다루는 상품 행 객체이다.

예시 필드:

```json
[{"product_data_category_name":"비료",
    "updated_at":"",
  {
    "row_id": "2100031144112__01",
    "product_code": "2100031144112",
    "product_name": "예시 상품명",
    "sale_price_type_code": "01",
    "sale_price_type_name": "조합원적용가",
    "product_type_variants": ["기본-과세-출하매출", "기본-영세-출하매출"],
    "spec": "20kg",
    "large_category": "비료",
    "medium_category": "무기질비료",
    "small_category": "원예용비료",
    "detail_category": "원예용비료",
    "tax_price": 14410,
    "zero_tax_price": 13100,
    "manufacturer_list": [
      {
        "manufacturer_code": "2910000206952",
        "manufacturer_name": "예시 제조사"
      }
    ],
    "warnings": [],
    "shadow": false,
    "note": "",
    "img_url": "https://example.com/image.png",->"product_data_category_name"="비료만 해당"
    "product_url": "https://example.com/product", ->"product_data_category_name"="비료만 해당"
    "nutrient": "18-1-15+1+0.1", ->"product_data_category_name"="비료만 해당"
    "price_subsidy": 750 ->"product_data_category_name"="비료만 해당"
  }}
]
```

## 6. 엑셀 업로드 및 정규화 규칙

## 6.1 입력 파일 형식

- 지원 파일 형식: `.xlsx`, `.xls`
- 첫 번째 시트를 기준으로 읽는다.

## 6.2 헤더 탐지 규칙

- 시스템은 시트 상단 일정 범위에서 헤더 후보를 탐지한다.
- 주요 탐지 대상 컬럼:
  - 상품코드
  - 상품명
  - 상품구분
  - 매출단가
  - 매출단가유형
  - 규격
  - 대분류 / 중분류 / 소분류 / 세분류
  - 상품제조업체코드 / 상품제조업체명

## 6.3 필수 컬럼

- 상품코드
- 상품명
- 상품구분
- 매출단가

필수 컬럼 누락 시 경고를 발생시킨다.

## 6.4 정규화 규칙

- 빈 값은 `null` 또는 빈 문자열 정책에 맞게 정리한다.
- 숫자 값은 가능한 경우 number로 변환한다.
- 상품코드 / 상품명 둘 다 비어 있는 행은 제외한다.

## 6.5 집계 규칙

- 행 식별자 `row_id`는 `product_code__sale_price_type_key` 형식으로 생성한다.
- 동일 상품코드 + 동일 매출단가 유형 조합은 하나의 집계 행으로 묶는다.
- `product_type`이 `과세`를 포함하면 `tax_price` 후보로 수집한다.
- `product_type`이 `영세`를 포함하면 `zero_tax_price` 후보로 수집한다.
- 동일 슬롯에 서로 다른 가격 후보가 2개 이상 들어오면 경고를 남긴다.
- 제조사 정보는 중복 제거 후 `manufacturer_list` 배열로 저장한다.

## 7. 정적 데이터 병합 규칙

## 7.1 병합 대상

- `static_fertilizers` 테이블

## 7.2 병합 기준

- `product_code`

## 7.3 병합 실행 조건

- 사용자가 `비료` 또는 `농약` 기본 카테고리를 선택한 경우에만 자동 병합을 시도한다.
- 사용자 정의 카테고리에서는 자동 병합하지 않는다.

## 7.4 병합 결과 필드

- `img_url`
- `product_url`
- `nutrient`
- `price_subsidy`

## 7.5 병합 실패 / 미매칭 처리

- 정적 데이터가 없으면 해당 필드는 `null`로 둔다.
- 병합 자체가 실패하면 오류 메시지를 보여주고, 원본 정규화 데이터는 유지한다.
- 병합 상태는 `요청 건수 / 매칭 건수` 형태로 사용자에게 표시한다.

## 8. 저장 및 수정 규칙

## 8.1 기본 카테고리 저장

- 기본 카테고리:
  - `비료`
  - `농약`
- 사용자가 기본 카테고리를 선택하고 저장하면 해당 이름으로 `office_product_datas`에 저장한다.

## 8.2 사용자 정의 카테고리 저장

- `+ 추가` 선택 시 카테고리 입력창을 노출한다.
- 카테고리 이름이 비어 있으면 저장할 수 없다.

## 8.3 저장 방식

- `office_code + product_data_category_name` 기준 upsert
- 기존 데이터가 있으면 덮어쓴다.
- 저장 시 `updated_at`과 `updated_who`를 갱신한다.

## 8.4 현재 수정 대상

현재 화면 기준으로 사용자가 후처리 가능한 항목:

- `shadow`
- `note`
- 일부 가격 확인 / 조정 대상 필드

운영 문서 기준으로 직접 수정 가능한 대표 필드:

- `tax_price`
- `zero_tax_price`
- `note`

## 9. Warning 규칙

## 9.1 Warning 목적

- 엑셀 업로드 과정에서 사용자가 바로 확인해야 할 이상 징후를 알려준다.
- Warning은 데이터 검토를 유도하는 기능이며, 모든 Warning이 저장 차단을 의미하지는 않는다.
- 다만 업로드 범위나 헤더 자체를 읽지 못한 경우는 정상 정규화가 어렵기 때문에 재업로드 또는 파일 확인이 우선이다.

## 9.2 Warning 발생 기준

1. 같은 `product_code`와 같은 `sale_price_type_name` 조합에서 `zero_tax_price` 또는 `tax_price` 값이 서로 다른 데이터가 2개 이상 존재하는 경우
2. 엑셀 업로드 시 데이터 범위를 읽지 못한 경우
3. 엑셀 업로드 시 헤더를 읽지 못한 경우

## 9.3 Warning 처리 원칙

- 가격 불일치 Warning은 해당 행 또는 집계 결과에 연결해 사용자가 어느 상품을 확인해야 하는지 바로 알 수 있게 한다.
- 범위 읽기 실패 또는 헤더 읽기 실패는 업로드 단계에서 즉시 안내한다.
- 헤더 또는 범위 문제는 사용자가 파일 구조를 수정한 뒤 다시 업로드하도록 유도한다.

## 10. AI 분석 규칙

## 10.1 AI 데이터 검사 목적

- AI는 저장된 데이터를 기반으로, 사람이 다시 보면 좋을 항목을 추천하는 보조 점검 도구로 사용한다.
- AI 결과는 자동 수정이 아니라 검토 추천이다.

## 10.2 AI 데이터 검사 항목

1. `product_name`, `nutrient` 등의 유사도를 기준으로 같은 상품일 가능성이 높지만 다른 `product_code`로 등록된 데이터를 알려준다.
2. `tax_price`가 `zero_tax_price`보다 큰 경우를 알려준다.
   - 둘 중 하나라도 값이 없으면 이 검사는 건너뛴다.
3. 데이터 전체를 읽고 추가 확인이나 수정이 필요해 보이는 부분을 종합적으로 추천한다.

## 10.3 AI 결과 처리 원칙

- AI 분석 결과는 사용자가 검토 후 반영 여부를 결정한다.
- AI 분석 결과만으로 데이터를 자동 저장하거나 자동 수정하지 않는다.
- 가능하면 결과에는 `product_code`, 상품명, 문제 사유를 함께 표시해 사용자가 바로 확인할 수 있게 한다.

## 11. 에러 및 예외 처리

## 11.1 인증 관련

- 회원가입 실패
  - 중복 사번
  - Auth 설정 오류
  - 트리거 / 테이블 구조 불일치
- 로그인 실패
  - 사번 또는 비밀번호 불일치

## 11.2 엑셀 관련

- 시트가 비어 있는 경우
- 헤더 탐지 실패
- 필수 컬럼 누락
- 과세 / 영세 분류가 해석 불가한 경우

## 11.3 병합 관련

- `static_fertilizers` 조회 실패
- 상품코드 미매칭

## 11.4 저장 관련

- 사용자 정보 부족
  - `office_code`, `office_name`, `user.id` 없음
- 카테고리명 없음
- 저장 대상 행 없음
- RLS 정책으로 인한 권한 오류

## 12. QR 코드 및 페이지 자동 생성 방향

이 항목은 현재 구현 완료 상태가 아니라 차기 범위이다.

예정 방향:

- 저장된 `office_product_datas.product_data`를 기반으로 고객용 페이지를 생성한다.
- 관리용 페이지는 더 많은 필드와 편집 기능을 제공한다.
- 생성된 페이지 URL에 대해 QR 코드를 발급한다.
- 사무소 현장에서 인쇄물 또는 매장 안내용으로 사용한다.

따라서 현재 문서에서는 QR 코드를 "프로젝트 최종 목표"로 정의하고, 현재 구현 범위와는 분리해 관리한다.

## 13. 용어 정리

- `login_users`: 사용자 프로필 테이블
- `auth.users`: Supabase Auth 계정 테이블
- `static_fertilizers`: 정적 농자재 참조 테이블
- `office_product_datas`: 사무소별 저장 데이터 테이블
- `product_data_category_name`: 저장 카테고리명
- `merge`: 정적 테이블 정보를 업로드 데이터에 덧붙이는 과정

## 14. 완료 기준

아래 조건을 만족하면 1차 기능 완료로 본다.

- 회원가입이 정상 동작한다.
- 로그인 후 세션이 유지된다.
- 엑셀 파일 업로드 시 필수 컬럼을 읽어온다.
- 과세 / 영세 단가가 집계된다.
- `비료` / `농약` 선택 시 정적 데이터 병합이 수행된다.
- 업로드 시 Warning 기준에 맞는 항목이 사용자에게 표시된다.
- AI 분석이 저장된 데이터를 기준으로 검토 포인트를 제안한다.
- 사용자 정의 카테고리 저장이 가능하다.
- 저장된 카테고리를 다시 불러올 수 있다.
- 같은 사무소 사용자는 자신의 사무소 데이터만 조회 / 수정할 수 있다.

## 15. 운영상 주의사항

- Supabase Auth의 Confirm Email은 비활성화 상태를 전제로 한다.
- 비밀번호는 `auth.users`에서만 관리한다.
- `login_users`는 인증 정보 저장소가 아니라 업무용 프로필 테이블이다.
- `office_code`는 권한 범위와 데이터 저장 단위를 동시에 결정하는 핵심 값이므로 입력 오류가 없어야 한다.
- `static_fertilizers` 데이터 품질이 병합 품질에 직접 영향을 준다.
- AI 분석 결과는 참고용이며, 최종 수정 책임은 사용자에게 있다.
