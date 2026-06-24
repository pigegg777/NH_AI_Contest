# Storefront AI Adaptive Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Step 3 card AI infer the current card layout and the user's natural-language intent, then save and render a structured `layoutPlan` that can rearrange card density, section order, image placement, and title clamp safely.

**Architecture:** Introduce a deep `layoutPlan` module as the new arrangement seam, keep `cardStyle` focused on appearance, and make the compiler the single module that merges current card state plus AI intent into deterministic render config. Public rendering and builder preview both consume the same compiled arrangement data so layout decisions survive save/load without prompt re-interpretation.

**Tech Stack:** React 19, Vite, Vitest + Testing Library, CSS Modules, OpenAI structured outputs with existing fallback heuristics.

---

### Task 1: Add the `layoutPlan` module and persist it through the storefront save seam

**Files:**
- Create: `react-app/src/features/storefront/model/cardLayoutPlanModel.js`
- Modify: `react-app/src/features/storefront/model/cardStyleModel.js`
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- Modify: `react-app/src/features/storefront/hooks/useCardAiDesign.js`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Test: `react-app/src/features/storefront/__tests__/cardStyleModel.test.js`
- Test: `react-app/src/features/storefront/__tests__/useCardAiDesign.test.js`

- [ ] **Step 1: Write the failing model tests for normalized `layoutPlan` support**

Add assertions to `react-app/src/features/storefront/__tests__/cardStyleModel.test.js` like:

```js
import { DEFAULT_CARD_STYLE, normalizeCardStyle } from '../model/cardStyleModel';

it('adds a default layoutPlan to normalized card styles', () => {
  expect(normalizeCardStyle({}).layoutPlan).toEqual(DEFAULT_CARD_STYLE.layoutPlan);
});

it('normalizes unsupported layoutPlan values back to safe defaults', () => {
  const result = normalizeCardStyle({
    layoutPlan: {
      sectionOrder: ['header', 'footer'],
      imagePlacement: 'floating',
      titleClamp: 5,
    },
  });

  expect(result.layoutPlan.sectionOrder).toEqual(['header', 'image', 'info']);
  expect(result.layoutPlan.imagePlacement).toBe('top');
  expect(result.layoutPlan.titleClamp).toBe(2);
});
```

- [ ] **Step 2: Run the model tests to verify they fail before implementation**

Run from `react-app/`:

```bash
npx vitest run src/features/storefront/__tests__/cardStyleModel.test.js
```

Expected: FAIL because `layoutPlan` does not exist yet.

- [ ] **Step 3: Implement the new `layoutPlan` module and fold it into `cardStyle` normalization**

Create `react-app/src/features/storefront/model/cardLayoutPlanModel.js`:

```js
export const CARD_SECTION_ORDER_PARTS = ['header', 'image', 'info'];
export const CARD_IMAGE_PLACEMENT_OPTIONS = ['top', 'left', 'right'];
export const CARD_CONTENT_DENSITY_OPTIONS = ['compact', 'comfortable'];
export const CARD_EMPHASIS_OPTIONS = ['title', 'image', 'info'];
export const CARD_GROUPING_HINT_OPTIONS = ['default', 'summary-first', 'detail-first', 'price-compare'];

export const DEFAULT_CARD_LAYOUT_PLAN = {
  cardsPerRow: 2,
  sectionOrder: ['header', 'image', 'info'],
  imagePlacement: 'top',
  titleClamp: 2,
  contentDensity: 'comfortable',
  emphasis: 'title',
  groupingHint: 'default',
};
```

Then update `react-app/src/features/storefront/model/cardStyleModel.js` so `DEFAULT_CARD_STYLE` includes:

```js
layoutPlan: DEFAULT_CARD_LAYOUT_PLAN,
```

and `normalizeCardStyle()` returns:

```js
layoutPlan: normalizeCardLayoutPlan({
  ...source.layoutPlan,
  cardsPerRow,
  structuralPreset,
  titleMode: normalizeTitleMode(source.titleMode, DEFAULT_CARD_STYLE.titleMode),
}),
```

