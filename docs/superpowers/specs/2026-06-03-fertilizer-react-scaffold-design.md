# 비료 React 초기 뼈대 설계

- 작성일: 2026-06-03
- 대상 경로: `react-app/`
- 목적: 기존 `react-app` 폴더를 실제 React/Vite 앱으로 전환하고, `NH-AGri_Web-React`의 `src/features/biryo` 구조에서 검색과 카테고리 선택 UI seam만 가져와 초기 화면 뼈대를 만든다.

## 1. 목표

이번 1차 작업의 목표는 다음과 같다.

1. `react-app`를 실제 React/Vite 프론트엔드 앱으로 전환한다.
2. 비료 정보 화면의 기본 page layout을 만든다.
3. 참조 프로젝트의 `biryo` feature에서 검색 입력과 카테고리 선택 구조만 가져온다.
4. 리스트 데이터는 아직 붙이지 않고, 빈 리스트 영역 placeholder만 렌더링한다.
5. 이후 실제 카테고리/데이터를 붙여도 page shape를 크게 바꾸지 않도록 feature-first 구조로 잡는다.

## 2. 이번 범위

포함:

- Vite + React 앱 기본 구성
- 앱 진입점 구성
- 비료 feature page 1개 구성
- 검색 입력 UI
- 카테고리 선택 UI
- 로컬 상태 연결
- 빈 리스트 영역 UI
- 향후 카테고리 설정 파일 placeholder 추가

제외:

- 실제 데이터 fetch
- Supabase 연동
- React Query 도입
- 상세 페이지
- 카드 리스트 실데이터 렌더링
- 관리자/고객 분기
- AI JSON 렌더링 로직

## 3. 선택한 접근

선택안은 `feature-first scaffold`이다.

이 접근을 고른 이유:

- 참조 프로젝트의 page composition 감각을 유지할 수 있다.
- 지금 필요한 검색/카테고리/list 영역만 얇게 가져오기 좋다.
- 나중에 실제 데이터, 카드, 상세 페이지를 붙일 때 locality가 좋다.
- 현재 범위에 불필요한 query layer나 과한 인프라를 넣지 않아도 된다.

## 4. 아키텍처

`react-app`를 Vite 기반 React 앱으로 전환한다.

초기 렌더링 구조:

1. `main.jsx`에서 앱 마운트
2. `App.jsx`는 앱 shell 역할만 담당
3. `FertilizerInfoPage`가 검색, 카테고리, 빈 리스트 영역을 조합
4. 카테고리 데이터는 별도 config file에서 가져오되 현재는 빈 배열
5. 필터 상태는 feature 내부 hook에서 로컬 상태로 관리

중요 결정:

- `biryo`에서 가져오는 것은 UI seam과 page shape만이다.
- `biryo`의 Supabase query, formatter, selector, detail 구조는 이번 범위에서 제외한다.
- 파생 상태는 `useEffect`로 저장하지 않고 render 단계에서 계산한다.

## 5. 예상 디렉터리 구조

```text
react-app/
  src/
    main.jsx
    App.jsx
    styles/
      global.css
    features/
      fertilizer/
        config/
          categories.js
        components/
          SearchInput.jsx
          CategorySelector.jsx
          EmptyFertilizerList.jsx
        hooks/
          useFertilizerFilters.js
        pages/
          FertilizerInfoPage.jsx
```

## 6. 컴포넌트 설계

### `App`

- 앱 shell만 담당
- 현재는 `FertilizerInfoPage`만 렌더링
- 라우터는 이번 범위에 넣지 않음

### `FertilizerInfoPage`

- 검색 영역, 카테고리 영역, 리스트 영역을 조합하는 page module
- `biryo`의 `BiryoInfoPage`처럼 page-level composition 유지
- 로컬 상태 hook과 category config를 연결

### `SearchInput`

- controlled input
- `value`, `onChange`, `placeholder` 정도의 작은 interface 유지
- 현재는 상품명 검색 용도

### `CategorySelector`

- 카테고리 option 목록 렌더링
- 현재 카테고리가 비어도 안전하게 동작
- 최소한 `전체` option은 항상 노출

### `EmptyFertilizerList`

- 데이터가 아직 없다는 의미의 placeholder section
- 에러 화면이 아니라 준비 중/비어 있음 상태로 표현

### `useFertilizerFilters`

- `query`
- `selectedCategory`
- 각 상태 변경 handler

이 hook은 지금은 얕지만, 이후 filter logic과 UI event locality를 모으는 seam 역할을 한다.

### `categories.js`

- 현재는 빈 배열 placeholder
- 이후 실제 커스텀 카테고리만 여기서 관리
- 기존 데이터에서 자동 추출하지 않음

## 7. 데이터 흐름

초기 상태:

- `query = ''`
- `selectedCategory = '전체'`
- `customCategories = []`
- `items = []`

page에서 계산:

- `categoryOptions = ['전체', ...customCategories]`
- `filteredItems = []`

흐름:

1. 사용자가 검색어 입력
2. `SearchInput`이 `query` 변경
3. 사용자가 카테고리 선택
4. `CategorySelector`가 `selectedCategory` 변경
5. page는 현재 상태 기준으로 파생 값을 계산
6. 지금은 데이터가 없으므로 빈 리스트 영역 유지

핵심 원칙:

- 파생 값은 render에서 계산
- effect로 state 복제하지 않음
- 아직 원격 데이터가 없으므로 query library 도입하지 않음

## 8. 예외 처리

- 카테고리 배열이 비어 있어도 앱이 깨지지 않아야 한다.
- 카테고리가 비어 있으면 `전체`만 노출한다.
- 검색어가 비어 있어도 정상 렌더링한다.
- 데이터가 아직 없다는 상태를 에러로 취급하지 않는다.
- 실제 데이터 연결 전까지는 `loading/error/empty`를 과도하게 분리하지 않는다.

## 9. Vercel React Best Practices 반영

- 파생 상태를 `useEffect`로 저장하지 않는다.
- 현재 범위에서 불필요한 data fetching abstraction을 넣지 않는다.
- search/filter 상태는 로컬에 둔다.
- 향후 리스트가 커질 경우에만 `useDeferredValue(query)`를 검토한다.
- 지금 단계에서 과한 memoization은 넣지 않는다.
- page 내부에 inline component를 정의하지 않는다.

## 10. 검증 계획

구현 이후 확인할 항목:

1. 검색 입력이 렌더링되는지
2. 카테고리 선택 UI가 렌더링되는지
3. 카테고리 데이터가 비어 있어도 `전체`가 보이는지
4. 빈 리스트 영역이 렌더링되는지
5. `cd react-app && npm run build`가 통과하는지

## 11. 다음 구현 단계 메모

구현 시 순서는 다음이 적절하다.

1. `react-app`를 Vite React 앱 구조로 전환
2. entry file과 global style 구성
3. `features/fertilizer` 디렉터리 생성
4. 검색/카테고리/빈 리스트 컴포넌트 생성
5. page 연결
6. build 검증

## 12. 보류 사항

- 실제 카테고리 목록 내용
- 실제 비료 데이터 source
- 카드 리스트 UI 상세
- 상세 페이지 여부
- 관리자/고객 분리 방식
- AI JSON 렌더러 연결 시점

## 13. 작업 메모

- 현재 작업 디렉터리는 git repository로 인식되지 않아, 본 spec은 파일로만 저장한다.
- git commit 단계는 저장소가 준비된 뒤 별도로 진행해야 한다.
