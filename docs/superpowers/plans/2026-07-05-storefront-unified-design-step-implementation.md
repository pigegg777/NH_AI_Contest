# Storefront Unified Design Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace separate page/card design steps with one unified design step that keeps shared chat context while still applying changes to only the selected target.

**Architecture:** Keep page and card style computation split in `usePageAiDesign` and `useCardAiDesign`, but move step orchestration, unified prompt state, unified message history, and target switching into the storefront builder layer. Reuse the existing chat presentation path, extend it with target badges, and keep the final preview and save payload contracts intact.

**Tech Stack:** React, Vite, Vitest, React Testing Library, existing storefront builder hooks/components

---

## File Structure

- Create: `react-app/src/features/storefront/pages/storefront-builder/UnifiedDesignStep.jsx`
- Create: `react-app/src/features/storefront/pages/storefront-builder/UnifiedDesignStep.module.css`
- Create: `react-app/src/features/storefront/components/unified-design/UnifiedDesignEditor.jsx`
- Create: `react-app/src/features/storefront/components/unified-design/UnifiedDesignEditor.module.css`
- Create: `react-app/src/features/storefront/components/unified-design/UnifiedDesignPromptField.jsx`
- Create: `react-app/src/features/storefront/components/unified-design/UnifiedDesignPromptField.module.css`
- Create: `react-app/src/features/storefront/hooks/useUnifiedDesignSession.js`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/hooks/usePageAiDesign.js`
- Modify: `react-app/src/features/storefront/hooks/useCardAiDesign.js`
- Modify: `react-app/src/features/storefront/components/ai-chat/AiChatPanel.jsx`
- Modify: `react-app/src/features/storefront/components/ai-chat/ChatMessageBubble.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

### Task 1: Red test for the new three-step flow

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Write the failing flow test**

Add a new regression test that asserts:

- the builder goes `category -> data selection -> unified design`
- there is no standalone page-design step in between
- the final step shows one unified design panel

Use this shape:

```jsx
it('uses the three-step flow and lands on one unified design step', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" />);

  await user.click(await screen.findByTestId('start-storefront-builder'));
  await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
  await user.click(screen.getByTestId('builder-go-next'));

  expect(screen.getByTestId('data-field-table-description')).toBeInTheDocument();

  await user.click(screen.getByTestId('builder-go-next'));

  expect(await screen.findByTestId('unified-design-editor')).toBeInTheDocument();
  expect(screen.queryByTestId('page-design-editor')).not.toBeInTheDocument();
  expect(screen.queryByTestId('card-design-editor')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the single test to verify it fails**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "uses the three-step flow and lands on one unified design step"
```

Expected: FAIL because `UnifiedDesignStep` does not exist yet and the flow still visits `PageDesignStep`.

- [ ] **Step 3: Implement the minimal step-flow change**

Update `StorefrontBuilderPage.jsx` to replace the four-step list with:

```jsx
const STEP_COMPONENTS = [
  { Component: ProductCategoryStep, selectStepProps: (builder) => builder.productCategoryStep },
  { Component: DataSelectionStep, selectStepProps: (builder) => builder.dataSelectionStep },
  { Component: UnifiedDesignStep, selectStepProps: (builder) => builder.unifiedDesignStep },
];
```

Update `useStorefrontBuilder.js` step constants to the new indexes:

```js
const DATA_SELECTION_STEP_INDEX = 1;
const FINAL_STEP_INDEX = 2;
```

Also update `handleNextClick` / final-step button conditions so the builder stops rendering `다음` on step index `2`.

- [ ] **Step 4: Run the single test again**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "uses the three-step flow and lands on one unified design step"
```

Expected: still FAIL, but now because the unified step UI has not been implemented yet.

### Task 2: Red test for unified target switching and shared prompt draft

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Create: `react-app/src/features/storefront/hooks/useUnifiedDesignSession.js`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`

- [ ] **Step 1: Write the failing interaction test**

Add a test that:

- reaches the unified design step
- confirms default target is page
- types into one shared prompt field
- switches to card target
- confirms the same draft text is still present

Use this shape:

```jsx
it('defaults to page target and keeps one shared prompt draft when switching targets', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" />);

  await reachUnifiedDesignStep(user);

  expect(screen.getByTestId('unified-design-target-page')).toHaveAttribute('aria-pressed', 'true');

  const prompt = screen.getByTestId('unified-design-prompt');
  await user.type(prompt, 'same draft across targets');
  await user.click(screen.getByTestId('unified-design-target-card'));

  expect(screen.getByTestId('unified-design-target-card')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('unified-design-prompt')).toHaveValue('same draft across targets');
});
```

