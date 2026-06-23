# 엑셀 추출 검토 AI 추천 설계

## 목표

`react-app/src/features/excel-extract`의 검토 페이지에 `AI 분석하기` 기능을 추가한다. 이 기능은 업로드된 전체 결과를 읽고 검토 우선순위와 수정 후보를 추천하지만, 원본 데이터나 행 값을 직접 수정하지 않는다.

## 범위

- 포함
  - `AI 분석하기` 버튼과 분석 상태 표시
  - `AI 추천 패널` 추가
  - 추천 카드 클릭 시 관련 행 강조
  - `mock provider` 기반 추천 생성
  - OpenAI `Responses API` 실제 호출
  - OpenAI 연결용 환경변수 자리 추가
  - 구조화 JSON 스키마와 분석 지침 프롬프트
- 제외
  - 행 값 자동 수정
  - 기존 warning 로직 변경

## 현재 구조

- 검토 페이지는 `추출 -> 정적비료 병합 -> warning 표시 -> 테이블 검토` 흐름이다.
- 각 행은 이미 `warnings`, `note`, `shadow`, `row_id`를 가진다.
- 기존 warning은 `headerDetection.js`, `rowAggregation.js`에서 규칙기반으로 생성된다.

## 설계 원칙

- `warning`은 기존 규칙 기반 사실로 유지한다.
- `AI 추천`은 별도 계층으로 관리한다.
- 추천은 전체 rows 기준으로 생성한다.
- 결과는 `추천`, `이유`, `관련 row_id`, `심각도`만 가진다.
- 키가 비어 있으면 자동으로 `mock mode`를 사용한다.
- 키가 있으면 OpenAI `Responses API`를 브라우저에서 직접 호출한다.
- OpenAI 응답은 `json_schema` 구조화 출력으로 받는다.

## 아키텍처

### 상태/서비스 분리

- 새 훅: `useWorkbookAiRecommendations`
  - 분석 실행
  - 로딩/에러/모드 관리
  - 활성 추천 선택
  - 강조 대상 `row_id` 계산
- 새 서비스: `workbookAiRecommendationService`
  - 환경변수 기반 모드 결정
  - 키 없으면 `mock provider`
  - 키 있으면 OpenAI 실제 호출
  - 규칙 기반 추천과 OpenAI 추천 병합
- 새 모델: `aiRecommendations`
  - 결과 스키마 정규화
  - 규칙기반 추천 생성

### 환경변수

- `VITE_OPENAI_API_KEY=''`
- `VITE_OPENAI_MODEL='gpt-4.1-mini'`

주의:
- `VITE_*` 값은 브라우저 번들에 노출된다.
- 현재 구현은 서버 프록시 없이 브라우저에서 OpenAI를 직접 호출한다.
- 운영 환경에서는 서버 프록시 또는 Edge Function으로 이동하는 것이 더 안전하다.

## OpenAI 호출 설계

- 엔드포인트: `POST https://api.openai.com/v1/responses`
- 입력:
  - 전체 rows를 압축한 JSON
  - 규칙 기반 추천 결과
- 출력:
  - `text.format.type = json_schema`
  - `recommendations[]`
- 지침:
  - 원본 데이터 수정 금지
  - 제공된 row만 근거로 추천
  - `title`, `reason`, `actionText`는 한국어
  - `row_id`는 입력값 그대로 사용

## 추천 규칙

### 1. 같은 상품인데 상품코드가 다른 경우

- 비교 기준
  - `product_name`
  - `nutrient`
  - `spec`
  - `manufacturer_list`
- 위 값이 충분히 같거나 유사한데 `product_code`가 다르면 추천 생성
- kind: `same-product-different-code`

### 2. 영세단가가 과세단가보다 비싼 경우

- 조건
  - `tax_price != null`
  - `zero_tax_price != null`
  - `zero_tax_price > tax_price`
- kind: `zero-tax-higher-than-tax`
- severity: `high`

### 3. 같은 상품코드인데 핵심 정보가 불일치하는 경우

- 같은 `product_code` 내부에서
  - `product_name`
  - `nutrient`
  - `spec`
  값이 갈리면 추천 생성
- kind: `same-code-inconsistent-info`

## UI 설계

- `병합하기` 옆에 `AI 분석하기` 버튼 추가
- 분석 가능한 조건
  - 추출 결과 존재
- 추천 표시 위치
  - warning 패널 아래
  - 테이블 위
- 추천 카드 정보
  - 제목
  - 심각도
  - 이유
  - 관련 행 수
- 카드 클릭 시
  - `activeRecommendationId` 갱신
  - 관련 `row_id`를 가진 테이블 행 강조
- `mock mode`일 때만 패널 상단에 `mock 분석` 배지 표시

## 에러 처리

- AI 분석 실패 시 기존 추출 결과와 warning, note, shadow는 유지한다.
- 실패 메시지는 AI 패널에만 표시한다.

## 테스트 범위

- 추천 결과 스키마 생성
- `zero_tax_price > tax_price` 규칙
- 같은 상품 추정 그룹 규칙
- `mock provider` 응답
- OpenAI 요청 바디 생성
- OpenAI 구조화 응답 파싱
- 패널 클릭 -> 관련 row 강조
- key 없음 -> mock mode 진입

## 검증

- `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/workbookAiRecommendations.test.js src/features/excel-extract/__tests__/workbookAiReviewPanel.test.jsx`
- `cd react-app && npm run build`
