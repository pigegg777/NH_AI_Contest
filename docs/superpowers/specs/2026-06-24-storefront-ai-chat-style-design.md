# Storefront AI Design — Chatbot-Style UI (Page Design / Card Design)

## Background

`PageDesignStep`과 `CardDesignStep`(둘 다 `react-app/src/features/storefront/...`)은 현재 "프롬프트 textarea + 수정 범위 라디오 + 적용 버튼" 형태의 one-shot UI다. 사용자가 요청을 입력하면 AI가 스타일을 한 번 patch하고, 결과는 즉시 미리보기에 반영될 뿐 별도의 설명이나 변경 요약은 없다(자동 contrast-fix 경고만 예외). 대화 맥락도 없어서, 후속 수정 요청("좀 더 크게")은 매번 전체 의도를 새로 입력해야 한다.

이 스펙은 두 단계 모두를 Claude Desktop과 유사한 챗봇 스타일 UI로 전환하는 설계를 다룬다:
1. 사용자가 자연어로 요구사항 입력
2. AI가 디자인을 적용하고, 무엇을 어떻게 바꿨는지 자연어로 설명
3. (추가) 같은 범위 내 다른 섹션에 어울리는 디자인을 짧게 제안 (텍스트만, 원클릭 적용 없음)

## Scope

Page Design과 Card Design 두 스텝을 동시에 같은 패턴으로 전환한다. 두 도메인은 이미 모델/서비스/훅이 1:1로 미러링된 구조이므로 한 번에 같은 패턴을 적용하는 것이 일관성 있다.

세션 한정 기능이다 — 대화 히스토리는 DB에 저장하지 않고, 페이지 새로고침/스텝 이탈 시 사라진다 (오늘의 동작과 동일). Undo는 기존과 동일하게 단일 레벨만 지원한다(직전 1턴만 되돌리기, 멀티스텝 점프 없음).

## Approach

공유 프레젠테이션 컴포넌트(`AiChatPanel`)를 만들어 Page/Card 양쪽에서 재사용하고, 도메인별 기존 훅(`usePageAiDesign`/`useCardAiDesign`)과 게이트웨이/컨트랙트(`pageStyleAiGateway`/`cardStyleAiGateway`, `pageStyleAiContract`/`cardStyleAiContract`)를 확장한다. 백엔드는 계속 stateless로 유지하고, 클라이언트가 최근 N턴의 대화 히스토리를 매 요청에 함께 보내 멀티턴 맥락을 흉내낸다 (OpenAI `previous_response_id` 같은 서버측 스레딩은 쓰지 않음 — 페이로드 방식이 더 단순하고 디버깅하기 쉬움, 현재 stateless 백엔드 아키텍처와 일치).

대안으로 검토했으나 채택하지 않은 것:
- **서버측 스레딩(`previous_response_id`)**: payload는 작아지지만 response_id를 어딘가 들고 있어야 해서 결국 클라가 다시 보내야 하는 복잡도가 비슷하고, strict json_schema 모드와 얽히면 디버깅이 어려워짐.
- **Page/Card 완전 별도 챗 UI**: 공유 컴포넌트 없이 각자 구현. 현재도 두 도메인이 1:1 미러링된 구조라 중복만 늘어남.

## Architecture

```
PageDesignStep / CardDesignStep
  └─ PageDesignEditor / CardDesignEditor
       └─ AiChatPanel (신규 공유 컴포넌트, presentational)
            ├─ ScopeSelectorStrip (기존 라디오 → 칩 형태)
            ├─ MessageList (ChatMessageBubble × N)
            └─ ChatInputBar (textarea + 전송 버튼)
```

흐름: 사용자 입력 → `sendMessage(text)`(훅) → 게이트웨이가 `{prompt, scope, history(최근 N턴), currentStyle, ...}` POST → 백엔드 function이 history를 포함해 OpenAI Responses API 멀티턴 input을 구성 → strict json schema 응답(`intent` + `explanation` + `suggestion`) → 훅이 style을 적용하고 `messages` 배열에 user/assistant 턴을 push.

상태(`messages[]`, `lastSnapshot` undo용)는 모두 훅 내부에 위치(`useCardAiDesign`/`usePageAiDesign`). 세션 한정, DB 저장 없음.

## Components

신규 (공유, `react-app/src/features/storefront/components/ai-chat/`):
- **`AiChatPanel.jsx`** — props: `messages, scopeOptions, selectedScope, onScopeChange, onSend, isLoading, onUndo, canUndo, warningMessage, errorMessage`. 순수 프레젠테이션, 도메인을 모름 (page/card 둘 다 같은 컴포넌트 재사용).
- **`ChatMessageBubble.jsx`** — `role`(user/assistant), `text`(설명), `suggestion`(있으면 bubble 하단에 보조 텍스트로 흐리게 표시), `scope` 태그(assistant bubble 우상단 작은 라벨).
- **`ScopeSelectorStrip.jsx`** — 기존 "수정 범위 선택" 라디오 리스트를 칩 형태로 변경, input 위에 고정.
- **`ChatInputBar.jsx`** — textarea + 전송 버튼. `Enter`=전송, `Shift+Enter`=줄바꿈.

