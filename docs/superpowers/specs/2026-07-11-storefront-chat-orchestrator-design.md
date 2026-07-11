# Storefront Chat-Orchestrator Builder Design

## Summary

`storefront builder`를 기존 `currentStep` 기반 wizard에서 벗어나, 한 화면에서 계속 이어지는 chat-orchestrated workspace로 재구성한다. 사용자는 더 이상 `다음 / 이전` 중심 단계 화면을 이동하지 않고, 좌측 대화 thread 안에서 `1. 페이지 전반 디자인 수정`, `2. 카테고리별 데이터 수정`, `3. 카테고리별 상세 디자인 수정`, `4. 통합 디자인 질문` 중 하나를 선택해 작업을 이어간다. 우측 mobile preview는 계속 고정하고, `2번` 모드에서만 하단 dock table을 노출한다.

이번 설계는 persistence model을 바꾸지 않는다. `office product data`, `storefront config`, `pageStyle`, `cardStyle`, `visibleFields` 저장 구조는 유지하고, orchestration layer와 presentation layer만 교체한다.

## Goals

- Storefront 편집 흐름을 한 화면의 chat-style workspace로 통합한다.
- `1/2/3/4` 메인 작업 선택을 assistant bubble 기반으로 반복 노출한다.
- `2번` 모드에서 현재 `data-selection` 행동을 유지하되, 화면 이동 대신 sticky category tab + 하단 dock table로 재배치한다.
- `1번`과 `3번`은 자유 입력 기반 AI 편집으로 만들되, 결과는 preview draft에 먼저 반영하고 저장은 `적용` 시점에만 수행한다.
- 마지막 성공 적용 1회에 대한 `되돌리기`를 지원한다.

## Non-Goals

- `office_product_datas` 또는 `office_page_config` 스키마 변경
- chat transcript 영속 저장
- `2번` 모드에서 실제 row 값 편집 지원
- `4번` 모드에서 AI가 직접 page/card style을 적용하는 자동 실행
- public storefront rendering 구조 재설계

## Approved Product Decisions

### Workspace shell

- 레이아웃은 `A split workspace`를 따른다.
  - 좌측: 누적 chat thread
  - 우측: 고정 preview
  - 하단 dock: `2번` 모드에서만 노출
- mode rail은 화면 상단에 고정하지 않는다.
- `1/2/3/4` 선택은 assistant bubble 안에서만 다시 노출한다.

### Mode semantics

- `1. 페이지 전반 디자인 수정`
  - 자유 입력 가능
  - target chip optional
  - AI 응답 시 preview draft 즉시 반영
  - 채팅에는 변경 요약을 남김
- `2. 카테고리별 데이터 수정`
  - 이름은 유지하지만 실제 동작은 현재 `data-selection`
  - row 값 수정이 아니라 `visibleFields` 조정
  - 상단 sticky category tab으로 카테고리 전환
  - 하단 dock의 field selection table이 카테고리에 맞춰 바뀜
- `3. 카테고리별 상세 디자인 수정`
  - 상단 sticky category tab 사용
  - 자유 입력 가능
  - target chip optional
  - AI 응답 시 해당 category card design draft를 preview에 반영
- `4. 통합 디자인 질문`
  - 현재 적용된 data/design state를 읽고 답변만 수행
  - 저장, preview patch, automatic apply 없음

### Chat log rules

- 모든 미세한 UI 조작을 메시지로 남기지 않는다.
- `2번` 모드의 field toggle은 조용히 preview/table만 갱신한다.
- `적용` 시점에만 요약 메시지 1개를 남긴다.

### Apply / undo / draft rules

- `적용`은 즉시 DB 저장이다.
- 저장 직후 assistant bubble 안에 `되돌리기`를 노출한다.
- `되돌리기`는 마지막 성공 적용 1회만 가능하다.
- `1번`/`3번`에서 draft를 만든 뒤 다른 모드로 이동하면 draft는 버린다.
- draft 폐기 전 별도 확인 다이얼로그는 두지 않는다.

### Return flow

- 저장 성공 후 무조건 메인 선택 bubble로 복귀한다.
- 같은 모드에 그대로 머무르지 않는다.
- 저장 완료 bubble은 다음 정보를 포함한다.
  - 저장 완료 사실
  - 되돌리기 액션
  - `1/2/3/4` 다시 선택 액션

## User Experience Flow

### Entry

1. Builder loads.
2. 좌측 thread 첫 assistant bubble이 `어느 부분을 수정할까요?`와 `1/2/3/4` 액션을 렌더한다.
3. 우측 preview는 저장된 현재 storefront config를 계속 보여준다.

### Mode 1: 페이지 전반 디자인 수정

1. 사용자가 mode 1을 선택한다.
2. assistant가 page-level target chip과 자유 입력 안내를 보여준다.
3. 사용자가 prompt를 보내면 page AI request를 수행한다.
4. preview draft가 즉시 갱신된다.
5. assistant가 무엇이 바뀌었는지 요약한다.
6. 사용자가 `적용`을 누르면 page-level snapshot을 저장하고 메인 선택 bubble로 복귀한다.

### Mode 2: 카테고리별 데이터 수정

1. 사용자가 mode 2를 선택한다.
2. 상단 sticky tab에 저장된 category 목록이 노출된다.
3. 선택된 category에 맞춰 하단 dock의 field selection table이 갱신된다.
4. field toggle은 즉시 preview와 table state를 갱신한다.
5. 채팅 thread에는 토글 메시지를 누적하지 않는다.
6. 사용자가 `적용`을 누르면 `visibleFields` 변경을 저장하고 요약 bubble을 남긴 뒤 메인 선택으로 복귀한다.

