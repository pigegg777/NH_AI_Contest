# Storefront Dashboard Public QR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the customer-facing public storefront QR from the storefront builder into the dashboard while keeping QR generation reusable and preserving builder save behavior.

**Architecture:** Introduce a dashboard-owned QR card under `features/public-storefront` that fetches storefront availability on mount, reuses the existing QR generation behavior through a public-storefront service, and renders simple `loading | empty | ready | error` states. Remove QR preview/export UI from the builder so the builder remains edit-and-save focused.

**Tech Stack:** React, Vitest, Testing Library, Vite, CSS Modules

---

### Task 1: Lock the behavior with failing tests

**Files:**
- Create: `react-app/src/features/public-storefront/__tests__/PublicStorefrontQrCard.test.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Test: `react-app/src/features/public-storefront/__tests__/PublicStorefrontQrCard.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

- [ ] **Step 1: Write the failing dashboard QR card tests**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchStorefrontConfig } from '../../storefront/services/storefrontConfigService';
import PublicStorefrontQrCard from '../components/PublicStorefrontQrCard';

vi.mock('../../storefront/services/storefrontConfigService', () => ({
  fetchStorefrontConfig: vi.fn(),
}));

describe('PublicStorefrontQrCard', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when there is no saved storefront config', async () => {
    fetchStorefrontConfig.mockResolvedValue(null);

    render(
      <PublicStorefrontQrCard
        officeCode="OFF-1"
        officeName="Demo Office"
        nhName="NH"
      />,
    );

    expect(await screen.findByText(/QR/)).toBeInTheDocument();
    expect(screen.getByText(/저장하면/i)).toBeInTheDocument();
  });

  it('shows the public storefront link and actions when a saved storefront exists', async () => {
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      categoryConfigs: [{ productCategoryName: 'Fertilizer Upload' }],
      hiddenProducts: [],
    });

    render(
      <PublicStorefrontQrCard
        officeCode="OFF-1"
        officeName="Demo Office"
        nhName="NH"
      />,
    );

    expect(await screen.findByRole('link')).toHaveAttribute(
      'href',
      'https://public.example.com/?tool=store&office=OFF-1',
    );
    expect(screen.getByRole('button', { name: /링크/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /출력/i })).toBeInTheDocument();
  });

  it('shows an error state and retries', async () => {
    fetchStorefrontConfig
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        officeCode: 'OFF-1',
        categoryConfigs: [{ productCategoryName: 'Fertilizer Upload' }],
        hiddenProducts: [],
      });

    const user = userEvent.setup();
    render(<PublicStorefrontQrCard officeCode="OFF-1" officeName="Demo Office" />);

    expect(await screen.findByText(/다시 시도/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /다시/i }));

    await waitFor(() => {
      expect(fetchStorefrontConfig).toHaveBeenCalledTimes(2);
    });
  });
});
```

- [ ] **Step 2: Run the dashboard QR card test and verify RED**

Run: `npx vitest run src/features/public-storefront/__tests__/PublicStorefrontQrCard.test.jsx`
Expected: FAIL because `PublicStorefrontQrCard` does not exist yet.

- [ ] **Step 3: Update the builder regression test to remove QR expectations**

```jsx
it('keeps the unified design step focused on save and guidance instead of QR export', async () => {
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

  const user = userEvent.setup();
  render(<StorefrontBuilderPage officeCode="OFF-1" />);

  await reachUnifiedDesignStep(user);

  expect(screen.queryByTestId('storefront-qr-export-card')).not.toBeInTheDocument();
  expect(screen.queryByTestId('open-storefront-qr-export')).not.toBeInTheDocument();
  expect(screen.getByText(/대시보드/i)).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the builder regression test and verify RED**

Run: `npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: FAIL because the unified design step still renders QR export UI.

- [ ] **Step 5: Commit**

```bash
git add src/features/public-storefront/__tests__/PublicStorefrontQrCard.test.jsx src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
git commit -m "test: cover dashboard public storefront qr ownership"
```

### Task 2: Implement the dashboard-owned QR card and shared QR service

**Files:**
- Create: `react-app/src/features/public-storefront/components/PublicStorefrontQrCard.jsx`
- Create: `react-app/src/features/public-storefront/components/PublicStorefrontQrCard.module.css`
- Create: `react-app/src/features/public-storefront/hooks/usePublicStorefrontQr.js`
- Create: `react-app/src/features/public-storefront/services/publicStorefrontQrService.js`
- Modify: `react-app/src/common/pages/DashboardPage.jsx`
- Modify: `react-app/src/common/pages/DashboardPage.module.css`
- Test: `react-app/src/features/public-storefront/__tests__/PublicStorefrontQrCard.test.jsx`

- [ ] **Step 1: Create the shared public storefront QR service**

```js
export {
  buildStorefrontPublicUrl,
  buildStorefrontQrAssets,
  printStorefrontQr,
} from '../../storefront/components/qr-export/storefrontQrExportService';
```

Then, if time allows in the same task, inline the implementation into the new public-storefront service and make the storefront path a compatibility re-export.

- [ ] **Step 2: Create the QR hook with mount fetch and retry**

```js
import { startTransition, useEffect, useState } from 'react';

import { fetchStorefrontConfig } from '../../storefront/services/storefrontConfigService';
import {
  buildStorefrontPublicUrl,
  buildStorefrontQrAssets,
} from '../services/publicStorefrontQrService';

const EMPTY_ASSETS = {
  previewSvgMarkup: '',
  printSvgMarkup: '',
  pngDataUrl: '',
  svgDownloadUrl: '',
};

export function usePublicStorefrontQr({ officeCode }) {
  const [state, setState] = useState({ status: 'loading', publicUrl: '', assets: EMPTY_ASSETS, config: null });

  // fetch storefront config on mount and on retry
  // derive ready vs empty
  // build QR assets only when ready

  return {
    ...state,
    retry,
  };
}
```

- [ ] **Step 3: Create the dashboard QR card component**

```jsx
export default function PublicStorefrontQrCard({
  officeCode,
  officeName,
  nhName,
}) {
  const qr = usePublicStorefrontQr({ officeCode });

  if (qr.status === 'loading') {
    return <section data-testid="public-storefront-qr-card">...</section>;
  }

  if (qr.status === 'empty') {
    return <section data-testid="public-storefront-qr-card">...</section>;
  }

  if (qr.status === 'error') {
    return <section data-testid="public-storefront-qr-card">...</section>;
  }

  return <section data-testid="public-storefront-qr-card">...</section>;
}
```

- [ ] **Step 4: Add the card to the dashboard page**

```jsx
import PublicStorefrontQrCard from '../../features/public-storefront/components/PublicStorefrontQrCard';

// inside DashboardPage content
<div className={styles.dashboardSections}>
  <PublicStorefrontQrCard
    officeCode={officeCode}
    officeName={officeName}
    nhName={user?.nh_name}
  />
  <div className={styles.grid}>...</div>
</div>
```

- [ ] **Step 5: Run the dashboard QR tests and make sure they pass**

Run: `npx vitest run src/features/public-storefront/__tests__/PublicStorefrontQrCard.test.jsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/common/pages/DashboardPage.jsx src/common/pages/DashboardPage.module.css src/features/public-storefront/components/PublicStorefrontQrCard.jsx src/features/public-storefront/components/PublicStorefrontQrCard.module.css src/features/public-storefront/hooks/usePublicStorefrontQr.js src/features/public-storefront/services/publicStorefrontQrService.js src/features/public-storefront/__tests__/PublicStorefrontQrCard.test.jsx
git commit -m "feat: move public storefront qr to dashboard"
```

### Task 3: Remove builder QR UI and add dashboard guidance

**Files:**
- Modify: `react-app/src/features/storefront/pages/storefront-builder/UnifiedDesignStep.jsx`
- Modify: `react-app/src/features/storefront/pages/storefront-builder/UnifiedDesignStep.module.css`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Test: `react-app/src/App.test.jsx`

- [ ] **Step 1: Remove builder-local QR state and rendering**

```jsx
export default function UnifiedDesignStep({ step }) {
  return (
    <StepShell ...>
      <UnifiedDesignEditor ... />

      <p className={styles.helperNote}>
        고객용 QR은 저장 후 대시보드에서 확인할 수 있습니다.
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="save-storefront-draft"
          onClick={step.saveDraft}
          disabled={step.status === 'saving'}
        >
          {step.status === 'saving' ? '저장 중..' : '초안 저장'}
        </button>
      </div>
    </StepShell>
  );
}
```

- [ ] **Step 2: Remove the `qrExport` view-model from the builder hook**

```js
const unifiedDesignStep = {
  selectedTarget: unifiedDesign.selectedTarget,
  setSelectedTarget: unifiedDesign.setSelectedTarget,
  promptDraft: unifiedDesign.promptDraft,
  // ...
  saveDraft,
  status,
  selectedProductCategoryName,
};
```

- [ ] **Step 3: Run the builder regression test and make sure it passes**

Run: `npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS

- [ ] **Step 4: Run route and integration coverage**

Run: `npx vitest run src/App.test.jsx src/features/public-storefront/__tests__/PublicStorefrontQrCard.test.jsx src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: exit code 0

- [ ] **Step 6: Commit**

```bash
git add src/features/storefront/pages/storefront-builder/UnifiedDesignStep.jsx src/features/storefront/pages/storefront-builder/UnifiedDesignStep.module.css src/features/storefront/hooks/useStorefrontBuilder.js src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx src/App.test.jsx
git commit -m "refactor: keep builder focused on storefront editing"
```
