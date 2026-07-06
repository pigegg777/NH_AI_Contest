# Storefront Public Screen Reuse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a ready-state public storefront screen and reuse it from both the public route adapter and the storefront builder preview.

**Architecture:** Introduce a new `public-storefront` feature with a route adapter page and a pure ready-state screen. Keep the existing storefront render core in place for now, wrap it with the new public screen, and have the builder preview consume that new screen instead of importing the older render module directly.

**Tech Stack:** React, Vite, Vitest, Testing Library, CSS Modules

---

### Task 1: Add the new public storefront seam tests

**Files:**
- Create: `react-app/src/features/public-storefront/__tests__/PublicStorefrontScreen.test.jsx`
- Create: `react-app/src/features/public-storefront/__tests__/PublicStorefrontPage.test.jsx`
- Create: `react-app/src/features/storefront/__tests__/StorefrontBuilderPreviewScreen.test.jsx`

- [ ] **Step 1: Write the failing ready-state screen test**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PublicStorefrontScreen from '../components/PublicStorefrontScreen';

describe('PublicStorefrontScreen', () => {
  it('renders the customer-facing storefront from ready-state props', () => {
    render(
      <PublicStorefrontScreen
        config={{
          navConfig: { title: 'Public Demo' },
          pageConfig: {
            nav: { title: 'Public Demo', subtitle: '', logoUrl: '' },
            searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
            categoryChips: { enabled: true, sticky: true, variant: 'soft' },
          },
          categoryConfigs: [
            {
              officeCode: 'OFF-1',
              productCategoryName: 'Fertilizer Upload',
              sortOrder: 0,
              categoryConfig: {
                displayName: 'Fertilizer Upload',
                sourceCategoryName: 'Fertilizer Upload',
                selectedMediumCategories: ['Premium'],
                representativeMediumCategory: 'Premium',
                cardDesign: {
                  visibleFields: ['product_name'],
                },
              },
            },
          ],
          hiddenProducts: [],
        }}
        productRows={[
          {
            product_category_name: 'Fertilizer Upload',
            product_name: 'Alpha',
            medium_category: 'Premium',
          },
        ]}
        officeName="Demo Office"
        nhName="NH"
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'NH Demo Office 고객용 정보' })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write the failing public adapter handoff test**

```jsx
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchAllOfficeProductRows,
  fetchPublicOfficeIdentity,
} from '../../office-product-editor/services/office-product-data/publicOfficeProductService';
import { fetchStorefrontConfig } from '../../storefront/services/storefrontConfigService';
import PublicStorefrontPage from '../pages/PublicStorefrontPage';

vi.mock('../../office-product-editor/services/office-product-data/publicOfficeProductService', () => ({
  fetchAllOfficeProductRows: vi.fn(),
  fetchPublicOfficeIdentity: vi.fn(),
}));

vi.mock('../../storefront/services/storefrontConfigService', () => ({
  fetchStorefrontConfig: vi.fn(),
}));

vi.mock('../components/PublicStorefrontScreen', () => ({
  default: ({ config, productRows, officeName, nhName }) => (
    <div data-testid="public-storefront-screen">
      {config?.officeCode}:{productRows.length}:{officeName}:{nhName}
    </div>
  ),
}));

describe('PublicStorefrontPage adapter', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hands ready-state props to PublicStorefrontScreen after the public fetch completes', async () => {
    fetchStorefrontConfig.mockResolvedValue({ officeCode: 'OFF-1', categoryConfigs: [], hiddenProducts: [] });
    fetchAllOfficeProductRows.mockResolvedValue([{ product_name: 'Alpha' }]);
    fetchPublicOfficeIdentity.mockResolvedValue({ officeName: 'Demo Office', nhName: 'NH' });

    render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(await screen.findByTestId('public-storefront-screen')).toHaveTextContent('OFF-1:1:Demo Office:NH');
  });
});
```

- [ ] **Step 3: Write the failing builder preview reuse test**

```jsx
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/office-product-data/officeProductDataReadService';
import StorefrontBuilderPage from '../pages/StorefrontBuilderPage';
import { fetchStorefrontConfig } from '../services/storefrontConfigService';

vi.mock('../../office-product-editor/services/office-product-data/officeProductDataReadService', () => ({
  fetchOfficeProductDataEntries: vi.fn(),
}));

vi.mock('../services/storefrontConfigService', () => ({
  fetchStorefrontConfig: vi.fn(),
  upsertStorefrontConfig: vi.fn(),
}));

vi.mock('../../public-storefront/components/PublicStorefrontScreen', () => ({
  default: ({ config, productRows, officeName, nhName }) => (
    <div data-testid="public-storefront-screen">
      {config?.officeCode}:{productRows.length}:{officeName}:{nhName}
    </div>
  ),
}));

describe('StorefrontBuilderPage preview seam', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the extracted PublicStorefrontScreen with builder preview props', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue([
      {
        officeCode: 'OFF-1',
        officeName: 'Demo Office',
        categoryName: 'Fertilizer Upload',
        rows: [{ product_name: 'Alpha', product_category_name: 'Fertilizer Upload', medium_category: 'Premium' }],
      },
    ]);
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: {
        nav: { title: '', subtitle: '', logoUrl: '' },
        searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
        categoryChips: { enabled: true, sticky: true, variant: 'soft' },
      },
      navConfig: {
        title: '',
        subtitle: '',
        brandColor: '#1d4a2e',
        searchPlaceholder: 'Search products',
        logoUrl: '',
        searchVariant: 'pill',
        categoryChipVariant: 'soft',
      },
      categoryConfigs: [],
      hiddenProducts: [],
    });

    render(<StorefrontBuilderPage officeCode="OFF-1" nhName="NH" />);

    expect(await screen.findByTestId('public-storefront-screen')).toHaveTextContent('OFF-1:1:Demo Office:NH');
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `cd react-app && npx vitest run src/features/public-storefront/__tests__/PublicStorefrontScreen.test.jsx src/features/public-storefront/__tests__/PublicStorefrontPage.test.jsx src/features/storefront/__tests__/StorefrontBuilderPreviewScreen.test.jsx`

Expected: FAIL because `PublicStorefrontScreen` / `PublicStorefrontPage` under `public-storefront` do not exist yet, and the builder still imports the older preview renderer directly.

### Task 2: Implement the extracted public storefront screen and route adapter

**Files:**
- Create: `react-app/src/features/public-storefront/components/PublicStorefrontScreen.jsx`
- Create: `react-app/src/features/public-storefront/pages/PublicStorefrontPage.jsx`
- Modify: `react-app/src/features/storefront/pages/PublicStorefrontPage.jsx`

- [ ] **Step 1: Implement the ready-state screen**

```jsx
import StorefrontView from '../../storefront/components/StorefrontView';

export default function PublicStorefrontScreen({
  config,
  productRows,
  officeName = '',
  nhName = '',
}) {
  return (
    <StorefrontView
      config={config}
      productRows={productRows}
      officeName={officeName}
      nhName={nhName}
    />
  );
}
```

- [ ] **Step 2: Implement the public route adapter**

```jsx
import { useEffect, useState } from 'react';

import {
  fetchAllOfficeProductRows,
  fetchPublicOfficeIdentity,
} from '../../office-product-editor/services/office-product-data/publicOfficeProductService';
import { fetchStorefrontConfig } from '../../storefront/services/storefrontConfigService';
import styles from '../../storefront/pages/PublicStorefrontPage.module.css';
import PublicStorefrontScreen from '../components/PublicStorefrontScreen';

const EMPTY_STATE = {
  status: 'placeholder',
  config: null,
  productRows: [],
  officeName: '',
  nhName: '',
};

export default function PublicStorefrontPage({ officeCode }) {
  const normalizedOfficeCode = (officeCode ?? '').trim();
  const [state, setState] = useState(EMPTY_STATE);

  useEffect(() => {
    if (!normalizedOfficeCode) {
      setState(EMPTY_STATE);
      return;
    }

    let isCancelled = false;

    setState({
      status: 'loading',
      config: null,
      productRows: [],
      officeName: '',
      nhName: '',
    });

    Promise.all([
      fetchStorefrontConfig({ officeCode: normalizedOfficeCode }),
      fetchAllOfficeProductRows({ officeCode: normalizedOfficeCode }),
      fetchPublicOfficeIdentity({ officeCode: normalizedOfficeCode }),
    ])
      .then(([config, productRows, officeIdentity]) => {
        if (isCancelled) {
          return;
        }

        if (!config || productRows.length === 0) {
          setState(EMPTY_STATE);
          return;
        }

        setState({
          status: 'ready',
          config,
          productRows,
          officeName: officeIdentity?.officeName ?? '',
          nhName: officeIdentity?.nhName ?? '',
        });
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setState({
          status: 'error',
          config: null,
          productRows: [],
          officeName: '',
          nhName: '',
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [normalizedOfficeCode]);

  if (state.status === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.statusMessage}>불러오는 중..</div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
      </div>
    );
  }

  if (state.status === 'placeholder') {
    return (
      <div className={styles.page}>
        <div className={styles.statusMessage}>페이지 준비 중입니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PublicStorefrontScreen
        config={state.config}
        productRows={state.productRows}
        officeName={state.officeName}
        nhName={state.nhName}
      />
    </div>
  );
}
```

- [ ] **Step 3: Keep the old storefront path as a compatibility re-export**

```jsx
export { default } from '../../public-storefront/pages/PublicStorefrontPage';
```

- [ ] **Step 4: Run the seam tests to verify they pass**

Run: `cd react-app && npx vitest run src/features/public-storefront/__tests__/PublicStorefrontScreen.test.jsx src/features/public-storefront/__tests__/PublicStorefrontPage.test.jsx`

Expected: PASS

### Task 3: Rewire the builder preview and app entry to the new public storefront feature

**Files:**
- Modify: `react-app/src/features/storefront/pages/StorefrontBuilderPage.jsx`
- Modify: `react-app/src/App.jsx`
- Modify: `react-app/src/App.test.jsx`

- [ ] **Step 1: Update the builder preview to reuse the new screen**

```jsx
import PublicStorefrontScreen from '../../public-storefront/components/PublicStorefrontScreen';
```

```jsx
<PublicStorefrontScreen
  config={builder.previewConfig}
  productRows={builder.previewProductRows}
  officeName={builder.officeName}
  nhName={builder.nh_name}
/>
```

- [ ] **Step 2: Update the app route import to the new public feature**

```jsx
import PublicStorefrontPage from './features/public-storefront/pages/PublicStorefrontPage';
```

- [ ] **Step 3: Update the app test mock path**

```jsx
vi.mock('./features/public-storefront/pages/PublicStorefrontPage', () => ({
  default: ({ officeCode }) => <div>public-storefront-page:{officeCode}</div>,
}));
```

- [ ] **Step 4: Run the builder and app seam tests**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontBuilderPreviewScreen.test.jsx src/App.test.jsx`

Expected: PASS

### Task 4: Run the broader storefront regression checks

**Files:**
- Verify only

- [ ] **Step 1: Run the existing public storefront regression suite**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

Expected: PASS

- [ ] **Step 2: Run the existing builder regression suite**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

Expected: PASS

- [ ] **Step 3: Run the storefront view regression suite**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontView.test.jsx`

Expected: PASS

- [ ] **Step 4: Run the frontend build**

Run: `cd react-app && npm run build`

Expected: exit code 0
