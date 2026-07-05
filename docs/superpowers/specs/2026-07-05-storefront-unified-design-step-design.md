# Storefront Unified Design Step Design

## Background

현재 `StorefrontBuilderPage`는 `ProductCategoryStep -> PageDesignStep -> DataSelectionStep -> CardDesignStep` 순서로 동작한다.

이 구조는 초기 구현에는 단순하지만, 실제 디자인 작업 흐름에서는 몇 가지 불편이 있다.

- 페이지 디자인과 카드 디자인이 서로 다른 step에 나뉘어 있어 수정 맥락이 끊긴다.
- `pageAiMessages`와 `cardAiMessages`가 분리되어 있어, 앞선 변경 이력을 바탕으로 다음 디자인 요청을 이어가기 어렵다.
- 사용자는 "방금 만든 페이지 분위기를 기준으로 카드도 바꿔줘" 같은 요청을 자연스럽게 하고 싶지만, 현재 구조는 이를 한 흐름으로 다루지 못한다.
- 반대로 실제 적용은 여전히 안전해야 하므로, 한 번의 AI 적용이 페이지와 카드를 동시에 바꾸는 방식은 피해야 한다.

추가로 현재 카드 AI는 `dataSelection.committed`를 기준으로 동작한다. 따라서 카드 디자인을 안정적으로 유지하려면 데이터 선택이 먼저 확정된 뒤 통합 디자인 단계로 들어가는 흐름이 필요하다.

이번 설계의 목표는 `PageDesignStep`과 `CardDesignStep`을 하나의 통합 디자인 단계로 합치되, 기존 카드 AI 변경 로직은 최대한 유지하고, 사용자가 한 채팅 패널 안에서 페이지/카드 디자인을 오갈 수 있게 만드는 것이다.

## Scope

이번 변경은 storefront builder 내부의 step 구조와 AI 디자인 편집 UI를 재구성한다.

포함 범위:

- `PageDesignStep`과 `CardDesignStep`을 하나의 통합 디자인 step으로 합친다.
- step 순서를 `ProductCategoryStep -> DataSelectionStep -> UnifiedDesignStep`으로 재정렬한다.
- 디자인 편집 UI는 탭 두 개가 아니라 단일 채팅 패널 하나로 구성한다.
- 사용자는 현재 수정 대상 `target`을 명시적으로 선택한다.
- AI 적용은 한 번에 선택된 `target` 하나에만 반영한다.
- 채팅 history와 입력 draft는 page/card를 나누지 않고 통합 관리한다.
- 메시지 리스트에서는 각 메시지에 `페이지` 또는 `카드` 배지를 표시한다.
- AI 호출 시에는 통합 history와 현재 page/card 상태 스냅샷을 함께 전달하고, 어떤 맥락을 실제로 참조할지는 AI가 직접 판단하게 둔다.

제외 범위:

- page AI와 card AI를 하나의 서버 계약으로 완전히 통합하는 작업
- 저장 payload 구조 변경
- 공개 storefront 렌더링 구조 변경
- 다중 target 동시 적용
- message history 영속 저장

## User Experience

### Step Flow

최종 흐름은 다음과 같다.

1. 사용자가 상품 카테고리를 선택한다.
2. 사용자가 카드에 노출할 데이터를 선택하고 확정한다.
3. 사용자가 통합 디자인 step으로 진입한다.

이 순서는 카드 AI가 이미 `committed data selection`을 필요로 하는 현재 구조와 맞는다. 이 설계는 기존 카드 AI 로직을 억지로 우회하지 않고 그대로 재사용하는 쪽을 우선한다.

### Unified Design Panel

통합 디자인 step은 하나의 채팅 패널만 가진다.

- 상단에서 현재 `target`을 `페이지` 또는 `카드`로 선택한다.
- `target` 아래에는 해당 target에 맞는 세부 `scope chip`만 표시한다.
- 입력창은 하나만 존재한다.
- 사용자가 `페이지`용 문장을 쓰다가 `카드` target으로 바꾸더라도 입력 draft는 유지된다.
- 처음 진입 시 기본 target은 `페이지`다.
- 사용자가 한 번 target을 바꾼 뒤에는 이 step 안에서 마지막으로 보던 target을 유지한다.
- 같은 카테고리 안에서 이전 step으로 갔다가 다시 돌아오는 경우에는 마지막 target, 입력 draft, 통합 history를 유지한다.
- 다른 상품 카테고리로 바꾸는 경우에는 통합 디자인 세션을 새로 시작한다. 이때 target은 다시 `페이지`로 초기화하고, 입력 draft와 통합 history도 비운다.

