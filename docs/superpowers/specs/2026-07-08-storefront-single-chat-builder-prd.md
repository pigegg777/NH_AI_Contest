# Storefront Single-Chat Builder PRD

## Problem Statement

현재 storefront builder는 `ProductCategoryStep -> DataSelectionStep -> UnifiedDesignStep` 순서로 동작하지만, 사용자가 체감하는 편집 경험은 여전히 "분리된 step wizard"에 가깝다.

이미 page/card 디자인은 하나의 AI 대화 흐름으로 통합되었지만, 그 앞단의 데이터 선택 흐름은 아직 다음과 같은 마찰을 남긴다.

- 첫 진입이 `시작하기` hero gate로 막혀 있어 바로 편집으로 들어가지 못한다.
- `수정할 데이터 선택`, `카드에 노출할 필드 선택`, `디자인 수정`이 각각 별도의 step 화면처럼 느껴진다.
- 사용자는 한 화면 안에서 자연스럽게 이어지는 대화형 작업보다, footer의 `이전` / `다음` 버튼을 따라가는 wizard를 경험한다.
- 1번과 2번 단계가 끝난 뒤에도 앞선 선택을 "요약된 문맥"으로 보기보다, 단계 자체를 다시 떠올려야 한다.
- 저장 후에는 다시 1번으로 돌아가고 싶지만, 현재는 저장 성공 상태만 바뀌고 대화 흐름이 초기화되지 않는다.

사용자가 원하는 workflow는 더 단순하고 더 office-facing 하다.

1. 등록된 office product data 중에서 `수정할 데이터`를 먼저 고른다.
2. 그 데이터에서 `카드에 노출할 필드/열`을 고른다.
3. 같은 채팅 화면 안에서 `디자인 수정`을 이어간다.
4. 저장하면 다시 1번 데이터 선택으로 돌아가되, 방금 저장한 데이터는 계속 선택된 상태로 남긴다.

이 변경의 핵심 문제는 단순한 스타일 변경이 아니다. 기존 state contract와 save payload를 깨지 않으면서, 분리된 step UI를 "하나의 채팅형 편집 surface"로 재구성해야 한다는 점이다.

## Solution

storefront builder를 `single-chat workspace`로 재구성한다.

오른쪽의 모바일 preview는 그대로 유지하고, 왼쪽 편집 영역만 하나의 대화 흐름처럼 보이게 바꾼다.

### New flow

1. Builder loads and opens directly into one chat-style workspace.
2. 첫 assistant prompt는 `수정할 데이터를 선택해주세요`이다.
3. 등록된 office product data 목록을 카드로 보여주고, 사용자가 하나를 선택하면 자동으로 2번 질문으로 진행한다.
4. 2번에서는 `카드에 노출할 필드/열 선택` UI를 인라인 체크 패널로 보여준다.
5. 사용자가 체크를 바꾸는 동안 preview는 즉시 바뀌지만, 실제 디자인 contract는 `이 필드로 진행`을 누를 때만 확정된다.
6. 필드를 확정하면 1번/2번 선택 UI는 접히고, 대신 `선택 데이터 요약 카드`와 `노출 필드 요약 카드`만 남는다.
7. 3번 디자인 수정은 같은 채팅 화면 안에서 이어진다.
8. 디자인 단계에서는 `페이지 | 카드` 전환 칩을 입력창 위에 고정한다. 기존처럼 탭을 나누지 않는다.
9. 메시지마다 `페이지` 또는 `카드` 배지를 보여주어 어떤 target에 적용된 요청인지 명확히 한다.
10. 하단에는 단계별 액션을 보여주는 고정 action row를 둔다.
11. 저장하면 다시 1번 데이터 선택 질문으로 돌아가되:
    - 방금 저장한 데이터는 선택된 상태로 유지
    - 저장된 field selection과 디자인 결과도 유지
    - free-form AI 대화내역만 초기화

### Back and revisit rules

- 2번 단계에는 `이전` / `이 필드로 진행` 버튼이 있다.
- 3번 단계에는 `이전` / `저장` 버튼이 있다.
- 2번에서 `이전`을 누르면 1번 데이터 선택 UI가 다시 열린다.
- 3번에서 `이전`을 누르면 2번 필드 선택 UI가 다시 열린다.
- 3번에서 2번으로 돌아갔다가 필드를 바꾸지 않고 다시 확정하면, 기존 디자인 상태를 그대로 유지한다.
- 2번에서 필드를 실제로 바꾸고 다시 확정하면, `카드 디자인 결과`와 `통합 디자인 대화내역`만 초기화한다.
- 같은 경우에도 page-level style state는 유지한다.
- 1번/2번이 접힌 뒤에는 각 요약 카드에 `다시 선택` 버튼을 두어 해당 단계로 직접 점프할 수 있게 한다.
- 3번 도중 다른 데이터를 선택하면 field selection, card design state, unified design chat history를 모두 버리고 새 데이터 기준으로 다시 시작한다.

### Persistence boundary

이 PRD는 "화면을 채팅처럼 보이게" 만들지만, persistence boundary는 기존과 동일하게 유지한다.

