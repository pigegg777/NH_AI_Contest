## Problem Statement

현재 storefront builder 는 사용자가 자연어로 원하는 디자인을 말해도, 실제로는 제한된 필드 토글과 스타일 토큰 변경 중심으로만 반영됩니다. 그래서 사용자는 "과세가격과 영세가격을 한 줄로 묶어줘", "카드 상세 레이아웃을 바꿔줘", "글자 톤을 더 공식적으로 보여줘" 같은 요구를 했을 때 AI 가 스스로 설계를 했다는 느낌보다 구조화된 편집기를 조작하는 느낌을 받습니다.

또한 공개용 QR 페이지까지 이어지는 저장 포맷이 AI 의 설계 의도를 담지 못해서, 미리보기에서 보인 자연어 기반 설계가 실제 저장 데이터와 고객용 페이지에 일관되게 연결되기 어렵습니다.

## Solution

storefront AI 를 "자연어 -> 설계 메타데이터 -> 미리보기 렌더" 흐름으로 재구성합니다. 사용자는 여전히 상품 데이터와 카테고리 선택까지만 구조적으로 고르고, 그 이후 카드 내부 정보 배치와 강조 방식은 AI 가 `designPlan` 과 `renderSpec` 으로 설계합니다.

AI 는 자유롭게 임의 HTML/CSS/JS 를 생성하지 않고, skill-pack 기반 프롬프트와 제한된 설계 모델 안에서 카드 구조, 필드 그룹화, 타이포그래피 톤, 가격 강조 방식을 결정합니다. 이 설계 메타데이터는 저장 payload 의 `categoryConfig.aiDesign` 에 함께 보존되며, builder preview 와 public storefront 가 같은 renderSpec 을 읽어 동일한 결과를 보여줍니다.

## User Stories

1. As an office operator, I want to choose the source product category first, so that AI works on the correct product data.
2. As an office operator, I want to describe the page in natural language, so that I do not have to manually tweak every card field and style token.
3. As an office operator, I want AI to understand requests about text color, text tone, and card layout, so that the page feels intentionally designed.
4. As an office operator, I want AI to group related fields like multiple price fields on one row when appropriate, so that product cards become easier to scan.
5. As an office operator, I want grouped fields to remain grounded in the saved source data, so that no factual product information is invented.
6. As an office operator, I want the preview to update immediately after an AI request, so that I can decide whether the draft is usable.
7. As an office operator, I want the AI-applied draft to be undoable, so that I can safely experiment.
8. As an office operator, I want the AI design intent to be saved with the storefront draft, so that reopening the category keeps the same rendering behavior.
9. As an office operator, I want the public storefront page to render the same grouped layout I saw in preview, so that QR customers see the intended design.
10. As an office operator, I want the system to keep using approved templates and rendering rules instead of arbitrary code generation, so that public publishing remains safe.
11. As an office operator, I want the AI system prompt to be assembled from reusable skill packs, so that design behavior can improve without rewriting the entire builder.
12. As an office operator, I want fertilizer-specific or pesticide-specific guidance to be injectable later, so that domain-sensitive presentation can evolve by category.
13. As an office operator, I want legacy style controls to keep working, so that the new AI layer does not break existing storefront drafts.
14. As an office operator, I want AI to preserve category selection and page-level settings while redesigning card presentation, so that my overall storefront configuration stays stable.
15. As a developer, I want to test the behavior at the service, builder, and public rendering seams, so that natural-language design changes stay reliable.

## Implementation Decisions

- Storefront AI responses are split into three internal layers: `designPlan` for intent, `renderSpec` for preview/public rendering, and legacy `patch` for compatibility with existing builder state.
- `designPlan` is the primary AI output shape. It contains `designBrief`, `transformPlan`, `contentPlan`, `layoutPlan`, and `stylePlan`.
- `renderSpec` is compiled from `designPlan` and is currently responsible for card body composition only. This enables richer field grouping without replacing the entire card renderer.
- Existing page-level and card-style state remains in place. The new architecture extends the system rather than replacing all existing storefront controls at once.
- AI-generated design metadata is stored under `categoryConfig.aiDesign`, alongside the existing saved category config.
- The builder preview path and the public storefront path both consume the saved `renderSpec`, which keeps preview and published output aligned.
- The AI request prompt is assembled from reusable skill packs such as base system rules, layout guidance, style guidance, transformation guidance, and publish safety guidance.
- Semantic grouping is policy-gated. The system can allow or deny grouping behavior through edit policy rather than by opening arbitrary markup freedom.
- Heuristic fallback mode still exists when OpenAI credentials are absent. It now produces `designPlan`, `renderSpec`, and legacy patch output rather than patch-only output.
- Public rendering intentionally stays inside controlled React rendering. The system does not allow raw AI-authored HTML/CSS/JS to run in the customer page.

## Testing Decisions

- Good tests should assert externally visible behavior: what the AI service normalizes, what the builder saves, and what the public storefront renders. They should avoid locking onto implementation details that can change without affecting user outcomes.
- The AI service seam is tested by normalizing design plans into render specs and compatible preview patches.
- The builder seam is tested by applying a mocked AI suggestion, saving the draft, and asserting that `aiDesign` persists in the saved payload.
- The public storefront seam is tested by loading a saved category config with `aiDesign.renderSpec` and asserting that grouped rows render as intended.
- Existing storefront model tests remain the prior art for save-payload normalization, while existing builder/public page tests remain the prior art for UI-level regression checks.

## Out of Scope

- Arbitrary AI-authored HTML/CSS/JS execution in the public storefront.
- A full free-form page composer where AI can replace every section outside the current storefront frame.
- Prompt library management UI for end users.
- Automatic learning from accepted or rejected AI drafts.
- Final QR export packaging, hosting strategy, or office-by-office deployment workflow.
- Multi-step approval workflow for publishing AI-generated storefronts.

## Further Notes

- This PRD intentionally chooses a controlled middle ground between rigid field toggles and dangerous full-code generation.
- The current implementation only upgrades card-body layout freedom. Header, image shell, and page chrome still follow the existing storefront component system.
- The saved `aiDesign` metadata creates a clean seam for future expansion into richer section layout, domain-specific design skills, and export-oriented rendering.
