# Hybrid Storefront Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the storefront builder into the confirmed hybrid AI flow so users can start from an AI-generated web page draft, refine shared page/card styling, and save the result into the split storefront config schema.

**Architecture:** Keep the public storefront rendering pipeline intact, but expand the builder draft model so it carries both shared page design and shared card styling. Rebuild the builder UI around a welcome gate, category status board, global page design controls, representative-category card controls, and an AI copilot panel that patches the live preview.

**Tech Stack:** React, Vite, Vitest, Testing Library, Supabase client config service, CSS modules

---

### Task 1: Lock the new builder flow in tests

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Write failing tests for the welcome-gated hybrid flow**

Add expectations for:
- a welcome CTA before editing starts
- category status cards showing `Add` / `Edit`
- the AI suggestion updating the representative category draft
- the save payload including `pageConfig.designDirection`

- [ ] **Step 2: Run the focused builder page test and confirm failure**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: FAIL because the current page still renders the old step-based builder.

### Task 2: Extend the builder draft model and AI patch contract

**Files:**
- Modify: `react-app/src/features/storefront/model/cardStyleModel.js`
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- Modify: `react-app/src/features/storefront/services/storefrontAiService.js`

- [ ] **Step 1: Expand the failing expectations through model-aware tests if needed**

If the builder test is not specific enough, add assertions there for `cardsPerRow`, `designDirection`, and representative category changes.

- [ ] **Step 2: Implement minimal model changes**

Add:
- shared page design normalization
- shared card style support for `cardsPerRow`
- save payload support for `pageConfig`
- AI patch support for `designDirection` and representative category

- [ ] **Step 3: Re-run the focused builder test**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: still FAIL until the page and hook are updated.

### Task 3: Rebuild the builder UI around the hybrid AI flow

**Files:**
- Create: `react-app/src/features/storefront/components/BuilderCategoryLibrary.jsx`
- Create: `react-app/src/features/storefront/components/BuilderCategoryLibrary.module.css`
- Create: `react-app/src/features/storefront/components/PageDesignEditor.jsx`
- Create: `react-app/src/features/storefront/components/PageDesignEditor.module.css`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css`

- [ ] **Step 1: Update the hook for welcome state, category statuses, representative category, and page design draft**

- [ ] **Step 2: Replace the old step-based left rail with the new hybrid builder layout**

Include:
- welcome/start panel
- category status board
- page-wide design controls
- representative card controls
- AI free-form refinement panel

- [ ] **Step 3: Run the focused builder page test until it passes**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS

### Task 4: Reflect the new design choices in the preview renderer

**Files:**
- Modify: `react-app/src/features/storefront/components/StorefrontView.jsx`
- Modify: `react-app/src/features/storefront/components/StorefrontView.module.css`
- Modify: `react-app/src/features/storefront/components/CardGridSection.jsx`
- Modify: `react-app/src/features/storefront/components/CardGridSection.module.css`

- [ ] **Step 1: Apply page design direction to the preview shell**

- [ ] **Step 2: Apply `cardsPerRow` and shared styling to card grids**

- [ ] **Step 3: Re-run the focused builder page test**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS with visible preview changes driven by the builder draft.

### Task 5: Full verification

**Files:**
- No code changes

- [ ] **Step 1: Run the storefront config service test**

Run: `npm run test:run -- src/features/storefront/__tests__/storefrontConfigService.test.js`
Expected: PASS

- [ ] **Step 2: Run the full test suite**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: PASS
