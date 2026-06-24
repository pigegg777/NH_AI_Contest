# 엑셀 검토 페이지 테이블 이름 입력 설계

## 목표

`react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.jsx` 상단 업로드 패널에 `테이블 이름` 입력 UI를 추가한다. 이 값은 화면 상태에서만 관리하며 업로드, 병합, AI 분석, 저장 로직에는 연결하지 않는다.

## 범위

- 포함
  - `테이블 이름` 선택 UI 추가
  - `비료`, `농약`, `기타` 선택 제공
  - `기타` 선택 시 직접입력 input 노출
  - 페이지 로컬 state로만 값 유지
- 제외
  - Supabase 저장
  - AI 분석 요청 반영
  - URL, localStorage, 서버 상태 동기화
  - 기존 테이블 모델, warning, 추천 로직 변경

## 설계 원칙

- 기존 상단 업로드 패널 흐름을 유지한다.
- 기본값은 선택하지 않은 상태로 둔다.
- `기타` 입력값은 다른 옵션으로 바꿨다가 다시 돌아와도 유지한다.
- 접근성은 native `label + select + input` 조합을 사용한다.
- 페이지 로컬 state만 사용하고 다른 훅이나 서비스로 올리지 않는다.

## 상태 모델

- `tableNameMode`
  - `'' | 'fertilizer' | 'pesticide' | 'custom'`
- `customTableName`
  - `string`

파생 규칙:
- `fertilizer` 선택 시 의미상 최종 이름은 `비료`
- `pesticide` 선택 시 의미상 최종 이름은 `농약`
- `custom` 선택 시 의미상 최종 이름은 `customTableName`

이 파생값은 현재 화면 표시를 위한 내부 계산으로만 사용 가능하며 외부 로직에 전달하지 않는다.

## UI 설계

- 위치
  - 파일 업로드 줄 아래
  - 병합/AI 버튼 줄 위
- 필드 구성
  - 라벨: `테이블 이름`
  - select 옵션:
    - `선택하세요`
    - `비료`
    - `농약`
    - `기타`
  - `기타` 선택 시 추가 필드:
    - 라벨: `직접 입력`
    - placeholder: `예: 자재, 종자, 사료`

## 동작

- 초기 렌더링에서는 직접입력 필드를 숨긴다.
- `비료`, `농약` 선택 시 직접입력 필드를 숨긴다.
- `기타` 선택 시 직접입력 필드를 보여준다.
- `기타`에 입력한 값은 다른 옵션을 선택해도 지우지 않는다.
- 파일 변경이나 추출 상태 변경과는 독립적으로 유지한다.

## 테스트 범위

- `테이블 이름` select가 렌더링된다.
- `비료` 선택 시 직접입력 input이 보이지 않는다.
- `농약` 선택 시 직접입력 input이 보이지 않는다.
- `기타` 선택 시 직접입력 input이 보인다.
- `기타` 입력 후 다른 옵션을 거쳐 다시 돌아오면 입력값이 유지된다.

## 검증

- `cd react-app && npm run test:run -- src/features/excel-extract/__tests__/excelExtractWorkbookReviewPage.test.jsx`
- `cd react-app && npm run build`
