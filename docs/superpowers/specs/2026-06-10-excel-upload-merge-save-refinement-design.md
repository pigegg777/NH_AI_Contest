# Excel Upload Merge Save Refinement Design

## Goal

`AiConetstPlan.md` 기준 1번 범위인 `엑셀 업로드 -> 정적 데이터 병합 -> 저장` 흐름을 먼저 다듬는다.

이번 단계의 목표는 아래 3가지다.

1. 현재 `excel-extract` 기능의 업로드, 병합, 저장 규칙을 코드에서 더 직관적으로 읽히게 만든다.
2. 레이아웃 배치는 유지한 채 업무 규칙을 기존 `hooks`, `model`, `services` 안에 더 잘 모은다.
3. 파일명과 함수명을 더 직관적으로 정리하되, 불필요한 파일 분리나 과한 구조 변경은 하지 않는다.

## Fixed Constraints

1. `AppLayout`, `DashboardPage`, `ExcelExtractWorkbookReviewPage`의 현재 레이아웃 배치는 수정하지 않는다.
2. 수정은 반드시 현재 `react-app/src/features` 구조를 기준으로 진행한다.
3. 새로운 상위 아키텍처나 과도한 workflow hook은 만들지 않는다.
4. 얇은 pass-through 파일, 한 번만 쓰는 wrapper, 이름만 다른 중복 seam은 만들지 않는다.
5. 기존 테스트 구조와 feature 경계를 유지한다.

## Current Structure Reference

현재 `excel-extract`는 이미 아래 흐름을 갖고 있다.

- `pages/ExcelExtractWorkbookReviewPage.jsx`
  - 페이지 조립과 사용자 상호작용 연결
- `hooks/useWorkbookExtraction.js`
  - 파일 선택과 추출 실행
- `hooks/useWorkbookReviewPipeline.js`
  - annotation, 정적 병합, 검색/필터/정렬, 표시 행 생성
- `hooks/useWorkbookAutoStaticMerge.js`
  - 기본 카테고리 선택 시 자동 병합 트리거
- `hooks/useWorkbookReviewSave.js`
  - 저장 가능 여부 판단과 저장 실행
- `model/save/index.js`
  - 저장 카테고리 관련 규칙
- `services/officeProductDataService.js`
  - Supabase 저장/목록 조회

이 구조 자체는 유지하되, 각 module의 interface가 더 명확해지도록 정리한다.

## Problem

현재 코드는 동작은 되지만, 아래 지점에서 이름과 책임이 약간 흐리다.

1. `pipeline`이라는 이름이 너무 넓다.
   - 실제로는 표시용 행 상태, annotation, 정적 병합 상태, 테이블 상태까지 함께 들고 있다.
2. `save` 관련 이름이 업무 규칙보다 동작 자체만 말한다.
   - 어떤 이름을 저장하는지, 어떤 조건에서 저장 가능한지, 어떤 카테고리 규칙을 따르는지가 이름에서 바로 드러나지 않는다.
3. `merge`가 “정적 데이터 병합”인지 “일반 행 병합”인지 이름만 보고는 분명하지 않다.
4. `model/save/index.js` 같은 이름은 feature 외부에서 봤을 때 역할이 바로 안 읽힌다.

이 문제는 코드 길이보다 interface의 선명도 문제에 가깝다. 따라서 이번 단계는 큰 재구성보다 naming과 책임 정리를 우선한다.

## Recommended Approach

### 1. 페이지는 그대로 두고 feature 내부 seam만 선명하게 만든다

- `ExcelExtractWorkbookReviewPage`는 계속 페이지 조립 역할만 맡긴다.
- 업로드, 병합, 저장 규칙은 기존 `hooks`, `model`, `services` 안에 유지한다.
- 새 “workflow hook”은 만들지 않는다.

### 2. 이름이 흐린 module만 선택적으로 rename 한다

이름 변경은 “역할이 바로 읽히는가?” 기준으로만 적용한다.

예상 rename 방향:

- `useWorkbookReviewPipeline`
  - 후보: `useWorkbookReviewTableState`
  - 이유: 이 hook의 실제 주 output은 화면에 쓰는 review rows / filter / sort / merge state다.
- `useWorkbookReviewSave`
  - 후보: `useWorkbookSave`
  - 이유: 역할이 더 짧고 직접적이다.
- `useWorkbookAutoStaticMerge`
  - 후보: `useWorkbookStaticMergeTrigger`
  - 이유: 실제로는 병합 자체가 아니라 자동 병합 요청 trigger를 담당한다.
- `model/save/index.js`
  - 후보: `model/save/workbookSaveModel.js`
  - 이유: feature 내부 역할이 파일명만 봐도 드러난다.
