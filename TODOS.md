# TODOS

Tracked follow-ups identified during `/plan-eng-review` (Phase 1b — AI 매장 설정 마법사, 2026-06-14). Each item was raised individually via AskUserQuestion and deferred (option A: add to TODOS.md).

Updated during `/plan-eng-review` (Phase 1c — 카드 디자인 단계, 2026-06-14): #1 범위 좁힘(Q3 테마 선택 부분은 Phase 1c에서 완료), #3에 Phase 1d 후보 라벨 추가, #4/#5 신규 추가. Outside Voice(codex) 독립 리뷰 결과 #6 신규 추가(D10).

## 1. 4단계(가격표시/연락처/주소/배너문구) + StorePage 렌더링

**What:** 마법사 4단계 — 가격표시 방식, 연락처/주소, 배너문구 입력 + `StorePage.jsx`에 해당 정보 렌더링 추가.

**Why:** Phase 1b에서 Q1+Q2(D2=A)만 범위였고, "테마 선택"(카드 색상 등) 부분은 Phase 1c의 3단계(카드 디자인 — accentColor)로 완료됨. 남은 가격표시/연락처/주소/배너문구가 구현되고 StorePage 렌더링까지 닿아야 design doc(`pigeg-main-design-20260614-101208.md`)의 "AI 매장 설정 마법사" 전체 구조가 완성됨.

**Depends on:** 1~3단계(Phase 1b+1c) 구현 완료 후.

## 2. Q2 섹션 순서 재정렬 UI (위/아래 버튼)

**What:** 마법사 Q2에서 선택한 카테고리들의 `section_order` 순서를 사용자가 위/아래 버튼으로 직접 조정.

**Why:** 이번 패스(D5=A)는 상품 데이터 첫 등장 순서를 고정 파생 순서로 그대로 사용(재정렬 UI 없음). 매장 운영자가 특정 카테고리를 페이지 상단에 강조하고 싶을 수 있음.

**Depends on:** Q1+Q2(이번 패스) 구현 완료 후. TODO 1(4단계) 패스와 함께 검토 후보.

## 3. AI 추천 기능 전체 (Q1~4단계별 어시스트) — Phase 1d 후보

**What:** Q1(자동 숨김 추천) / Q2(주요 작물 AI 추론) / 3단계(카드 디자인 자유서술 반영) / 4단계(배너문구 생성) 각 단계에 AI 어시스트 추가. `workbookAiRecommendationService`/`ruleBasedRecommendationModel` 재사용.

**Why:** Phase 1b(D1=B), Phase 1c(D2=Approach A) 모두 데이터 기반 골격 먼저, AI=0 유지로 보류. 스키마/의존성 변경 없이 구현 가능 (human: ~1-2일 / CC: ~3-4시간).

**Depends on:** Q1+Q2(Phase 1b), 3단계(Phase 1c) 구현 후 단계별 추가. 우선순위는 다음 office-hours에서 Phase 1e(#4)와 함께 재논의.

## 4. Phase 1e 후보: 카테고리 세분화 + StorePage nav/검색/QR

**What:** 중/소/세분류 그룹핑 선택 UI + `StorePage`에 카테고리 nav/검색 + QR 생성 추가.

**Why:** Phase 1c D2에서 검토된 Approach C — 스코프/회귀 위험 가장 크고 새 의존성(QR 라이브러리) 필요. 가장 큰 변화라 후보로 기록, Phase 1d(#3)와 순서는 다음 office-hours에서 결정.

**Depends on:** Phase 1c(3단계 카드 디자인) 완료 후. 새 의존성(QR) 도입 여부 별도 검토 필요.

## 5. 데이터 저장 방식 (고민중)

**What:** "데이터 저장" 항목 — 사용자가 명시적으로 "고민중"이라 한 미확정 요구사항.

**Why:** Phase 1c design doc Open Questions에 명시 — 스코프화 전, 다음 office-hours에서 재논의 후 결정.

**Depends on:** 다음 office-hours에서 방향 결정 후 스코프화.

## 6. StorePage 섹션 렌더링 구조 분리 (CardGridSection이 card-grid/highlight-banner 둘 다 처리) — Phase 1e 후보

**What:** `StorePage.jsx`의 `sectionMatching.js`가 `card-grid`/`highlight-banner` 등 서로 다른 `display_variant`를 전부 `CardGridSection`으로 렌더링 — 섹션 타입별 책임 분리(컴포넌트 분기) 검토.

**Why:** Phase 1c plan-eng-review의 Outside Voice(codex 독립 리뷰)에서 발견. Phase 1c가 `CardGridSection`에 카드 디자인 `style` prop을 추가하면, 같은 컴포넌트를 쓰는 `highlight-banner` 섹션에도 카드 스타일이 적용될 위험 — 지금은 card-grid 한정으로 처리해 회피(D10=B, 이번 패스 범위 유지), 구조적 분리는 별도 검토 필요.

**Depends on:** Phase 1c(3단계 카드 디자인) 구현 후. TODO 4(Phase 1e, 카테고리 세분화+nav/검색/QR)와 순서는 다음 office-hours에서 논의.
