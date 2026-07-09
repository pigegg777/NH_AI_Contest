# Storefront Single-Chat Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the storefront builder from a visible multi-step wizard into one chat-style workspace while preserving the current field-selection, AI-design, preview, and save contracts.

**Architecture:** Keep the core state in `useStorefrontBuilder`, `useDataSelectionDraft`, `usePageAiDesign`, `useCardAiDesign`, and `useUnifiedDesignSession`. Add a thin conversation-shell UI that renders stage prompts, summary cards, and stage-local actions around the existing builder state instead of inventing a new persistence model or new AI orchestration layer.

**Tech Stack:** React, CSS Modules, Vite, Vitest, React Testing Library, existing storefront builder hooks/components

---

## File Structure

- Create: `react-app/src/features/storefront/components/chat-builder/StorefrontConversationPanel.jsx`
- Create: `react-app/src/features/storefront/components/chat-builder/StorefrontConversationPanel.module.css`
- Create: `react-app/src/features/storefront/components/chat-builder/SelectionSummaryCard.jsx`
- Create: `react-app/src/features/storefront/components/chat-builder/SelectionSummaryCard.module.css`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/components/unified-design/UnifiedDesignEditor.jsx`
- Modify: `react-app/src/features/storefront/components/unified-design/UnifiedDesignEditor.module.css`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPreviewScreen.test.jsx`

