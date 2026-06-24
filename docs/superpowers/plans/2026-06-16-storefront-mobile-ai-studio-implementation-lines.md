# Storefront Mobile AI Studio Modification Lines

**Goal:** Rework the storefront builder into a simpler office-facing two-step AI studio so category choice happens first, AI refinement happens second, and the preview stays rendered as a phone-shaped mobile storefront on one page.

**Architecture:** Keep the current storefront config schema and product matching seams, but compress the builder flow. Let the hook/model own default all-category selection and compatibility derivation, let the AI service own title/subtitle patching, and let the preview renderer own the mobile phone-frame presentation.

**Primary seams to implement and verify:**

- `StorefrontBuilderPage`: user-visible builder flow and step composition
- `useStorefrontBuilder`: draft orchestration, compatibility defaults, and save wiring
- `storefrontBuilderModel`: deterministic defaulting and payload shaping
- `requestStorefrontAiSuggestion`: AI recommendation normalization
- `StorefrontView`: mobile preview rendering inside the builder

---

### Line 1: Re-lock the builder flow contract in tests

**Intent**

Move the test contract from a 5-step wizard to a 2-step builder:

- `Step 1`: category selection only
- `Step 2`: AI studio plus save

**Expected behavior**

- The first screen no longer asks for medium categories, representative cards, or manual title/subtitle entry.
- After category choice, the user enters the AI studio directly.
- Existing draft status cards still distinguish `Add page` and `Edit page`.

**Affected code areas**

- `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

---

### Line 2: Default all medium categories and remove manual representative-card flow

**Intent**

Keep the saved draft schema compatible while simplifying the builder interaction.

**Expected behavior**

- Selecting a product category should automatically select all medium categories for that uploaded category.
- The UI should not render a standalone medium-category step.
- The UI should not render a representative-card selection step.
- `representativeMediumCategory` should be auto-derived from the first visible selected medium category for compatibility.

**Affected code areas**

- `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- `react-app/src/features/storefront/model/sectionMatching.js`

---

### Line 3: Turn Step 2 into an AI recommendation studio

**Intent**

Make the second step feel conversational, but still guided by office-safe recommendations.

**Expected behavior**

- The AI step should provide a free-form prompt area.
- The AI step should also provide selectable recommendation controls for common refinements such as tone, layout, card density, price emphasis, and search wording.
- Applying AI should update page style, visible fields, card style, and page copy.
- AI should not modify the underlying office product data rows.

**Affected code areas**

- `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- `react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css`
- `react-app/src/features/storefront/services/storefrontAiService.js`

---

### Line 4: Remove manual page title/subtitle inputs and move copy ownership to AI

**Intent**

Align the UI with the requested AI-first authoring flow.

**Expected behavior**

- The builder no longer renders `Page title` or `Page subtitle` text inputs.
- `navConfig.title` and `navConfig.subtitle` should still be saved.
- AI suggestions become the primary source for title and subtitle updates.
- Fallback copy should remain deterministic when AI output is partial or unavailable.

**Affected code areas**

- `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- `react-app/src/features/storefront/services/storefrontAiService.js`

---

### Line 5: Render the preview as a phone-shaped mobile storefront at all times

**Intent**

Make the office user review the storefront in the intended customer reading format.

**Expected behavior**

- The builder keeps the preview visible throughout the flow.
- The preview sits inside a phone-shaped frame rather than a plain web panel.
- The preview width and spacing should read as mobile-first.
- The storefront remains scrollable as one continuous mobile page.

**Affected code areas**

- `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- `react-app/src/features/storefront/pages/StorefrontBuilderPage.module.css`
- `react-app/src/features/storefront/components/StorefrontView.jsx`
- `react-app/src/features/storefront/components/StorefrontView.module.css`

---

### Line 6: Preserve save compatibility and category scoping

**Intent**

Ship the UX rework without breaking saved storefront drafts or mixing category data.

**Expected behavior**

- Save payloads continue to use the split storefront config schema.
- Category rows remain scoped to the selected uploaded product category only.
- Existing saved drafts can still be loaded into the builder.
- Hidden product rules remain intact.

**Affected code areas**

- `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- `react-app/src/features/storefront/services/storefrontConfigService.js`
- `react-app/src/features/storefront/__tests__/storefrontConfigService.test.js`

---

### Verification line

Implementation should finish with focused verification at these seams:

- `StorefrontBuilderPage.test.jsx`
- `storefrontConfigService.test.js`
- any focused tests added for builder model defaults or preview behavior
- storefront build verification in the React app