### History Presentation

채팅 메시지는 하나의 리스트로 통합 표시한다.

- page/card 요청과 응답을 한 timeline에서 모두 보여준다.
- 각 user/assistant 메시지에는 해당 turn의 `target` 배지를 표시한다.
- 필요하면 기존 `scope` 정보도 함께 노출할 수 있지만, 사용자 입장에서 더 중요한 1차 구분은 `페이지`와 `카드`다.

이 방식은 추후 "앞에서 만든 배경/분위기를 기준으로 카드 수정" 같은 요청이 들어왔을 때, 사용자가 맥락이 이어지고 있다고 느끼게 해 준다.

## Product Rules

- 사용자는 항상 현재 수정 대상 `target`을 명시적으로 선택한다.
- 한 번의 AI 적용은 선택된 `target` 하나에만 반영된다.
- AI는 통합 history와 현재 page/card 상태를 함께 전달받는다.
- 다만 실제로 어떤 맥락을 사용해 응답을 만들지는 AI가 판단한다.
- page 요청은 page state만 변경한다.
- card 요청은 기존처럼 card state만 변경한다.
- card 요청은 현재와 동일하게 `dataSelection.committed`를 기준으로 동작한다.
- 저장 시 page/card 최종 state만 저장하며, 통합 채팅 history는 저장하지 않는다.
- 카테고리 변경은 통합 디자인 세션의 경계로 간주한다.

## Step Composition

`StorefrontBuilderPage`는 step 배열을 아래처럼 재구성한다.

- `ProductCategoryStep`
- `DataSelectionStep`
- `UnifiedDesignStep`

기존 `PageDesignStep`과 `CardDesignStep`는 제거하거나, 통합 step 내부 구현으로 흡수한다.

`StorefrontBuilderPage`의 다음 동작도 함께 바뀐다.

- category 선택 후 `다음`을 누르면 바로 `DataSelectionStep`으로 이동
- data selection 미확정 상태에서는 기존처럼 `확인하고 다음 단계로`
- data selection 확정 시 `UnifiedDesignStep`으로 이동
- 마지막 step은 이제 통합 디자인 step 하나이므로 기존 `currentStep === 3` 기준 로직은 새 step 수에 맞게 조정

## State Model

기존처럼 page와 card의 실제 디자인 결과 state는 분리 유지한다.

- page style state는 `usePageAiDesign`가 계속 소유
- card style state는 `useCardAiDesign`가 계속 소유

대신 통합 디자인 UI 상태를 위한 새 상태가 필요하다.

- `selectedDesignTarget`: `'page' | 'card'`
- `unifiedPromptDraft`: 현재 입력창 값
- `unifiedMessages`: page/card 공통 timeline

이때 `history/state는 유지`라는 요구를 반영해, 메시지 timeline은 분리 표시가 아니라 진짜 통합 목록으로 다룬다.

권장 메시지 구조:

```js
{
  id,
  role: 'user' | 'assistant',
  target: 'page' | 'card',
  scope: string,
  text: string,
  suggestion?: string,
  warningMessage?: string,
  ts: number,
}
```

## AI Execution Model

실행 경로는 기존 page/card AI 훅을 최대한 유지한다.

1. 사용자가 현재 `target`을 고른다.
2. 사용자가 단일 입력창에 요청을 입력한다.
3. 통합 panel은 현재 draft, selected target, selected scope를 기준으로 `apply`를 호출한다.
4. 실제 apply 함수는 선택된 target에 따라 기존 page 또는 card AI 실행 경로로 라우팅한다.
5. 라우팅된 실행은 기존처럼 각자 자기 결과 state만 갱신한다.
6. 통합 message store에는 user/assistant turn을 모두 기록한다.

즉, "UI와 history는 통합, 실제 스타일 결과 반영은 target별 분리"가 핵심 경계다.

## AI Context Strategy

AI에 전달하는 맥락은 두 레이어로 나눈다.

### Required Explicit Inputs

- 현재 선택된 `target`
- 현재 선택된 `scope`
- 현재 입력 prompt

### Shared Context Inputs

- 최근 통합 history
- 현재 page style 상태
- 현재 card style 상태
- card 요청인 경우 committed visible fields
- 선택된 상품 카테고리명