### Task 1: Lock the new always-open chat entry flow in page tests

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`

- [ ] **Step 1: Write the failing entry-flow test**

Add a test that verifies:

- the builder no longer waits behind `start-storefront-builder`
- the first render after loading shows one chat-style prompt
- registered data options are visible immediately
- choosing a data set opens field selection without clicking a generic `다음`

Use this shape:

```jsx
it('opens directly into the chat-style builder and auto-advances from data choice to field choice', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" />);

  expect(screen.queryByTestId('start-storefront-builder')).not.toBeInTheDocument();
  expect(await screen.findByTestId('chat-stage-data-picker')).toBeInTheDocument();
  expect(screen.getByText(/수정할 데이터를 선택/)).toBeInTheDocument();
  expect(screen.getByText('fertilizer.xlsx')).toBeInTheDocument();

  await user.click(screen.getByTestId('chat-select-product-category-Fertilizer Upload'));

  expect(await screen.findByTestId('chat-stage-field-picker')).toBeInTheDocument();
  expect(screen.getByText(/카드에 노출할 필드/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "opens directly into the chat-style builder and auto-advances from data choice to field choice"
```

Expected: FAIL because the page still renders the hero start gate and still depends on explicit next-step navigation.

- [ ] **Step 3: Move the builder into an always-open session**

In `useStorefrontBuilder.js`, remove the user-visible dependency on `startSession()` by setting the session open when loading succeeds.

The state shape should move toward:

```js
setHasStarted(true);
setCurrentStep(0);
```

and `selectProductCategory(categoryName)` should auto-advance to field selection:

```js
function selectProductCategory(categoryName) {
  const isDifferentCategory =
    toTrimmedString(categoryName) !==
    toTrimmedString(selectedProductCategoryName);

  if (isDifferentCategory) {
    markDirty();
    unifiedDesign.resetSession();
    pageAi.discardPageAiDesignSession();
    cardAi.discardCardAiDesignSession();
  }

  hydrateCategoryDraft(categoryName, productEntries, existingConfig);
  setHasStarted(true);
  setCurrentStep(DATA_SELECTION_STEP_INDEX);
}
```

- [ ] **Step 4: Remove the hero/start gate from the page**

Replace the current left-column conditional in `StorefrontBuilderPage.jsx`:

```jsx
{!builder.hasStarted ? (
  <section className={styles.heroPanel}>...</section>
) : (
  <>...</>
)}
```

with a single always-on conversation mount point:

```jsx
<StorefrontConversationPanel builder={builder} />
```

Keep the preview panel unchanged on the right.

- [ ] **Step 5: Re-run the focused test**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "opens directly into the chat-style builder and auto-advances from data choice to field choice"
```

Expected: PASS.

### Task 2: Lock the back/confirm/reset rules before building the full shell

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`

- [ ] **Step 1: Write the failing field-stage navigation test**

Add a test for the field-selection stage contract:

- `이전` returns to the registered-data picker
- `이 필드로 진행` moves to design
- the design stage is not reachable from draft field changes alone

Use this shape:

```jsx
it('uses explicit back and confirm actions inside field selection', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" />);

  await user.click(await screen.findByTestId('chat-select-product-category-Fertilizer Upload'));
  expect(screen.getByTestId('chat-stage-field-picker')).toBeInTheDocument();

  await user.click(screen.getByTestId('chat-field-selection-back'));
  expect(await screen.findByTestId('chat-stage-data-picker')).toBeInTheDocument();

  await user.click(screen.getByTestId('chat-select-product-category-Fertilizer Upload'));
  await user.click(screen.getByTestId('chat-confirm-field-selection'));

  expect(await screen.findByTestId('unified-design-editor')).toBeInTheDocument();
});
```

- [ ] **Step 2: Write the failing design-preservation test**

Add a test that proves we preserve design state when fields were not changed:

```jsx
it('preserves the existing design state when returning from design to fields without changing them', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" />);

  await user.click(await screen.findByTestId('chat-select-product-category-Fertilizer Upload'));
  await user.click(screen.getByTestId('chat-confirm-field-selection'));
  await user.click(screen.getByTestId('unified-design-target-card'));
  await user.type(screen.getByTestId('unified-design-prompt'), 'keep this draft');

  await user.click(screen.getByTestId('chat-design-back'));
  await user.click(screen.getByTestId('chat-confirm-field-selection'));

  expect(await screen.findByTestId('unified-design-target-card')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('unified-design-prompt')).toHaveValue('keep this draft');
});
```

- [ ] **Step 3: Run the two focused tests to verify RED**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "explicit back and confirm actions inside field selection|preserves the existing design state when returning from design to fields without changing them"
```

Expected: FAIL because the builder still relies on footer step navigation and does not have stage-local buttons.

- [ ] **Step 4: Add explicit stage actions to the builder hook**

Extend `useStorefrontBuilder.js` with stage-local navigation helpers:

```js
function reopenCategorySelection() {
  setCurrentStep(0);
}

function reopenFieldSelection() {
  setCurrentStep(DATA_SELECTION_STEP_INDEX);
}
```

Then update `confirmDataSelection()` so it only resets downstream state when fields actually changed:

```js
function confirmDataSelection() {
  const hasFieldChanges = !dataSelection.isConfirmed;

  markDirty();
  dataSelection.confirm();

  if (hasFieldChanges) {
    cardAi.hydrateCardStyle();
    unifiedDesign.resetSession();
  }

  setCurrentStep(FINAL_STEP_INDEX);
}
```

Keep page AI state intact here. Do **not** call `pageAi.hydratePageStyle()` or otherwise reset page style during field reconfirm.

- [ ] **Step 5: Expose the new actions through the returned builder contract**

Add these shapes near the returned object:

```js
const conversationFlow = {
  reopenCategorySelection,
  reopenFieldSelection,
};

return {
  ...,
  conversationFlow,
};
```

and keep existing `dataSelectionStep.confirmDataSelection` plus `goPrevious` only if tests still need it elsewhere.

- [ ] **Step 6: Re-run the two focused tests**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "explicit back and confirm actions inside field selection|preserves the existing design state when returning from design to fields without changing them"
```

Expected: the tests still fail at the UI layer, but the hook-side behavior is ready for the new shell.

### Task 3: Build the conversation shell and summary cards

**Files:**
- Create: `react-app/src/features/storefront/components/chat-builder/StorefrontConversationPanel.jsx`
- Create: `react-app/src/features/storefront/components/chat-builder/StorefrontConversationPanel.module.css`
- Create: `react-app/src/features/storefront/components/chat-builder/SelectionSummaryCard.jsx`
- Create: `react-app/src/features/storefront/components/chat-builder/SelectionSummaryCard.module.css`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css`

- [ ] **Step 1: Write the failing summary-collapse test**

Add a test that locks the single-thread presentation:

```jsx
it('collapses completed data and field stages into summary cards with re-open actions', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" />);

  await user.click(await screen.findByTestId('chat-select-product-category-Fertilizer Upload'));
  await user.click(screen.getByTestId('chat-confirm-field-selection'));

  expect(await screen.findByTestId('chat-summary-selected-data')).toBeInTheDocument();
  expect(screen.getByTestId('chat-summary-visible-fields')).toBeInTheDocument();
  expect(screen.getByTestId('chat-reopen-data-selection')).toBeInTheDocument();
  expect(screen.getByTestId('chat-reopen-field-selection')).toBeInTheDocument();
  expect(screen.queryByTestId('chat-stage-data-picker')).not.toBeInTheDocument();
  expect(screen.queryByTestId('chat-stage-field-picker')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the summary test to verify RED**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "collapses completed data and field stages into summary cards with re-open actions"
```

Expected: FAIL because no conversation shell or summary cards exist yet.

- [ ] **Step 3: Create the summary card component**

Create `SelectionSummaryCard.jsx` with one clear responsibility:

```jsx
import styles from './SelectionSummaryCard.module.css';

export default function SelectionSummaryCard({
  title,
  description,
  meta = [],
  actionLabel,
  actionTestId,
  onAction,
  testId,
}) {
  return (
    <section className={styles.card} data-testid={testId}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{title}</p>
          <p className={styles.description}>{description}</p>
        </div>
        <button type="button" className={styles.actionButton} data-testid={actionTestId} onClick={onAction}>
          {actionLabel}
        </button>
      </div>
      {meta.length > 0 ? (
        <ul className={styles.metaList}>
          {meta.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Create the conversation-shell component**

Create `StorefrontConversationPanel.jsx` and make it render the one-thread layout:

```jsx
export default function StorefrontConversationPanel({ builder }) {
  const isDataStage = builder.currentStep === 0;
  const isFieldStage = builder.currentStep === 1;
  const isDesignStage = builder.currentStep === 2;

  return (
    <section className={styles.panel}>
      <div className={styles.thread}>
        <div className={styles.assistantCard}>
          <p className={styles.assistantText}>
            {isDataStage
              ? '수정할 데이터를 선택해주세요.'
              : isFieldStage
                ? '카드에 노출할 필드/열을 선택해주세요.'
                : '페이지 또는 카드를 선택해 디자인을 수정해주세요.'}
          </p>
        </div>

        {!isDataStage ? <SelectionSummaryCard ... /> : null}
        {isDataStage ? <div data-testid="chat-stage-data-picker">...</div> : null}

        {isDesignStage ? <SelectionSummaryCard ... /> : null}
        {isFieldStage ? <div data-testid="chat-stage-field-picker">...</div> : null}

        {isDesignStage ? <UnifiedDesignEditor ... /> : null}
      </div>
    </section>
  );
}
```

Use existing builder state for the actual data cards, field tables, and unified design editor rather than inventing another store.

- [ ] **Step 5: Rewire the page to use the conversation shell**

In `StorefrontBuilderPage.jsx`, replace the old step-switch and footer-nav block with the new shell:

```jsx
<div className={styles.leftColumn}>
  <StorefrontConversationPanel builder={builder} />

  {builder.status === 'save-error' ? (
    <div className={styles.errorBox}>
      {builder.errorMessage || '스토어프론트 초안을 저장하지 못했습니다.'}
    </div>
  ) : null}
</div>
```

Delete the old `STEP_COMPONENTS` loop and the generic `.stepNavActions` footer from this page.

- [ ] **Step 6: Re-run the summary test**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "collapses completed data and field stages into summary cards with re-open actions"
```

Expected: PASS.

### Task 4: Wire stage-specific actions, save-return behavior, and same-data retention

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/components/chat-builder/StorefrontConversationPanel.jsx`
- Modify: `react-app/src/features/storefront/components/unified-design/UnifiedDesignEditor.jsx`
- Modify: `react-app/src/features/storefront/components/unified-design/UnifiedDesignEditor.module.css`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPreviewScreen.test.jsx`

- [ ] **Step 1: Write the failing save-return test**

Add a test that locks the post-save behavior:

```jsx
it('returns to data selection after save while keeping the saved data selected and clearing design chat history', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
  upsertStorefrontConfig.mockResolvedValue(undefined);

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" />);

  await user.click(await screen.findByTestId('chat-select-product-category-Fertilizer Upload'));
  await user.click(screen.getByTestId('chat-confirm-field-selection'));
  await user.type(screen.getByTestId('unified-design-prompt'), 'cool trustworthy blue');
  await user.click(screen.getByTestId('apply-unified-ai-design'));
  await waitFor(() => {
    expect(screen.getAllByTestId('chat-message-target-badge').length).toBeGreaterThan(0);
  });

  await user.click(screen.getByTestId('chat-save-storefront-draft'));

  expect(await screen.findByTestId('chat-stage-data-picker')).toBeInTheDocument();
  expect(screen.getByTestId('chat-product-category-card-Fertilizer Upload')).toHaveAttribute('data-selected', 'true');
  expect(screen.queryAllByTestId('chat-message-target-badge')).toHaveLength(0);
});
```

- [ ] **Step 2: Write the failing different-data reset test**

Add a test that proves changing to another registered data set resets downstream context:

```jsx
it('resets fields, card design, and unified chat when the user switches to a different registered data set', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" />);

  await user.click(await screen.findByTestId('chat-select-product-category-Fertilizer Upload'));
  await user.click(screen.getByTestId('chat-confirm-field-selection'));
  await user.type(screen.getByTestId('unified-design-prompt'), 'keep this draft');
  await user.click(screen.getByTestId('chat-reopen-data-selection'));
  await user.click(screen.getByTestId('chat-select-product-category-Pesticide Upload'));

  expect(await screen.findByTestId('chat-stage-field-picker')).toBeInTheDocument();
  expect(screen.queryAllByTestId('chat-message-target-badge')).toHaveLength(0);
  expect(screen.queryByDisplayValue('keep this draft')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run both focused tests to verify RED**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "returns to data selection after save while keeping the saved data selected and clearing design chat history|resets fields, card design, and unified chat when the user switches to a different registered data set"
```

Expected: FAIL because the save-return and re-open actions are not fully wired yet.

- [ ] **Step 4: Add the save-return reset path in the builder hook**

In `useStorefrontBuilder.js`, keep the persisted state but clear only the unified free-form conversation after save:

```js
async function saveDraft() {
  setStatus('saving');
  setErrorMessage('');

  try {
    const payload = buildStorefrontSavePayload({ ... });

    await upsertStorefrontConfig(payload);
    setExistingConfig(payload);
    setHiddenProducts(payload.hiddenProducts);
    unifiedDesign.resetSession();
    setCurrentStep(0);
    setStatus('saved');
  } catch (error) {
    ...
  }
}
```

Do **not** clear `selectedProductCategoryName`, committed fields, page style, or card style here.

- [ ] **Step 5: Render stage-specific action bars in the conversation panel**

In `StorefrontConversationPanel.jsx`, render the stage actions inline with stable test ids:

```jsx
{isFieldStage ? (
  <div className={styles.actionRow}>
    <button type="button" data-testid="chat-field-selection-back" onClick={builder.conversationFlow.reopenCategorySelection}>
      이전
    </button>
    <button type="button" data-testid="chat-confirm-field-selection" onClick={builder.dataSelectionStep.confirmDataSelection}>
      이 필드로 진행
    </button>
  </div>
) : null}

{isDesignStage ? (
  <div className={styles.actionRow}>
    <button type="button" data-testid="chat-design-back" onClick={builder.conversationFlow.reopenFieldSelection}>
      이전
    </button>
    <button type="button" data-testid="chat-save-storefront-draft" onClick={builder.unifiedDesignStep.saveDraft}>
      저장
    </button>
  </div>
) : null}
```

- [ ] **Step 6: Keep the unified design target chips fixed above the input**

In `UnifiedDesignEditor.jsx`, keep the target selector mounted in the design stage regardless of which message is currently selected. The key UI contract is:

```jsx
<div className={styles.targetSection}>
  <span className={styles.targetLabel}>수정 대상</span>
  <ScopeSelectorStrip
    scopeOptions={TARGET_OPTIONS}
    selectedScope={selectedTarget}
    onScopeChange={onChangeTarget}
    testIdPrefix="unified-design-target"
    listTestId="unified-design-target-list"
  />
</div>
```

Do not reintroduce page/card tabs or separate route-level editors.

- [ ] **Step 7: Re-run the two focused tests**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "returns to data selection after save while keeping the saved data selected and clearing design chat history|resets fields, card design, and unified chat when the user switches to a different registered data set"
```

Expected: PASS.

### Task 5: Regression pass and production verification

**Files:**
- Modify: any touched files from Tasks 1-4
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPreviewScreen.test.jsx`

- [ ] **Step 1: Run the storefront builder page suite**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
```

Expected: PASS with 0 failing tests.

- [ ] **Step 2: Run the preview seam suite**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPreviewScreen.test.jsx
```

Expected: PASS with 0 failing tests.

- [ ] **Step 3: Run the combined storefront verification set**

Run:

```bash
cd react-app
npx vitest run src/App.test.jsx src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx src/features/storefront/__tests__/StorefrontBuilderPreviewScreen.test.jsx src/features/storefront/__tests__/PublicStorefrontPage.test.jsx src/features/public-storefront/__tests__/PublicStorefrontPage.test.jsx
```

Expected: PASS with 0 failing tests.

- [ ] **Step 4: Run the production build**

Run:

```bash
cd react-app
npm run build
```

Expected: build completes with exit code `0`.

- [ ] **Step 5: Self-review the implementation against the spec**

Check the completed work against the PRD and verify:

- no start gate remains
- the flow is rendered as one chat-style workspace
- field confirmation is explicit
- summary cards reopen the earlier stages
- save returns to the first question while keeping the selected data loaded
- different-data switches reset downstream context
- save payload still excludes chat transcript state

If any item fails, fix it before calling the work complete.
