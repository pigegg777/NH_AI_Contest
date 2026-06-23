# 회원가입 사업장 코드 추가 설계

## 목표

`react-app/src/features/auth`의 회원가입 화면에 필수 `사업장 코드` 입력값을 추가하고, 기존 `login_users` 테이블 insert 흐름으로 `business_code` 컬럼까지 저장한다.

## 범위

- 포함:
  - 회원가입 폼 상태와 UI에 `businessCode` 필드 추가
  - Supabase insert payload에 `business_code` 추가
  - 신규/재설치용 SQL 스키마 파일에 `business_code text not null` 반영
- 제외:
  - 로그인 화면/로그인 결과 표시 변경
  - 대시보드나 레이아웃에서 사업장 코드 노출
  - 추가 형식 검증, 중복 검증, 관리자 기능

## 현재 구조

- `RegisterPage.jsx`가 로컬 state로 회원가입 입력값을 관리한다.
- `authService.register()`가 `login_users` 테이블에 직접 insert 한다.
- `supabase_setup.sql`이 기본 테이블 정의를 담고 있다.

## 변경 설계

### UI

- `RegisterPage.jsx`의 form state에 `businessCode`를 추가한다.
- `사업장 코드` 입력칸을 기존 조직 정보 입력군 옆에 배치한다.
- `required` 속성을 주어 브라우저 수준에서 빈 제출을 막는다.

### 데이터 저장

- `authService.register()`가 받는 파라미터에 `businessCode`를 포함한다.
- Supabase insert 시 `business_code: businessCode`로 매핑한다.
- 기존 `.select('id').single()` 패턴은 유지한다.

### 스키마

- `public.login_users`에 `business_code text not null`을 추가한다.
- 기존 파일은 회원가입 insert 동작과 어긋나는 부분이 있으므로, 최소한 현재 기능 설명이 맞도록 컬럼 정의를 갱신한다.

## 에러 처리

- 현재 UX 패턴 유지:
  - insert 실패 시 `register()`는 `null` 반환
  - 성공 메시지는 표시되지 않음
- 이번 변경에서는 별도 에러 문구 추가하지 않는다.

## 테스트 전략

- `RegisterPage` 테스트:
  - `사업장 코드` 필드가 렌더링되는지 확인
  - 제출 시 `register()`가 `businessCode`를 포함한 객체로 호출되는지 확인
- `authService` 테스트:
  - Supabase insert payload에 `business_code`가 들어가는지 확인

## 검증

- `cd react-app && npm run test:run -- src/features/auth/pages/RegisterPage.test.jsx src/features/auth/services/authService.test.js`
- `cd react-app && npm run build`
