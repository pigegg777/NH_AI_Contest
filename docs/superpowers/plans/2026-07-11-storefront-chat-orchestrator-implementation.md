# Storefront Chat-Orchestrator Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the storefront builder into a single chat-orchestrated workspace with assistant mode choices, sticky category tabs, mode-specific docks, immediate apply persistence, and one-level undo.

**Architecture:** Keep the current storefront data, preview, AI, and save seams in `useStorefrontBuilder`, `usePageAiDesign`, `useCardAiDesign`, `useDataSelectionDraft`, and `buildStorefrontSavePayload`. Add a new `useStorefrontChatSession` orchestration hook plus focused chat-workspace components that own mode transitions, thread rendering, apply-result bubbles, and undo sequencing without changing the saved storefront payload shape.

**Tech Stack:** React, CSS Modules, Vite, Vitest, React Testing Library, existing storefront builder hooks/components, existing Supabase-backed storefront config services

---

## File Structure

- Create: `react-app/src/features/storefront/hooks/useStorefrontChatSession.js`
- Create: `react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx`
- Create: `react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.module.css`
- Create: `react-app/src/features/storefront/components/chat-workspace/StorefrontChatThread.jsx`
- Create: `react-app/src/features/storefront/components/chat-workspace/ModeChoiceBubble.jsx`
- Create: `react-app/src/features/storefront/components/chat-workspace/DesignTargetChipsBubble.jsx`
- Create: `react-app/src/features/storefront/components/chat-workspace/FieldSelectionDock.jsx`
- Create: `react-app/src/features/storefront/components/chat-workspace/ChatComposerDock.jsx`
- Create: `react-app/src/features/storefront/components/chat-workspace/ApplyResultBubble.jsx`
- Create: `react-app/src/features/storefront/__tests__/useStorefrontChatSession.test.js`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css`
- Modify: `react-app/src/features/storefront/components/unified-design/UnifiedDesignEditor.jsx`
- Modify: `react-app/src/features/storefront/components/ai-chat/AiChatPanel.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Modify: `react-app/src/features/storefront/__tests__/AiChatPanel.test.jsx`

### Task 1: Add the chat-session orchestration seam with RED tests first

**Files:**
- Create: `react-app/src/features/storefront/hooks/useStorefrontChatSession.js`
- Create: `react-app/src/features/storefront/__tests__/useStorefrontChatSession.test.js`

- [ ] **Step 1: Write the failing mode-transition and undo tests**

Create `react-app/src/features/storefront/__tests__/useStorefrontChatSession.test.js` with coverage for:

- initial `idle` mode
- selecting a mode appends an assistant-guided transition
- saving a successful apply stores one snapshot only
- a second successful apply overwrites the previous undo checkpoint

Use this test shape:

```js
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useStorefrontChatSession } from '../hooks/useStorefrontChatSession';

describe('useStorefrontChatSession', () => {
  it('starts in idle mode with a mode-choice prompt', () => {
    const { result } = renderHook(() => useStorefrontChatSession());

    expect(result.current.mode).toBe('idle');
    expect(result.current.messages.at(-1)?.kind).toBe('mode-choice');
  });

  it('keeps only the most recent successful apply snapshot for undo', () => {
    const { result } = renderHook(() => useStorefrontChatSession());

    act(() => {
      result.current.recordSuccessfulApply({
        mode: 'page',
        payload: { officeCode: 'OFF-1' },
        summary: 'page applied',
      });
      result.current.recordSuccessfulApply({
        mode: 'card',
        payload: { officeCode: 'OFF-1', category: '비료' },
        summary: 'card applied',
      });
    });

    expect(result.current.lastApplySnapshot.summary).toBe('card applied');
  });
});
```

- [ ] **Step 2: Run the new hook test file to verify RED**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/useStorefrontChatSession.test.js
```

Expected: FAIL because the hook file does not exist yet.

- [ ] **Step 3: Implement the minimal chat-session hook**

Create `useStorefrontChatSession.js` with the smallest complete state seam:

```js
import { useMemo, useRef, useState } from 'react';

const INITIAL_MODE = 'idle';