- 저장은 final design stage에서만 가능하다.
- 저장 payload는 기존처럼 final page/card state만 저장한다.
- AI prompt text나 free-form chat history는 저장하지 않는다.
- data selection의 canonical source of truth는 계속 `visibleFields`이다.
- AI는 page/card design만 바꿀 수 있고, visible field selection은 바꿀 수 없다.

## User Stories

1. As an office user, I want the storefront builder to open directly into one chat-style workspace, so that I can start editing immediately without a separate start gate.
2. As an office user, I want the first prompt to ask which registered data I want to edit, so that the workflow begins from the business object I already recognize.
3. As an office user, I want the registered data list to show category name, row count, source file name, updated time, and draft status, so that I can confidently choose the right office product data set.
4. As an office user, I want choosing a data set to automatically move me into field selection, so that the flow feels conversational instead of wizard-like.
5. As an office user, I want field selection to stay structured as checkboxes rather than natural-language guessing, so that product facts remain reliable.
6. As an office user, I want field toggles to update the preview immediately, so that I can see the effect of each visible field before confirming.
7. As an office user, I want a dedicated `이 필드로 진행` action, so that I explicitly confirm the data contract before design begins.
8. As an office user, I want an `이전` button in the field-selection stage, so that I can go back to registered data choice without losing my place.
9. As an office user, I want the selected data UI to collapse into a summary card after I move forward, so that the conversation stays compact.
10. As an office user, I want the selected field UI to collapse into a summary card after I confirm it, so that I can focus on design instead of repeated form controls.
11. As an office user, I want a `다시 선택` action on the selected data summary card, so that I can intentionally restart from a different office product data set.
12. As an office user, I want a `다시 선택` action on the selected fields summary card, so that I can revisit visible fields without hunting for hidden controls.
13. As an office user, I want the design stage to live in the same chat screen as the earlier choices, so that the whole storefront edit feels like one conversation.
14. As an office user, I want `페이지 | 카드` target controls to stay fixed above the input area, so that I always know what I am editing.
15. As an office user, I do not want page and card editing split into separate tabs, so that the screen still feels like one workspace.
16. As an office user, I want each design-stage message to show whether it applied to page or card, so that shared chat history does not become ambiguous.
17. As an office user, I want the AI to change only the currently selected target, so that page requests do not unexpectedly alter cards and card requests do not unexpectedly alter the page.
18. As an office user, I want the AI to stay out of visible field selection, so that design prompts cannot silently change product facts.
19. As an office user, I want an `이전` button in the design stage, so that I can revisit fields without leaving the conversation surface.
20. As an office user, I want going back and forward without changing fields to preserve my existing design result, so that review does not destroy work.
21. As an office user, I want changing fields and reconfirming them to reset only card design output and design chat history, so that I can re-style cards against the new data contract without losing page-level work.
22. As an office user, I want save to stay available only in the final design stage, so that unfinished draft selections are not treated as done.
23. As an office user, I want saving to return me to the first data-selection question, so that I can continue the workflow in the same chat surface.
24. As an office user, I want the data I just saved to remain selected after save, so that repeated refinement of the same office product data set is fast.
25. As an office user, I want saved field selection and saved design state to remain loaded after save, so that I continue from the latest committed storefront result.
26. As an office user, I want prior free-form design chat messages to be cleared after save, so that the next edit session starts with a clean conversation.
27. As an office user, I want choosing a different registered data set to restart the later stages, so that design work never hangs onto the wrong office product data context.
28. As an office user, I want the mobile storefront preview to remain visible while I move through all three stages, so that I always understand the customer-facing result.
29. As a maintainer, I want the builder to keep reusing `visibleFields`, existing preview shaping, and existing save payload seams, so that this UX refactor does not require a new persistence model.
30. As a maintainer, I want the conversation-like rendering of stages 1 and 2 to be derived UI rather than persisted AI transcript, so that save behavior stays narrow and predictable.
31. As a maintainer, I want the current builder orchestration hook to remain the main state seam, so that the feature can be tested at the highest useful level instead of through scattered local state.
32. As a maintainer, I want the new flow to extend existing storefront builder tests rather than replace them with lower-value implementation-detail tests, so that regressions remain easy to catch.
33. As a maintainer, I want the existing office product data entry fetch seam to remain in place for this slice, so that the UI refactor does not widen scope into data-loading optimization work.
34. As an AFK agent, I want the single-chat builder rules captured in one PRD, so that implementation can proceed without reopening each UX decision.

## Implementation Decisions

- The user-visible workflow becomes a single chat-like surface, but the underlying builder still keeps three ordered stages:
  - registered data selection
  - field selection confirmation
  - unified design editing