이 shared context는 page/card 모두에 전달될 수 있다. 단, 이 정보를 실제로 얼마나 사용할지는 AI가 직접 판단한다.

중요한 점은 다음 두 가지를 동시에 만족하는 것이다.

- 사용자는 "지금 page를 바꾸는지 card를 바꾸는지"를 명확히 제어한다.
- AI는 "앞선 page 변경이 지금 card 요청에 도움이 되는지"를 스스로 판단할 수 있다.

## Component Plan

권장 방향은 새 통합 편집 컴포넌트를 도입하고, 기존 chat presentation 조각은 재사용하는 것이다.

새 컴포넌트:

- `UnifiedDesignStep.jsx`
- `UnifiedDesignEditor.jsx`
- 필요 시 `DesignTargetSelector.jsx`

재사용 후보:

- `AiChatPanel.jsx`
- `ScopeSelectorStrip.jsx`
- `ChatMessageBubble.jsx`

수정 포인트:

- `AiChatPanel`은 현재 `scope` 중심으로만 구성되어 있으므로, `target` 배지 또는 메시지 메타 확장을 수용하도록 조정
- `ChatMessageBubble`은 `scope` 외에 `target` 표시를 지원해야 함
- 기존 `PageStylePromptField`와 `CardStylePromptField`는 그대로 둘 수도 있지만, 단일 입력창 요구를 반영하려면 통합 prompt field로 대체하는 편이 더 자연스럽다
- `CardDesignStep`에 있던 `saveDraft`, `QR export`, undo 진입점은 통합 디자인 step으로 이동
- `cardsPerRow` 제어는 card target일 때만 보여준다

## Hook / State Ownership Plan

추천 구현은 기존 `usePageAiDesign`, `useCardAiDesign`를 완전히 합치지 않고, builder 레벨에 통합 orchestration 상태를 하나 추가하는 방식이다.

예시:

- `usePageAiDesign`: page style 계산과 page-specific apply 유지
- `useCardAiDesign`: card style 계산과 card-specific apply 유지
- `useStorefrontBuilder`: unified target, unified prompt, unified message history, unified apply 라우팅 담당

이 접근의 장점은 다음과 같다.

- 기존 card AI 로직을 거의 그대로 재사용 가능
- page/card 결과 state를 억지로 합치지 않아 회귀 위험이 낮음
- 통합 UX 요구는 builder orchestration 레벨에서 해결 가능

## Testing

반드시 필요한 검증은 다음과 같다.

- step 순서가 `category -> data selection -> unified design`으로 바뀌는지
- data selection이 확정되기 전에는 unified design step으로 넘어가지 않는지
- 통합 디자인 step이 기본 target을 `페이지`로 여는지
- target 변경 후 다시 진입했을 때 마지막 target을 유지하는지
- 입력 draft가 target 전환 후에도 유지되는지
- page target 적용 시 page state만 바뀌고 card state는 유지되는지
- card target 적용 시 card state만 바뀌고 page state는 유지되는지
- 통합 message history가 page/card turn을 한 리스트에 순서대로 유지하는지
- 각 메시지에 `페이지` 또는 `카드` 배지가 표시되는지
- card target에서만 `cardsPerRow`와 undo UI가 보이는지
- save/QR export 액션이 통합 디자인 step에서 계속 동작하는지
- 저장 payload가 기존 page/card 저장 규칙을 깨지 않는지

## Risks

- 통합 history를 도입하면 기존 `pageAiMessages`, `cardAiMessages` 기반 테스트와 UI 가정이 깨질 수 있다.
- 입력창을 하나로 합치면 기존 page/card 전용 prompt label과 test id가 바뀐다.
- AI에 shared context를 함께 넘기기 시작하면, 설명 문구나 제안 문구가 더 길어질 수 있다.

## Decisions Left Intentionally Simple

- AI가 shared context 중 무엇을 실제로 참고할지는 강하게 강제하지 않는다.
- page/card 서버 계약을 한 번에 합치지 않는다.
- history 영속 저장은 이번 범위에 넣지 않는다.
- multi-target apply는 허용하지 않는다.

## Out of Scope

- Public storefront feature split 후속 작업
- page/card AI gateway 통합
- 대화 이력 저장/복원
- AI 제안 클릭 즉시 적용 같은 고급 상호작용
- builder 외 route 구조 변경
