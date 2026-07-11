# Storefront Chat-Orchestrator Builder PRD

## Problem Statement

현재 storefront builder는 사용자가 체감하기에 대화형 편집기라기보다 `단계형 wizard`에 가깝다. 사용자는 저장된 office product data를 고르고, `data-selection`을 조정하고, page/card 디자인을 바꾸는 동안 같은 작업을 이어서 한다고 느끼고 싶지만 실제 화면은 `다음 / 이전`과 분리된 step UI를 반복해서 보여준다. 특히 다음 문제가 크다.

- 같은 storefront 수정 세션이 한 화면의 누적 대화처럼 이어지지 않는다.
- `2. 카테고리별 데이터 수정`은 사용자가 기대하는 “같은 화면에서 계속 보는 조정”이 아니라 별도 단계 이동처럼 보인다.
- page/card AI 수정이 이루어져도 사용자는 “어떤 mode에서 무엇이 바뀌었는지”를 thread 안에서 자연스럽게 따라가기 어렵다.
- 저장 후에도 다시 메인 작업 선택으로 돌아가는 상담형 흐름이 아니라, wizard state를 수동으로 다시 탐색해야 한다.

농협 사무소 직원 입장에서는 storefront builder가 office product data를 기준으로 연속 편집되는 상담형 도구처럼 보여야 한다. 지금 구조는 저장 경계와 데이터 경계는 안전하지만, 사용자 경험은 그에 비해 지나치게 단계 분리형이다.

## Solution

storefront builder를 `chat-orchestrated workspace`로 재구성한다. 좌측은 누적 chat thread, 우측은 고정 preview, 하단은 mode에 따라 바뀌는 입력창 또는 field selection dock로 구성한다. 사용자는 assistant bubble 안에서 `1. 페이지 전반 디자인 수정`, `2. 카테고리별 데이터 수정`, `3. 카테고리별 상세 디자인 수정`, `4. 통합 디자인 질문` 중 하나를 선택해 작업을 계속한다.

핵심은 presentation만 바꾸고 persistence는 유지하는 것이다.

- `1번`과 `3번`은 자유 입력 기반 AI 편집으로 바꾼다.
- `2번`은 현재 `data-selection`을 한 화면의 sticky category tab + 하단 dock table로 재구성한다.
- `4번`은 현재 적용된 data/design state를 읽고 답변만 하는 advisory mode로 둔다.
- 저장은 여전히 명시적 `적용` 시점에만 발생한다.
- 저장 후에는 assistant가 다시 `1/2/3/4` 선택 bubble을 보여준다.
- 마지막 성공 저장 1회에 대해 assistant bubble 안 `되돌리기`를 제공한다.

## User Stories

1. As an office user, I want the storefront builder to feel like one ongoing conversation, so that I can keep refining one storefront session without mentally switching screens.
2. As an office user, I want the assistant to ask which kind of storefront change I want to make, so that I can start from a clear office-facing action.
3. As an office user, I want mode selection to happen inside the chat thread, so that the workflow still feels conversational instead of app-navigation heavy.
4. As an office user, I want the mobile storefront preview to stay visible while I chat, so that I always understand the customer-facing result.
5. As an office user, I want page-wide design editing in its own mode, so that I can ask for broader visual changes without touching category card details.
6. As an office user, I want category-level data adjustment in its own mode, so that I can change which product facts appear on cards without editing row values.
7. As an office user, I want category-level detailed design editing in its own mode, so that I can style one category’s cards without confusing it with page-wide styling.
8. As an office user, I want an advisory-only mode, so that I can ask “what is currently applied?” without accidentally changing the storefront.
9. As an office user, I want page and card AI prompts to support free-form text, so that I can describe changes naturally.
10. As an office user, I want preview changes to appear immediately after an AI response, so that I can see the effect before I save.
11. As an office user, I want the AI to explain what it changed, so that I can judge whether the draft matches my intent.
12. As an office user, I want the AI’s target chips to be optional rather than mandatory, so that I can type naturally first and narrow the scope only when needed.
13. As an office user, I want `2. 카테고리별 데이터 수정` to stay anchored to the current `data-selection` behavior, so that field visibility remains predictable.
14. As an office user, I want registered categories to stay visible as sticky tabs in modes 2 and 3, so that I can move across saved office product data categories without leaving the screen.
15. As an office user, I want clicking another category to refresh only the relevant table or design context, so that the whole workspace does not feel like it reloaded.
16. As an office user, I want the lower dock in mode 2 to show field selection controls, so that I can focus on visible fields rather than raw product rows.
17. As an office user, I want field toggles to update preview immediately, so that I can compare visible field choices live.
18. As an office user, I do not want every field toggle to create a chat message, so that the thread stays readable.
19. As an office user, I want applying mode 2 changes to leave one summary message, so that I can still understand what changed at a glance.
20. As an office user, I want applying page-wide design changes to save immediately, so that the result becomes the new storefront baseline without another hidden save step.
21. As an office user, I want applying category-detail design changes to save immediately, so that the right-side preview and the stored storefront stay aligned.
22. As an office user, I want the workflow to return to the main `1/2/3/4` assistant question after each successful apply, so that I can continue refining from a stable home point.
23. As an office user, I want a `되돌리기` action right in the assistant result bubble, so that I can recover from the latest applied change without searching elsewhere.
24. As an office user, I want undo to restore the last successfully applied storefront state, so that one mistaken apply does not force manual reconstruction.
25. As an office user, I want unfinished draft edits in page/card modes to disappear when I leave the mode, so that I never mistake an abandoned draft for saved state.
26. As an office user, I want advisory mode to answer using the current storefront state, so that I can ask for guidance without new setup steps.
27. As an office user, I do not want advisory answers to apply design changes automatically, so that consulting the AI stays safe.
28. As an office user, I want the builder to keep using my saved office product data and storefront config, so that this UX refactor does not break my existing office work.
29. As an office user, I want `2. 카테고리별 데이터 수정` to keep its current label, so that the visible feature list matches the wording I already use.
30. As an office user, I want the builder to continue treating `2번` as visible-field configuration rather than row-value editing, so that saving remains consistent with the current storefront contract.
31. As a maintainer, I want the persistence boundary to stay on the existing storefront save payload, so that this feature remains a UX/orchestration change rather than a schema project.
32. As a maintainer, I want `visibleFields`, `pageStyle`, `cardStyle`, `hiddenProducts`, and category configs to remain the source of truth, so that the public storefront keeps rendering the same saved data model.
33. As a maintainer, I want the new conversation state machine to sit above the current builder logic, so that existing page/card/data seams remain reusable.
34. As a maintainer, I want a dedicated orchestration seam for chat mode and apply/undo sequencing, so that behavior can be tested without relying on brittle DOM-only assertions.
35. As a maintainer, I want preview behavior to continue through existing `PublicStorefrontScreen` seams, so that I can catch regressions at the same rendering boundary as before.
36. As a maintainer, I want the builder page integration tests to remain the highest-value regression seam, so that workflow regressions surface quickly.
37. As a maintainer, I want the refactor to respect office-facing language such as `storefront`, `office product data`, and `product_data_category_name`, so that documentation and code continue to match the domain.
38. As a future agent, I want the approved mode rules, undo rule, and draft-discard rule captured in one PRD, so that implementation does not have to reopen earlier UX decisions.