- `isStaticMergeEnabledForTableNameMode`
  - 후보: `shouldUseStaticDataMerge`
  - 이유: UI mode보다 업무 규칙 의미가 더 바로 읽힌다.
- `resolveTableCategoryName`
  - 후보: `resolveSaveCategoryName`
  - 이유: 저장 시점의 카테고리명 결정 함수라는 점을 더 분명히 한다.
- `handleMerge`
  - 후보: `handleStaticDataMerge`
  - 이유: 어떤 병합인지 이름에서 바로 드러낸다.

반대로 아래 이름은 이번 단계에서 유지한다.

- `ExcelExtractWorkbookReviewPage`
- `officeProductDataService`
- `buildOfficeProductDataCatalogModel`

이 이름들은 이미 feature 맥락에서 충분히 직관적이다.

### 3. 저장 규칙은 `save` seam에 더 모은다

이번 단계에서 저장 관련 판단은 아래 흐름으로 선명하게 정리한다.

- 저장 카테고리명 결정
- 정적 병합 적용 여부 판단
- 저장 가능 여부 판단
- 저장 payload 정리
- Supabase upsert

핵심은 페이지가 저장 조건을 많이 알지 않게 하고, 기존 save seam이 더 많은 leverage를 갖도록 만드는 것이다.

### 4. 병합 규칙은 “정적 데이터 병합”으로 명시한다

비료/농약 선택 시 자동 병합되는 규칙은 이미 있으므로, 동작을 바꾸기보다 naming을 명확히 한다.

- 기본 카테고리: 정적 데이터 병합 사용
- 사용자 정의 카테고리: 정적 데이터 병합 미사용
- 병합 결과 행은 AI/저장 공통 입력으로 사용

## Target Behavior

이번 수정이 끝나면 아래가 코드에서 더 분명해야 한다.

1. 파일 업로드 후 추출 결과가 만들어진다.
2. 현재 저장 대상 카테고리에 따라 정적 데이터 병합 사용 여부가 결정된다.
3. 병합된 결과 또는 원본 결과가 review table, AI 분석, 저장에 일관되게 전달된다.
4. 저장 시 카테고리명과 사용자 정보, 저장 대상 행 상태가 한 곳에서 검증된다.
5. 주요 함수와 파일 이름만 읽어도 흐름을 따라갈 수 있다.

## Affected Files

직접 수정 대상 후보:

- `react-app/src/features/excel-extract/pages/ExcelExtractWorkbookReviewPage.jsx`
- `react-app/src/features/excel-extract/hooks/useWorkbookExtraction.js`
- `react-app/src/features/excel-extract/hooks/useWorkbookReviewPipeline.js`
- `react-app/src/features/excel-extract/hooks/useWorkbookAutoStaticMerge.js`
- `react-app/src/features/excel-extract/hooks/useWorkbookReviewSave.js`
- `react-app/src/features/excel-extract/model/save/index.js`
- `react-app/src/features/excel-extract/services/officeProductDataService.js`
- 관련 import를 사용하는 `__tests__` 파일들

## Testing

이번 단계에서는 아래 범위만 검증한다.

1. hook 테스트
   - 병합 trigger가 기존 규칙대로 동작하는지
   - 저장 가능 여부와 저장 성공 메시지가 기대대로 나오는지
2. model 테스트
   - 카테고리명 결정과 정적 병합 사용 여부 판단이 기대대로 동작하는지
3. 페이지 테스트
   - 업로드 후 기본 카테고리와 custom 카테고리 흐름이 기존 UX를 깨지 않는지

레이아웃 스냅샷이나 전면 UI 구조 테스트는 이번 단계의 범위에 넣지 않는다.

## Why This Is The Right Depth

이 접근은 큰 새 구조를 추가하지 않으면서도, 기존 feature 안에서 interface를 더 선명하게 만든다.

- **Locality**
  - 업로드, 병합, 저장 규칙이 페이지 밖 기존 seam 안에 더 모인다.
- **Leverage**
  - 페이지는 조립만 알고, 저장/병합 판단은 더 작은 interface로 호출할 수 있다.
- **Deletion test**
  - 새 상위 workflow module을 만드는 대신 기존 seam을 깊게 만들어서, 얇은 중간 계층을 추가하지 않는다.

## Out Of Scope

이번 단계에서는 하지 않는다.

1. AI 분석 규칙 자체 수정
2. Warning 규칙 추가 구현
3. auth 구조 재설계
4. dashboard layout 변경
5. `excel-extract` 전체를 새로운 폴더 체계로 재정리