- [ ] **Step 4: Thread `layoutPlan` through the hook seam**

Update `react-app/src/features/storefront/hooks/useCardAiDesign.js` so `hydrateCardStyle()` and `setCardsPerRow()` keep `cardStyle.layoutPlan.cardsPerRow` aligned with the selected density.

The critical line should look like:

```js
return normalizeCardStyle({
  ...current,
  cardsPerRow: nextCardsPerRow,
  layoutPlan: {
    ...current.layoutPlan,
    cardsPerRow: nextCardsPerRow,
  },
});
```

- [ ] **Step 5: Persist `layoutPlan` through the save/load interface**

Update `react-app/src/features/storefront/model/storefrontBuilderModel.js` so:

```js
cardDesign: {
  visibleFields: normalizedCardFields,
  cardStyle: normalizedCardStyle,
  bodySlots,
}
```

continues to save a single `cardStyle` object, but that `cardStyle` now carries `layoutPlan`.

No new top-level save key is needed.

- [ ] **Step 6: Run the focused model and hook tests**

Run:

```bash
npx vitest run src/features/storefront/__tests__/cardStyleModel.test.js src/features/storefront/__tests__/useCardAiDesign.test.js
```

Expected: PASS with `layoutPlan` preserved across normalization and hook state updates.

---

### Task 2: Deepen the card AI interpreter and compiler around `layoutPlan`

**Files:**
- Modify: `react-app/src/features/storefront/services/cardStyleAiInterpreter.js`
- Modify: `react-app/src/features/storefront/services/cardStyleCompiler.js`
- Modify: `react-app/src/features/storefront/model/cardCompositionModel.js`
- Modify: `react-app/src/features/storefront/services/cardStyleSkillPromptService.js`
- Test: `react-app/src/features/storefront/__tests__/cardStyleAiInterpreter.test.js`
- Test: `react-app/src/features/storefront/__tests__/cardStyleCompiler.test.js`
- Test: `react-app/src/features/storefront/__tests__/cardCompositionModel.test.js`

- [ ] **Step 1: Write failing tests for freeform layout intent and grouped info survival**

Extend `react-app/src/features/storefront/__tests__/cardStyleAiInterpreter.test.js` with cases like:

```js
it('detects layout cues without requiring a fixed command phrase', () => {
  const intent = buildHeuristicCardAiIntent({
    cardAiDesign: { prompt: '카드가 답답하니 이미지는 옆으로 보내고 제목은 짧게 보여줘' },
    visibleFields: ['product_name', 'spec', 'tax_price'],
  });

  expect(intent.layout).toEqual(
    expect.objectContaining({
      imagePlacement: 'left',
      titleClamp: 1,
      contentDensity: 'compact',
    }),
  );
});
```

and:

```js
it('keeps requestedGroups in the strict schema path', () => {
  expect(CARD_STYLE_AI_SCHEMA.properties.info.properties.requestedGroups).toBeDefined();
});
```

- [ ] **Step 2: Run interpreter/compiler tests to capture the current failures**

Run:

```bash
npx vitest run src/features/storefront/__tests__/cardStyleAiInterpreter.test.js src/features/storefront/__tests__/cardStyleCompiler.test.js src/features/storefront/__tests__/cardCompositionModel.test.js
```

Expected: FAIL because the schema, heuristic intent, and compiler do not yet understand `layoutPlan`.

- [ ] **Step 3: Extend the AI intent schema with a dedicated layout object**

Add a `layout` object to `CARD_STYLE_AI_SCHEMA` in `react-app/src/features/storefront/services/cardStyleAiInterpreter.js`:

