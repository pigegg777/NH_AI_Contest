# 안내 문구 강조 마커 AI 삽입 설계

**작성일:** 2026-08-26
**상태:** 사용자 승인됨
**선행 조건:** [2026-08-26-storefront-information-authoring-design.md](2026-08-26-storefront-information-authoring-design.md) 의 항목 입력 UI(`InformationEntryFields.jsx`)가 먼저 존재해야 한다.

## 한 줄 요약

판매자가 평문으로 쓴 안내 설명에 `AI 강조` 버튼 하나로 `<<제목>>` 과 `[[중요]]` 마커를 끼워 넣는다. **AI는 마커만 넣고 글자는 한 자도 바꾸지 않으며, 그 사실을 코드가 검증한다.**

## 배경 — 앞선 결정을 뒤집는다

선행 설계 문서의 "하지 않는 것"에 **"안내 문구의 AI 디자인"** 이 들어 있다. 이 문서가 그 항목을 뒤집는다.

뒤집는 이유는 스코프가 다르기 때문이다. 그때 배제한 것은 *안내 문구의 스타일을 AI가 정하는 것* 이었고 — 색·크기·레이아웃을 AI가 고르는 일 — 그건 지금도 하지 않는다. 여기서 하는 것은 *판매자가 이미 쓴 글에서 강조할 자리를 AI가 찾는 것* 이다. 스타일 값은 여전히 CSS가 전부 정한다.

선행 설계는 판매자가 `<<>>` 와 `[[]]` 문법을 배우게 하는 데 삽입 버튼과 상시 설명 줄을 썼다. 이 기능은 그 학습 자체를 선택 사항으로 만든다.

## 결정

| # | 결정 | 근거 |
| --- | --- | --- |
| 1 | AI가 강조 위치를 **스스로 판단**한다 | 이 기능의 가치는 문법 대행이다. 프롬프트 입력칸은 또 다른 문법을 배우게 만든다 |
| 2 | AI는 **마커만 삽입**하고 글자를 바꾸지 않는다 | 검증 가능해지고, 되돌리기가 싸지고, 표현은 판매자가 AI보다 잘 안다 |
| 3 | 글자 보존을 **코드가 강제**한다 | 프롬프트 규칙은 지켜지지 않을 때 알 방법이 없다 |
| 4 | 버튼은 **항목 행마다** 둔다 | 손으로 넣는 삽입 버튼과 같은 가족이라 같은 자리에 있어야 한다 |
| 5 | 항목 라벨은 `<<제목>>`, 빨강은 아껴 쓴다 | 줄마다 앞머리가 빨강이면 빨강이 "중요"라는 뜻을 잃는다 |
| 6 | 검증 실패는 **502 로 드러낸다** | 원문을 성공인 척 돌려주면 버그를 영영 못 본다 |
| 7 | 되돌리기는 **한 단계, 그 행만** | 스냅샷이 하나뿐이라 그 이상은 되살릴 수 없다 |

## AI 판단 규칙

프롬프트에 못 박는 규칙:

| 마커 | 쓰는 자리 |
| --- | --- |
| `<<제목>>` | 항목 라벨(`비료:`, `농약:`)과 단독 소제목 줄 |
| `[[중요]]` | 조건·자격·기한·금액 제한처럼 놓치면 판매자가 곤란해지는 문구. **설명당 많아야 1~2개** |

라벨은 "여기부터 비료 얘기"라는 **구조** 표시지 경고가 아니다. 구조는 제목 스타일(굵게 + 1.08배 + `#2f4a39`)이 맡고, 빨강(`#c62828`)은 드물게 써야 눈에 박힌다.

추가 규칙:

- **이미 들어 있는 마커는 건드리지 않는다.** 판매자가 손으로 넣은 강조를 재배치하지 않는다.
- **강조할 게 없으면 아무것도 넣지 않는다.** 억지로 채우지 않는다.
- **줄 전체를 감싸지 않는다.** 문장 통째로 강조하면 강조가 아니다.
- **중첩하지 않는다.** 파서가 중첩을 지원하지 않는다.

