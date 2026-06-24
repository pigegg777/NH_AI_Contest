# Storefront Mobile AI Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the storefront builder into a two-step AI studio with category-only Step 1, AI-guided Step 2, and a persistent mobile phone preview.

**Architecture:** Keep the existing storefront config schema and product matching rules, but compress the builder UI flow. Let the builder model and hook own default medium-category selection plus compatibility derivation, let the AI service own guided patching of title/subtitle and style, and let the preview renderer own the phone-frame mobile presentation.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, CSS modules

---

### Task 1: Lock the new two-step builder contract in tests

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Write the failing builder-flow expectations**

Cover:
- Step 1 only asks for product category selection
- no medium-category step
- no representative-card step
- no manual page title/subtitle inputs
- Step 2 exposes guided AI recommendations plus free-form prompt
- preview stays category-scoped and save still works

- [ ] **Step 2: Run the focused builder test and confirm RED**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: FAIL because the page still renders the old multi-step wizard.

### Task 2: Default category selection and preserve save compatibility

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js`

- [ ] **Step 1: Implement default all-medium-category selection through the model/hook seam**

- [ ] **Step 2: Auto-derive `representativeMediumCategory` for compatibility**

- [ ] **Step 3: Keep save payload format intact while removing UI dependence on the removed steps**

- [ ] **Step 4: Re-run the focused builder test**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: still FAIL until the page UI is updated.

### Task 3: Rebuild Step 2 as the AI recommendation studio

**Files:**
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css`
- Modify: `react-app/src/features/storefront/services/storefrontAiService.js`

- [ ] **Step 1: Remove the old medium-category and representative-card steps from the page**

- [ ] **Step 2: Remove manual page title/subtitle inputs**

- [ ] **Step 3: Add guided recommendation controls alongside free-form AI prompting**

- [ ] **Step 4: Ensure AI patching owns title/subtitle updates with deterministic fallbacks**

- [ ] **Step 5: Re-run the focused builder test until GREEN**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS

### Task 4: Turn the live preview into a persistent phone-frame mobile storefront

**Files:**
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css`
- Modify: `react-app/src/features/storefront/components/StorefrontView.jsx`
- Modify: `react-app/src/features/storefront/components/StorefrontView.module.css`

- [ ] **Step 1: Wrap the preview in a phone-shaped frame that stays visible through both steps**

- [ ] **Step 2: Tighten StorefrontView layout so it reads as a mobile-first one-page storefront**

- [ ] **Step 3: Re-run the focused builder test**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS with visible preview changes.

### Task 5: Final verification

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/storefrontConfigService.test.js` only if required

- [ ] **Step 1: Run the focused builder test**

Run: `npm run test:run -- src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS

- [ ] **Step 2: Run the storefront config service test**

Run: `npm run test:run -- src/features/storefront/__tests__/storefrontConfigService.test.js`
Expected: PASS

- [ ] **Step 3: Run the React app build**

Run: `npm run build`
Expected: PASS
