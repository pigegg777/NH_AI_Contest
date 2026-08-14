# DataEditorSection 탭 분리 디자인

- 날짜: 2026-08-14
- 대상 파일: `react-app/src/features/office-product-editor/components/DataEditorSection.jsx` 및 하위 `data-edit-controls/ExcelUploadPanel.jsx`, `data-edit-controls/WorkbookAiRecommendationPanel.jsx`

## 배경 / 목적

현재 `DataEditorSection`은 `ExcelUploadPanel`과 `WorkbookAiRecommendationPanel`을 2-column grid로 나란히 배치한다. 이를 탭(엑셀 업로드 / AI 분석)으로 전환하고, 각 탭 내부를 좌/우 2-column으로 재구성한다. 동시에 (1) 파일 업로드에 드래그 앤 드롭 지원 추가, (2) AI 분석 탭에 로직 없는 자연어 입력 UI를 추가한다. 상세 시각 스타일(색상, 카드 형태, 타이포그래피)은 현재 디자인을 그대로 유지하고, 레이아웃 구조만 변경한다.

## 컴포넌트 구조

```
DataEditorSection (activeTab state 소유: 'upload' | 'ai', 기본값 'upload')
├─ TabBar (role="tablist"): "엑셀 업로드" / "AI 분석" 버튼 2개
└─ 활성 탭만 렌더링 (비활성 탭은 언마운트)
     'upload' → ExcelUploadPanel
     'ai'     → WorkbookAiRecommendationPanel
```

- `activeTab`은 `DataEditorSection` 로컬 `useState`로 관리한다. 별도 라우팅/쿼리 파라미터는 사용하지 않는다.
- 실제 데이터(rows, AI 추천 결과, 업로드 상태 등)는 기존과 동일하게 `editorContexts`의 컨텍스트(`useExtractionCtx`, `useTableCtx`, `useAiCtx`, `useActiveCategoryCtx`)에 있으므로, 탭 전환으로 언마운트되어도 데이터는 유실되지 않는다.
- 탭 버튼은 `role="tab"`, `aria-selected`, 탭 패널은 `role="tabpanel"`로 최소 접근성을 확보한다.
- 기존 `.controlBar`(2-column grid로 두 패널을 나란히 배치하던 CSS)는 제거하고, 각 탭 콘텐츠 내부에 자체 2-column grid(`.tabColumns`)를 새로 정의한다. 반응형 규칙(760px 이하에서 1-column)은 `.tabColumns`에도 동일하게 적용한다.

## ExcelUploadPanel 탭 재구성

```
ExcelUploadPanel (탭 콘텐츠)
└─ .tabColumns (grid: 1fr 1fr)
   ├─ 왼쪽 컬럼
   │   ├─ 안내 문구 ("📊 엑셀 업로드 ...", "새 파일 선택 시 ...") — 기존 유지
   │   ├─ 파일 선택 버튼 (기존 uploadBtn + hidden file input) — 기존 유지
   │   ├─ [신규] DropzoneArea — 점선 테두리 박스, 드래그 오버 시 하이라이트 스타일
   │   └─ statusArea (로딩 중 / 에러 메시지) — 기존 위치대로 왼쪽에 유지 (업로드 동작 자체에 대한 피드백이므로)
   └─ 오른쪽 컬럼
       ├─ FileWarningsPanel ("파일 경고") — 기존 컴포넌트 그대로, 위치만 이동
       └─ WarningRowsPanel ("행 경고") — 기존 컴포넌트 그대로, 위치만 이동
```

**DropzoneArea 동작:**
- `onDragOver` / `onDragLeave` / `onDrop` 핸들러를 새로 추가한다.
- `onDrop`에서 `event.dataTransfer.files[0]`을 기존 `onWorkbookChange`가 기대하는 `{ target: { files } }` 형태로 감싸 그대로 전달한다.
- 새로운 검증 로직이나 별도 상태는 추가하지 않는다 — 버튼 클릭 업로드와 드래그 업로드가 동일한 코드 경로(`handleWorkbookChange`)를 탄다.
- 드래그 오버 중에는 로컬 `useState`(예: `isDragging`)로 하이라이트 스타일만 토글한다.