```js
layout: {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    cardsPerRow: { type: 'number', enum: [1, 2] },
    sectionOrder: { type: 'array', items: { type: 'string', enum: ['header', 'image', 'info'] } },
    imagePlacement: { type: 'string', enum: ['top', 'left', 'right'] },
    titleClamp: { type: 'number', enum: [1, 2] },
    contentDensity: { type: 'string', enum: ['compact', 'comfortable'] },
    emphasis: { type: 'string', enum: ['title', 'image', 'info'] },
    groupingHint: { type: 'string', enum: ['default', 'summary-first', 'detail-first', 'price-compare'] },
  },
  required: ['cardsPerRow', 'sectionOrder', 'imagePlacement', 'titleClamp', 'contentDensity', 'emphasis', 'groupingHint'],
},
```

Also add `requestedGroups` to the `info` schema and normalize it in the OpenAI path.

- [ ] **Step 4: Make the heuristic interpreter infer layout intent from ordinary language**

Add a dedicated detector in `cardStyleAiInterpreter.js`:

```js
function detectLayoutIntentCandidate(promptText, visibleFields) {
  const candidate = {};

  if (includesAny(promptText, ['옆으로', 'side', 'horizontal'])) candidate.imagePlacement = 'left';
  if (includesAny(promptText, ['오른쪽', 'right side'])) candidate.imagePlacement = 'right';
  if (includesAny(promptText, ['한 줄', 'one line'])) candidate.titleClamp = 1;
  if (includesAny(promptText, ['답답', 'compact', 'tight'])) candidate.contentDensity = 'compact';
  if (includesAny(promptText, ['넓게', 'compare', 'wide comparison'])) candidate.cardsPerRow = 2;

  return Object.keys(candidate).length > 0 ? candidate : null;
}
```

- [ ] **Step 5: Move structural resolution behind the compiler seam**

Update `react-app/src/features/storefront/services/cardStyleCompiler.js` so `compileCardStyle()` becomes the single module that:

```js
const layoutPlan = normalizeCardLayoutPlan({
  ...previous.layoutPlan,
  ...intent?.layout,
  cardsPerRow: intent?.layout?.cardsPerRow ?? cardsPerRow ?? previous.layoutPlan.cardsPerRow,
});
```

and then derives:

```js
const structuralPreset = resolveStructuralPresetFromLayoutPlan(layoutPlan);
const titleMode = resolveTitleModeFromLayoutPlan(layoutPlan);
```

The old `structuralPresetRequest` and `titleModeRequest` can remain as a backward-compatible adapter, but the compiler should convert them into `layoutPlan` rather than treating them as the final seam.

- [ ] **Step 6: Re-run the focused intent/compiler tests**

Run:

```bash
npx vitest run src/features/storefront/__tests__/cardStyleAiInterpreter.test.js src/features/storefront/__tests__/cardStyleCompiler.test.js src/features/storefront/__tests__/cardCompositionModel.test.js
```

Expected: PASS with `layoutPlan` as the new arrangement interface and `requestedGroups` preserved in both heuristic and structured-output flows.

---

### Task 3: Rework the card renderer to consume compiled arrangement data instead of hardcoded preset branches

**Files:**
- Modify: `react-app/src/features/storefront/components/CardGridSection.jsx`
- Modify: `react-app/src/features/storefront/components/CardGridSection.module.css`
- Test: `react-app/src/features/storefront/__tests__/StorefrontView.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

- [ ] **Step 1: Add failing renderer tests for image-right and title one-line clamp**

Extend `react-app/src/features/storefront/__tests__/StorefrontView.test.jsx` with a case that renders a section using:

```js
cardStyle: {
  ...DEFAULT_CARD_STYLE,
  layoutPlan: {
    ...DEFAULT_CARD_STYLE.layoutPlan,
    imagePlacement: 'right',
    sectionOrder: ['header', 'info', 'image'],
    titleClamp: 1,
  },
},
```

and assert:

```js
expect(screen.getByTestId('storefront-card-grid-section')).toHaveAttribute('data-image-placement', 'right');
expect(screen.getByText('Alpha Premium')).toHaveStyle({ WebkitLineClamp: '1' });
```

- [ ] **Step 2: Run the renderer-facing tests**

Run:

```bash
npx vitest run src/features/storefront/__tests__/StorefrontView.test.jsx src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
```

Expected: FAIL because the renderer still hardcodes `side-by-side` through preset shape only.

- [ ] **Step 3: Make `CardGridSection` render from compiled `layoutPlan`**

Replace the hardcoded preset branch in `react-app/src/features/storefront/components/CardGridSection.jsx`:

```jsx
if (preset?.shape === 'side-by-side') {
  return (
    <article key={cardKey} className={`${styles.card} ${styles.cardImageLeft}`}>
      {sectionNodes.image}
      <div className={styles.cardMain}>
        {sectionNodes.header}
        {sectionNodes.info}
      </div>
    </article>
  );
}
```

with a render path driven by normalized arrangement data:

```jsx
<article
  key={cardKey}
  className={`${styles.card} ${styles[`cardImage${imagePlacementClassName}`] || ''}`}
  data-image-placement={resolvedStyle.layoutPlan.imagePlacement}