export function useStorefrontChatSession() {
  const idRef = useRef(0);
  const [mode, setMode] = useState(INITIAL_MODE);
  const [messages, setMessages] = useState(() => [
    { id: 'message-1', kind: 'assistant-text', text: 'AI가 수정하고 싶은 부분을 선택해주세요.' },
    { id: 'message-2', kind: 'mode-choice' },
  ]);
  const [lastApplySnapshot, setLastApplySnapshot] = useState(null);

  function nextId() {
    idRef.current += 1;
    return `message-${idRef.current + 2}`;
  }

  function appendMessage(message) {
    setMessages((current) => [...current, { id: nextId(), ...message }]);
  }

  function chooseMode(nextMode) {
    setMode(nextMode);
    appendMessage({ kind: 'summary', title: 'mode', text: nextMode });
  }

  function returnToIdle() {
    setMode(INITIAL_MODE);
    appendMessage({ kind: 'mode-choice' });
  }

  function recordSuccessfulApply(snapshot) {
    setLastApplySnapshot(snapshot);
    appendMessage({ kind: 'apply-result', text: snapshot.summary, canUndo: true });
  }

  return {
    mode,
    messages,
    lastApplySnapshot,
    chooseMode,
    returnToIdle,
    recordSuccessfulApply,
    appendMessage,
  };
}
```

- [ ] **Step 4: Re-run the hook test file**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/useStorefrontChatSession.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the new orchestration seam**

Run:

```bash
git add react-app/src/features/storefront/hooks/useStorefrontChatSession.js react-app/src/features/storefront/__tests__/useStorefrontChatSession.test.js
git commit -m "test: add storefront chat session seam"
```

Expected: commit succeeds with only the new hook and its tests staged.

### Task 2: Replace the left workspace shell with a chat workspace

**Files:**
- Create: `react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx`
- Create: `react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.module.css`
- Create: `react-app/src/features/storefront/components/chat-workspace/StorefrontChatThread.jsx`
- Create: `react-app/src/features/storefront/components/chat-workspace/ModeChoiceBubble.jsx`
- Create: `react-app/src/features/storefront/components/chat-workspace/ApplyResultBubble.jsx`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Write the failing page-flow test for the new shell**

Extend `StorefrontBuilderPage.test.jsx` with a test that expects:

- no legacy wizard footer
- no start gate
- one chat thread container
- one mode-choice bubble after loading

Use this test shape:

```jsx
it('renders one chat workspace with an assistant mode-choice bubble on load', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

  render(<StorefrontBuilderPage officeCode="OFF-1" nhName="NH" />);

  expect(await screen.findByTestId('storefront-chat-workspace')).toBeInTheDocument();
  expect(screen.getByTestId('storefront-chat-thread')).toBeInTheDocument();
  expect(screen.getByTestId('storefront-mode-choice-bubble')).toBeInTheDocument();
  expect(screen.queryByTestId('start-storefront-builder')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused builder test to verify RED**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "renders one chat workspace with an assistant mode-choice bubble on load"
```

Expected: FAIL because the page still renders the older conversation panel contract.

- [ ] **Step 3: Implement the chat workspace and thread shell**

Create `StorefrontChatWorkspace.jsx`:

```jsx
import StorefrontChatThread from './StorefrontChatThread';
import ModeChoiceBubble from './ModeChoiceBubble';
import ApplyResultBubble from './ApplyResultBubble';
import styles from './StorefrontChatWorkspace.module.css';

export default function StorefrontChatWorkspace({ session, builder, onChooseMode }) {
  return (
    <section className={styles.workspace} data-testid="storefront-chat-workspace">
      <div className={styles.threadWrap}>
        <StorefrontChatThread messages={session.messages} data-testid="storefront-chat-thread" />
        {session.mode === 'idle' ? (
          <ModeChoiceBubble onChooseMode={onChooseMode} />
        ) : null}
        {session.lastApplySnapshot ? (
          <ApplyResultBubble snapshot={session.lastApplySnapshot} />
        ) : null}
      </div>
    </section>
  );
}
```

Create `ModeChoiceBubble.jsx`:

```jsx
export default function ModeChoiceBubble({ onChooseMode }) {
  return (
    <section data-testid="storefront-mode-choice-bubble">
      <button type="button" onClick={() => onChooseMode('page')}>1. 페이지 전반 디자인 수정</button>
      <button type="button" onClick={() => onChooseMode('data')}>2. 카테고리별 데이터 수정</button>
      <button type="button" onClick={() => onChooseMode('card')}>3. 카테고리별 상세 디자인 수정</button>
      <button type="button" onClick={() => onChooseMode('advisory')}>4. 통합 디자인 질문</button>
    </section>
  );
}
```

- [ ] **Step 4: Mount the new workspace from the page**

In `StorefrontBuilderPage.jsx`, replace the old left-column panel import and render with the new workspace:

```jsx
import StorefrontChatWorkspace from '../components/chat-workspace/StorefrontChatWorkspace';
import { useStorefrontChatSession } from '../hooks/useStorefrontChatSession';

export default function StorefrontBuilderPage({ officeCode, nhName }) {
  const builder = useStorefrontBuilder({ officeCode, nhName });
  const session = useStorefrontChatSession();

  ...

  return (
    <div className={styles.page}>
      <div className={styles.workspace}>
        <div className={styles.leftColumn}>
          <StorefrontChatWorkspace
            session={session}
            builder={builder}
            onChooseMode={session.chooseMode}
          />
```

- [ ] **Step 5: Re-run the focused builder test**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "renders one chat workspace with an assistant mode-choice bubble on load"
```

Expected: PASS.

- [ ] **Step 6: Commit the workspace shell**

Run:

```bash
git add react-app/src/features/storefront/components/chat-workspace react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
git commit -m "feat: add storefront chat workspace shell"
```

Expected: commit succeeds with the new workspace shell and page rewiring staged.

### Task 3: Implement mode 2 with sticky category tabs and the field-selection dock

**Files:**
- Create: `react-app/src/features/storefront/components/chat-workspace/FieldSelectionDock.jsx`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Write the failing mode-2 interaction test**

Add a builder page test that expects:

- mode 2 entry from the assistant bubble
- sticky category tabs
- field-selection dock visible only in mode 2
- preview-affecting toggles without per-toggle thread noise

Use this test shape:

```jsx
it('shows sticky category tabs and a field-selection dock only in mode 2', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" nhName="NH" />);

  await user.click(await screen.findByRole('button', { name: '2. 카테고리별 데이터 수정' }));

  expect(await screen.findByTestId('storefront-sticky-category-tabs')).toBeInTheDocument();
  expect(screen.getByTestId('storefront-field-selection-dock')).toBeInTheDocument();
  expect(screen.queryByTestId('storefront-chat-composer-dock')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused mode-2 test to verify RED**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "shows sticky category tabs and a field-selection dock only in mode 2"
```

Expected: FAIL because mode 2-specific shell pieces do not exist yet.

- [ ] **Step 3: Expose selected category and field-toggle seams from the builder**

In `useStorefrontBuilder.js`, add a returned shape that the dock can consume directly:

```js
const categoryTabs = productCategoryOptions.map((option) => ({
  id: option.categoryName,
  label: option.categoryName,
}));

const dataMode = {
  categoryTabs,
  selectedCategoryId: selectedProductCategoryName,
  selectCategory: selectProductCategory,
  availableCategoryFields,
  draftFields: dataSelection.draft,
  committedFields: dataSelection.committed,
  toggleField: dataSelection.toggleField,
  applyLabel: '적용',
};
```

Return `dataMode` alongside the existing preview state.

- [ ] **Step 4: Implement the dock component with existing field table logic**

Create `FieldSelectionDock.jsx`:

```jsx
import DataFieldGroupTable from '../data-selection/DataFieldGroupTable';
import { groupAvailableFields } from '../../model/data-selection/dataSelectionFieldGroupModel';

export default function FieldSelectionDock({ mode, onApply }) {
  const groups = groupAvailableFields(mode.availableCategoryFields);

  return (
    <section data-testid="storefront-field-selection-dock">
      <div data-testid="storefront-sticky-category-tabs">
        {mode.categoryTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={tab.id === mode.selectedCategoryId}
            onClick={() => mode.selectCategory(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataFieldGroupTable
        groupLabel="설명 정보"
        fields={groups.description}
        draftFields={mode.draftFields}
        onToggleField={mode.toggleField}
        testId="data-field-table-description"
      />

      <button type="button" onClick={onApply}>적용</button>
    </section>
  );
}
```

- [ ] **Step 5: Mount the dock only for mode 2**

In `StorefrontChatWorkspace.jsx`, render:

```jsx
{session.mode === 'data' ? (
  <FieldSelectionDock
    mode={builder.dataMode}
    onApply={() => {
      builder.dataMode.apply();
      session.recordSuccessfulApply(builder.dataMode.buildSnapshot());
      session.returnToIdle();
    }}
  />
) : null}
```

Do not mount the dock in other modes.

- [ ] **Step 6: Re-run the focused mode-2 test**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "shows sticky category tabs and a field-selection dock only in mode 2"
```

Expected: PASS.

- [ ] **Step 7: Commit the mode-2 dock**

Run:

```bash
git add react-app/src/features/storefront/components/chat-workspace/FieldSelectionDock.jsx react-app/src/features/storefront/hooks/useStorefrontBuilder.js react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
git commit -m "feat: add storefront data-mode dock"
```

Expected: commit succeeds with mode 2 UI and builder seam changes staged.

### Task 4: Implement modes 1, 3, and 4 with the shared composer contract

**Files:**
- Create: `react-app/src/features/storefront/components/chat-workspace/ChatComposerDock.jsx`
- Create: `react-app/src/features/storefront/components/chat-workspace/DesignTargetChipsBubble.jsx`
- Modify: `react-app/src/features/storefront/components/unified-design/UnifiedDesignEditor.jsx`
- Modify: `react-app/src/features/storefront/components/ai-chat/AiChatPanel.jsx`
- Modify: `react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Modify: `react-app/src/features/storefront/__tests__/AiChatPanel.test.jsx`

- [ ] **Step 1: Write the failing AI-draft and advisory tests**

Add builder page coverage for:

- mode 1 draft preview patch + explanation bubble
- mode 3 category-detail draft patch + explanation bubble
- mode 4 advisory reply with no save/apply controls

Use this test shape:

```jsx
it('uses the shared composer in page, card, and advisory modes with mode-specific behavior', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
  requestPageStyleAiIntent.mockResolvedValue({
    intent: { palette: { accentHex: '#14532d' } },
    explanation: '페이지 전반 색감을 정리했습니다.',
    suggestion: null,
  });

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" nhName="NH" />);

  await user.click(await screen.findByRole('button', { name: '1. 페이지 전반 디자인 수정' }));
  await user.type(screen.getByTestId('storefront-chat-composer-input'), '신뢰감 있게 정리해줘');
  await user.click(screen.getByTestId('storefront-chat-composer-send'));

  expect(await screen.findByText('페이지 전반 색감을 정리했습니다.')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused AI-mode test to verify RED**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "uses the shared composer in page, card, and advisory modes with mode-specific behavior"
```

Expected: FAIL because the shared composer dock and advisory mode are not wired yet.

- [ ] **Step 3: Build the shared composer dock**

Create `ChatComposerDock.jsx`:

```jsx
export default function ChatComposerDock({
  value,
  onChange,
  onSend,
  sendLabel,
  disabled = false,
}) {
  return (
    <section data-testid="storefront-chat-composer-dock">
      <textarea
        data-testid="storefront-chat-composer-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        data-testid="storefront-chat-composer-send"
        onClick={onSend}
        disabled={disabled}
      >
        {sendLabel}
      </button>
    </section>
  );
}
```

Create `DesignTargetChipsBubble.jsx`:

```jsx
export default function DesignTargetChipsBubble({ targets, selectedTarget, onSelect }) {
  return (
    <section data-testid="storefront-design-target-bubble">
      {targets.map((target) => (
        <button
          key={target.id}
          type="button"
          aria-pressed={target.id === selectedTarget}
          onClick={() => onSelect(target.id)}
        >
          {target.label}
        </button>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Adapt the existing AI seams rather than replacing them**

In `StorefrontChatWorkspace.jsx`, wire the composer by mode:

```jsx
const isDesignMode = session.mode === 'page' || session.mode === 'card';
const isAdvisoryMode = session.mode === 'advisory';

{isDesignMode ? (
  <>
    <DesignTargetChipsBubble
      targets={session.mode === 'page' ? builder.pageTargets : builder.cardTargets}
      selectedTarget={builder.selectedDesignTarget}
      onSelect={builder.selectDesignTarget}
    />
    <ChatComposerDock
      value={builder.composerValue}
      onChange={builder.setComposerValue}
      onSend={builder.sendDesignPrompt}
      sendLabel="초안 만들기"
      disabled={builder.isSendingDesignPrompt}
    />
  </>
) : null}

{isAdvisoryMode ? (
  <ChatComposerDock
    value={builder.advisoryValue}
    onChange={builder.setAdvisoryValue}
    onSend={builder.sendAdvisoryPrompt}
    sendLabel="질문하기"
    disabled={builder.isSendingAdvisoryPrompt}
  />
) : null}
```

Keep the actual page/card request work inside the existing AI hooks; the workspace only routes user intent.

- [ ] **Step 5: Add the missing AI panel regression assertions**

In `AiChatPanel.test.jsx`, add or adapt assertions so the panel still:

- renders empty state
- respects send disabled state
- keeps undo optional

Use this shape:

```jsx
expect(screen.getByTestId('apply-ai-suggestion')).toBeDisabled();
expect(screen.queryByTestId('undo-ai-changes')).not.toBeInTheDocument();
```

- [ ] **Step 6: Re-run the focused AI-mode test**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "uses the shared composer in page, card, and advisory modes with mode-specific behavior"
```

Expected: PASS.

- [ ] **Step 7: Commit the multi-mode composer flow**

Run:

```bash
git add react-app/src/features/storefront/components/chat-workspace/ChatComposerDock.jsx react-app/src/features/storefront/components/chat-workspace/DesignTargetChipsBubble.jsx react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx react-app/src/features/storefront/components/unified-design/UnifiedDesignEditor.jsx react-app/src/features/storefront/components/ai-chat/AiChatPanel.jsx react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx react-app/src/features/storefront/__tests__/AiChatPanel.test.jsx
git commit -m "feat: add storefront chat composer modes"
```

Expected: commit succeeds with modes 1, 3, and 4 wired to the shared composer contract.

### Task 5: Wire apply-immediately persistence and one-level undo

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontChatSession.js`
- Modify: `react-app/src/features/storefront/components/chat-workspace/ApplyResultBubble.jsx`
- Modify: `react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Write the failing save-and-undo builder test**

Add a test that verifies:

- apply in mode 1 or 3 calls the existing storefront save path immediately
- the assistant result bubble exposes undo
- undo re-saves the previous snapshot
- the mode returns to idle after both apply and undo

Use this shape:

```jsx
it('applies immediately and supports one-level undo from the assistant result bubble', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
  upsertStorefrontConfig.mockResolvedValue(undefined);
  requestPageStyleAiIntent.mockResolvedValue({
    intent: { palette: { accentHex: '#14532d' } },
    explanation: '페이지를 정리했습니다.',
    suggestion: null,
  });

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" nhName="NH" />);

  await user.click(await screen.findByRole('button', { name: '1. 페이지 전반 디자인 수정' }));
  await user.type(screen.getByTestId('storefront-chat-composer-input'), '초록톤으로 정리해줘');
  await user.click(screen.getByTestId('storefront-chat-composer-send'));
  await user.click(await screen.findByRole('button', { name: '적용' }));

  expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole('button', { name: '되돌리기' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '되돌리기' }));

  expect(upsertStorefrontConfig).toHaveBeenCalledTimes(2);
  expect(await screen.findByTestId('storefront-mode-choice-bubble')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused save/undo test to verify RED**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "applies immediately and supports one-level undo from the assistant result bubble"
```

Expected: FAIL because the workspace does not yet route apply/undo through the session snapshot seam.

- [ ] **Step 3: Build snapshot helpers from the existing payload compiler**

In `useStorefrontBuilder.js`, expose helpers that compile payloads without changing the persistence shape:

```js
function buildCurrentSavePayload() {
  return buildStorefrontSavePayload({
    officeCode,
    existingConfig,
    hiddenProducts,
    selectedProductCategoryName,
    selectedMediumCategories,
    representativeMediumCategory,
    cardStyle: cardAi.cardStyle,
    cardFields: dataSelection.committed,
    bodySlots: cardAi.bodySlots,
    navConfig,
    mobileUiTree,
    pageStyle: pageAi.pageStyle,
    allowedScalarKeys: effectiveScalarKeys,
  });
}

async function saveCompiledPayload(payload) {
  await upsertStorefrontConfig(payload);
  setExistingConfig(payload);
  setHiddenProducts(payload.hiddenProducts);
}
```

- [ ] **Step 4: Route apply and undo through the session snapshot**

In `StorefrontChatWorkspace.jsx`, after a successful apply:

```jsx
const payload = builder.buildCurrentSavePayload();
await builder.saveCompiledPayload(payload);
session.recordSuccessfulApply({
  mode: session.mode,
  payload,
  summary: 'storefront 변경을 저장했습니다.',
});
session.returnToIdle();
```

In `ApplyResultBubble.jsx`, wire undo:

```jsx
export default function ApplyResultBubble({ snapshot, onUndo }) {
  return (
    <section>
      <p>{snapshot.summary}</p>
      <button type="button" onClick={onUndo}>되돌리기</button>
    </section>
  );
}
```

And in the workspace:

```jsx
<ApplyResultBubble
  snapshot={session.lastApplySnapshot}
  onUndo={async () => {
    await builder.saveCompiledPayload(session.lastApplySnapshot.payload);
    session.returnToIdle();
  }}
/>
```

- [ ] **Step 5: Re-run the focused save/undo test**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "applies immediately and supports one-level undo from the assistant result bubble"
```

Expected: PASS.

- [ ] **Step 6: Commit the apply/undo persistence flow**

Run:

```bash
git add react-app/src/features/storefront/hooks/useStorefrontBuilder.js react-app/src/features/storefront/hooks/useStorefrontChatSession.js react-app/src/features/storefront/components/chat-workspace/ApplyResultBubble.jsx react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
git commit -m "feat: add storefront apply and undo flow"
```

Expected: commit succeeds with apply/undo snapshot behavior staged.

### Task 6: Run the storefront regression and production verification pass

**Files:**
- Modify: any touched files from Tasks 1-5
- Test: `react-app/src/features/storefront/__tests__/useStorefrontChatSession.test.js`
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/AiChatPanel.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

- [ ] **Step 1: Run the new chat-session test file**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/useStorefrontChatSession.test.js
```

Expected: PASS with zero failures.

- [ ] **Step 2: Run the storefront builder page suite**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
```

Expected: PASS with zero failures.

- [ ] **Step 3: Run supporting storefront UI seams**

Run:

```bash
cd react-app
npx vitest run src/features/storefront/__tests__/AiChatPanel.test.jsx src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
```

Expected: PASS with zero failures.

- [ ] **Step 4: Run the combined storefront verification set**

Run:

```bash
cd react-app
npx vitest run src/App.test.jsx src/features/storefront/__tests__/useStorefrontChatSession.test.js src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx src/features/storefront/__tests__/AiChatPanel.test.jsx src/features/storefront/__tests__/PublicStorefrontPage.test.jsx src/features/public-storefront/__tests__/PublicStorefrontPage.test.jsx
```

Expected: PASS with zero failures.

- [ ] **Step 5: Run the production build**

Run:

```bash
cd react-app
npm run build
```

Expected: build completes with exit code `0`.

- [ ] **Step 6: Self-review against the spec and PRD**

Check the finished implementation against the documented requirements:

- one chat workspace only
- assistant-bubble mode choice only
- sticky category tabs only in modes 2 and 3
- field-selection dock only in mode 2
- shared composer only in modes 1, 3, and 4
- immediate apply persistence
- one-level undo from the assistant result bubble
- draft discard on mode exit
- existing storefront payload shape unchanged

If any item fails, fix the code before calling the work complete.

- [ ] **Step 7: Commit the regression pass**

Run:

```bash
git add react-app/src/features/storefront react-app/src/App.test.jsx
git commit -m "test: verify storefront chat orchestrator flow"
```

Expected: commit succeeds after all tests and the build pass.
