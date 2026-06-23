# Storefront Step Module Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the storefront builder so each step owns its JSX and CSS module, while `StorefrontBuilderPage` shrinks to a page-shell + preview layout module.

**Architecture:** Keep the current storefront behavior and highest behavioral seam (`StorefrontBuilderPage` tests) intact, but move step implementation into intuitive folders. The page module stops owning step-level class names, `useStorefrontBuilder` exposes narrower step-facing interfaces, and large step children move beside the step that owns them.

**Tech Stack:** React 19, Vite, Vitest + Testing Library, CSS Modules, no new dependencies.

## Global Constraints

- Do not change saved storefront payload shape.
- Keep the existing three-step flow and test IDs stable unless a test update is required only for import-path changes.
- `StorefrontBuilderPage.module.css` should own only page shell, workspace, preview shell, and shared navigation actions.
- Each step folder should own its own layout and child module styles.
- This slice stops before a broader `StorefrontView` / `CardGridSection` folder split. That remains a follow-up after the step-owned seam is stable.

---

### Task 1: Baseline the current storefront seams and carve out a shared step shell

**Files:**
- Create: `react-app/src/features/storefront/components/step-shell/StepShell.jsx`
- Create: `react-app/src/features/storefront/components/step-shell/StepShell.module.css`
- Delete: `react-app/src/features/storefront/components/StepShell.jsx`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css`
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Run the current storefront builder tests as the baseline**

Run from `react-app/`:

```bash
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx src/features/storefront/__tests__/PageDesignEditor.test.jsx
```

Expected: PASS before any refactor starts.

- [ ] **Step 2: Create a dedicated step-shell module**

Create `react-app/src/features/storefront/components/step-shell/StepShell.jsx`:

```jsx
import styles from './StepShell.module.css';

export default function StepShell({ eyebrow, title, description, children }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 className={styles.title}>{title}</h2>
        </div>
      </div>
      {description ? <div className={styles.description}>{description}</div> : null}
      {children}
    </section>
  );
}
```

Create `react-app/src/features/storefront/components/step-shell/StepShell.module.css` by moving only the shell-owned rules out of `StorefrontBuilderPage.module.css`:

```css
.panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  border-radius: 32px;
  background: #fff;
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.08);
}