- The existing `useStorefrontBuilder` orchestration layer remains the main state boundary for this feature.
- The existing `useDataSelectionDraft` draft-versus-committed model remains the source of truth for whether visible field changes are merely previewed or actually confirmed.
- The existing `usePageAiDesign`, `useCardAiDesign`, and `useUnifiedDesignSession` seams remain the design-stage state model.
- This slice does not introduce a new persistence schema. `visibleFields` remains the canonical saved representation of card-visible data.
- This slice does not introduce a new AI contract. Page and card AI execution continue to run through separate existing design hooks and are only re-presented in one screen.
- The current office product data entry load remains the data seam for this feature. The builder continues to read its registered-data cards from the same loaded category entries instead of adding a catalog-only fetch layer in this slice.
- The standalone `시작하기` gate is removed or folded into an always-open conversation entry state.
- The generic wizard footer navigation is removed. Instead, each stage owns its own explicit actions:
  - field stage: `이전`, `이 필드로 진행`
  - design stage: `이전`, `저장`
- Stage 1 and stage 2 "assistant prompts" are presentation blocks, not persisted AI transcript.
- Stage 1 and stage 2 summaries are derived summary cards, not durable chat history records.
- The free-form design chat history remains scoped to the unified design session and is not written into the saved storefront config.
- Selecting a registered data set automatically advances into the field-selection stage.
- Field toggles continue to update preview immediately through draft selection.
- Only the field-confirm action promotes draft field selection into committed field selection.
- Returning from design to field selection without changing fields must preserve card design state and unified design history.
- Reconfirming changed fields must reset:
  - card design result
  - unified design free-form history
  - current design target back to its default if the unified session reset path does so
- Reconfirming changed fields must not reset page-level style state.
- Choosing a different registered data set must reset:
  - field selection context for the new data set
  - card design result
  - unified design free-form history
- Choosing the same registered data set again must not count as a category-change reset.
- The design-stage target selector remains explicit and fixed near the input area. It is not replaced by inferred AI routing.
- Page/card target switching remains direct user intent rather than model-side guessing.
- Message rendering in the design stage continues to show target badges so the shared message list remains intelligible.
- Save remains the final action of the design stage and continues to persist only the compiled storefront result.
- After save, the conversation returns to the first question in UI terms, but:
  - the selected office product data set remains selected
  - the saved field selection remains loaded
  - the saved page/card design state remains loaded
  - the design-stage free-form conversation history is cleared
- Existing preview shaping and save payload normalization remain the preferred regression seams. The feature should avoid introducing a lower-level orchestration layer unless the current seam proves insufficient.

## Testing Decisions

- Good tests should verify external office-facing behavior, reset boundaries, and saved payload invariants rather than local implementation details such as internal component nesting or variable names.
- The highest-value regression seam remains the storefront builder page flow.
- The builder page tests should verify:
  - no standalone start gate after loading
  - direct entry into the chat-style workspace
  - registered data cards render from existing office product data entries
  - selecting a data set auto-advances into field selection
  - field-selection preview reacts immediately to draft toggles
  - field confirmation is explicit
  - previous navigation returns to the earlier stage
  - summary cards collapse and reopen correctly
  - unified design remains one screen with fixed target chips rather than tab-separated editors
  - save returns to the first question while keeping the selected data loaded
- Builder orchestration tests should verify:
  - same-data revisit does not trigger a reset
  - different-data revisit does trigger a full downstream reset
  - back-and-forward without field edits preserves design state
  - reconfirming changed fields resets card design and unified free-form history but keeps page style
- Unified design chat tests should verify:
  - messages keep target badges
  - target changes apply only to the selected page/card seam
  - target controls stay visible in one unified editing area
- Preview-oriented tests should verify:
  - draft visible fields still change the live preview before confirmation
  - committed visible fields remain the fields that final card-design/save logic uses
- Persistence tests should verify:
  - save payload still uses the existing storefront config shape
  - save payload contains the committed field selection only
  - save payload does not contain AI prompt strings or chat transcript state
- Prior art for the new coverage should be taken from:
  - `StorefrontBuilderPage` flow tests
  - existing builder preview seam tests
  - existing page/card AI behavior tests
  - save payload normalization tests

## Out of Scope

- Natural-language parsing of which registered data set to open
- Natural-language parsing of which visible fields to select
- Replacing explicit field checkboxes with AI-only interpretation
- Persisting stage 1 or stage 2 conversational scaffolding as stored transcript
- Persisting unified design chat history in the storefront config
- Introducing a new backend schema for conversation state
- Reworking the saved storefront payload shape
- Replacing the current office product data entry fetch with a separate catalog/detail loading split
- Redesigning the right-side mobile preview into a new visualization concept
- Reworking the public storefront browsing model
- Letting AI alter visible field selection
- Turning page/card target switching into implicit model-side auto-routing

## Further Notes

- This PRD builds on the current storefront builder direction rather than replacing it. The existing `data first, design second` contract remains valid; only the presentation surface changes from visible steps into one conversational workspace.
- This PRD partially supersedes the user-facing assumptions of the earlier unified design step work by removing the visible multi-step framing around it while keeping the same save and AI boundaries underneath.
- The assumed implementation/test seams for this work are:
  - storefront builder page flow
  - builder orchestration hook
  - unified design session history
  - save payload normalization
  - persistent mobile preview
- This PRD intentionally keeps scope narrow. It does not try to solve data-loading performance, public storefront redesign, or AI contract consolidation in the same slice.