**스타일:** 기존 디자인 토큰(`--corp-*` 변수)과 `.panel` / `.compactPanel` 클래스를 재사용한다. 드롭존 박스만 신규 CSS 클래스를 추가한다.

## WorkbookAiRecommendationPanel 탭 재구성

```
WorkbookAiRecommendationPanel (탭 콘텐츠)
└─ .tabColumns (grid: 1fr 1fr)
   ├─ 왼쪽 컬럼
   │   ├─ 안내 문구 ("AI 분석", 설명 텍스트) — 기존 유지
   │   ├─ [신규] NaturalLanguagePromptInput — 단일 textarea + placeholder
   │   │     · 로컬 state만 소유 (`promptDraft`), 전송 버튼 없음, 백엔드 연동 없음 — 순수 UI 껍데기
   │   │     · placeholder 예: "예: 마진율이 낮은 상품 위주로 검토해줘"
   │   └─ "AI 분석하기" 버튼 — 기존 그대로 유지, `onAiAnalyze` 독립 호출 (입력값과 무관하게 동작)
   └─ 오른쪽 컬럼
       └─ WorkbookAiRecommendations (로딩 문구 / 추천 카드 그리드) — 기존 컴포넌트 그대로, 위치만 이동
```

- `showPanel` 조건(로딩 중이거나 결과가 있을 때만 표시)은 유지하되, 이제 오른쪽 컬럼 전체가 이 조건을 따른다. 결과가 없을 때 오른쪽 컬럼은 기존과 동일하게 완전히 비워둔다 (상세 디자인 현행 유지 원칙).
- `NaturalLanguagePromptInput`은 로직이 없으므로 별도 파일로 분리하지 않고 `WorkbookAiRecommendationPanel.jsx` 내부 함수로 둔다.

## 확정된 결정 사항 (질의응답 요약)

| 항목 | 결정 |
|---|---|
| 기본 활성 탭 | 엑셀 업로드 탭 |
| 드래그 앤 드롭 구성 | 파일 선택 버튼은 유지하고, 그 아래 별도 드롭존 박스 추가 |
| 자연어 입력창 형태 | 단일 textarea (메시지 리스트 없음) |
| 입력창-분석버튼 관계 | 독립적 — 입력값은 상태로만 보유, "AI 분석하기" 클릭 시 기존과 동일하게 `onAiAnalyze` 호출 |
| 파일 경고(FileWarningsPanel) 위치 | 오른쪽 컬럼 (행 경고와 함께) |
| 탭 구현 방식 | 커스텀 `useState` 기반 탭 (외부 라이브러리 미사용) |

## 범위 밖 (Out of scope)

- 자연어 입력창을 실제 AI 프롬프트로 연결하는 로직 (백엔드 연동, `onAiAnalyze`에 텍스트 전달 등) — 이번 변경에서는 UI 껍데기만 만든다.
- 탭 상태의 URL 동기화 / 새로고침 후 탭 유지.
- 드롭존에 대한 파일 형식 사전 검증 강화 (기존 업로드 핸들러의 검증 로직을 그대로 재사용).

## 테스트 관점

- 탭 전환 시 각 탭의 콘텐츠가 올바르게 표시/숨김되는지.
- 파일 선택 버튼과 드롭존 양쪽 경로 모두 `handleWorkbookChange`가 동일하게 호출되는지.
- 탭 전환 후에도 업로드된 rows, AI 추천 결과가 유지되는지 (컨텍스트 기반이므로 유실 없음을 확인).
- 반응형(760px 이하)에서 각 탭 내부 2-column이 1-column으로 무너지는지.