.panelHeader {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.eyebrow {
  margin: 0;
  color: #15803d;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.title {
  margin: 0;
  color: #0f172a;
  font-size: 1.6rem;
  line-height: 1.2;
}

.description {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.6;
}
```

- [ ] **Step 3: Remove the shell rules from `StorefrontBuilderPage.module.css` and repoint imports**

Update imports that currently read:

```jsx
import StepShell from './StepShell';
```

to:

```jsx
import StepShell from './step-shell/StepShell';
```

Then delete `react-app/src/features/storefront/components/StepShell.jsx` after all imports are moved.

- [ ] **Step 4: Re-run the focused builder tests**

Run:

```bash
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx src/features/storefront/__tests__/PageDesignEditor.test.jsx
```

Expected: PASS. The behavior seam should be unchanged; only CSS ownership and import paths move.

---

### Task 2: Move Step 1 into an owned `product-category-step/` folder

**Files:**
- Create: `react-app/src/features/storefront/components/product-category-step/ProductCategoryStep.jsx`
- Create: `react-app/src/features/storefront/components/product-category-step/ProductCategoryStep.module.css`
- Create: `react-app/src/features/storefront/components/product-category-step/page-design/PageDesignEditor.jsx`
- Create: `react-app/src/features/storefront/components/product-category-step/page-design/PageDesignEditor.module.css`
- Create: `react-app/src/features/storefront/components/product-category-step/page-design/PageStylePromptField.jsx`
- Delete: `react-app/src/features/storefront/components/ProductCategoryStep.jsx`
- Delete: `react-app/src/features/storefront/components/PageDesignEditor.jsx`
- Delete: `react-app/src/features/storefront/components/PageDesignEditor.module.css`
- Delete: `react-app/src/features/storefront/components/page-design/PageStylePromptField.jsx`
- Modify: `react-app/src/features/storefront/__tests__/PageDesignEditor.test.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Move `PageDesignEditor` and its prompt field under the Step 1 folder**

Create `product-category-step/page-design/PageDesignEditor.jsx` with the same behavior seam:

```jsx
import panelStyles from '../../../office-product-editor/components/shared/panel.module.css';
import PageStylePromptField from './PageStylePromptField';
import styles from './PageDesignEditor.module.css';

const EDITABLE_SCOPE_ITEMS = [
  { label: '전체 색감', detail: '배경색과 포인트 색상' },
  { label: '헤더 텍스트 스타일', detail: '글자색, 굵기, 자간' },
  { label: '카테고리 칩', detail: '배경색, 글자색, 테두리' },
  { label: '검색창', detail: '크기와 테두리 강도' },
];

export default function PageDesignEditor({ pageAiDesign, onChangePrompt, onApply, isApplying, errorMessage }) {
  return (
    <div className={styles.editor} data-testid="page-design-editor">
      <div className={styles.editorLayout}>
        <div className={styles.promptPanel} data-testid="page-design-prompt-panel">
          <div className={styles.promptPanelHeader}>
            <h4 className={styles.promptPanelTitle}>원하는 페이지 분위기를 먼저 자세히 적어 주세요.</h4>
            <p id="page-style-prompt-help" className={styles.promptPanelDescription}>
              색감, 제목 강조, 검색창 분위기를 한 번에 적으면 AI가 그 범위 안에서 반영합니다.
            </p>
          </div>

          <div className={styles.promptColumn}>
            <PageStylePromptField
              value={pageAiDesign.prompt}
              onChange={onChangePrompt}
              className={styles.promptField}
              describedBy="page-style-prompt-help"
            />

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                data-testid="apply-page-ai-design"
                onClick={onApply}
                disabled={isApplying}
              >
                {isApplying ? '적용 중...' : '페이지 스타일 적용'}
              </button>
            </div>

            {errorMessage ? <div className={panelStyles.errorBox}>{errorMessage}</div> : null}
          </div>
        </div>

        <aside className={styles.scopePanel}>
          <p className={styles.scopeListLabel}>수정 가능 영역</p>
          <ul className={styles.scopeList} data-testid="page-design-scope-list">
            {EDITABLE_SCOPE_ITEMS.map((item) => (
              <li key={item.label} className={styles.scopeItem}>
                <span className={styles.scopeLabel}>{item.label}</span>
                <span className={styles.scopeDetail}>{item.detail}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Give Step 1 its own layout module**

Create `product-category-step/ProductCategoryStep.module.css` and move only Step 1-owned rules from `StorefrontBuilderPage.module.css`:

```css
.subStepSectionList { display: grid; gap: 18px; }
.subStepSection { display: flex; flex-direction: column; gap: 18px; padding: 22px; background: #fff; border-radius: 24px; }
.subStepHeader { display: flex; flex-direction: column; gap: 12px; }
.subStepHeaderMain { display: flex; gap: 14px; align-items: flex-start; }
.subStepBadge { color: #15803d; font-weight: 800; font-size: 0.92rem; }
.sectionStack { display: flex; flex-direction: column; gap: 6px; }
.sectionTitle { margin: 0; color: #0f172a; font-size: 1.12rem; line-height: 1.3; }
.subStepDescription { margin: 0; color: #475569; font-size: 0.92rem; line-height: 1.6; }
.descriptionLead { margin: 0; }
.categoryGrid { display: grid; gap: 12px; }
.categoryCard { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 16px 18px; border-radius: 18px; background: #f8fafc; }
.categoryCardActive { background: #ecfdf5; box-shadow: inset 0 0 0 2px rgba(21, 128, 61, 0.18); }
.cardTitle { margin: 0; font-size: 1rem; color: #0f172a; }
.cardMeta { margin: 6px 0 0; color: #64748b; font-size: 0.86rem; }
.primaryButton {}
.categorySelectedBadge {}
```

(Reuse existing button class names only if they still belong in the page shell; otherwise move them into step-local CSS and rename imports accordingly.)

- [ ] **Step 3: Move `ProductCategoryStep.jsx` into its folder and narrow its imports**

Create `product-category-step/ProductCategoryStep.jsx`:

```jsx
import StepShell from '../step-shell/StepShell';
import PageDesignEditor from './page-design/PageDesignEditor';
import styles from './ProductCategoryStep.module.css';

export default function ProductCategoryStep({ step }) {
  return (
    <StepShell
      eyebrow="1단계"
      title="페이지 기본 설정"
      description={<p className={styles.descriptionLead}>페이지의 전체적인 사용자 분위기를 먼저 정해 주세요.</p>}
    >
      {/* keep the existing 1-1 / 1-2 structure and test IDs unchanged */}
    </StepShell>
  );
}
```

The important seam change here is `builder` -> `step`, not the rendered behavior.

- [ ] **Step 4: Update the tests to import the moved editor**

Change the top of `PageDesignEditor.test.jsx` from:

```jsx
import PageDesignEditor from '../components/PageDesignEditor';
```

to:

```jsx
import PageDesignEditor from '../components/product-category-step/page-design/PageDesignEditor';
```

Only update `StorefrontBuilderPage.test.jsx` if a moved path or renamed prop requires it.

- [ ] **Step 5: Run the focused tests**

Run:

```bash
npx vitest run src/features/storefront/__tests__/PageDesignEditor.test.jsx src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
```

Expected: PASS. Step 1 behavior and page-style editing should remain stable.

---

### Task 3: Move Step 2 and Step 3 into owned folders and give table/prompt UI local styles

**Files:**
- Create: `react-app/src/features/storefront/components/data-selection-step/DataSelectionStep.jsx`
- Create: `react-app/src/features/storefront/components/data-selection-step/DataSelectionStep.module.css`
- Create: `react-app/src/features/storefront/components/data-selection-step/DataFieldGroupTable.jsx`
- Create: `react-app/src/features/storefront/components/data-selection-step/DataFieldGroupTable.module.css`
- Create: `react-app/src/features/storefront/components/card-design-step/CardDesignStep.jsx`
- Create: `react-app/src/features/storefront/components/card-design-step/CardDesignStep.module.css`
- Delete: `react-app/src/features/storefront/components/DataSelectionStep.jsx`
- Delete: `react-app/src/features/storefront/components/CardDesignStep.jsx`
- Delete: `react-app/src/features/storefront/components/data-selection/DataFieldGroupTable.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Move the data-selection table under the step that owns it**

Create `data-selection-step/DataFieldGroupTable.jsx` with the current render seam unchanged:

```jsx
import { isMandatoryField } from '../../model/dataSelectionFieldGroupModel';
import { formatFieldDisplayValue } from '../../model/cardFieldRenderModel';
import styles from './DataFieldGroupTable.module.css';
```

Move all field-table-only rules out of `StorefrontBuilderPage.module.css` into `DataFieldGroupTable.module.css`.

- [ ] **Step 2: Move `DataSelectionStep.jsx` into its folder and switch from `builder` to `step` props**

Use:

```jsx
import StepShell from '../step-shell/StepShell';
import DataFieldGroupTable from './DataFieldGroupTable';
import { groupAvailableFields } from '../../model/dataSelectionFieldGroupModel';
import styles from './DataSelectionStep.module.css';
```

Preserve these behavioral seams:

```jsx
data-testid="data-field-table-description"
data-testid="data-selection-unconfirmed-hint"
data-testid="confirm-data-selection"
```

- [ ] **Step 3: Move `CardDesignStep.jsx` into its folder and give the AI prompt panel local styles**

Create `card-design-step/CardDesignStep.jsx` with the same button/test seams:

```jsx
data-testid="apply-ai-suggestion"
data-testid="save-storefront-draft"
data-testid="undo-ai-changes"
data-testid="ai-change-summary-panel"
```

Move textarea, summary, and AI-change-panel layout rules into `CardDesignStep.module.css`.

- [ ] **Step 4: Re-run the builder page tests**

Run:

```bash
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
```

Expected: PASS. The three-step builder flow should still render and save the same way.

---

### Task 4: Narrow the external `useStorefrontBuilder` interface and trim `StorefrontBuilderPage` to shell-only ownership

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css`
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Return nested step-facing objects from `useStorefrontBuilder`**

Replace the flat step-facing return shape:

```js
productCategoryOptions,
selectedProductCategoryName,
draftDataSelection,
committedDataSelection,
aiPrompt,
aiSummary,
...
```

with nested objects:

```js
productCategoryStep: {
  productCategoryOptions,
  selectedProductCategoryName,
  pageAiDesign: pageAi.pageAiDesign,
  isApplyingPageAiDesign: pageAi.isApplyingPageAiDesign,
  pageAiErrorMessage: pageAi.pageAiErrorMessage,
  setPagePrompt: pageAi.setPrompt,
  applyPageAiDesign: pageAi.applyPageAiDesign,
  selectProductCategory,
},
dataSelectionStep: {
  availableCategoryFields,
  draftDataSelection: dataSelection.draft,
  committedDataSelection: dataSelection.committed,
  isDataSelectionConfirmed: dataSelection.isConfirmed,
  toggleDraftField: dataSelection.toggleField,
  confirmDataSelection,
  goNext,
},
cardDesignStep: {
  aiPrompt,
  aiSummary,
  aiChangeSummary,
  aiErrorMessage,
  isAiApplying,
  setAiPrompt,
  applyAiSuggestion,
  undoAiChanges,
  saveDraft,
  status,
},
```

Keep page-shell state (`status`, `errorMessage`, `hasStarted`, `currentStep`, `previewConfig`, `previewProductRows`, `startSession`, `goNext`, `goPrevious`) at the top level.

- [ ] **Step 2: Update `StorefrontBuilderPage.jsx` to pass only the slice each step needs**

Move from:

```jsx
const StepComponent = STEP_COMPONENTS[builder.currentStep];
return <StepComponent builder={builder} />;
```

to a step registry:

```jsx
const STEP_COMPONENTS = [
  { Component: ProductCategoryStep, selectProps: (builder) => builder.productCategoryStep },
  { Component: DataSelectionStep, selectProps: (builder) => builder.dataSelectionStep },
  { Component: CardDesignStep, selectProps: (builder) => builder.cardDesignStep },
];
```

Then render:

```jsx
const activeStep = STEP_COMPONENTS[builder.currentStep];
const StepComponent = activeStep.Component;
return <StepComponent step={activeStep.selectProps(builder)} />;
```

- [ ] **Step 3: Delete step-owned CSS from `StorefrontBuilderPage.module.css`**

After the folder split, this file should keep only:

```css
.page {}
.workspace {}
.leftColumn {}
.heroPanel {}
.previewPanel {}
.previewHeader {}
.previewStage {}
.previewDevice {}
.previewDeviceSpeaker {}
.previewDeviceScreen {}
.stepNavActions {}
```

Any rule that only styles a specific step, field table, textarea, or sub-step badge should be removed from this file and live beside its owning module.

- [ ] **Step 4: Run the full storefront refactor verification**

Run:

```bash
npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx src/features/storefront/__tests__/PageDesignEditor.test.jsx
npx vitest run src/features/storefront/__tests__
npm run build
```

Expected:
- focused builder tests PASS
- full storefront test directory PASS
- Vite build exits 0

## Self-Review

- **Spec coverage:** step-owned folder split 쨌 component-local CSS ownership 쨌 page-shell CSS trim 쨌 narrower step-facing builder interface 쨌 large child modules moved beside their owning step.
- **Placeholder scan:** none; all paths and verification commands are concrete.
- **Type/name consistency:** use `step` prop consistently across moved step modules; keep existing test IDs so the builder page seam survives the refactor.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-22-storefront-step-module-refactor.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Defaulting to **Inline Execution** in this session unless the user asks to switch.