- [ ] **Step 2: Run that test to verify RED**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "defaults to page target and keeps one shared prompt draft when switching targets"
```

Expected: FAIL because no unified target selector or shared prompt exists.

- [ ] **Step 3: Implement unified design session state**

Create `useUnifiedDesignSession.js` with the single-purpose state:

```js
import { useRef, useState } from 'react';

export function useUnifiedDesignSession() {
  const [selectedTarget, setSelectedTarget] = useState('page');
  const [promptDraft, setPromptDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const messageIdRef = useRef(0);

  function nextMessageId() {
    messageIdRef.current += 1;
    return `unified-design-message-${messageIdRef.current}`;
  }

  return {
    selectedTarget,
    promptDraft,
    messages,
    setSelectedTarget,
    setPromptDraft,
    setMessages,
    nextMessageId,
  };
}
```

Then extend it in the same file with:

- `resetSession()`
- `resetForCategoryChange()`
- `appendUserMessage()`
- `appendAssistantMessage()`

Wire it into `useStorefrontBuilder.js`, not the page component, so step navigation preserves the state.

- [ ] **Step 4: Create the unified editor UI**

Create `UnifiedDesignEditor.jsx` with:

- `data-testid="unified-design-editor"`
- target selector buttons:
  - `unified-design-target-page`
  - `unified-design-target-card`
- one shared prompt field:
  - `unified-design-prompt`

Use `ScopeSelectorStrip` under the target selector instead of building duplicate chip logic.

- [ ] **Step 5: Re-run the target-switch test**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "defaults to page target and keeps one shared prompt draft when switching targets"
```

Expected: PASS.

### Task 3: Red test for target-specific application with one shared history list

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Modify: `react-app/src/features/storefront/hooks/usePageAiDesign.js`
- Modify: `react-app/src/features/storefront/hooks/useCardAiDesign.js`
- Modify: `react-app/src/features/storefront/components/ai-chat/AiChatPanel.jsx`
- Modify: `react-app/src/features/storefront/components/ai-chat/ChatMessageBubble.jsx`

- [ ] **Step 1: Write the failing page-target test**

Add a test that:

- reaches the unified step
- applies a page-style prompt with the shared input
- confirms the page preview changes
- confirms the card layout remains unchanged
- confirms the message list shows a page badge

Use this shape:

```jsx
it('applies only the selected page target and records a page badge in shared history', async () => {
  vi.stubEnv('VITE_STOREFRONT_AI_LOCAL_HEURISTIC', 'true');
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" />);

  await reachUnifiedDesignStep(user);

  await user.type(
    screen.getByTestId('unified-design-prompt'),
    'cool trustworthy blue, make the title bolder',
  );
  await user.click(screen.getByTestId('apply-unified-ai-design'));

  await waitFor(() => {
    expect(screen.getByTestId('storefront-page').style.getPropertyValue('--brand-color')).toBe('#2563eb');
  });

  const sectionEl = screen
    .getByTestId('mobile-preview-device')
    .querySelector('section[data-structural-preset]');
  expect(sectionEl.dataset.structuralPreset).toBe('header-top');
  expect(screen.getByText('페이지')).toBeInTheDocument();
});
```

- [ ] **Step 2: Write the failing card-target test**

Add a sister test that:

- switches to card target
- applies a card prompt
- confirms card layout changes
- confirms the page brand color stays unchanged
- confirms the message list shows a card badge

- [ ] **Step 3: Run the two tests to verify RED**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "selected page target|selected card target"
```

Expected: FAIL because the unified apply path and shared history badges do not exist.

- [ ] **Step 4: Extend page/card AI hooks to accept external request inputs**

Update `usePageAiDesign.js`:

```js
async function applyPageAiDesign(overrides = {}) {
  const normalizedInput = normalizePageAiDesignInput({
    ...pageAiDesign,
    prompt: overrides.prompt ?? pageAiDesign.prompt,
    targetScope: overrides.targetScope ?? pageAiDesign.targetScope,
  });

  const history = Array.isArray(overrides.history)
    ? overrides.history
    : pageAiMessages.slice(-MAX_PAGE_AI_HISTORY_TURNS).map((message) => ({
        role: message.role,
        text: message.text,
      }));

  // existing AI call...

  return {
    ok: true,
    explanation,
    suggestion,
    scope: normalizedInput.targetScope,
  };
}
```

Update `useCardAiDesign.js` the same way, plus return `warningMessage` when present:

```js
return {
  ok: true,
  explanation,
  suggestion,
  scope: normalizedInput.targetScope,
  warningMessage: result.warning,
};
```

Keep the existing internal style mutation logic intact.

- [ ] **Step 5: Implement unified apply orchestration in `useStorefrontBuilder.js`**

Add one builder-level `applyUnifiedDesign()` that:

- reads the current unified prompt
- chooses the active target
- serializes the last shared turns into `{ role, text }[]`
- calls the matching AI hook with override inputs
- appends user/assistant messages into the unified list
- clears the shared prompt draft after the user turn is queued

The routing shape should look like:

```js
if (selectedDesignTarget === 'page') {
  const result = await pageAi.applyPageAiDesign({
    prompt: unifiedPromptDraft,
    targetScope: pageAi.pageAiDesign.targetScope,
    history,
  });
} else {
  const result = await cardAi.applyCardAiDesign({
    prompt: unifiedPromptDraft,
    targetScope: cardAi.cardAiDesign.targetScope,
    history,
    visibleFields: dataSelection.committed,
    fieldLabels: STOREFRONT_FIELD_LABELS,
    productCategoryName: selectedProductCategoryName,
  });
}
```

- [ ] **Step 6: Extend shared chat presentation to show target badges**

Update `AiChatPanel.jsx` so it can pass through `message.targetLabel` and `message.scopeLabel`.

Update `ChatMessageBubble.jsx` so both user and assistant bubbles can render:

```jsx
{message.targetLabel ? <span className={styles.scopeTag}>{message.targetLabel}</span> : null}
{!isUser && message.scopeLabel ? <span className={styles.scopeTag}>{message.scopeLabel}</span> : null}
```

Store `targetLabel` directly in unified messages so scope resolution stays cheap and statically analyzable.

- [ ] **Step 7: Re-run the two tests**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "selected page target|selected card target"
```

Expected: PASS.

### Task 4: Red test for same-category retention and category-change reset

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`

- [ ] **Step 1: Write the failing retention test**

Add a test that:

- reaches the unified step
- switches to card target
- types a draft
- goes back to data selection and forward again
- confirms target and draft are still there

- [ ] **Step 2: Write the failing reset-on-category-change test**

Add a test that:

- reaches the unified step
- creates some shared history
- goes back to category selection
- chooses a different category
- returns to unified design
- confirms:
  - target resets to page
  - prompt is empty
  - old shared messages are gone

- [ ] **Step 3: Run both tests to verify RED**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "retains unified design state|resets unified design state when changing category"
```

Expected: FAIL because the unified session lifecycle is not implemented yet.

- [ ] **Step 4: Implement lifecycle rules in the builder**

In `useStorefrontBuilder.js`:

- keep unified session state untouched on `goPrevious()` / `goNext()`
- when `selectProductCategory()` receives a different category:
  - reset unified target to page
  - clear prompt draft
  - clear unified message history
- do not reset unified session on save

This preserves the new design-session continuity rule.

- [ ] **Step 5: Re-run the retention/reset tests**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "retains unified design state|resets unified design state when changing category"
```

Expected: PASS.

### Task 5: Final regression pass and cleanup

**Files:**
- Modify: `react-app/src/features/storefront/pages/storefront-builder/DataSelectionStep.jsx`
- Optional cleanup: stop importing `PageDesignStep` and `CardDesignStep` from `StorefrontBuilderPage.jsx`

- [ ] **Step 1: Align step copy and step numbers**

Update `DataSelectionStep.jsx` eyebrow/description to match the new 3-step flow.

Create `UnifiedDesignStep.jsx` with the QR/save actions that currently live in `CardDesignStep.jsx`.

- [ ] **Step 2: Reuse static imports and avoid extra render churn**

Apply the Vercel React rules here:

- keep imports direct and static (`bundle-barrel-imports`, `bundle-analyzable-paths`)
- keep derived booleans local to render rather than effect state (`rerender-derived-state-no-effect`)
- avoid inline component definitions in the unified editor path (`rerender-no-inline-components`)
- keep target routing in event handlers / action functions rather than new effects (`rerender-move-effect-to-event`)

- [ ] **Step 3: Run the targeted storefront builder suite**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx src/features/storefront/__tests__/StorefrontBuilderPreviewScreen.test.jsx
```

Expected: PASS with 0 failing tests.

- [ ] **Step 4: Run the broader builder/public verification**

Run:

```bash
cd react-app
npx vitest run src/App.test.jsx src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx src/features/storefront/__tests__/StorefrontView.test.jsx src/features/storefront/__tests__/PublicStorefrontPage.test.jsx src/features/public-storefront/__tests__/PublicStorefrontScreen.test.jsx src/features/public-storefront/__tests__/PublicStorefrontPage.test.jsx src/features/storefront/__tests__/StorefrontBuilderPreviewScreen.test.jsx
```

Expected: PASS with 0 failing tests.

- [ ] **Step 5: Run production build verification**

Run:

```bash
cd react-app
npm run build
```

Expected: build completes with exit code `0`.
