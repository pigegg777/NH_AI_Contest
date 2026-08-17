# Storefront AI Design Unified Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the storefront builder's three separate AI design modes (page / card / autoDesign) into one unified "design" mode where a single category-tab strip — now prefixed with a "공통 요소" (common elements) tab — decides which target (page-wide styling vs. one large-category's card styling) the composer is editing.

**Architecture:** `ModeChoiceBubble` drops from 4 entry buttons to 2 (`data`, `design`). Inside `design` mode, `useStorefrontBuilder` tracks a new `designTarget` state (`'common'` or `'category'`) alongside the existing `selectedProductCategoryName`. The category-tab strip gets a `공통 요소` tab prepended; clicking a tab calls a new `selectDesignTarget` function that discards whatever draft is being left (reverting to its captured baseline) and switches which underlying AI hook (`pageAi` for common, `cardAi` for category) the composer reads from and writes to. The old `autoDesign` behavior — one prompt that silently edits both page and card together — is removed; every prompt now scopes to whichever target tab is active, exactly like the old standalone `page`/`card` modes did.

**Tech Stack:** React 19, Vite, Vitest + React Testing Library (`@testing-library/user-event`), existing `usePageAiDesign` / `useCardAiDesign` hooks (unchanged).

**Spec:** No separate spec doc — this plan itself is the spec, confirmed with the user via two rounds of clarifying questions in-session:
1. Merge page/card modes into the unified design mode, accessed via category tabs with a "공통 요소" tab prepended. Tab click swaps which composer (page-style vs. card-style) renders. Confirmed.
2. The old `autoDesign` "one prompt edits both at once" behavior is removed entirely — every prompt now scopes to the single active tab. Confirmed (Option 1 in the clarifying question).

## Global Constraints