### Mode 3: 카테고리별 상세 디자인 수정

1. 사용자가 mode 3을 선택한다.
2. 상단 sticky tab으로 category를 고른다.
3. assistant가 card-level target chip과 자유 입력 안내를 보여준다.
4. prompt 전송 시 card AI request를 수행한다.
5. preview draft가 즉시 갱신된다.
6. assistant가 변경 요약을 남긴다.
7. 사용자가 `적용`을 누르면 해당 category config 변경을 저장하고 메인 선택으로 복귀한다.

### Mode 4: 통합 디자인 질문

1. 사용자가 mode 4를 선택한다.
2. 하단 입력창이 활성화된다.
3. AI는 현재 `storefront config`, `pageStyle`, `cardStyle`, `visibleFields`, 선택 category 상태를 바탕으로 답변한다.
4. preview patch나 저장은 수행하지 않는다.
5. assistant는 답변 후 다시 메인 선택 bubble을 제안한다.

## State Model

새 orchestration 중심 상태는 `currentStep`보다 높은 수준의 mode machine이다.

```ts
type ChatMode = 'idle' | 'page' | 'data' | 'card' | 'advisory';

type ApplySnapshot = {
  mode: Exclude<ChatMode, 'idle' | 'advisory'>;
  payload: StorefrontSavePayload;
  summary: string;
  appliedAt: number;
} | null;

type ChatMessage =
  | { id: string; kind: 'assistant-text'; text: string }
  | { id: string; kind: 'user-text'; text: string }
  | { id: string; kind: 'mode-choice' }
  | { id: string; kind: 'target-chip-choice'; mode: 'page' | 'card' }
  | { id: string; kind: 'summary'; title: string; text: string }
  | { id: string; kind: 'apply-result'; text: string; canUndo: boolean }
  | { id: string; kind: 'error'; text: string };
```

### Source-of-truth boundaries

- `useStorefrontBuilder`
  - storefront config compilation
  - office product data hydration
  - page/card preview shaping
- `useStorefrontChatSession`
  - current chat mode
  - thread messages
  - selected sticky category for `2번/3번`
  - last apply snapshot
  - assistant bubble sequencing
- `usePageAiDesign`
  - page draft patch and AI status
- `useCardAiDesign`
  - card draft patch and AI status
- `useDataSelectionDraft`
  - `visibleFields` draft/committed split

## Component Architecture

### New seams

- `useStorefrontChatSession`
  - conversation state machine
  - mode transitions
  - message append helpers
  - apply-result / undo bubble shaping
- `StorefrontChatWorkspace`
  - left shell layout
- `StorefrontChatThread`
  - bubble list renderer
- `ModeChoiceBubble`
  - `1/2/3/4` assistant action bubble
- `StickyCategoryTabs`
  - `2번/3번` 전용 상단 category 전환
- `FieldSelectionDock`
  - 하단 field selection dock
- `ChatComposerDock`
  - `1/3/4` 전용 입력창 / apply actions
- `ApplyResultBubble`
  - 저장 완료 + 되돌리기

### Existing seams to reuse

- `PublicStorefrontScreen`
- `DataFieldGroupTable`
- `requestPageStyleAiIntent`
- `requestCardStyleAiIntent`
- `fetchStorefrontConfig`
- `upsertStorefrontConfig`
- `buildStorefrontSavePayload`

## Persistence and Undo

- 저장은 항상 compiled storefront payload 단위다.
- chat transcript는 저장하지 않는다.
- 마지막 성공 적용 직전 payload를 `ApplySnapshot`으로 보관한다.
- `undo`는 snapshot payload를 다시 `upsertStorefrontConfig`하는 방식으로 구현한다.
- 새 적용이 성공하면 이전 undo 가능 범위는 덮어쓴다.

## Error Handling

- AI 호출 실패
  - 현재 mode 유지
  - error bubble 추가
  - 저장본/preview committed state 보존
- 저장 실패
  - 현재 mode 유지
  - draft 유지
  - retry 가능
- advisory mode 실패
  - preview 영향 없음
  - error bubble만 추가

## Accepted Test Seams

이 설계에서 기대하는 핵심 test seam은 다음과 같다.

- `StorefrontBuilderPage` integration flow
  - mode choice
  - sticky tab behavior
  - preview reactions
  - save-return bubble
- `useStorefrontChatSession`
  - mode transitions
  - undo snapshot overwrite
  - draft discard behavior
- save payload normalization
  - `visibleFields`, page/card style, hidden products가 기존 shape로 유지되는지
- public preview rendering
  - `PublicStorefrontScreen`이 draft/committed config를 동일한 seam에서 읽는지

## Risks

- 현재 `currentStep` 전제 test가 많이 깨질 수 있다.
- `AiChatPanel`을 그대로 재사용하면 새 mode bubble 구조와 맞지 않을 수 있다.
- mobile에서 sticky preview, sticky tabs, composer, dock가 겹칠 수 있다.
- repo 내 일부 기존 한글 copy 인코딩이 깨져 있어 새 문구 관리 시 UTF-8 정리가 필요하다.

## Rollout Notes

- persistence boundary를 건드리지 않는 범위에서 UI/orchestration refactor로 제한한다.
- mode별 기능을 따로 배포하지 않고 한 번에 묶되, test seam은 mode 단위로 나눈다.
- 이전 `single-chat builder` 문서들의 의도는 계승하되, 이번 문서는 `assistant mode choice + sticky category tabs + apply/undo snapshot`까지 구체화한 최신 설계로 간주한다.