수정:
- **`CardDesignEditor.jsx` / `PageDesignEditor.jsx`** — 기존 textarea+버튼 레이아웃을 `<AiChatPanel ... />`로 교체. 기존 undo 버튼은 `onUndo`/`canUndo` prop으로 패널에 흡수.

## Data Flow / State Shape

훅(`useCardAiDesign`/`usePageAiDesign`) 내부 신규 state:

```js
messages: [
  { id, role: 'user', text, scope, ts },
  { id, role: 'assistant', text /* explanation */, suggestion, scope, ts,
    snapshotBefore /* undo용 직전 style */ },
]
```

`sendMessage(promptText)` 동작:
1. `messages`에 user 턴을 push.
2. 최근 6턴(user/assistant 합쳐, 왕복 약 3회)만 추려 `{role, text}` 배열로 게이트웨이에 전달 — 토큰 비용을 제한하기 위함. 화면에는 전체 히스토리가 계속 남지만, 전송되는 건 최근 6턴만.
3. 게이트웨이 → 백엔드 → 응답 `{intent, explanation, suggestion}` 수신.
4. style에 `intent`를 적용하기 직전 상태를 `snapshotBefore`로 저장 (단일 undo만 지원하므로 직전 1개만 보관, 스택 아님).
5. assistant 턴을 push (`explanation`, `suggestion`, contrast-fix 경고가 있으면 `warningMessage`도 함께 표시).

Undo: `lastSnapshot` 복원, 복원 후에는 추가 undo 불가 (오늘과 동일한 single-level 동작).

## Backend / Schema Changes

`react-app/functions/api/storefront-ai/{card,page}-style.js`:
- 요청 바디에 `history: [{role, text}]` 추가 수신. `functions/lib/requestValidation.js`에 `assertHistoryWithinLimits` 추가해 검증: 최대 6턴, 항목당 최대 500자(기존 `assertPromptWithinLimit`의 1턴 제한과 동일 기준 재사용).

`{card,page}StyleAiContract.js`:
- `CARD_STYLE_AI_SCHEMA`/`PAGE_STYLE_AI_SCHEMA`에 기존 style 필드들과 같은 레벨로 sibling 필드 추가: `explanation`(string, required), `suggestion`(string, nullable).
- `buildXxxOpenAiRequestBody`가 `input` 배열에서 system 메시지 다음으로 history 턴들을 `{role: 'user'|'assistant', content: text}`로 순서대로 끼워넣고, 마지막에 현재 user 메시지를 추가.
- system prompt에 한국어로 "1~2문장 설명 + (있으면) 같은 scope 내 다른 섹션에 어울리는 제안 1문장, 없으면 null" 지시를 추가.
- `normalizeOpenAiXxxIntent`가 `explanation`/`suggestion`을 나머지 style 필드와 분리해, enum clamp 등 기존 정규화 로직은 style 필드에만 적용. 핸들러 최종 응답은 `{ intent, explanation, suggestion }`.

`currentCardStyle`/`currentPageStyle`은 변함없이 매 요청 전체 전송(history는 대화 맥락용일 뿐, 실제 스타일 상태의 source of truth는 항상 `currentStyle`).

## Error Handling

- 게이트웨이 네트워크/4xx 실패 → assistant 턴 대신 인라인 `errorMessage` 박스 표시(오늘과 동일). 메시지 리스트에는 쌓지 않고, 마지막 user 턴은 그대로 남겨 재전송 가능하게 함.
- contrast-fix 같은 `warningMessage`는 별도 박스 대신 해당 assistant 턴 bubble 안 작은 배지로 흡수.
- history 페이로드가 한도를 넘으면 백엔드가 400(`assertHistoryWithinLimits` 위반) 반환 → 클라이언트는 일반 에러로 표시.

## Testing

- 훅 단위 테스트(`useCardAiDesign.test.js`/`usePageAiDesign.test.js` 확장): `sendMessage` 호출 시 history N턴 cap, snapshot 저장/undo 복원, explanation/suggestion 분리 파싱.
- 컨트랙트 단위 테스트: `buildXxxOpenAiRequestBody`가 history 배열을 순서대로 input에 끼워넣는지, `normalizeOpenAiXxxIntent`가 explanation/suggestion을 올바르게 분리하는지.
- 컴포넌트 테스트: `AiChatPanel` 렌더 — message list 순서, scope 칩 선택 반영, undo 버튼 disabled 조건.
- 기존 테스트 스위트 회귀 없는지 확인(`npm test`).

## Out of Scope

- 추천 제안의 원클릭 적용(클릭 시 자동 프롬프트 전송) — 이번 범위는 텍스트 제안만.
- 대화 히스토리 DB 영속화 — 세션 한정만 지원.
- 멀티스텝 undo(임의 시점으로 점프) — 단일 레벨 undo만 지원.
- Page Design ↔ Card Design 간 크로스 스텝 추천 — 각 스텝은 자기 영역(같은 step의 다른 섹션)만 추천.