```
입력   비료: 요소 20kg 15,000원
       영세가격은 등록 농가만 적용됩니다

출력   <<비료:>> 요소 20kg 15,000원
       [[영세가격은 등록 농가만]] 적용됩니다
```

## 안전망 — 글자 보존 검증

이미 있는 파서를 재사용한다.

```js
// parseInformationText 는 조각 배열을 준다. text 만 이어붙이면 "인식된 마커만
// 제거된 원문" 이 나온다. 안 닫힌 기호는 파서가 평문으로 두므로 그대로 남는다.
plainTextOf(text) = parseInformationText(text).map((s) => s.text).join('')
```

**규칙:** `plainTextOf(AI응답) !== plainTextOf(판매자원문)` 이면 응답을 버린다.

이러면 AI가 "영세가격"을 "영세 가격"으로 띄우거나, 문장을 요약하거나, 없던 안내를 지어내면 전부 걸린다. 마커 위치를 어디로 옮기든 글자만 같으면 통과한다. 안 닫힌 마커도 여는 기호가 평문 글자로 남아 거절되는데, 그게 옳다 — 판매자 화면에 `[[` 가 그대로 보이는 출력이다.

**알면서 두는 구멍:** "기존 마커는 건드리지 않는다"는 이 검증으로 못 막는다. 판매자가 넣은 `[[비료]]` 를 AI가 `<<비료>>` 로 바꿔도 글자는 같아 통과한다. 마커별 위치까지 대조하면 막을 수 있지만 그 복잡도를 살 만큼 잦거나 해로운 사고가 아니다. 프롬프트 규칙으로 두고, 되돌리기가 최후 수단이다.

## 요청 / 응답

```
POST /api/storefront-ai/information-emphasis
요청  { officeCode, label, description }
응답  { description }        // 마커가 끼워진 같은 글자
```

- `label` 도 보낸다. "영세가격 안내"라는 제목을 알면 본문에서 뭐가 중요한지 판단이 정확해진다. 마커는 `description` 에만 넣는다 (선행 설계 결정 4 — `label` 은 마커를 해석하지 않는다).
- `description` 은 기존 `assertPromptWithinLimit` 재사용 → 빈 값 금지, 2000자 이하. 넘으면 422.
- 응답은 `strict: true` json_schema, 필드는 `description` 하나. `max_output_tokens` 1500.
- `requireOwnedOffice` 를 통과시킨다. 남의 사무소 안내로 AI를 돌릴 수 없다.
- 모델은 기존 엔드포인트와 같이 `env.OPENAI_MODEL || 'gpt-5.6-terra'`.

## 화면 동작

```
설명   [ 비료: 요소 20kg 15,000원                      ]
       [ 농약: 살균제 500ml 8,000원                    ]
       [ 제목 ] [ 중요 ] [ AI 강조 ]
       << >> 제목 · [[ ]] 중요
       AI가 강조를 넣었습니다 · 되돌리기        ← 결과 줄 (평소엔 없음)
```

| 상황 | 결과 |
| --- | --- |
| 누르는 중 | `AI 강조` 비활성 + "강조 넣는 중…" |
| 마커가 들어옴 | textarea 즉시 교체 + `되돌리기` 줄. 오른쪽 미리보기가 바로 갱신된다 |
| 응답 문자열이 원문과 완전히 같음 | "강조할 곳을 찾지 못했어요" — 값 그대로 |
| 서버 오류 / 검증 실패 | 빨간 한 줄 에러 — 값 그대로 |
| 설명이 비어 있음 | 버튼 비활성 (422 를 미리 막는다) |

