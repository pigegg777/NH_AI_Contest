# 엑셀 검토 저장 데모 설계

## 목표

`react-app/src/features/excel-extract` 검토 페이지에 `저장` 버튼을 추가하고, 현재 검토 row 배열을 Supabase `office_product_datas` 테이블에 `upsert` 저장한다. 이 구현은 데모 우선 버전이며, 브라우저에서 Supabase Data API를 직접 호출한다.

## 범위

- 포함
  - `저장` 버튼과 저장 상태 표시
  - `office_product_datas` upsert service
  - `office_code + product_data_category_name` 기준 upsert
  - `product_data`에 현재 검토 rows 배열 `jsonb` 저장
  - `office_product_datas` SQL 스키마와 migration 추가
  - 로그인 user에 `office_code` 포함
- 제외
  - 저장 데이터 복원 화면
  - 변경 이력 관리
  - Supabase Auth 전환
  - Edge Function / 서버 프록시

## 저장 모델

- 테이블: `public.office_product_datas`
- 고유키: `(office_code, product_data_category_name)`
- 저장 컬럼
  - `office_code`
  - `office_name`
  - `product_data_category_name`
  - `product_data`
  - `row_count`
  - `source_file_name`
  - `updated_who`
  - `created_at`
  - `updated_at`

## UI 흐름

- `저장` 버튼은 `병합하기`, `AI 분석하기` 옆에 배치
- 저장 가능 조건
  - 로그인 user 존재
  - `user.id`, `user.office_code`, `user.office_name` 존재
  - 추출 결과 존재
  - 저장 대상 rows 1개 이상
  - 테이블 이름 유효
  - `기타` 선택 시 직접입력 값 non-empty
- 성공 시 저장 성공 메시지 표시
- 실패 시 에러 메시지 표시

## 카테고리 이름

- `fertilizer` -> `비료`
- `pesticide` -> `농약`
- `custom` -> `customTableName.trim()`

## 저장 대상 rows

- 검색/필터/정렬된 `sortedRows`가 아니라 현재 검토 데이터 전체를 저장한다.
- 기준은 `mergedRows`
  - 병합 전이면 annotation 반영 rows
  - 병합 후면 정적비료 병합까지 반영된 rows

## 데모 보안 전제

- 현재 앱은 Supabase Auth 기반이 아니라 `login_users` 직접 조회 로그인 구조다.
- 따라서 DB 정책은 데모용으로 완화된 형태가 필요하다.
- 브라우저에서는 `VITE_SUPABASE_PUBLISHABLE_KEY`만 사용해야 하며 `service_role` 키는 사용 금지다.

## 테스트 범위

- save service가 `upsert` payload를 올바르게 생성한다.
- save service가 `office_code,product_data_category_name`로 `onConflict`를 건다.
- 페이지에서 유효한 테이블 이름 선택 시 `저장` 버튼이 활성화된다.
- `기타` 선택 후 직접입력한 카테고리명으로 save service를 호출한다.
- 저장 성공/실패 메시지가 렌더링된다.

## 검증

- `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/officeProductDataService.test.js src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`
- `cd react-app && npm run build`
