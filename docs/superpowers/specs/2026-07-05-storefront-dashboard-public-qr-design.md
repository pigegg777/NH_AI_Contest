# Storefront Dashboard Public QR Ownership Design

## Background

The customer-facing QR currently lives inside the storefront builder flow.

- The QR points to the public storefront route, not to the builder itself.
- The builder currently mixes two responsibilities: editing the storefront and distributing the published storefront.
- The dashboard currently has no awareness of whether a public storefront has already been saved.

After splitting public storefront rendering into `features/public-storefront`, the QR now fits better as a public storefront concern than as a builder concern.

## Problem

The current ownership creates three product issues.

1. The builder is responsible for customer distribution UI even though its primary job is editing and saving.
2. Users have to enter the builder to find the public QR, even when they only want to share the latest saved storefront.
3. The QR UI is tied to builder-specific state such as unsaved changes and step-level dialog state.

## Goals

- Move customer/public QR ownership to the dashboard.
- Treat the QR as a representation of the latest saved public storefront.
- Reuse the existing public storefront URL and QR generation logic instead of rebuilding it.
- Keep the builder focused on editing and saving only.

## Non-Goals

- No global app-wide cache invalidation mechanism.
- No automatic redirect from builder to dashboard after save.
- No change to the public storefront route contract.
- No change to the public storefront data payload format.
- No attempt to make one QR component serve both builder and dashboard with builder-specific state.

## Decision Summary

We will use dashboard remount fetch as the refresh mechanism.

- `DashboardPage` will own the customer QR entry point.
- The dashboard QR card will fetch public storefront availability on mount.
- The card will use the saved public storefront as the source of truth.
- QR service ownership will move under `features/public-storefront`.
- The builder will remove QR preview/export UI and replace it with guidance that customer QR is available on the dashboard.

This works well with the current app structure because `DashboardPage` unmounts while the user is inside the builder and mounts again when they return, so the dashboard naturally reloads the latest storefront status.

## Chosen Approach

### Recommended Approach: Dashboard-Owned QR With Shared Services

The dashboard renders a dedicated public QR card. That card checks whether a saved storefront exists for the current office, then builds QR assets from the existing public URL generation flow.

Why this is the recommended approach:

- It matches product ownership: public distribution belongs with the public storefront, not with the editor.
- It avoids unnecessary global state and refresh plumbing.
- It keeps builder-specific state out of the customer QR experience.
- It reuses the already-proven public storefront URL and QR asset generation logic.

### Rejected Approach: Keep Builder QR And Also Mirror It On Dashboard

This duplicates ownership and keeps the builder responsible for a public-share feature.

### Rejected Approach: Global Refresh Key Or Explicit Invalidation

This adds complexity that the current mount/unmount page structure does not need.

## User Experience

### Dashboard Flow

1. The user lands on the dashboard.
2. The dashboard renders a customer QR card.
3. The card checks whether a saved public storefront exists for `user.office_code`.
4. If a saved storefront exists, the dashboard shows the customer QR, public link, and export/share actions.
5. If no saved storefront exists yet, the dashboard explains that the QR will appear after the first storefront save.

### Builder Flow

1. The user edits and saves the storefront in the builder.
2. The builder no longer shows the customer QR card or QR dialog.
3. Near the save action, the builder shows guidance such as "Customer QR is available on the dashboard."
4. When the user returns to the dashboard, the dashboard remounts and reloads the latest saved storefront availability.

## Ownership Boundaries

### Dashboard Responsibility

`DashboardPage` owns the entry point and placement of the customer QR section.

- It passes office-level identity data from the authenticated user.
- It does not perform QR asset generation itself.
- It does not need to know builder-specific draft state.
- It places the customer QR card above the existing dashboard navigation card grid.

### Public Storefront Responsibility

Public storefront code owns the customer QR feature implementation because the QR represents the published public storefront.

Required placement:

- `src/features/public-storefront/components/PublicStorefrontQrCard.jsx`
- `src/features/public-storefront/components/PublicStorefrontQrCard.module.css`
- `src/features/public-storefront/hooks/usePublicStorefrontQr.js`
- `src/features/public-storefront/services/publicStorefrontQrService.js`

`publicStorefrontQrService.js` should become the canonical home for QR URL generation, asset generation, and print helpers. Any builder-local QR service file should either be removed or reduced to a temporary compatibility re-export during the migration, but the dashboard must consume the public-storefront service path.

### Storefront Builder Responsibility

The builder remains responsible for editing, previewing, AI-assisted design, and saving storefront data.

Recommended edits:

- Remove QR card rendering from `UnifiedDesignStep.jsx`
- Remove QR dialog button from the builder action area
- Remove `qrExport` view-model construction from `useStorefrontBuilder.js`
- Add a simple post-save guidance line that points users to the dashboard for customer QR

## Data Flow

### Dashboard Card Data Source

The dashboard QR card fetches only the minimum data required to determine availability.