>
  {orderedSections.map((sectionName) => sectionNodes[sectionName])}
</article>
```

- [ ] **Step 4: Add CSS adapters for top/left/right image placement and compact density**

Update `react-app/src/features/storefront/components/CardGridSection.module.css` with arrangement-specific classes such as:

```css
.cardImageLeft {
  grid-template-columns: minmax(0, var(--card-image-width)) minmax(0, 1fr);
}

.cardImageRight {
  grid-template-columns: minmax(0, 1fr) minmax(0, var(--card-image-width));
}

.cardImageRight .cardImageWrap {
  order: 2;
}
```

and a density attribute like:

```css
.section[data-content-density='compact'] .cardBody {
  gap: 8px;
}
```

- [ ] **Step 5: Re-run renderer tests**

Run:

```bash
npx vitest run src/features/storefront/__tests__/StorefrontView.test.jsx src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
```

Expected: PASS with builder preview and public rendering both honoring the same compiled arrangement data.

---

### Task 4: Verify the full storefront flow and keep the step-owned editing seam stable

**Files:**
- Modify: `react-app/src/features/storefront/components/card-design-step/card-design/CardDesignEditor.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/useCardAiDesign.test.js`

- [ ] **Step 1: Keep the Step 3 editing surface stable while routing through the deeper layout seam**

Ensure `CardDesignEditor.jsx` keeps the current prompt textarea, scope list, density toggle, and apply/save actions unchanged from the user's perspective.

The key interface is still:

```jsx
<button data-testid="apply-ai-suggestion" />
<button data-testid="save-storefront-draft" />
```

even though the implementation now updates `layoutPlan` plus `cardStyle`.

- [ ] **Step 2: Add an integration test that layout changes survive the builder preview/save seam**

Extend `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx` with an assertion that after applying a compiled layout change and saving:

```js
expect(savedPayload.categoryConfigs[0].categoryConfig.cardDesign.cardStyle.layoutPlan).toEqual(
  expect.objectContaining({
    imagePlacement: 'right',
    titleClamp: 1,
  }),
);
```

- [ ] **Step 3: Run the full targeted storefront verification**

Run:

```bash
npx vitest run src/features/storefront/__tests__/cardStyleModel.test.js src/features/storefront/__tests__/useCardAiDesign.test.js src/features/storefront/__tests__/cardStyleAiInterpreter.test.js src/features/storefront/__tests__/cardStyleCompiler.test.js src/features/storefront/__tests__/cardCompositionModel.test.js src/features/storefront/__tests__/StorefrontView.test.jsx src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
npm run build
```

Expected:
- targeted storefront tests PASS
- Vite build exits 0

## Self-Review

- **Spec coverage:** `layoutPlan` source of truth, current-state-aware AI interpretation, safe normalization, renderer reflow, persistence, and builder/public parity are all covered.
- **Placeholder scan:** none; all files, test seams, and commands are concrete.
- **Type/name consistency:** `layoutPlan` is the arrangement module name everywhere, while `cardStyle` remains the appearance module name; the compiler is the only module that merges them.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-22-storefront-ai-adaptive-card-layout.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Defaulting to **Inline Execution** in this session because the user explicitly requested planning plus immediate code changes.