- **되돌리기 줄은 판매자가 그 textarea 를 다시 건드리면 사라진다.** 안 그러면 "AI 적용 → 손으로 두 줄 더 씀 → 되돌리기" 가 방금 쓴 두 줄까지 날린다. 스냅샷은 그 시점 원문 하나뿐이라 손으로 쓴 것을 되살릴 방법이 없다.
- **상태는 `entry.id` 로 분리한다.** 1번 항목이 도는 중에 3번 항목 버튼을 눌러도 스피너와 에러가 섞이지 않는다. `informationEntriesModel.js` 가 이미 안정적인 `id` 를 만들어 둔다.
- 미리보기 갱신은 기존 경로를 그대로 탄다. AI 적용은 판매자가 직접 타이핑한 것과 구분되지 않는다.

## 파일

| 파일 | 역할 |
| --- | --- |
| `functions/api/storefront-ai/information-emphasis.js` (신규) | 엔드포인트 — 검증 → `requireOwnedOffice` → `requestOpenAiJson` → 정규화 |
| `model/information-emphasis/ai-request/informationEmphasisPrompt.js` (신규) | 시스템 지시문 |
| `model/information-emphasis/ai-request/informationEmphasisOpenAiRequest.js` (신규) | `buildInformationEmphasisOpenAiRequestBody` |
| `model/information-emphasis/ai-response/informationEmphasisAiSchema.js` (신규) | strict json_schema |
| `model/information-emphasis/ai-response/informationEmphasisAiNormalizer.js` (신규) | 글자 보존 검증 — `parseInformationText` 재사용 |
| `services/information-emphasis/informationEmphasisAiGateway.js` (신규) | `cardStyleAiGateway` 와 같은 모양 |
| `hooks/useInformationEmphasisAi.js` (신규) | 행별 pending / 에러 / 되돌리기 스냅샷 |
| `components/builder-workspace/field-selection/InformationEntryFields.jsx` (수정) | 버튼 한 개 + 결과 줄 한 개 배선 |

## 테스트

**정규화 / 검증** (`informationEmphasisAiNormalizer.test.js`)

- 마커만 추가된 응답을 통과시킨다
- 글자를 바꾼 응답을 거절한다 — 띄어쓰기 추가, 문장 요약, 없던 문장 추가
- 안 닫힌 마커가 든 응답을 거절한다 — 남은 여는 기호가 "늘어난 글자"로 잡힌다
- 원문에 이미 마커가 있고 응답이 그것을 유지하면 통과한다
- 원문과 같은 응답(강조할 곳 없음)을 통과시킨다

**요청 빌더** (`informationEmphasisOpenAiRequest.test.js`)

- `label` 과 `description` 이 페이로드에 들어간다
- schema 가 `strict` 이고 필드가 `description` 하나다

**엔드포인트** (`functions/api/storefront-ai/__tests__/`)

- 빈 `description` → 422
- 2000자 초과 → 422
- 남의 `officeCode` → `requireOwnedOffice` 가 거절
- AI 가 글자를 바꾼 응답 → 502, 원문 미변경
- 허용 키 밖의 필드는 `pickAllowedKeys` 가 버린다

**입력 UI** (`InformationEntryFields` 테스트)

- 설명이 비면 `AI 강조` 가 비활성이다
- 성공하면 그 행 textarea 만 바뀌고 다른 행은 그대로다
- `되돌리기` 가 직전 원문으로 복구한다
- textarea 를 다시 편집하면 `되돌리기` 줄이 사라진다
- 1번 행이 pending 인 동안 3번 행에 스피너가 뜨지 않는다
- 실패 시 값이 유지되고 에러 한 줄이 뜬다

**브라우저**

- 평문 안내에 버튼을 눌러 강조가 실제로 보이는지, 미리보기가 갱신되는지
- 모바일에서 버튼 세 개가 가로 스크롤을 만들지 않는지

## 하지 않는 것

- 판매자 프롬프트 입력칸 (AI 가 스스로 판단한다)
- 문장 다듬기·맞춤법 교정 (마커만 넣는다)
- 항목 전체 일괄 강조 버튼
- 되돌리기 여러 단계 / 다시 실행
- 강조 결과에 대한 AI 설명 문구
- 안내 문구의 스타일(색·크기)을 AI 가 정하는 것 — 선행 설계의 배제 항목 그대로 유지