- Fetch: `fetchStorefrontConfig({ officeCode })`
- Office metadata source: authenticated `user`
  - `user.office_code`
  - `user.nh_name`
  - `user.office_name`

The dashboard does not need to fetch public product rows or public identity records just to decide whether to show the QR.

### QR Generation

The QR card reuses existing QR behavior.

- Public URL generation: `buildStorefrontPublicUrl`
- QR asset generation: `buildStorefrontQrAssets`
- Print support: `printStorefrontQr`

Whether these helpers stay in place temporarily or move into `features/public-storefront/services`, the final ownership should be aligned with public storefront.

### Refresh Model

The refresh model is intentionally simple.

1. The builder saves storefront data through the existing save path.
2. The user navigates back to the dashboard.
3. `DashboardPage` mounts again.
4. The QR card refetches storefront availability.
5. The latest saved public storefront state is shown.

There is no explicit refresh bus, no dashboard prop-based invalidation key, and no background sync mechanism in this design.

## UI State Model

The dashboard QR card should support four explicit states.

### `loading`

- Shown while storefront availability is being checked
- Uses lightweight placeholder UI inside the dashboard card area

### `empty`

- No saved public storefront exists yet
- Copy explains that the customer QR appears after the first save

### `ready`

- Saved public storefront exists
- Show office name/code, public link, QR preview, and export/share actions
- The QR semantics are always based on the latest saved public storefront

### `error`

- Availability fetch failed or QR asset generation failed
- Show a compact error state with retry

## Component Design

### `DashboardPage`

Changes:

- Add the customer QR card into the dashboard layout
- Pass authenticated office identity down to the QR card
- Keep navigation cards as they are

### `PublicStorefrontQrCard`

Responsibilities:

- Fetch storefront availability on mount
- Build and hold QR assets
- Render `loading`, `empty`, `ready`, and `error`
- Support public link opening, copy, download, and print
- Expose these actions directly in the card in v1, without a separate modal requirement

This component should be dashboard-friendly, not builder-friendly. It should not know about builder step state, unsaved draft state, or builder dialogs.

### `usePublicStorefrontQr`

Responsibilities:

- Orchestrate the mount fetch
- Manage card UI state
- Trigger QR asset generation after availability is confirmed
- Expose retry behavior

### QR Service

Responsibilities:

- Build public storefront URL
- Build preview/print/download QR assets
- Print QR

This remains stateless and reusable.

## File-Level Change Plan

### Add

- `react-app/src/features/public-storefront/components/PublicStorefrontQrCard.jsx`
- `react-app/src/features/public-storefront/components/PublicStorefrontQrCard.module.css`
- `react-app/src/features/public-storefront/hooks/usePublicStorefrontQr.js`
- `react-app/src/features/public-storefront/services/publicStorefrontQrService.js`

### Update

- `react-app/src/common/pages/DashboardPage.jsx`
- `react-app/src/common/pages/DashboardPage.module.css`
- `react-app/src/features/storefront/pages/storefront-builder/UnifiedDesignStep.jsx`
- `react-app/src/features/storefront/pages/storefront-builder/UnifiedDesignStep.module.css`
- `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`

### Remove Or Replace

- Builder-local QR rendering path from `StorefrontQrExportCard` usage
- Builder-local `qrExport` step view-model
- `react-app/src/features/storefront/components/qr-export/storefrontQrExportService.js` as the canonical service location

## Error Handling

The dashboard QR feature should fail softly.

- If storefront config fetch fails, the dashboard still loads and only the QR card shows an error state.
- If QR asset generation fails, the card should not break the dashboard; it should show a retryable error state.
- If `officeCode` is missing, treat the card as unavailable rather than crashing.
- If browser clipboard or print APIs are unavailable, keep the rest of the card usable and show a small status message.

## Testing

### Dashboard Tests

Add tests for the QR card or dashboard integration that cover:

- loading state on initial mount
- empty state when no storefront config exists
- ready state when storefront config exists
- public URL is generated from the office code
- export actions appear only in ready state
- error state and retry behavior

### Builder Regression Tests

Update builder tests to cover:

- unified design step no longer renders the QR export card
- unified design step no longer renders the QR dialog button
- save flow still works without QR UI
- post-save guidance toward dashboard is shown

### Public Route Safety

Retain tests that ensure the public storefront route still resolves correctly through `?tool=store&office=...`.

## Risks

- If QR logic is moved physically between folders, imports may break during the transition.
- If the dashboard card reuses too much of the builder card, builder-specific copy or state can leak back in.
- If the dashboard CSS grows without layout planning, the current simple card grid may become visually unbalanced on mobile.

## Decisions Kept Intentionally Simple

- Remount fetch is enough for now.
- Dashboard does not preload full public storefront data.
- Builder does not need to know when the dashboard refreshes.
- QR availability is defined by saved storefront config existence, not by any extra publish flag.

## Out of Scope

- Auto-navigation from builder to dashboard after save
- Real-time dashboard refresh while the builder remains open in another tab
- Analytics around QR opens or downloads
- Broader dashboard information architecture redesign