- Do not touch `usePageAiDesign.js`, `useCardAiDesign.js`, `useStorefrontChatSession.js`, `CategoryTabs.jsx`, `DesignTargetChipsBubble.jsx`, `CategoryImageGenPanel.jsx`, or `FieldSelectionDock.jsx` — all already generic enough to support this feature unchanged (verified by reading each file in full before writing this plan).
- `CategoryTabs` id scheme: category tabs use the raw category name string as `id` (e.g. `"Fertilizer Upload"`). The new common-elements tab uses `id: 'common'`.
- Button/copy text stays in Korean, matching existing strings in the touched files exactly (see each task's code).
- The apply button is always labeled **"저장하기"** (not "적용" — that string belongs to a stale test, see Task 4). The undo button is always labeled **"되돌리기"**.
- `chatSession.mode` values become exactly `'idle' | 'data' | 'design'` — `'page'`, `'card'`, `'autoDesign'` no longer exist anywhere after this plan.

---

### Task 1: Unify mode options and target-aware composer copy

**Files:**
- Modify: `react-app/src/features/storefront/components/chat-workspace/storefrontChatModes.js`
- Create: `react-app/src/features/storefront/__tests__/storefrontChatModes.test.js`

**Interfaces:**
- Consumes: nothing external.
- Produces:
  - `STOREFRONT_CHAT_MODE_OPTIONS` — now exactly 2 entries: `{ id: 'data', ... }`, `{ id: 'design', ... }`.
  - `getStorefrontChatScaffoldCopy(mode)` — unchanged signature/behavior, keep as-is.
  - `getStorefrontDesignComposerCopy(designTarget)` — **new**, replaces `getStorefrontComposerCopy(mode)`. Takes `'common' | 'category'`, returns `{ title, description, placeholder, discardLabel, sendLabel, targetLabel } | null`. Task 2 consumes this.

- [ ] **Step 1: Write the failing test**

```js
// react-app/src/features/storefront/__tests__/storefrontChatModes.test.js
import { describe, expect, it } from 'vitest';

import {
  STOREFRONT_CHAT_MODE_OPTIONS,
  getStorefrontDesignComposerCopy,
} from '../components/chat-workspace/storefrontChatModes';

describe('STOREFRONT_CHAT_MODE_OPTIONS', () => {
  it('exposes exactly the data and design entry modes, in that order', () => {
    expect(STOREFRONT_CHAT_MODE_OPTIONS.map((option) => option.id)).toEqual(['data', 'design']);
  });

  it('gives every option a non-empty label and description', () => {
    STOREFRONT_CHAT_MODE_OPTIONS.forEach((option) => {
      expect(option.label).toEqual(expect.any(String));
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description).toEqual(expect.any(String));
      expect(option.description.length).toBeGreaterThan(0);
    });
  });
});

describe('getStorefrontDesignComposerCopy', () => {
  it('returns page-style copy for the common target', () => {
    const copy = getStorefrontDesignComposerCopy('common');

    expect(copy.title).toBe('공통 요소 디자인 작업 공간');
    expect(copy.targetLabel).toBe('수정 대상');
    expect(copy.sendLabel).toBe('AI 요청하기');
  });

  it('returns card-style copy for the category target', () => {
    const copy = getStorefrontDesignComposerCopy('category');

    expect(copy.title).toBe('카드 디자인 작업 공간');
    expect(copy.targetLabel).toBe('수정 대상');
  });

  it('returns null for an unrecognized target', () => {
    expect(getStorefrontDesignComposerCopy('bogus')).toBeNull();
    expect(getStorefrontDesignComposerCopy(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/storefront/__tests__/storefrontChatModes.test.js`
Expected: FAIL — `getStorefrontDesignComposerCopy` is not exported yet, and `STOREFRONT_CHAT_MODE_OPTIONS` still has 4 entries.

- [ ] **Step 3: Rewrite the implementation**

Replace the full contents of `react-app/src/features/storefront/components/chat-workspace/storefrontChatModes.js` with:

```js
export const STOREFRONT_CHAT_MODE_OPTIONS = [
  {
    id: 'data',
    label: '대분류별 표시할 데이터선택',
    description: '영세가격,면세가격,분류등 보여줄 데이터를 선택',
  },
  {
    id: 'design',
    label: 'AI 디자인 수정',
    description: '공통 요소와 대분류별 카드 디자인을 한 작업 공간에서 이어서 수정',
  },
];

const STOREFRONT_DESIGN_TARGET_COMPOSER_COPY = {
  common: {
    title: '공통 요소 디자인 작업 공간',
    description:
      '미리보기를 유지한 채 페이지 전반 분위기와 탐색 요소를 조정합니다.',
    placeholder:
      '페이지 톤, 검색창, 카테고리 칩, 배너 등에 대한 수정 요청을 입력하세요.',
    discardLabel: '뒤로가기',
    sendLabel: 'AI 요청하기',
    targetLabel: '수정 대상',
  },
  category: {
    title: '카드 디자인 작업 공간',
    description:
      '선택된 카테고리 카드의 상세 디자인을 이 작업 공간 안에서 이어서 조정합니다.',
    placeholder:
      '카드 레이아웃, 이미지 처리, 정보 영역, 강조 필드 등에 대한 수정 요청을 입력하세요.',
    discardLabel: '뒤로가기',
    sendLabel: 'AI 요청하기',
    targetLabel: '수정 대상',
  },
};

export function getStorefrontChatScaffoldCopy(mode) {
  if (mode === 'idle') {
    return '수정하고 싶은 작업을 선택해주세요.';
  }

  if (mode === 'data') {
    return '카테고리 데이터와 노출 필드를 이 작업 공간 안에서 계속 조정할 수 있습니다.';
  }

  return '선택한 작업에 맞는 입력 영역이 여기에서 이어집니다.';
}

export function getStorefrontDesignComposerCopy(designTarget) {
  return STOREFRONT_DESIGN_TARGET_COMPOSER_COPY[designTarget] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/storefront/__tests__/storefrontChatModes.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/components/chat-workspace/storefrontChatModes.js react-app/src/features/storefront/__tests__/storefrontChatModes.test.js
git commit -m "feat(storefront): unify design mode options and target-aware composer copy"
```

---

### Task 2: Rework `useStorefrontBuilder` around a single design-target state machine

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`

**Interfaces:**
- Consumes: `STOREFRONT_CHAT_MODE_OPTIONS`, `getStorefrontDesignComposerCopy` from Task 1's `storefrontChatModes.js`. `PAGE_AI_TARGET_SCOPE_OPTIONS` / `CARD_AI_TARGET_SCOPE_OPTIONS`, `usePageAiDesign` / `useCardAiDesign` — all unchanged, exactly as they exist today.
- Produces (the hook's returned shape — Task 3 consumes this):
  - `chatSession.mode` is now `'idle' | 'data' | 'design'`.
  - `builder.dataMode` — **unchanged** shape (`categoryTabs`, `selectedCategoryId`, `selectCategory`, `availableCategoryFields`, `draftFields`, `committedFields`, `toggleField`, `applyChanges`, `hasPendingChanges`, `previewConfig`, `goBack`).
  - `builder.designMode` — **new name, replaces `cardMode`**. Shape:
    ```
    {
      categoryTabs: [{ id: 'common', label: '공통 요소' }, ...dataMode.categoryTabs],
      selectedCategoryId: string,   // 'common' or the active category name
      selectCategory: (targetId: string) => void,   // this is selectDesignTarget
      mediumCategories: string[],
      generatedCategoryImages: object,
      isGeneratingCategoryImage: object,
      generateCategoryImage: (mediumCategory, options) => Promise,
    }
    ```
  - `builder.composerMode` — when `chatSession.mode === 'design'`, now carries a resolved `copy` object (from `getStorefrontDesignComposerCopy`) instead of requiring the caller to look it up by mode string. Full shape:
    ```
    {
      copy: { title, description, placeholder, discardLabel, sendLabel, targetLabel },
      promptDraft, setPromptDraft, isApplying, errorMessage, canSend,
      sendPrompt, exitMode, showApplyAction, canApply, applyDraft,
      targetOptions, selectedTargetId, setTargetId,
    }
    ```
    `null` when `chatSession.mode` is not `'design'`.
  - `builder.switchMode`, `builder.undoLastApply`, `builder.applyCurrentModeDraft`, `builder.buildCurrentSavePayload`, `builder.saveCompiledPayload` — unchanged signatures.

- [ ] **Step 1: Rename the mode-choice state and refs**

In `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`, replace:

```js
  const [composerDrafts, setComposerDrafts] = useState({
    page: "",
    card: "",
    autoDesign: "",
  });
  const [pendingComposerApply, setPendingComposerApply] = useState({
    page: false,
    card: false,
    autoDesign: false,
  });
  const pageModeDraftRef = useRef(null);
  const cardModeDraftRef = useRef(null);
  const previousChatModeRef = useRef(chatSession.mode);
  const previousCardCategoryRef = useRef("");
```

with:

```js
  const [designTarget, setDesignTarget] = useState("common");
  const [composerDrafts, setComposerDrafts] = useState({
    common: "",
    category: "",
  });
  const [pendingComposerApply, setPendingComposerApply] = useState({
    common: false,
    category: false,
  });
  const commonDraftRef = useRef(null);
  const categoryDraftRef = useRef(null);
  const previousChatModeRef = useRef(chatSession.mode);
  const previousCardCategoryRef = useRef("");
```

- [ ] **Step 2: Rename the draft-capture functions**

Replace:

```js
  function capturePageModeDraft() {
    const baseline = cloneValue(pageAi.pageStyle);

    pageModeDraftRef.current = baseline;
    setComposerApplyPending("page", false);
    pageAi.hydratePageStyle(baseline);
  }

  function captureCardModeDraft() {
    const baseline = {
      cardStyle: cloneValue(cardAi.cardStyle),
      bodySlots: cloneValue(cardAi.bodySlots),
      generatedCategoryImages: cloneValue(cardAi.generatedCategoryImages),
    };

    cardModeDraftRef.current = baseline;
    setComposerApplyPending("card", false);
    cardAi.hydrateCardStyle(baseline.cardStyle, baseline.bodySlots, baseline.generatedCategoryImages);
  }
```

with:

```js
  function captureCommonDraft() {
    const baseline = cloneValue(pageAi.pageStyle);

    commonDraftRef.current = baseline;
    setComposerApplyPending("common", false);
    pageAi.hydratePageStyle(baseline);
  }

  function captureCategoryDraft() {
    const baseline = {
      cardStyle: cloneValue(cardAi.cardStyle),
      bodySlots: cloneValue(cardAi.bodySlots),
      generatedCategoryImages: cloneValue(cardAi.generatedCategoryImages),
    };

    categoryDraftRef.current = baseline;
    setComposerApplyPending("category", false);
    cardAi.hydrateCardStyle(baseline.cardStyle, baseline.bodySlots, baseline.generatedCategoryImages);
  }
```

`hydrateCategoryDraft` (the function that runs on initial load and on `selectProductCategory`) already sets `cardModeDraftRef.current = {...}` directly — rename that one field reference too:

```js
    cardAi.hydrateCardStyle(resolvedDraft.cardStyle, resolvedDraft.bodySlots, resolvedDraft.generatedCategoryImages);
    cardModeDraftRef.current = {
```

becomes:

```js
    cardAi.hydrateCardStyle(resolvedDraft.cardStyle, resolvedDraft.bodySlots, resolvedDraft.generatedCategoryImages);
    categoryDraftRef.current = {
```

- [ ] **Step 3: Rewrite the two mode/category-change effects**

Replace:

```js
  useEffect(() => {
    if (chatSession.mode === previousChatModeRef.current) {
      return;
    }

    if (chatSession.mode === "page" || chatSession.mode === "autoDesign") {
      capturePageModeDraft();
    }

    if (chatSession.mode === "card" || chatSession.mode === "autoDesign") {
      captureCardModeDraft();
    }

    previousChatModeRef.current = chatSession.mode;
  }, [chatSession.mode]);

  useEffect(() => {
    if (
      (chatSession.mode === "card" || chatSession.mode === "autoDesign") &&
      selectedProductCategoryName &&
      selectedProductCategoryName !== previousCardCategoryRef.current
    ) {
      captureCardModeDraft();
    }

    previousCardCategoryRef.current = selectedProductCategoryName;
  }, [chatSession.mode, selectedProductCategoryName]);
```

with:

```js
  useEffect(() => {
    if (chatSession.mode === previousChatModeRef.current) {
      return;
    }

    if (chatSession.mode === "design") {
      setDesignTarget("common");
      captureCommonDraft();
      captureCategoryDraft();
    }

    previousChatModeRef.current = chatSession.mode;
  }, [chatSession.mode]);

  useEffect(() => {
    if (
      chatSession.mode === "design" &&
      designTarget === "category" &&
      selectedProductCategoryName &&
      selectedProductCategoryName !== previousCardCategoryRef.current
    ) {
      captureCategoryDraft();
    }

    previousCardCategoryRef.current = selectedProductCategoryName;
  }, [chatSession.mode, designTarget, selectedProductCategoryName]);
```

- [ ] **Step 4: Add `selectDesignTarget`, right after `selectProductCategory`**

```js
  function selectDesignTarget(targetId) {
    if (targetId === "common") {
      if (designTarget === "common") {
        return;
      }

      if (categoryDraftRef.current) {
        cardAi.hydrateCardStyle(
          categoryDraftRef.current.cardStyle,
          categoryDraftRef.current.bodySlots,
          categoryDraftRef.current.generatedCategoryImages,
        );
      }

      setComposerApplyPending("category", false);
      setComposerDraft("category", "");
      setDesignTarget("common");
      return;
    }

    if (designTarget === "common") {
      if (commonDraftRef.current) {
        pageAi.hydratePageStyle(commonDraftRef.current);
      }

      setComposerApplyPending("common", false);
      setComposerDraft("common", "");
      setDesignTarget("category");
    }

    selectProductCategory(targetId);
  }
```

- [ ] **Step 5: Update `resolveChatScopeLabel` to key off `designTarget`**

Replace:

```js
function resolveChatScopeLabel(mode, targetScope) {
  if (mode === "page") {
    return resolveScopeLabel(PAGE_AI_TARGET_SCOPE_OPTIONS, targetScope);
  }

  if (mode === "card") {
    return resolveScopeLabel(CARD_AI_TARGET_SCOPE_OPTIONS, targetScope);
  }

  return "";
}
```

with:

```js
function resolveChatScopeLabel(designTarget, targetScope) {
  if (designTarget === "common") {
    return resolveScopeLabel(PAGE_AI_TARGET_SCOPE_OPTIONS, targetScope);
  }

  if (designTarget === "category") {
    return resolveScopeLabel(CARD_AI_TARGET_SCOPE_OPTIONS, targetScope);
  }

  return "";
}
```

- [ ] **Step 6: Rewrite `buildApplySummary`**

Replace:

```js
  function buildApplySummary(mode) {
    if (mode === "data") {
      return (
        buildDataModeCompletionSummary()?.text ??
        "표시 필드 변경 사항이 저장되었습니다."
      );
    }

    if (mode === "card") {
      return `${selectedProductCategoryName || "현재"} 카드 변경 사항이 저장되었습니다.`;
    }

    if (mode === "page") {
      return "페이지 변경 사항이 저장되었습니다.";
    }

    if (mode === "autoDesign") {
      return "AI가 자동으로 정리한 디자인이 적용되었습니다.";
    }

    return "스토어프론트 변경 사항이 저장되었습니다.";
  }
```

with:

```js
  function buildApplySummary(mode, target) {
    if (mode === "data") {
      return (
        buildDataModeCompletionSummary()?.text ??
        "표시 필드 변경 사항이 저장되었습니다."
      );
    }

    if (mode === "design" && target === "category") {
      return `${selectedProductCategoryName || "현재"} 카드 변경 사항이 저장되었습니다.`;
    }

    if (mode === "design" && target === "common") {
      return "공통 요소 변경 사항이 저장되었습니다.";
    }

    return "스토어프론트 변경 사항이 저장되었습니다.";
  }
```

- [ ] **Step 7: Update `applyCurrentModeDraft` and `undoLastApply`'s snapshot mode fallback**

Replace the body of `applyCurrentModeDraft`:

```js
  async function applyCurrentModeDraft(
    mode = chatSession.mode,
    overrides = {},
  ) {
    const previousPayload = cloneValue(existingConfig);
    const payload = buildCurrentSavePayload(overrides);
    const summary = buildApplySummary(mode);

    await saveCompiledPayload(payload);
    setComposerApplyPending("page", false);
    setComposerApplyPending("card", false);
    setComposerApplyPending("autoDesign", false);
    pageModeDraftRef.current = null;
    cardModeDraftRef.current = null;
    chatSession.recordSuccessfulApply({
      summary,
      snapshot: {
        mode,
        payload: previousPayload,
        summary,
      },
    });
    chatSession.returnToIdle();
  }
```

with:

```js
  async function applyCurrentModeDraft(
    mode = chatSession.mode,
    overrides = {},
  ) {
    const previousPayload = cloneValue(existingConfig);
    const payload = buildCurrentSavePayload(overrides);
    const summary = buildApplySummary(mode, designTarget);

    await saveCompiledPayload(payload);
    setComposerApplyPending("common", false);
    setComposerApplyPending("category", false);
    commonDraftRef.current = null;
    categoryDraftRef.current = null;
    chatSession.recordSuccessfulApply({
      summary,
      snapshot: {
        mode,
        payload: previousPayload,
        summary,
      },
    });
    chatSession.returnToIdle();
  }
```

`undoLastApply` already reads `snapshot.mode ?? "page"` as a fallback label for a thread message — change that fallback to `"design"` since `"page"` no longer exists:

```js
        mode: snapshot.mode ?? "page",
```
becomes
```js
        mode: snapshot.mode ?? "design",
```

- [ ] **Step 8: Rewrite `sendComposerPrompt`, dropping the `autoDesign` branch entirely**

Replace the full function body:

```js
  async function sendComposerPrompt() {
    const mode = chatSession.mode;
    const prompt = toTrimmedString(composerDrafts[mode]);

    if (!prompt) {
      return;
    }

    const targetScope =
      mode === "page"
        ? pageAi.pageAiDesign.targetScope
        : mode === "card"
          ? cardAi.cardAiDesign.targetScope
          : "";
    const scopeLabel = resolveChatScopeLabel(mode, targetScope);
    const targetLabel =
      mode === "page" ? "Page" : mode === "card" ? "Card" : undefined;
    const userMessage = buildSharedThreadMessage({
      role: "user",
      mode,
      targetLabel,
      scope: targetScope,
      scopeLabel,
      text: prompt,
    });
    const history = buildSharedHistory(
      [...chatSession.messages, userMessage],
      mode,
    );

    chatSession.appendMessage(userMessage);
    setComposerDraft(mode, "");

    if (mode === "autoDesign") {
      markDirty();

      const [pageResult, cardResult] = await Promise.all([
        pageAi.applyPageAiDesign({ prompt, targetScope: "", history }),
        cardAi.applyCardAiDesign({
          prompt,
          targetScope: "",
          history,
          visibleFields: dataSelection.committed,
          fieldLabels: STOREFRONT_FIELD_LABELS,
          productCategoryName: selectedProductCategoryName,
          productRows: currentEntry?.rows,
        }),
      ]);

      const succeeded = [pageResult, cardResult].filter((result) => result?.ok);
      const failed = [pageResult, cardResult].filter((result) => !result?.ok);

      if (succeeded.length === 0) {
        chatSession.appendMessage(
          buildSharedThreadMessage({
            role: "assistant",
            mode,
            text:
              failed
                .map((result) => result.error)
                .filter(Boolean)
                .join(" ") || "디자인을 자동으로 적용하지 못했습니다.",
          }),
        );
        return;
      }

      setComposerApplyPending("autoDesign", true);

      const text = [
        ...succeeded.map((result) => result.explanation).filter(Boolean),
        ...failed.map((result) => result.error).filter(Boolean),
      ].join(" ");

      chatSession.appendMessage(
        buildSharedThreadMessage({
          role: "assistant",
          mode,
          text,
          warningMessage: cardResult?.warningMessage,
        }),
      );
      return;
    }

    markDirty();

    const result =
      mode === "card"
        ? await cardAi.applyCardAiDesign({
            prompt,
            targetScope,
            history,
            visibleFields: dataSelection.committed,
            fieldLabels: STOREFRONT_FIELD_LABELS,
            productCategoryName: selectedProductCategoryName,
            productRows: currentEntry?.rows,
          })
        : await pageAi.applyPageAiDesign({
            prompt,
            targetScope,
            history,
          });

    if (!result?.ok) {
      chatSession.appendMessage(
        buildSharedThreadMessage({
          role: "assistant",
          mode,
          text:
            result?.error ??
            (mode === "card"
              ? cardAi.cardAiErrorMessage
              : pageAi.pageAiErrorMessage) ??
            "작업 공간 초안을 업데이트하지 못했습니다.",
        }),
      );
      return;
    }

    if (mode === "page" || mode === "card") {
      setComposerApplyPending(mode, true);
    }

    chatSession.appendMessage(
      buildSharedThreadMessage({
        role: "assistant",
        mode,
        scope: result.scope,
        scopeLabel: resolveChatScopeLabel(mode, result.scope),
        text: result.explanation,
        suggestion: result.suggestion,
        warningMessage: result.warningMessage,
      }),
    );
  }
```

with:

```js
  async function sendComposerPrompt() {
    const mode = chatSession.mode;
    const draftKey = designTarget === "common" ? "common" : "category";
    const prompt = toTrimmedString(composerDrafts[draftKey]);

    if (!prompt) {
      return;
    }

    const targetScope =
      designTarget === "common"
        ? pageAi.pageAiDesign.targetScope
        : cardAi.cardAiDesign.targetScope;
    const scopeLabel = resolveChatScopeLabel(designTarget, targetScope);
    const targetLabel = designTarget === "common" ? "Page" : "Card";
    const userMessage = buildSharedThreadMessage({
      role: "user",
      mode,
      targetLabel,
      scope: targetScope,
      scopeLabel,
      text: prompt,
    });
    const history = buildSharedHistory(
      [...chatSession.messages, userMessage],
      mode,
    );

    chatSession.appendMessage(userMessage);
    setComposerDraft(draftKey, "");
    markDirty();

    const result =
      designTarget === "category"
        ? await cardAi.applyCardAiDesign({
            prompt,
            targetScope,
            history,
            visibleFields: dataSelection.committed,
            fieldLabels: STOREFRONT_FIELD_LABELS,
            productCategoryName: selectedProductCategoryName,
            productRows: currentEntry?.rows,
          })
        : await pageAi.applyPageAiDesign({
            prompt,
            targetScope,
            history,
          });

    if (!result?.ok) {
      chatSession.appendMessage(
        buildSharedThreadMessage({
          role: "assistant",
          mode,
          text:
            result?.error ??
            (designTarget === "category"
              ? cardAi.cardAiErrorMessage
              : pageAi.pageAiErrorMessage) ??
            "작업 공간 초안을 업데이트하지 못했습니다.",
        }),
      );
      return;
    }

    setComposerApplyPending(draftKey, true);

    chatSession.appendMessage(
      buildSharedThreadMessage({
        role: "assistant",
        mode,
        scope: result.scope,
        scopeLabel: resolveChatScopeLabel(designTarget, result.scope),
        text: result.explanation,
        suggestion: result.suggestion,
        warningMessage: result.warningMessage,
      }),
    );
  }
```

- [ ] **Step 9: Rewrite `discardCurrentModeDraft`**

Replace:

```js
  function discardCurrentModeDraft() {
    const mode = chatSession.mode;

    if ((mode === "page" || mode === "autoDesign") && pageModeDraftRef.current) {
      pageAi.hydratePageStyle(pageModeDraftRef.current);
      pageModeDraftRef.current = null;
    }

    if ((mode === "card" || mode === "autoDesign") && cardModeDraftRef.current) {
      cardAi.hydrateCardStyle(
        cardModeDraftRef.current.cardStyle,
        cardModeDraftRef.current.bodySlots,
        cardModeDraftRef.current.generatedCategoryImages,
      );
      cardModeDraftRef.current = null;
    }

    if (mode === "page" || mode === "card" || mode === "autoDesign") {
      setComposerApplyPending(mode, false);
    }

    if (mode === "data" && !dataSelection.isConfirmed) {
      dataSelection.reset(dataSelection.committed);
    }

    if (mode === "page" || mode === "card" || mode === "autoDesign") {
      setComposerDraft(mode, "");
    }
  }
```

with:

```js
  function discardCurrentModeDraft() {
    const mode = chatSession.mode;

    if (mode === "design") {
      if (commonDraftRef.current) {
        pageAi.hydratePageStyle(commonDraftRef.current);
        commonDraftRef.current = null;
      }

      if (categoryDraftRef.current) {
        cardAi.hydrateCardStyle(
          categoryDraftRef.current.cardStyle,
          categoryDraftRef.current.bodySlots,
          categoryDraftRef.current.generatedCategoryImages,
        );
        categoryDraftRef.current = null;
      }

      setComposerApplyPending("common", false);
      setComposerApplyPending("category", false);
      setComposerDraft("common", "");
      setComposerDraft("category", "");
    }

    if (mode === "data" && !dataSelection.isConfirmed) {
      dataSelection.reset(dataSelection.committed);
    }
  }
```

- [ ] **Step 10: Rename `cardMode` to `designMode` and rewrite `composerMode`**

Replace:

```js
  const cardMode = {
    categoryTabs: dataMode.categoryTabs,
    selectedCategoryId: dataMode.selectedCategoryId,
    selectCategory: dataMode.selectCategory,
    mediumCategories: selectedMediumCategories,
    generatedCategoryImages: cardAi.generatedCategoryImages,
    isGeneratingCategoryImage: cardAi.isGeneratingCategoryImage,
    generateCategoryImage: (mediumCategory, options) =>
      cardAi.generateCategoryImage(mediumCategory, {
        ...options,
        representativeProductFields: (() => {
          const representativeRow = (currentEntry?.rows ?? []).find(
            (row) => row?.medium_category === mediumCategory,
          );

          return { spec: representativeRow?.spec, nutrient: representativeRow?.nutrient };
        })(),
      }),
  };

  const composerMode =
    chatSession.mode === "page" ||
    chatSession.mode === "card" ||
    chatSession.mode === "autoDesign"
      ? {
          promptDraft: composerDrafts[chatSession.mode] ?? "",
          setPromptDraft: (value) => setComposerDraft(chatSession.mode, value),
          isApplying:
            chatSession.mode === "page"
              ? pageAi.isApplyingPageAiDesign
              : chatSession.mode === "card"
                ? cardAi.isApplyingCardAiDesign
                : chatSession.mode === "autoDesign"
                  ? pageAi.isApplyingPageAiDesign || cardAi.isApplyingCardAiDesign
                  : false,
          errorMessage:
            chatSession.mode === "page"
              ? pageAi.pageAiErrorMessage
              : chatSession.mode === "card"
                ? cardAi.cardAiErrorMessage
                : chatSession.mode === "autoDesign"
                  ? [pageAi.pageAiErrorMessage, cardAi.cardAiErrorMessage]
                      .filter(Boolean)
                      .join(" ")
                  : "",
          canSend: Boolean(
            toTrimmedString(composerDrafts[chatSession.mode] ?? ""),
          ),
          sendPrompt: sendComposerPrompt,
          exitMode: exitComposerMode,
          showApplyAction:
            chatSession.mode === "page" ||
            chatSession.mode === "card" ||
            chatSession.mode === "autoDesign",
          canApply:
            chatSession.mode === "page"
              ? pendingComposerApply.page
              : chatSession.mode === "card"
                ? pendingComposerApply.card
                : chatSession.mode === "autoDesign"
                  ? pendingComposerApply.autoDesign
                  : false,
          applyDraft: () => applyCurrentModeDraft(chatSession.mode),
          targetOptions:
            chatSession.mode === "page"
              ? PAGE_AI_TARGET_SCOPE_OPTIONS
              : chatSession.mode === "card"
                ? CARD_AI_TARGET_SCOPE_OPTIONS
                : [],
          selectedTargetId:
            chatSession.mode === "page"
              ? pageAi.pageAiDesign.targetScope
              : chatSession.mode === "card"
                ? cardAi.cardAiDesign.targetScope
                : "",
          setTargetId:
            chatSession.mode === "page"
              ? pageAi.setTargetScope
              : chatSession.mode === "card"
                ? cardAi.setTargetScope
                : () => {},
        }
      : null;
```

with:

```js
  const designMode = {
    categoryTabs: [
      { id: "common", label: "공통 요소" },
      ...dataMode.categoryTabs,
    ],
    selectedCategoryId: designTarget === "common" ? "common" : selectedProductCategoryName,
    selectCategory: selectDesignTarget,
    mediumCategories: selectedMediumCategories,
    generatedCategoryImages: cardAi.generatedCategoryImages,
    isGeneratingCategoryImage: cardAi.isGeneratingCategoryImage,
    generateCategoryImage: (mediumCategory, options) =>
      cardAi.generateCategoryImage(mediumCategory, {
        ...options,
        representativeProductFields: (() => {
          const representativeRow = (currentEntry?.rows ?? []).find(
            (row) => row?.medium_category === mediumCategory,
          );

          return { spec: representativeRow?.spec, nutrient: representativeRow?.nutrient };
        })(),
      }),
  };

  const composerDraftKey = designTarget === "common" ? "common" : "category";

  const composerMode =
    chatSession.mode === "design"
      ? {
          copy: getStorefrontDesignComposerCopy(designTarget),
          promptDraft: composerDrafts[composerDraftKey] ?? "",
          setPromptDraft: (value) => setComposerDraft(composerDraftKey, value),
          isApplying:
            designTarget === "common"
              ? pageAi.isApplyingPageAiDesign
              : cardAi.isApplyingCardAiDesign,
          errorMessage:
            designTarget === "common"
              ? pageAi.pageAiErrorMessage
              : cardAi.cardAiErrorMessage,
          canSend: Boolean(
            toTrimmedString(composerDrafts[composerDraftKey] ?? ""),
          ),
          sendPrompt: sendComposerPrompt,
          exitMode: exitComposerMode,
          showApplyAction: true,
          canApply: pendingComposerApply[composerDraftKey],
          applyDraft: () => applyCurrentModeDraft(chatSession.mode),
          targetOptions:
            designTarget === "common"
              ? PAGE_AI_TARGET_SCOPE_OPTIONS
              : CARD_AI_TARGET_SCOPE_OPTIONS,
          selectedTargetId:
            designTarget === "common"
              ? pageAi.pageAiDesign.targetScope
              : cardAi.cardAiDesign.targetScope,
          setTargetId:
            designTarget === "common" ? pageAi.setTargetScope : cardAi.setTargetScope,
        }
      : null;
```

Add the new import at the top of the file, alongside the existing `storefrontChatModes` usages (there are none yet in this file — this is the first one):

```js
import { getStorefrontDesignComposerCopy } from "../components/chat-workspace/storefrontChatModes";
```

- [ ] **Step 11: Update the returned object**

Replace:

```js
  return {
    status,
    errorMessage,
    selectedProductCategoryName,
    previewConfig,
    previewProductRows: allProductRows,
    officeName,
    nh_name: toTrimmedString(nhName),
    chatSession,
    dataMode,
    cardMode,
    composerMode,
    buildCurrentSavePayload,
    saveCompiledPayload,
    applyCurrentModeDraft,
    undoLastApply,
    switchMode,
  };
```

with:

```js
  return {
    status,
    errorMessage,
    selectedProductCategoryName,
    previewConfig,
    previewProductRows: allProductRows,
    officeName,
    nh_name: toTrimmedString(nhName),
    chatSession,
    dataMode,
    designMode,
    composerMode,
    buildCurrentSavePayload,
    saveCompiledPayload,
    applyCurrentModeDraft,
    undoLastApply,
    switchMode,
  };
```

- [ ] **Step 12: Smoke-check the file has no leftover references**

Run:
```bash
grep -n '"page"\|"card"\|"autoDesign"\|pageModeDraftRef\|cardModeDraftRef\|cardMode\b' react-app/src/features/storefront/hooks/useStorefrontBuilder.js
```
Expected: no output (every reference was renamed in Steps 1–11). This file has no dedicated unit test — Task 4's rewritten `StorefrontBuilderPage.test.jsx` is what proves this hook's new behavior end-to-end, so don't expect a passing test run yet; Task 3 must land first for the app to even render.

- [ ] **Step 13: Commit**

```bash
git add react-app/src/features/storefront/hooks/useStorefrontBuilder.js
git commit -m "feat(storefront): replace page/card/autoDesign modes with a single design-target state machine"
```

---

### Task 3: Rewire the chat workspace UI to the new `designMode`/`composer.copy` shape

**Files:**
- Modify: `react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx`
- Modify: `react-app/src/features/storefront/components/chat-workspace/ChatComposerDock.jsx`

**Interfaces:**
- Consumes: `builder.designMode`, `builder.composerMode` (with `.copy`) from Task 2.
- Produces: same rendered output contract Task 4's tests assert against (`data-testid="storefront-chat-composer-dock"`, `data-testid="storefront-sticky-category-tabs"` via the existing `CategoryTabs`, `data-testid="storefront-design-target-chips"` via the existing `DesignTargetChipsBubble`).

- [ ] **Step 1: Rewrite `StorefrontChatWorkspace.jsx`**

Replace the full file with:

```jsx
import FieldSelectionDock from './FieldSelectionDock';
import ChatComposerDock from './ChatComposerDock';
import ModeChoiceBubble from './ModeChoiceBubble';
import StorefrontChatThread from './StorefrontChatThread';
import styles from './StorefrontChatWorkspace.module.css';

export default function StorefrontChatWorkspace({ session, builder }) {
  const dataMode = builder?.dataMode;
  const designMode = builder?.designMode;
  const composerMode = builder?.composerMode;
  const isDataMode = session.mode === 'data' && dataMode;
  const isDesignMode = session.mode === 'design' && designMode;
  const isCategoryDesignTarget = isDesignMode && designMode.selectedCategoryId !== 'common';
  const modeChoiceMessage = session.messages.find(
    (message) => message.kind === 'mode-choice',
  );

  async function handleApplyDataMode() {
    if (!dataMode) {
      return;
    }

    await dataMode.applyChanges?.();
  }

  return (
    <section
      className={styles.workspace}
      data-testid="storefront-chat-workspace"
    >
      <h2 className={styles.title}>스토어프론트 AI 작업 공간</h2>

      {modeChoiceMessage ? (
        <ModeChoiceBubble
          message={modeChoiceMessage}
          onChooseMode={session.chooseMode}
        />
      ) : null}

      <StorefrontChatThread
        canUndo={Boolean(session.lastApplySnapshot)}
        onUndo={builder.undoLastApply}
        session={session}
      />

      {isDataMode ? (
        <FieldSelectionDock dataMode={dataMode} onApply={handleApplyDataMode} />
      ) : composerMode ? (
        <div className={styles.composerShell}>
          <ChatComposerDock
            composer={composerMode}
            categoryTabsMode={isDesignMode ? designMode : null}
            categoryImageMode={isCategoryDesignTarget ? designMode : null}
          />
        </div>
      ) : (
        <div className={styles.scaffoldPanel} />
      )}
    </section>
  );
}
```

- [ ] **Step 2: Update `ChatComposerDock.jsx` to read `composer.copy` instead of looking up copy by mode**

Replace:

```jsx
import CategoryImageGenPanel from './CategoryImageGenPanel';
import CategoryTabs from './CategoryTabs';
import DesignTargetChipsBubble from './DesignTargetChipsBubble';
import { getStorefrontComposerCopy } from './storefrontChatModes';
import styles from './ChatComposerDock.module.css';

export default function ChatComposerDock({ mode, composer, categoryTabsMode, categoryImageMode }) {
  const copy = getStorefrontComposerCopy(mode);

  if (!copy || !composer) {
    return null;
  }
```

with:

```jsx
import CategoryImageGenPanel from './CategoryImageGenPanel';
import CategoryTabs from './CategoryTabs';
import DesignTargetChipsBubble from './DesignTargetChipsBubble';
import styles from './ChatComposerDock.module.css';

export default function ChatComposerDock({ composer, categoryTabsMode, categoryImageMode }) {
  const copy = composer?.copy;

  if (!copy || !composer) {
    return null;
  }
```

The rest of the file (everything below this point) is unchanged — it already only reads `copy.title`, `copy.description`, `copy.discardLabel`, `copy.targetLabel`, `copy.placeholder`, `copy.sendLabel`, and `composer.*`.

- [ ] **Step 3: Commit**

```bash
git add react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx react-app/src/features/storefront/components/chat-workspace/ChatComposerDock.jsx
git commit -m "feat(storefront): wire chat workspace to the unified design mode"
```

---

### Task 4: Rewrite the `StorefrontBuilderPage` integration tests for the unified flow

**Context:** `StorefrontBuilderPage.test.jsx` was already stale before this plan — 7 of its 10 tests fail on `main` today, looking for buttons like `"1. 페이지 전반 디자인 수정"` and an `"적용"` button that don't exist in the current UI (current mode labels have no numbering, and the apply button is `"저장하기"`). This task replaces all mode-choice-dependent tests with ones matching the Task 1–3 behavior. The 2 non-mode tests (loading state, error state) are correct as-is and are carried over unchanged.

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

**Interfaces:**
- Consumes: `StorefrontBuilderPage` (from Task 3's wiring, atop Task 2's hook), mocked `fetchOfficeProductDataEntries`, `fetchStorefrontConfig`, `upsertStorefrontConfig`, `requestPageStyleAiIntent`, `requestCardStyleAiIntent` — same mock points as the existing file.

- [ ] **Step 1: Replace the whole file**

```jsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOfficeProductDataEntries } from "../../office-product-editor/services/office-product-data/officeProductDataReadService";
import { requestCardStyleAiIntent } from "../model/card-design/ai-request/cardStyleAiOrchestrator";
import { requestPageStyleAiIntent } from "../model/page-design/ai-request/pageStyleAiOrchestrator";
import StorefrontBuilderPage from "../pages/StorefrontBuilderPage";
import {
  fetchStorefrontConfig,
  upsertStorefrontConfig,
} from "../model/storefront-config/storefrontConfigOrchestrator";

vi.mock(
  "../../office-product-editor/services/office-product-data/officeProductDataReadService",
  () => ({
    fetchOfficeProductDataEntries: vi.fn(),
  }),
);

vi.mock("../model/storefront-config/storefrontConfigOrchestrator", () => ({
  fetchStorefrontConfig: vi.fn(),
  upsertStorefrontConfig: vi.fn(),
}));

vi.mock("../model/page-design/ai-request/pageStyleAiOrchestrator", () => ({
  requestPageStyleAiIntent: vi.fn(),
}));

vi.mock("../model/card-design/ai-request/cardStyleAiOrchestrator", () => ({
  requestCardStyleAiIntent: vi.fn(),
}));

const PRODUCT_ENTRIES = [
  {
    id: 11,
    officeCode: "OFF-1",
    officeName: "Demo Office",
    categoryName: "Fertilizer Upload",
    rowCount: 2,
    sourceFileName: "fertilizer.xlsx",
    updatedAt: "2026-06-15T00:00:00Z",
    rows: [
      {
        product_category_name: "Fertilizer Upload",
        product_name: "Alpha",
        spec: "20kg",
        large_category: "Fertilizer",
        medium_category: "Premium",
        tax_price: 1000,
      },
    ],
  },
  {
    id: 12,
    officeCode: "OFF-1",
    officeName: "Demo Office",
    categoryName: "Pesticide Upload",
    rowCount: 1,
    sourceFileName: "pesticide.xlsx",
    updatedAt: "2026-06-16T00:00:00Z",
    rows: [
      {
        product_category_name: "Pesticide Upload",
        product_name: "Beta",
        usage: "Leaf spray",
        detail_category: "Leaf Care",
        zero_tax_price: 2500,
      },
    ],
  },
];

const EXISTING_CONFIG = {
  officeCode: "OFF-1",
  pageConfig: {
    schemaVersion: 1,
    designDirection: "friendly",
    theme: { brandColor: "#1d4a2e", backgroundTone: "mint" },
    nav: {
      title: "Existing guide",
      subtitle: "Existing subtitle",
      logoUrl: "",
    },
    searchSection: {
      enabled: true,
      placeholder: "Search products",
      variant: "pill",
    },
    categoryChips: { enabled: true, sticky: true },
  },
  navConfig: {
    title: "Existing guide",
    subtitle: "Existing subtitle",
    brandColor: "#1d4a2e",
    searchPlaceholder: "Search products",
    logoUrl: "",
    searchVariant: "pill",
  },
  categoryConfigs: [
    {
      productCategoryName: "Fertilizer Upload",
      categoryConfig: {
        schemaVersion: 1,
        displayName: "Fertilizer Upload",
        sourceCategoryName: "Fertilizer Upload",
        selectedMediumCategories: ["Premium"],
        representativeMediumCategory: "Premium",
        layoutStyle: { variant: "card-grid" },
        cardDesign: {
          visibleFields: ["product_name", "spec", "tax_price"],
          style: {
            layout: "grid",
            accentColor: "#1d4a2e",
            fontSize: "medium",
            cardsPerRow: 2,
          },
        },
      },
      updatedAt: "2026-06-15T00:00:00Z",
    },
    {
      productCategoryName: "Pesticide Upload",
      categoryConfig: {
        schemaVersion: 1,
        displayName: "Pesticide Upload",
        sourceCategoryName: "Pesticide Upload",
        selectedMediumCategories: [],
        representativeMediumCategory: "",
        layoutStyle: { variant: "card-grid" },
        cardDesign: {
          visibleFields: ["product_name", "usage", "zero_tax_price"],
          style: {
            layout: "grid",
            accentColor: "#1d4a2e",
            fontSize: "medium",
            cardsPerRow: 2,
          },
        },
      },
      updatedAt: "2026-06-16T00:00:00Z",
    },
  ],
  hiddenProducts: [],
  updatedAt: "2026-06-15T00:00:00Z",
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("StorefrontBuilderPage", () => {
  it("shows a loading state while fetching", () => {
    fetchOfficeProductDataEntries.mockReturnValue(new Promise(() => {}));
    fetchStorefrontConfig.mockReturnValue(new Promise(() => {}));

    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(
      screen.getByText("스토어프론트 빌더를 불러오는 중.."),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("storefront-chat-workspace"),
    ).not.toBeInTheDocument();
  });

  it("shows an error message when a fetch rejects", async () => {
    fetchOfficeProductDataEntries.mockRejectedValue(new Error("boom"));
    fetchStorefrontConfig.mockResolvedValue(null);

    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(
      await screen.findByText("스토어프론트 빌더를 불러오지 못했습니다."),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("storefront-chat-workspace"),
    ).not.toBeInTheDocument();
  });

  it("shows exactly the data and design mode-choice buttons", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    const bubble = await screen.findByTestId("storefront-mode-choice-bubble");

    expect(
      within(bubble).getByRole("button", { name: "대분류별 표시할 데이터선택" }),
    ).toBeInTheDocument();
    expect(
      within(bubble).getByRole("button", { name: "AI 디자인 수정" }),
    ).toBeInTheDocument();
    expect(within(bubble).getAllByRole("button")).toHaveLength(2);
  });

  it("enters design mode on the common-elements tab by default and renders the page-style composer", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(
      await screen.findByRole("button", { name: "AI 디자인 수정" }),
    );

    expect(
      await screen.findByTestId("storefront-chat-composer-dock"),
    ).toBeInTheDocument();
    expect(screen.getByText("공통 요소 디자인 작업 공간")).toBeInTheDocument();

    const tabs = screen.getByTestId("storefront-sticky-category-tabs");

    expect(within(tabs).getByRole("tab", { name: "공통 요소" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      within(tabs).getByRole("tab", { name: "Fertilizer Upload" }),
    ).toHaveAttribute("aria-selected", "false");
    expect(
      within(tabs).getByRole("tab", { name: "Pesticide Upload" }),
    ).toHaveAttribute("aria-selected", "false");
  });

  it("sends a common-elements prompt through requestPageStyleAiIntent and shows the reply", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestPageStyleAiIntent.mockResolvedValue({
      intent: {},
      explanation: "Page styling updated for the shared workspace preview.",
      suggestion: "Consider tightening the header after this pass.",
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(
      await screen.findByRole("button", { name: "AI 디자인 수정" }),
    );

    const composerInput = await screen.findByTestId(
      "storefront-chat-composer-input",
    );
    await user.type(composerInput, "Refresh the page tone and search area.");
    await user.click(screen.getByTestId("storefront-chat-composer-send"));

    expect(
      await screen.findByText(
        "Page styling updated for the shared workspace preview.",
      ),
    ).toBeInTheDocument();
    expect(requestPageStyleAiIntent).toHaveBeenCalledTimes(1);
    expect(requestCardStyleAiIntent).not.toHaveBeenCalled();
  });

  it("switches to a category tab and sends a card-design prompt through requestCardStyleAiIntent", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestCardStyleAiIntent.mockResolvedValue({
      intent: {},
      explanation: "Card styling updated for the selected category.",
      suggestion: null,
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(
      await screen.findByRole("button", { name: "AI 디자인 수정" }),
    );
    await user.click(
      await screen.findByRole("tab", { name: "Fertilizer Upload" }),
    );

    expect(screen.getByText("카드 디자인 작업 공간")).toBeInTheDocument();

    const composerInput = screen.getByTestId("storefront-chat-composer-input");
    await user.type(composerInput, "Make the price field bold.");
    await user.click(screen.getByTestId("storefront-chat-composer-send"));

    expect(
      await screen.findByText("Card styling updated for the selected category."),
    ).toBeInTheDocument();
    expect(requestCardStyleAiIntent).toHaveBeenCalledTimes(1);
    expect(requestPageStyleAiIntent).not.toHaveBeenCalled();
  });

  it("discards an unapplied draft instead of saving it when switching tabs", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestPageStyleAiIntent.mockResolvedValue({
      intent: { palette: { accentHex: "#14532d" } },
      explanation: "페이지 톤을 정리했습니다.",
      suggestion: null,
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(
      await screen.findByRole("button", { name: "AI 디자인 수정" }),
    );
    await user.type(
      screen.getByTestId("storefront-chat-composer-input"),
      "초록 느낌으로 정리해줘",
    );
    await user.click(screen.getByTestId("storefront-chat-composer-send"));

    expect(
      await screen.findByRole("button", { name: "저장하기" }),
    ).toBeEnabled();

    await user.click(
      screen.getByRole("tab", { name: "Fertilizer Upload" }),
    );

    expect(screen.getByText("카드 디자인 작업 공간")).toBeInTheDocument();
    expect(upsertStorefrontConfig).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "저장하기" })).toBeDisabled();
  });

  it("applies through 저장하기 and supports one-level undo via 되돌리기", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);
    requestPageStyleAiIntent.mockResolvedValue({
      intent: { palette: { accentHex: "#14532d" } },
      explanation: "페이지 톤을 정리했습니다.",
      suggestion: null,
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" nhName="NH" />);

    await user.click(
      await screen.findByRole("button", { name: "AI 디자인 수정" }),
    );
    await user.type(
      screen.getByTestId("storefront-chat-composer-input"),
      "초록 느낌으로 정리해줘",
    );
    await user.click(screen.getByTestId("storefront-chat-composer-send"));
    await user.click(await screen.findByRole("button", { name: "저장하기" }));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);
    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];

    expect(savedPayload.pageConfig.pageStyle.palette.accentHex).toBe("#14532d");

    const undoButton = await screen.findByRole("button", { name: "되돌리기" });

    expect(undoButton).toBeInTheDocument();
    expect(
      screen.getAllByTestId("storefront-mode-choice-bubble").length,
    ).toBeGreaterThan(0);

    await user.click(undoButton);

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(2);
    expect(
      (await screen.findAllByTestId("storefront-mode-choice-bubble")).length,
    ).toBeGreaterThan(0);
  });

  it("keeps data mode working: category tabs, per-category field toggles, and 저장하기", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(
      await screen.findByRole("button", {
        name: "대분류별 표시할 데이터선택",
      }),
    );

    expect(
      await screen.findByTestId("storefront-field-selection-dock"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("storefront-chat-composer-dock"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("data-field-row-tax_price")).toBeInTheDocument();
    expect(
      screen.queryByTestId("data-field-row-zero_tax_price"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Pesticide Upload" }));

    expect(
      await screen.findByTestId("data-field-row-zero_tax_price"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("data-field-row-tax_price"),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the full storefront suite and fix any remaining fallout**

Run: `npx vitest run src/features/storefront src/features/public-storefront src/common`

Expected: `StorefrontBuilderPage.test.jsx` — 10/10 pass. If anything else in the suite fails, read the failure output (not just the summary) — it will point at a literal `"page"`/`"card"`/`"autoDesign"` reference somewhere Task 2's Step 12 grep missed, or a leftover `mode` prop assumption in a file this plan didn't anticipate touching. Fix at the source, don't patch the test to match a bug.

- [ ] **Step 3: Commit**

```bash
git add react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
git commit -m "test(storefront): rewrite StorefrontBuilderPage integration tests for the unified design-tab flow"
```

---

## Self-Review Notes

**Spec coverage:**
- "AI 통합 디자인에 공통요소/상세디자인 합치기" → Task 2 removes the `autoDesign` dual-apply branch and the standalone `page`/`card` modes; `ModeChoiceBubble` drops to 2 buttons (Task 1).
- "카테고리탭에 공통요소 + 대분류 렌더" → Task 2's `designMode.categoryTabs` prepends `{ id: 'common', label: '공통 요소' }` ahead of the existing category tabs.
- "각 카테고리탭 클릭시 수정대상 렌더되도록" → Task 2's `selectDesignTarget` swaps `designTarget`, which Task 2's `composerMode` and Task 3's `ChatComposerDock` use to render the matching copy/composer/target-options for that tab.

**Placeholder scan:** every step above has literal, complete code — no TBDs.

**Type/interface consistency:** `designMode.selectCategory` = `selectDesignTarget`, consumed by `CategoryTabs`'s existing `onClick={() => categoryTabsMode.selectCategory(tab.id)}` — verified against the current `CategoryTabs.jsx` source, unchanged. `composer.copy` is produced in Task 2 and consumed in Task 3's `ChatComposerDock` — same 6 fields on both sides (`title`, `description`, `placeholder`, `discardLabel`, `sendLabel`, `targetLabel`).