## Implementation Decisions

- The visible workflow is reorganized into a chat-orchestrated workspace with four explicit user-facing modes: page-wide design, category data adjustment, category detailed design, and advisory Q&A.
- The repository keeps the current storefront persistence model. No new durable conversation schema is introduced.
- `2. 카테고리별 데이터 수정` keeps its current label even though its technical behavior remains the current `data-selection` contract.
- `2번` continues to edit visible field configuration for storefront cards rather than raw office product row values.
- Existing builder state for office product data hydration, storefront config compilation, page style, card style, and preview shaping remains the preferred implementation seam.
- A new orchestration seam is added above the current builder logic to own:
  - chat mode selection
  - thread message sequencing
  - sticky category tab state for modes 2 and 3
  - latest successful apply snapshot
  - assistant bubble actions after save and undo
- Page-wide and category-detail design modes allow free-form prompting. Target chips remain optional and constrain the change only when the user chooses them.
- Advisory mode consumes the current storefront state and answers in text only. It does not apply new page/card patches and does not write data.
- Page-wide and category-detail AI responses immediately patch draft preview state before save, and each response includes a human-readable explanation of the applied draft changes.
- Mode 2 uses immediate preview updates for field toggles, but the chat thread records only the apply summary, not each toggle event.
- Saving remains an explicit `적용` action and writes the existing storefront config shape immediately.
- Undo is intentionally limited to the last successful apply only. A newer apply replaces the prior undo checkpoint.
- Leaving a page/card draft mode without applying discards the draft silently rather than prompting the user with a confirmation dialog.
- After any successful apply, the UI returns to the main assistant choice prompt instead of staying inside the same mode.
- The right-side preview stays mounted across all modes and continues to read the existing preview configuration seam.
- The lower dock is mode-sensitive:
  - visible in mode 2 for field selection
  - absent in modes 1 and 3 where chat and preview are the primary focus
- The implementation should favor specialized workspace bubbles and a chat session orchestrator over trying to stretch the existing wizard panel abstractions to fit all new rules.

## Testing Decisions

- Good tests should verify external office-facing behavior and persistence boundaries, not internal implementation details such as local state variable names or component nesting.
- The highest-value integration seam is still the builder page workflow because the risk is primarily in orchestration, sequencing, and save/undo behavior.
- A new orchestration-level seam should be tested directly to cover:
  - mode transitions
  - latest-apply snapshot overwrite
  - draft discard on mode exit
  - post-save return to main assistant choice
- Existing storefront payload normalization remains a critical seam because the feature must not change saved data shape.
- Public preview rendering remains a critical seam because immediate draft feedback is central to the new UX.
- Prior art for new tests should come from:
  - the current storefront builder page flow tests
  - current storefront config orchestration tests
  - existing AI chat panel tests where message rendering or action buttons are similar
  - current public storefront rendering tests
- A good test in this feature area should:
  - observe one user-visible behavior at a time
  - assert saved payload or rendered storefront behavior rather than internal helper state
  - avoid coupling to incidental chat markup where a semantic assertion is possible
  - treat undo as a persisted-behavior contract, not just a local state toggle

## Out of Scope

- Editing raw office product row values in mode 2
- Renaming `2. 카테고리별 데이터 수정`
- Persisting chat transcript history
- Adding multi-level undo or time-travel history
- Adding confirmation dialogs before discarding page/card drafts
- Automatically applying advisory mode suggestions
- Consolidating page/card AI backends into one new backend contract
- Public storefront redesign outside the builder workflow
- Supabase schema or migration changes for this feature
- New dashboard navigation concepts outside the storefront builder workspace

## Further Notes

- The accepted implementation seams for this work are:
  - builder page workflow integration
  - chat-session orchestration
  - existing storefront save payload normalization
  - existing public preview rendering
- This PRD updates and supersedes older single-chat storefront notes where they conflict with the newly approved rules for:
  - mode selection inside assistant bubbles only
  - sticky category tabs in modes 2 and 3 only
  - mode-2 lower dock visibility only
  - apply-immediately persistence
  - single-level undo inside the assistant result bubble
  - silent discard of un-applied page/card drafts on mode exit
