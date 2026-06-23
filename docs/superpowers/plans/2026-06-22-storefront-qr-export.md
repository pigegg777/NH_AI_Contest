# Storefront QR Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a step-3 QR export flow for the storefront builder so each office can preview, download, copy, and print a single public storefront QR code.

**Architecture:** Keep QR ownership inside the `card-design-step` module boundary. Build the public storefront URL from `VITE_PUBLIC_APP_URL ?? window.location.origin`, derive QR assets client-side, and render a small always-on card plus a portal modal for download/copy/print actions. Preserve the existing "last saved public storefront" seam by using the latest saved config as the QR source when the current draft is dirty.

**Tech Stack:** React 19, Vite, Vitest + Testing Library, CSS Modules, `qrcode`.

---

### Task 1: Lock the QR export behavior with failing tests

**Files:**
- Create: `react-app/src/features/storefront/__tests__/storefrontQrExportService.test.js`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] Write a failing test for `buildStorefrontPublicUrl` covering configured public URL and `window.location.origin` fallback.
- [ ] Run the new service test and confirm it fails because the QR service does not exist yet.
- [ ] Add failing builder-page coverage for:
  - step 3 rendering a QR card when a saved storefront already exists
  - step 3 keeping the QR export button disabled when no saved storefront exists yet
  - opening a modal with copy/print/download actions once QR export is available
- [ ] Run the focused builder test file and confirm the new assertions fail for the expected missing UI.

### Task 2: Implement QR URL and asset utilities

**Files:**
- Create: `react-app/src/features/storefront/components/card-design-step/qr-export/storefrontQrExportService.js`
- Modify: `react-app/package.json`

- [ ] Add the `qrcode` dependency.
- [ ] Implement pure helpers for:
  - resolving the public app base URL
  - building the `?tool=store&office=` public storefront URL
  - generating SVG markup and PNG data URLs in parallel
  - generating a downloadable SVG data URL
  - opening a print window with QR + office metadata + public link
- [ ] Run the service test and confirm it passes.

### Task 3: Add step-3 QR card and modal UI

**Files:**
- Create: `react-app/src/features/storefront/components/card-design-step/qr-export/StorefrontQrExportCard.jsx`
- Create: `react-app/src/features/storefront/components/card-design-step/qr-export/StorefrontQrExportCard.module.css`
- Modify: `react-app/src/features/storefront/components/card-design-step/CardDesignStep.jsx`
- Modify: `react-app/src/features/storefront/components/card-design-step/CardDesignStep.module.css`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`

- [ ] Expose a `qrExport` slice from `useStorefrontBuilder` containing office identity, saved-state availability, public URL, and dirty/saved messaging metadata.
- [ ] Render a QR summary card in step 3 with:
  - small QR preview
  - office name / office code
  - public link
  - "last saved public storefront" guidance when the current draft is dirty
  - `QR 내보내기` action next to `초안 저장`
- [ ] Render a portal modal with:
  - large QR
  - PNG download link
  - SVG download link
  - link copy button
  - print button
- [ ] Keep the export action disabled until a saved storefront exists, but immediately available when the office already has a saved config on load.
- [ ] Run the focused builder tests and confirm they pass.

### Task 4: Verify the full storefront slice

**Files:**
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/storefrontQrExportService.test.js`

- [ ] Run:

```bash
npx vitest run src/features/storefront/__tests__/storefrontQrExportService.test.js src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
```

- [ ] Run:

```bash
npx vitest run src/features/storefront/__tests__
```

- [ ] Run:

```bash
npm run build
```

## Self-Review

- **Spec coverage:** single office QR, saved-public-page gating, modal preview/download/copy/print, public URL policy, and step-3-only ownership are all covered.
- **Placeholder scan:** none.
- **Type/name consistency:** `qrExport` is the single step-facing contract for step 3 QR behavior.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-22-storefront-qr-export.md`. This session is continuing with **Inline Execution**.
