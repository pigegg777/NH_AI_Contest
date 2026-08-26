# 스토어프론트 안내 항목 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사무소와 각 분류의 안내 문구를 `{ id, label, description }` 항목 여러 개로 바꾸고, 대분류 칩의 `사무소 정보` 탭에서 전부 읽히게 한다.

**Architecture:** 순수 모델(`informationEntriesModel`)이 정규화·폴백·상한을 혼자 책임지고, 설정 모델과 뷰 훅은 그것을 부르기만 한다. 렌더는 기존 `CategoryInformationPanel` 패턴을 그대로 따르는 `OfficeInformationPanel`을 추가한다. 안내 문구는 AI 디자인 대상이 아니므로 스타일 스키마가 늘지 않고, 오히려 기존 스코프 2개가 빠진다.

**Tech Stack:** React 19, Vite 8, vitest 4, CSS Modules, `@testing-library/react`

**Spec:** `docs/superpowers/specs/2026-08-26-storefront-information-entries-design.md`

## Global Constraints

- 테스트 명령: `cd react-app && npx vitest run <path>`. 전체는 `npx vitest run src/features/storefront`.
- 시작 시점 기준 storefront 스위트는 **544개 전부 통과**한다. 새 실패를 만들지 말 것.
- `AppLayout.test.jsx`, `PublicStorefrontQrCard.test.jsx`, `excelExtractWorkbookReviewPage.test.jsx`, `excelExtractWorkbookReviewTable.test.jsx`는 이 브랜치 밖의 이유로 실패한다. 무시할 것.
- `StorefrontBuilderPage.test.jsx`, `officeProductEditorDraftPersistence.test.jsx`는 병렬 부하에서 흔들린다. 실패하면 단독 재실행 후 판단할 것.
- **고객용 스토어프론트 CSS는 하드코딩 hex를 쓴다.** `--corp-*` 토큰은 관리자(빌더) 화면 전용이다.
- 한국어 텍스트에는 `word-break: keep-all`. **그라디언트 금지.**
- `git add -A` 금지. 실제로 고친 경로만 stage 할 것.
- 항목 상한은 `MAX_INFORMATION_ENTRIES = 10`.
- 안내 문구에 **AI 스타일 스코프를 새로 만들지 않는다.**

---

### Task 1: 안내 항목 모델

**Files:**
- Create: `react-app/src/features/storefront/model/storefront-config/informationEntriesModel.js`
- Test: `react-app/src/features/storefront/__tests__/informationEntriesModel.test.js` (create)

**Interfaces:**
- Consumes: 없음 (순수 모델)
- Produces:
  - `MAX_INFORMATION_ENTRIES = 10`
  - `createInformationEntry() -> { id, label: '', description: '' }`
  - `normalizeInformationEntries(source, { legacyText } = {}) -> Array<{ id, label, description }>`

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/informationEntriesModel.test.js`:

```js
import { describe, expect, it } from 'vitest';

import {
  MAX_INFORMATION_ENTRIES,
  createInformationEntry,
  normalizeInformationEntries,
} from '../model/storefront-config/informationEntriesModel';

describe('normalizeInformationEntries', () => {
  it('keeps the label and description of each entry', () => {
    expect(
      normalizeInformationEntries([
        { id: 'a', label: '영세가격', description: '농업경영체 등록자 구매가격' },
      ]),
    ).toEqual([
      { id: 'a', label: '영세가격', description: '농업경영체 등록자 구매가격' },
    ]);
  });

  it('returns an empty array for anything that is not an array', () => {
    expect(normalizeInformationEntries(undefined)).toEqual([]);
    expect(normalizeInformationEntries(null)).toEqual([]);
    expect(normalizeInformationEntries('영세가격')).toEqual([]);
    expect(normalizeInformationEntries({ label: '영세가격' })).toEqual([]);
  });

  it('drops entries where both halves are empty', () => {
    expect(
      normalizeInformationEntries([
        { id: 'a', label: '', description: '' },
        { id: 'b', label: '  ', description: '  ' },
        { id: 'c', label: '배송', description: '' },
        { id: 'd', label: '', description: '당일 발송' },
      ]),
    ).toEqual([
      { id: 'c', label: '배송', description: '' },
      { id: 'd', label: '', description: '당일 발송' },
    ]);
  });

  it('keeps line breaks inside a description but trims the ends', () => {
    expect(
      normalizeInformationEntries([
        { id: 'a', label: ' 보관 ', description: '  첫째 줄\n둘째 줄  ' },
      ]),
    ).toEqual([{ id: 'a', label: '보관', description: '첫째 줄\n둘째 줄' }]);
  });

  it('gives an entry an id when it arrives without one', () => {
    const [entry] = normalizeInformationEntries([
      { label: '배송', description: '당일 발송' },
    ]);

    expect(entry.id).toBeTruthy();
    expect(typeof entry.id).toBe('string');
  });

  it('never repeats an id, even when the saved ones collide', () => {
    const entries = normalizeInformationEntries([
      { id: 'same', label: 'a', description: '' },
      { id: 'same', label: 'b', description: '' },
      { label: 'c', description: '' },
    ]);

    expect(new Set(entries.map((entry) => entry.id)).size).toBe(3);
  });

  it('caps the list', () => {
    const source = Array.from({ length: MAX_INFORMATION_ENTRIES + 5 }, (_, index) => ({
      id: `e${index}`,
      label: `라벨 ${index}`,
      description: '',
    }));

    expect(normalizeInformationEntries(source)).toHaveLength(
      MAX_INFORMATION_ENTRIES,
    );
  });

  it('falls back to the old single string when there are no entries', () => {
    expect(
      normalizeInformationEntries([], { legacyText: '영세가격 : 농업경영체 등록자 구매가격' }),
    ).toEqual([
      {
        id: expect.any(String),
        label: '',
        description: '영세가격 : 농업경영체 등록자 구매가격',
      },
    ]);
  });

  it('ignores the old string once real entries exist', () => {
    expect(
      normalizeInformationEntries([{ id: 'a', label: '배송', description: '' }], {
        legacyText: '영세가격 : 농업경영체 등록자 구매가격',
      }),
    ).toEqual([{ id: 'a', label: '배송', description: '' }]);
  });

  it('does not invent an entry when both the list and the old string are empty', () => {
    expect(normalizeInformationEntries([], { legacyText: '   ' })).toEqual([]);
    expect(normalizeInformationEntries(undefined, {})).toEqual([]);
  });
});

describe('createInformationEntry', () => {
  it('returns a blank entry with its own id', () => {
    const first = createInformationEntry();
    const second = createInformationEntry();

    expect(first).toEqual({ id: expect.any(String), label: '', description: '' });
    expect(first.id).not.toBe(second.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/informationEntriesModel.test.js`
Expected: FAIL — `Failed to resolve import .../informationEntriesModel`

- [ ] **Step 3: Write the implementation**

Create `react-app/src/features/storefront/model/storefront-config/informationEntriesModel.js`:

```js
import { toTrimmedString } from '../../../../common/utils/text';

/**
 * 사무소와 분류가 각각 들고 있는 안내 항목. 판매자가 쓰는 글이라 AI 디자인
 * 대상이 아니고, 스타일은 패널 CSS가 전부 정한다.
 */
export const MAX_INFORMATION_ENTRIES = 10;

// 저장된 id를 그대로 살리면서 새 항목에도 겹치지 않는 id를 준다. 배열 인덱스를
// React key로 쓰면 행을 지웠을 때 입력 중이던 값이 옆 행으로 딸려간다.
function randomEntryId() {
  return `ie-${Math.random().toString(36).slice(2, 10)}`;
}

export function createInformationEntry() {
  return { id: randomEntryId(), label: '', description: '' };
}

export function normalizeInformationEntries(source, { legacyText = '' } = {}) {
  const usedIds = new Set();
  const entries = [];

  for (const item of Array.isArray(source) ? source : []) {
    if (entries.length >= MAX_INFORMATION_ENTRIES) {
      break;
    }

    const label = toTrimmedString(item?.label);
    const description = toTrimmedString(item?.description);

    if (!label && !description) {
      continue;
    }

    const savedId = toTrimmedString(item?.id);
    let id = savedId && !usedIds.has(savedId) ? savedId : randomEntryId();

    while (usedIds.has(id)) {
      id = randomEntryId();
    }

    usedIds.add(id);
    entries.push({ id, label, description });
  }

  if (entries.length > 0) {
    return entries;
  }

  // 옛 단일 문자열은 읽기 폴백으로만 산다. 콜론으로 자동 분리하면 본문에
  // 콜론이 든 문장을 망가뜨리므로 통째로 description에 넣는다.
  const legacy = toTrimmedString(legacyText);

  return legacy ? [{ id: randomEntryId(), label: '', description: legacy }] : [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/informationEntriesModel.test.js`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/model/storefront-config/informationEntriesModel.js react-app/src/features/storefront/__tests__/informationEntriesModel.test.js
git commit -m "feat(storefront): model the information entries"
```

---

### Task 2: 설정 모델 배선

**Files:**
- Modify: `react-app/src/features/storefront/model/storefront-config/storefrontBuilderModel.js`
- Modify: `react-app/src/features/storefront/model/storefront-config/sectionMatching.js`
- Test: `react-app/src/features/storefront/__tests__/informationEntriesConfig.test.js` (create)

**Interfaces:**
- Consumes: Task 1의 `normalizeInformationEntries`
- Produces:
  - `normalizePageConfig(...)` 반환값에 `officeInfo: Array<Entry>`
  - `normalizeCategoryConfig(...)` 반환값에 `info: Array<Entry>`
  - `buildCategoryConfigRow({ categoryInfoEntries })`, `buildStorefrontSavePayload({ officeInfoEntries, categoryInfoEntries })`
  - `buildSections(...)` 각 섹션에 `infoEntries: Array<Entry>`

`normalizeCategoryConfig`의 기존 `description` 문자열 필드와 `normalizePageConfig`의 `nav.subtitle`은 **지우지 않는다.** 읽기 폴백으로 계속 필요하다.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/informationEntriesConfig.test.js`:

```js
import { describe, expect, it } from 'vitest';

import {
  buildStorefrontSavePayload,
  normalizeCategoryConfig,
  normalizePageConfig,
} from '../model/storefront-config/storefrontBuilderModel';
import { buildSections } from '../model/storefront-config/sectionMatching';

describe('page config information entries', () => {
  it('normalizes the saved entries', () => {
    expect(
      normalizePageConfig({
        officeInfo: [{ id: 'a', label: '영세가격', description: '농업경영체 등록자' }],
      }).officeInfo,
    ).toEqual([
      { id: 'a', label: '영세가격', description: '농업경영체 등록자' },
    ]);
  });

  it('falls back to the old nav subtitle', () => {
    expect(
      normalizePageConfig({ nav: { subtitle: '영세가격 : 농업경영체 등록자' } })
        .officeInfo,
    ).toEqual([
      { id: expect.any(String), label: '', description: '영세가격 : 농업경영체 등록자' },
    ]);
  });

  it('is empty when nothing was ever written', () => {
    expect(normalizePageConfig({}).officeInfo).toEqual([]);
  });
});

describe('category config information entries', () => {
  it('normalizes the saved entries', () => {
    expect(
      normalizeCategoryConfig(
        { info: [{ id: 'a', label: '봄철 밑거름', description: '3월 중순부터' }] },
        '비료',
      ).info,
    ).toEqual([{ id: 'a', label: '봄철 밑거름', description: '3월 중순부터' }]);
  });

  it('falls back to the old description string', () => {
    expect(
      normalizeCategoryConfig({ description: '봄철 밑거름 안내' }, '비료').info,
    ).toEqual([
      { id: expect.any(String), label: '', description: '봄철 밑거름 안내' },
    ]);
  });
});

describe('buildSections', () => {
  it('carries the entries onto the section', () => {
    const [section] = buildSections(
      [
        {
          productCategoryName: '비료',
          categoryConfig: {
            info: [{ id: 'a', label: '봄철 밑거름', description: '3월 중순부터' }],
          },
        },
      ],
      [{ product_category_name: '비료', product_name: '알파' }],
    );

    expect(section.infoEntries).toEqual([
      { id: 'a', label: '봄철 밑거름', description: '3월 중순부터' },
    ]);
  });

  it('gives an unconfigured category an empty list rather than undefined', () => {
    const [section] = buildSections(
      [],
      [{ product_category_name: '비료', product_name: '알파' }],
    );

    expect(section.infoEntries).toEqual([]);
  });
});

describe('buildStorefrontSavePayload', () => {
  it('writes both lists', () => {
    const payload = buildStorefrontSavePayload({
      officeCode: 'OFF-1',
      existingConfig: null,
      hiddenProducts: [],
      selectedProductCategoryName: '비료',
      selectedMediumCategories: [],
      representativeMediumCategory: '',
      cardFields: ['product_name'],
      officeInfoEntries: [{ id: 'o1', label: '영세가격', description: '등록자' }],
      categoryInfoEntries: [{ id: 'c1', label: '봄철', description: '3월' }],
      navConfig: {},
      mobileUiTree: undefined,
      allowedScalarKeys: ['product_name'],
    });

    expect(payload.pageConfig.officeInfo).toEqual([
      { id: 'o1', label: '영세가격', description: '등록자' },
    ]);
    expect(payload.categoryConfigs[0].categoryConfig.info).toEqual([
      { id: 'c1', label: '봄철', description: '3월' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/informationEntriesConfig.test.js`
Expected: FAIL — `expected undefined to equal [...]`

- [ ] **Step 3: Wire `storefrontBuilderModel.js`**

Add the import beside the other model imports at the top of the file:

```js
import { normalizeInformationEntries } from './informationEntriesModel';
```

In `normalizePageConfig`, add `officeInfo` to the returned object, directly after the `nav: { ... }` block:

```js
    officeInfo: normalizeInformationEntries(source.officeInfo, {
      legacyText: sourceNav.subtitle,
    }),
```

In `normalizeCategoryConfig`, add `info` directly after the existing `description:` line (line ~289) — keep `description` as it is:

```js
    info: normalizeInformationEntries(source.info, { legacyText: source.description }),
```

In `buildCategoryConfigRow`, add `categoryInfoEntries` to the destructured parameters, and inside the object it hands to `normalizeCategoryConfig`, add — right after the existing `description:` entry:

```js
      info:
        categoryInfoEntries === undefined
          ? existingRow?.categoryConfig?.info
          : categoryInfoEntries,
```

In `buildStorefrontSavePayload`, add `officeInfoEntries` and `categoryInfoEntries` to the destructured parameters, pass `categoryInfoEntries` through to `buildCategoryConfigRow`, and in the `normalizePageConfig({ ... })` call inside `buildPageConfigFromDraft` add:

```js
    officeInfo: officeInfoEntries,
```

`buildPageConfigFromDraft` therefore needs `officeInfoEntries` threaded into it as a parameter too. Where `officeInfoEntries` is `undefined`, fall back to what the existing config already holds so an unrelated save cannot wipe the list:

```js
    officeInfo: officeInfoEntries ?? basePageConfig.officeInfo,
```

- [ ] **Step 4: Wire `sectionMatching.js`**

Add the import:

```js
import { normalizeInformationEntries } from './informationEntriesModel';
```

In `buildDefaultSection`, add beside the existing `description: ''`:

```js
    infoEntries: [],
```

In `buildSections`'s configured-section mapper, add beside the existing `description:` line:

```js
        infoEntries: normalizeInformationEntries(categoryConfig.info, {
          legacyText: categoryConfig.description,
        }),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/informationEntriesConfig.test.js`
Expected: PASS (7 tests)

- [ ] **Step 6: Run the storefront suite**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: no new failures.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/model/storefront-config/storefrontBuilderModel.js react-app/src/features/storefront/model/storefront-config/sectionMatching.js react-app/src/features/storefront/__tests__/informationEntriesConfig.test.js
git commit -m "feat(storefront): carry the information entries through the config"
```

---

### Task 3: 사무소 정보 패널

**Files:**
- Create: `react-app/src/features/storefront/components/storefront-page/category-nav/OfficeInformationPanel.jsx`
- Create: `react-app/src/features/storefront/components/storefront-page/category-nav/OfficeInformationPanel.module.css`
- Test: `react-app/src/features/storefront/__tests__/OfficeInformationPanel.test.jsx` (create)

**Interfaces:**
- Consumes: Task 1의 항목 모양 `{ id, label, description }`
- Produces: `<OfficeInformationPanel officeEntries categoryGroups />`
  - `officeEntries: Array<Entry>`
  - `categoryGroups: Array<{ categoryName: string, entries: Array<Entry> }>`

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/OfficeInformationPanel.test.jsx`:

```jsx
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import OfficeInformationPanel from '../components/storefront-page/category-nav/OfficeInformationPanel';

const OFFICE_ENTRIES = [
  { id: 'o1', label: '영세가격', description: '농업경영체 등록자 구매가격' },
];
const CATEGORY_GROUPS = [
  {
    categoryName: '비료',
    entries: [{ id: 'c1', label: '봄철 밑거름', description: '3월 중순부터' }],
  },
];

describe('OfficeInformationPanel', () => {
  it('shows the office entries above the category groups', () => {
    render(
      <OfficeInformationPanel
        officeEntries={OFFICE_ENTRIES}
        categoryGroups={CATEGORY_GROUPS}
      />,
    );

    const office = screen.getByText('영세가격');
    const category = screen.getByText('봄철 밑거름');

    expect(office.compareDocumentPosition(category)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('heads each group with its category name', () => {
    render(
      <OfficeInformationPanel officeEntries={[]} categoryGroups={CATEGORY_GROUPS} />,
    );

    const group = screen.getByTestId('storefront-office-information-group-비료');

    expect(within(group).getByText('비료')).toBeInTheDocument();
    expect(within(group).getByText('3월 중순부터')).toBeInTheDocument();
  });

  it('renders an entry with no label as description only', () => {
    render(
      <OfficeInformationPanel
        officeEntries={[{ id: 'o1', label: '', description: '안내 문구' }]}
        categoryGroups={[]}
      />,
    );

    expect(screen.getByText('안내 문구')).toBeInTheDocument();
    expect(
      screen.queryByTestId('storefront-office-information-label-o1'),
    ).not.toBeInTheDocument();
  });

  it('renders nothing at all when there is nothing to say', () => {
    const { container } = render(
      <OfficeInformationPanel officeEntries={[]} categoryGroups={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('omits the office block when only categories have entries', () => {
    render(
      <OfficeInformationPanel officeEntries={[]} categoryGroups={CATEGORY_GROUPS} />,
    );

    expect(
      screen.queryByTestId('storefront-office-information-office'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('storefront-office-information-group-비료'),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/OfficeInformationPanel.test.jsx`
Expected: FAIL — `Failed to resolve import .../OfficeInformationPanel`

- [ ] **Step 3: Write the component**

Create `react-app/src/features/storefront/components/storefront-page/category-nav/OfficeInformationPanel.jsx`:

```jsx
import { useId } from 'react';

import styles from './OfficeInformationPanel.module.css';

function InformationEntryList({ entries }) {
  return (
    <dl className={styles.entryList}>
      {entries.map((entry) => (
        <div key={entry.id} className={styles.entry}>
          {entry.label ? (
            <dt
              className={styles.entryLabel}
              data-testid={`storefront-office-information-label-${entry.id}`}
            >
              {entry.label}
            </dt>
          ) : null}
          {entry.description ? (
            <dd className={styles.entryDescription}>{entry.description}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/**
 * 대분류 칩의 `사무소 정보` 탭이 여는 패널. 사무소 안내와 모든 분류의 안내를
 * 한 화면에 모아 보여준다. 문구 자체는 판매자가 표시항목 선택에서 쓴다.
 */
export default function OfficeInformationPanel({
  officeEntries = [],
  categoryGroups = [],
}) {
  const titleId = useId();

  if (officeEntries.length === 0 && categoryGroups.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby={titleId}
      data-testid="storefront-office-information"
    >
      <h2 id={titleId} className={styles.panelTitle}>
        안내
      </h2>

      {officeEntries.length > 0 ? (
        <div
          className={styles.block}
          data-testid="storefront-office-information-office"
        >
          <h3 className={styles.blockTitle}>사무소 안내</h3>
          <InformationEntryList entries={officeEntries} />
        </div>
      ) : null}

      {categoryGroups.map((group) => (
        <div
          key={group.categoryName}
          className={styles.block}
          data-testid={`storefront-office-information-group-${group.categoryName}`}
        >
          <h3 className={styles.blockTitle}>{group.categoryName}</h3>
          <InformationEntryList entries={group.entries} />
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Write the stylesheet**

Create `react-app/src/features/storefront/components/storefront-page/category-nav/OfficeInformationPanel.module.css`:

```css
/* 고객용 화면이므로 --corp-* 토큰이 아니라 하드코딩 hex를 쓴다. */
.panel {
  margin-bottom: 24px;
  padding: 26px 28px 22px;
  border: 1px solid color-mix(in srgb, var(--brand-color, #1d4a2e) 24%, #dfe8dc);
  border-radius: 14px;
  background: color-mix(in srgb, var(--brand-color, #1d4a2e) 5%, #ffffff);
}

.panelTitle {
  margin: 0 0 18px;
  color: var(--title-text-color, #173223);
  font-size: 1.08rem;
  font-weight: 800;
  line-height: 1.35;
  word-break: keep-all;
}

.block {
  padding-top: 16px;
  border-top: 1px dashed
    color-mix(in srgb, var(--brand-color, #1d4a2e) 22%, transparent);
}

.block:first-of-type {
  padding-top: 0;
  border-top: 0;
}

.blockTitle {
  margin: 0 0 10px;
  color: #173223;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.4;
  word-break: keep-all;
}

.entryList {
  margin: 0 0 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entry {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/* label과 description은 각자 클래스를 갖는다. AI 대상이 아니라 여기서 정한
   값이 최종값이다. */
.entryLabel {
  margin: 0;
  color: #2f4a39;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.45;
  word-break: keep-all;
}

.entryDescription {
  margin: 0;
  max-width: 48rem;
  color: #51635a;
  font-size: 0.84rem;
  font-weight: 400;
  line-height: 1.7;
  white-space: pre-line;
  word-break: keep-all;
  overflow-wrap: break-word;
  text-wrap: pretty;
}

@media (max-width: 720px) {
  .panel {
    padding: 20px 18px 18px;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/OfficeInformationPanel.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/components/storefront-page/category-nav/OfficeInformationPanel.jsx react-app/src/features/storefront/components/storefront-page/category-nav/OfficeInformationPanel.module.css react-app/src/features/storefront/__tests__/OfficeInformationPanel.test.jsx
git commit -m "feat(storefront): add the office information panel"
```

---

### Task 4: 분류 패널을 항목 배열로

**Files:**
- Modify: `react-app/src/features/storefront/components/storefront-page/category-nav/CategoryInformationPanel.jsx`
- Modify: `react-app/src/features/storefront/components/storefront-page/category-nav/CategoryInformationPanel.module.css`
- Test: `react-app/src/features/storefront/__tests__/CategoryInformationPanel.test.jsx` (create)

**Interfaces:**
- Consumes: Task 1의 항목 모양
- Produces: `<CategoryInformationPanel categoryName entries cardStyle />` — `description` 문자열 prop이 `entries` 배열로 바뀐다.

현재 이 컴포넌트는 `description` 문자열 하나를 받아 `.description` 하나로 그린다. `cardStyle` prop과 `buildShellCssVars` 호출은 **제거한다** — Task 7이 그 CSS 변수를 없애므로 남으면 죽은 코드가 된다.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/CategoryInformationPanel.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CategoryInformationPanel from '../components/storefront-page/category-nav/CategoryInformationPanel';

describe('CategoryInformationPanel', () => {
  it('lists every entry under the category name', () => {
    render(
      <CategoryInformationPanel
        categoryName="비료"
        entries={[
          { id: 'a', label: '봄철 밑거름', description: '3월 중순부터' },
          { id: 'b', label: '보관 방법', description: '직사광선을 피해' },
        ]}
      />,
    );

    expect(screen.getByText('비료 안내')).toBeInTheDocument();
    expect(screen.getByText('봄철 밑거름')).toBeInTheDocument();
    expect(screen.getByText('보관 방법')).toBeInTheDocument();
  });

  it('renders an entry with no label as description only', () => {
    render(
      <CategoryInformationPanel
        categoryName="비료"
        entries={[{ id: 'a', label: '', description: '안내 문구' }]}
      />,
    );

    expect(screen.getByText('안내 문구')).toBeInTheDocument();
  });

  it('renders nothing when there are no entries', () => {
    const { container } = render(
      <CategoryInformationPanel categoryName="비료" entries={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the line breaks a merchant typed', () => {
    render(
      <CategoryInformationPanel
        categoryName="비료"
        entries={[{ id: 'a', label: '', description: '첫째 줄\n둘째 줄' }]}
      />,
    );

    expect(screen.getByText(/첫째 줄/)).toHaveStyle({ whiteSpace: 'pre-line' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/CategoryInformationPanel.test.jsx`
Expected: FAIL — 항목이 그려지지 않아 `Unable to find an element with the text: 봄철 밑거름`

- [ ] **Step 3: Rewrite the component**

Replace the whole body of `CategoryInformationPanel.jsx`:

```jsx
import { useId } from 'react';

import styles from './CategoryInformationPanel.module.css';

/**
 * 중분류 칩의 `{분류명} 정보` 탭이 여는 패널. 사무소 정보 탭과 내용이 겹치지만,
 * 그 분류를 보고 있는 구매자가 바로 읽을 수 있는 경로다.
 */
export default function CategoryInformationPanel({
  categoryName,
  entries = [],
}) {
  const titleId = useId();

  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby={titleId}
      data-testid="storefront-category-information"
    >
      <div className={styles.headingRow}>
        <span className={styles.icon} aria-hidden="true">
          i
        </span>
        <h2 id={titleId} className={styles.title}>
          {categoryName} 안내
        </h2>
      </div>

      <dl className={styles.entryList}>
        {entries.map((entry) => (
          <div key={entry.id} className={styles.entry}>
            {entry.label ? (
              <dt className={styles.entryLabel}>{entry.label}</dt>
            ) : null}
            {entry.description ? (
              <dd className={styles.entryDescription}>{entry.description}</dd>
            ) : null}
          </div>
        ))}
      </dl>

      <p className={styles.helper}>상품을 보려면 위 중분류를 선택하세요.</p>
    </section>
  );
}
```

- [ ] **Step 4: Update the stylesheet**

In `CategoryInformationPanel.module.css`, replace the whole `.description` rule with these four rules. Leave `.panel`, `.headingRow`, `.icon`, `.title`, `.helper` and the media query untouched:

```css
.entryList {
  margin: 18px 0 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.entry {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.entryLabel {
  margin: 0;
  color: #2f4a39;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.45;
  word-break: keep-all;
}

.entryDescription {
  margin: 0;
  max-width: 48rem;
  color: #51635a;
  font-size: 0.84rem;
  font-weight: 400;
  line-height: 1.7;
  white-space: pre-line;
  word-break: keep-all;
  overflow-wrap: break-word;
  text-wrap: pretty;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/CategoryInformationPanel.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/components/storefront-page/category-nav/CategoryInformationPanel.jsx react-app/src/features/storefront/components/storefront-page/category-nav/CategoryInformationPanel.module.css react-app/src/features/storefront/__tests__/CategoryInformationPanel.test.jsx
git commit -m "feat(storefront): list every entry in the category panel"
```

---

### Task 5: 뷰 훅 + 대분류 칩

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontView.js`
- Modify: `react-app/src/features/storefront/components/storefront-page/category-nav/ProductCategoryNavBlock.jsx`
- Modify: `react-app/src/features/storefront/components/storefront-page/StorefrontView.jsx`
- Test: `react-app/src/features/storefront/__tests__/officeInformationTab.test.jsx` (create)

**Interfaces:**
- Consumes: Task 1 `normalizeInformationEntries`, Task 2 `section.infoEntries`, Task 3 `OfficeInformationPanel`, Task 4 `CategoryInformationPanel entries`
- Produces (뷰 반환값):
  - `officeInformationItemId: '__office_information__'`
  - `officeInformationEntries: Array<Entry>`
  - `officeInformationCategoryGroups: Array<{ categoryName, entries }>`
  - `canRenderOfficeInformation: boolean`
  - `isOfficeInformationActive: boolean`
  - `activeCategoryInfoEntries: Array<Entry>` (기존 `activeCategoryDescription` 대체)

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/officeInformationTab.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import StorefrontView from '../components/storefront-page/StorefrontView';

const PRODUCT_ROWS = [
  { product_category_name: '비료', product_name: '알파', tax_price: 1000 },
  { product_category_name: '농약', product_name: '베타', tax_price: 2000 },
];

function buildConfig({ officeInfo, fertilizerInfo } = {}) {
  return {
    officeCode: 'OFF-1',
    pageConfig: { officeInfo },
    navConfig: { title: '발안농협' },
    categoryConfigs: [
      {
        productCategoryName: '비료',
        categoryConfig: { info: fertilizerInfo, cardDesign: { visibleFields: ['product_name'] } },
      },
      {
        productCategoryName: '농약',
        categoryConfig: { cardDesign: { visibleFields: ['product_name'] } },
      },
    ],
    hiddenProducts: [],
  };
}

describe('office information tab', () => {
  it('offers the chip and opens the panel', async () => {
    const user = userEvent.setup();

    render(
      <StorefrontView
        config={buildConfig({
          officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
          fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
        })}
        productRows={PRODUCT_ROWS}
        officeName="영농센터"
        nhName="발안농협"
      />,
    );

    const chips = screen.getByTestId('storefront-product-category-chips');
    const officeChip = screen.getByRole('button', { name: '사무소 정보' });

    expect(chips).toContainElement(officeChip);

    await user.click(officeChip);

    const panel = await screen.findByTestId('storefront-office-information');

    expect(panel).toBeInTheDocument();
    expect(screen.getByText('영세가격')).toBeInTheDocument();
    expect(screen.getByText('봄철 밑거름')).toBeInTheDocument();
  });

  it('hides the product cards while the tab is open', async () => {
    const user = userEvent.setup();

    render(
      <StorefrontView
        config={buildConfig({
          officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자' }],
        })}
        productRows={PRODUCT_ROWS}
        officeName="영농센터"
        nhName="발안농협"
      />,
    );

    expect(screen.getByText('알파')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '사무소 정보' }));

    expect(screen.queryByText('알파')).not.toBeInTheDocument();
  });

  it('goes back to the cards when another category is picked', async () => {
    const user = userEvent.setup();

    render(
      <StorefrontView
        config={buildConfig({
          officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자' }],
        })}
        productRows={PRODUCT_ROWS}
        officeName="영농센터"
        nhName="발안농협"
      />,
    );

    await user.click(screen.getByRole('button', { name: '사무소 정보' }));
    await user.click(screen.getByRole('button', { name: '농약' }));

    expect(
      screen.queryByTestId('storefront-office-information'),
    ).not.toBeInTheDocument();
    expect(await screen.findByText('베타')).toBeInTheDocument();
  });

  it('offers no chip when nobody wrote anything', () => {
    render(
      <StorefrontView
        config={buildConfig({})}
        productRows={PRODUCT_ROWS}
        officeName="영농센터"
        nhName="발안농협"
      />,
    );

    expect(
      screen.queryByRole('button', { name: '사무소 정보' }),
    ).not.toBeInTheDocument();
  });

  it('offers the chip when only a category wrote something', () => {
    render(
      <StorefrontView
        config={buildConfig({
          fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
        })}
        productRows={PRODUCT_ROWS}
        officeName="영농센터"
        nhName="발안농협"
      />,
    );

    expect(
      screen.getByRole('button', { name: '사무소 정보' }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/officeInformationTab.test.jsx`
Expected: FAIL — `Unable to find an accessible element with the role "button" and name "사무소 정보"`

- [ ] **Step 3: Extend `useStorefrontView.js`**

Add the import beside the other model imports:

```js
import { normalizeInformationEntries } from '../model/storefront-config/informationEntriesModel';
```

Add the sentinel beside the existing `CATEGORY_INFORMATION_ITEM_ID` (line ~59):

```js
const OFFICE_INFORMATION_ITEM_ID = '__office_information__';
```

Replace the `activeCategoryDescription` / `canRenderCategoryInformation` pair with the entry-array versions:

```js
  const activeCategoryInfoEntries = activeSectionEntry?.section?.infoEntries ?? [];
  const canRenderCategoryInformation =
    activeCategoryInfoEntries.length > 0 &&
    mobileUiTree.some(
      (block) => block.type === 'categoryChips' && block.enabled !== false,
    );
```

Directly after `catalogSectionEntries` is built, derive the office-tab values. `flatMap` maps and filters in one pass:

```js
  const officeInformationEntries = normalizeInformationEntries(
    config?.pageConfig?.officeInfo,
    { legacyText: resolvedPageConfig.nav.subtitle },
  );
  const officeInformationCategoryGroups = catalogSectionEntries.flatMap(
    ({ sectionName, section }) =>
      section?.infoEntries?.length > 0
        ? [{ categoryName: sectionName, entries: section.infoEntries }]
        : [],
  );
  const canRenderOfficeInformation =
    officeInformationEntries.length > 0 ||
    officeInformationCategoryGroups.length > 0;
  const isOfficeInformationActive =
    canRenderOfficeInformation &&
    activeSectionName === OFFICE_INFORMATION_ITEM_ID;
```

`activeSectionEntry` must not resolve to a real category while the office tab is open. Change its definition to short-circuit:

```js
  const activeSectionEntry = isOfficeInformationActive
    ? null
    : catalogSectionEntries.find(
        (entry) => entry.sectionName === activeSectionName,
      ) ??
      catalogSectionEntries[0] ??
      null;
```

Because `isOfficeInformationActive` reads `activeSectionName` only, it can be computed before `activeSectionEntry`. Order the block so `officeInformationEntries` / `isOfficeInformationActive` come first, then `activeSectionEntry`, then `officeInformationCategoryGroups` (which needs `catalogSectionEntries` only).

`visibleProducts` must be empty while the tab is open — extend the existing guard:

```js
  const visibleProducts =
    isCategoryInformationActive || isOfficeInformationActive
      ? []
      : sectionScopedProducts.filter(...)
```

The effect that snaps `activeSectionName` back to the first category must leave the sentinel alone. Add this as the effect's first statement:

```js
    if (activeSectionName === OFFICE_INFORMATION_ITEM_ID) {
      return;
    }
```

Return the new values from the hook:

```js
    officeInformationItemId: OFFICE_INFORMATION_ITEM_ID,
    officeInformationEntries,
    officeInformationCategoryGroups,
    canRenderOfficeInformation,
    isOfficeInformationActive,
    activeCategoryInfoEntries,
```

and delete `activeCategoryDescription` from the returned object.

`handleCategoryRailSectionSelect` currently reads `nextSection?.section?.description` to decide the default medium chip. Change it to read the array, and make it handle the sentinel:

```js
  function handleCategoryRailSectionSelect(sectionName, sectionId) {
    if (sectionName === OFFICE_INFORMATION_ITEM_ID) {
      setActiveSectionName(OFFICE_INFORMATION_ITEM_ID);
      setActiveMediumCategory(ALL_MEDIUM_CATEGORY_LABEL);
      return;
    }

    const nextSection = catalogSectionEntries.find(
      (entry) => entry.sectionName === sectionName,
    );
    const nextDefaultMediumCategory =
      nextSection?.section?.infoEntries?.length > 0
        ? CATEGORY_INFORMATION_ITEM_ID
        : ALL_MEDIUM_CATEGORY_LABEL;

    setActiveSectionName(sectionName);
    setActiveMediumCategory(nextDefaultMediumCategory);
    scrollToSection(sectionId);
  }
```

- [ ] **Step 4: Add the chip in `ProductCategoryNavBlock.jsx`**

Replace the chip list so the office chip is prepended. Keep the early return, but let the office chip alone justify rendering:

```jsx
export default function ProductCategoryNavBlock({ view, elementKey }) {
  if (view.catalogSectionEntries.length === 0) {
    return null;
  }

  const productCategoryChipVariant = view.pageStyle.productCategoryChips.variant;
  const officeChip = view.canRenderOfficeInformation
    ? [{ sectionId: view.officeInformationItemId, sectionName: view.officeInformationItemId, label: '사무소 정보' }]
    : [];
  const chipEntries = [
    ...officeChip,
    ...view.catalogSectionEntries.map(({ sectionId, sectionName }) => ({
      sectionId,
      sectionName,
      label: sectionName,
    })),
  ];

  return (
    <div className={styles.productCategorySection}>
      <div
        className={`${styles.productCategoryWrap} ${PRODUCT_CHIP_VARIANT_CLASS_NAMES[productCategoryChipVariant] || ''}`}
        data-testid="storefront-product-category-chips"
        data-chip-variant={productCategoryChipVariant}
        role="group"
        aria-label="상품 분류"
      >
        {chipEntries.map(({ sectionId, sectionName, label }) => {
          const isActive =
            sectionName === view.officeInformationItemId
              ? view.isOfficeInformationActive
              : !view.isOfficeInformationActive &&
                view.activeSectionTitle === sectionName;

          return (
            <button
              key={`${elementKey}-${sectionId}`}
              type="button"
              className={`${styles.productCategoryChip} ${isActive ? styles.productCategoryChipActive : ''}`}
              aria-pressed={isActive}
              onClick={() =>
                view.handleCategoryRailSectionSelect(sectionName, sectionId)
              }
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Render the panel in `StorefrontView.jsx`**

Add the import beside the other category-nav imports:

```js
import OfficeInformationPanel from './category-nav/OfficeInformationPanel';
```

Directly above the existing `view.isCategoryInformationActive` block, add:

```jsx
          {view.isOfficeInformationActive ? (
            <OfficeInformationPanel
              officeEntries={view.officeInformationEntries}
              categoryGroups={view.officeInformationCategoryGroups}
            />
          ) : null}
```

Change the existing `CategoryInformationPanel` usage to the new prop and drop `cardStyle`:

```jsx
          {view.isCategoryInformationActive ? (
            <CategoryInformationPanel
              categoryName={view.activeSectionTitle}
              entries={view.activeCategoryInfoEntries}
            />
          ) : null}
```

- [ ] **Step 6: Fix `CategoryChipsBlock.jsx`**

It reads the deleted `view.activeCategoryDescription`. Change its first line to:

```jsx
  const hasCategoryInformation = view.activeCategoryInfoEntries.length > 0;
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/officeInformationTab.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 8: Run the storefront suite**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: no new failures. Any test referencing `activeCategoryDescription` or passing `description` to `CategoryInformationPanel` must be updated to the entry array.

- [ ] **Step 9: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/hooks/useStorefrontView.js react-app/src/features/storefront/components/storefront-page/category-nav/ProductCategoryNavBlock.jsx react-app/src/features/storefront/components/storefront-page/category-nav/CategoryChipsBlock.jsx react-app/src/features/storefront/components/storefront-page/StorefrontView.jsx react-app/src/features/storefront/__tests__/
git commit -m "feat(storefront): open the office information tab from the category chips"
```

---

### Task 6: 히어로 설명 제거 + 페이지 AI 스코프 제거

**Files:**
- Modify: `react-app/src/features/storefront/components/storefront-page/hero/HeroBlock.jsx`
- Modify: `react-app/src/features/storefront/components/storefront-page/hero/HeroSection.module.css`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontView.js`
- Modify: `react-app/src/features/storefront/model/storefront-view/storefrontViewStyleModel.js`
- Modify: `react-app/src/features/storefront/model/page-design/style/pageStyleModel.js`
- Modify: `react-app/src/features/storefront/model/page-design/style/pageStyleCompiler.js`
- Modify: `react-app/src/features/storefront/model/page-design/ai-request/pageAiDesignModel.js`
- Modify: `react-app/src/features/storefront/model/page-design/ai-request/pageDesignScopeGuide.js`
- Modify: `react-app/src/features/storefront/model/page-design/ai-request/pageStyleAiPrompt.js`
- Modify: `react-app/src/features/storefront/model/page-design/ai-response/pageStyleAiResponseSchema.js`
- Modify: `react-app/src/features/storefront/model/page-design/ai-response/pageStyleAiResponseNormalizer.js`
- Delete: `react-app/src/features/storefront/__tests__/pageDescriptionAiScope.test.js`
- Test: `react-app/src/features/storefront/__tests__/pageDesignScopeGuide.test.js` (modify)

**Interfaces:**
- Consumes: 없음
- Produces: `PAGE_AI_TARGET_SCOPE_OPTIONS` 길이 6 → 5, `pageDescription` 스코프 제거

안내가 전부 정보 탭으로 갔으므로 히어로의 설명은 렌더되지 않는다. `상단 설명 글자` 칩은 스타일할 DOM이 없어지므로 함께 제거한다.

- [ ] **Step 1: Write the failing test**

Add to `react-app/src/features/storefront/__tests__/pageDesignScopeGuide.test.js`, inside the existing `describe`:

```js
  it('no longer offers the page description scope', () => {
    expect(
      PAGE_AI_TARGET_SCOPE_OPTIONS.map((option) => option.id),
    ).not.toContain('pageDescription');
    expect(PAGE_AI_TARGET_SCOPE_OPTIONS).toHaveLength(5);
  });
```

If `PAGE_AI_TARGET_SCOPE_OPTIONS` is not already imported in that file, add:

```js
import { PAGE_AI_TARGET_SCOPE_OPTIONS } from '../model/page-design/ai-request/pageAiDesignModel';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageDesignScopeGuide.test.js`
Expected: FAIL — `expected [ 'palette', 'header', 'pageDescription', … ] not to contain 'pageDescription'`

- [ ] **Step 3: Strip the hero**

In `HeroBlock.jsx`, delete the whole `{view.pageDescription ? (...) : null}` block and the comment above it. The component ends after the `.brandBlock` div.

In `HeroSection.module.css`, delete the `.description` rule and the `.description` rule inside the `@media (max-width: 720px)` block.

In `useStorefrontView.js`, delete the `pageDescription` const and its entry in the returned object.

In `storefrontViewStyleModel.js`, delete the four `'--page-description-*'` entries.

- [ ] **Step 4: Strip the page style model**

In `pageStyleModel.js`, delete `PAGE_STYLE_DESCRIPTION_FONT_SIZE_TOKENS`, `PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES`, the `description: { ... }` block inside `DEFAULT_PAGE_STYLE`, the `normalizeDescription` function, and the `description: normalizeDescription(source.description),` line inside `normalizePageStyle`.

In `pageStyleCompiler.js`, delete `resolveDescription`, the `case 'pageDescription':` branch, and every `description:` line in the other branches.

- [ ] **Step 5: Strip the page AI request/response**

In `pageAiDesignModel.js`, delete the `{ id: 'pageDescription', ... }` option.

In `pageDesignScopeGuide.js`, delete the `scopeId: 'pageDescription'` guide entry.

In `pageStyleAiPrompt.js`, remove `description` from the scope enumeration line and from the palette-isolation line.

In `pageStyleAiResponseSchema.js`, delete `NULLABLE_DESCRIPTION_SCHEMA`, `description: NULLABLE_DESCRIPTION_SCHEMA,` from `properties`, and `'description',` from `required`.

In `pageStyleAiResponseNormalizer.js`, delete `normalizeDescriptionIntent`, its call inside `normalizePageStyleAiIntent`, and the `pageDescription: 'description'` pair from `scopedKeyByTarget`.

- [ ] **Step 6: Delete the dead test file**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git rm react-app/src/features/storefront/__tests__/pageDescriptionAiScope.test.js
```

- [ ] **Step 7: Fix the remaining references**

Run: `cd react-app && npx vitest run src/features/storefront`

`pageStyleAiContract.test.js` asserts the whole intent object with `toEqual` and carries `description: null` in two expectations — remove those two lines. `StorefrontTextFields.test.jsx`, `fieldSelectionCommonTab.test.jsx` and `StorefrontBuilderPage.test.jsx` may assert on the hero description — remove those assertions. Expected: no new failures.

- [ ] **Step 8: Build**

Run: `cd react-app && npx vite build`
Expected: succeeds.

- [ ] **Step 9: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/
git commit -m "refactor(storefront): drop the hero description and its AI scope"
```

---

### Task 7: 카드 AI 스코프 제거

**Files:**
- Modify: `react-app/src/features/storefront/model/card-design/ai-request/cardAiDesignModel.js`
- Modify: `react-app/src/features/storefront/model/card-design/ai-request/cardDesignScopeGuide.js`
- Modify: `react-app/src/features/storefront/model/card-design/ai-response/cardStyleAiResponseSchema.js`
- Modify: `react-app/src/features/storefront/model/card-design/ai-response/cardStyleAiResponseNormalizer.js`
- Modify: `react-app/src/features/storefront/model/card-design/style/cardStyleModel.js`
- Modify: `react-app/src/features/storefront/model/card-design/style/cardStyleCompiler.js`
- Modify: `react-app/src/features/storefront/model/card-grid-section/cardGridFieldStyleModel.js`
- Modify: `react-app/src/features/storefront/services/card-design/skill/skillPrompt.js`
- Modify: `react-app/src/features/storefront/services/card-design/skill/references/scopeModelPrompt.js`
- Modify: `react-app/src/features/storefront/components/storefront-page/product-cards/CardGridSection.module.css`
- Delete: `react-app/src/features/storefront/__tests__/categoryDescriptionAiScope.test.js`
- Test: `react-app/src/features/storefront/__tests__/cardAiDesignModel.test.js` (modify)

**Interfaces:**
- Consumes: 없음
- Produces: `CARD_AI_TARGET_SCOPE_OPTIONS` 길이 5 → 4, `description` 스코프 제거

- [ ] **Step 1: Write the failing test**

In `cardAiDesignModel.test.js`, change the scope-list test back to four and drop the `description` line from the normalize test:

```js
  it('lists exactly the four approved scopes', () => {
    expect(CARD_AI_TARGET_SCOPE_OPTIONS.map((option) => option.id)).toEqual([
      'header',
      'image',
      'info',
      'field',
    ]);
  });
```

and in the scope-normalizing test replace `expect(normalizeCardAiTargetScope('description')).toBe('description');` with:

```js
    expect(normalizeCardAiTargetScope('description')).toBe('');
```

Also rename the two test titles from `five approved scopes` back to `four approved scopes`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/cardAiDesignModel.test.js`
Expected: FAIL — the options array still has five entries.

- [ ] **Step 3: Strip the card AI surface**

In `cardAiDesignModel.js`, delete the `{ id: 'description', label: '분류 설명 글자', ... }` option.

In `cardDesignScopeGuide.js`, delete the `scopeId: 'description'` guide entry.

In `cardStyleAiResponseSchema.js`, delete `NULLABLE_DESCRIPTION_SCHEMA`, `description: NULLABLE_DESCRIPTION_SCHEMA,` from `properties`, `'description',` from `required`, and the now-unused `CARD_DESCRIPTION_FONT_SIZE_TOKENS` import.

In `cardStyleAiResponseNormalizer.js`, delete `normalizeDescriptionIntent`, its call inside `normalizeOpenAiCardIntent`, the `CARD_DESCRIPTION_FONT_SIZE_TOKENS` import, and `'description'` from `CARD_SCOPED_SECTION_KEYS`.

In `cardStyleModel.js`, delete `CARD_DESCRIPTION_FONT_SIZE_TOKENS`, `CARD_DESCRIPTION_FONT_SIZE_VALUES`, the `description: { ... }` block inside `DEFAULT_CARD_STYLE`, `normalizeDescription`, and the `description: normalizeDescription(source.description),` line inside `normalizeCardStyle`.

In `cardStyleCompiler.js`, delete the `const description = { ... }` block and the `description,` line in the `normalizeCardStyle({ ... })` call.

In `cardGridFieldStyleModel.js`, delete the four `'--category-description-*'` entries and the `CARD_DESCRIPTION_FONT_SIZE_VALUES` import.

In `skillPrompt.js`, remove `card.description` from both enumerations.

In `scopeModelPrompt.js`, restore "five sections", remove `card.description` from the bullet list and from the target-scope line, and delete the `### card.description` section.

In `CardGridSection.module.css`, delete the `.categoryDescription` rule — nothing references it since the description moved to the panel.

- [ ] **Step 4: Delete the dead test file**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git rm react-app/src/features/storefront/__tests__/categoryDescriptionAiScope.test.js
```

- [ ] **Step 5: Fix the remaining references**

Run: `cd react-app && npx vitest run src/features/storefront`

`cardStyleModel.test.js` expects `description: DEFAULT_CARD_STYLE.description` in the full normalize expectation — remove that line and its comment. Expected: no new failures.

- [ ] **Step 6: Build**

Run: `cd react-app && npx vite build`
Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/
git commit -m "refactor(storefront): drop the category description AI scope"
```

---

### Task 8: 반복 입력 컴포넌트

**Files:**
- Create: `react-app/src/features/storefront/components/builder-workspace/field-selection/InformationEntryFields.jsx`
- Modify: `react-app/src/features/storefront/components/builder-workspace/field-selection/FieldSelectionDock.module.css`
- Test: `react-app/src/features/storefront/__tests__/InformationEntryFields.test.jsx` (create)

**Interfaces:**
- Consumes: Task 1 `MAX_INFORMATION_ENTRIES`, `createInformationEntry`
- Produces: `<InformationEntryFields legend entries onChange descriptionPlaceholder />`
  - `onChange(nextEntries)` — 항상 배열 전체를 넘긴다

**빌더(관리자) 화면이므로 CSS는 `--corp-*` 토큰을 쓴다.** CSS는 기존 `FieldSelectionDock.module.css` 끝에 **덧붙인다.**

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/InformationEntryFields.test.jsx`:

```jsx
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MAX_INFORMATION_ENTRIES } from '../model/storefront-config/informationEntriesModel';
import { InformationEntryFields } from '../components/builder-workspace/field-selection/InformationEntryFields';

function Stateful({ initialEntries = [] }) {
  const [entries, setEntries] = useState(initialEntries);

  return (
    <InformationEntryFields
      legend="분류 설명"
      entries={entries}
      onChange={setEntries}
      descriptionPlaceholder="안내 문구"
    />
  );
}

describe('InformationEntryFields', () => {
  it('shows one blank row when there is nothing yet', () => {
    render(<Stateful />);

    expect(screen.getAllByLabelText('라벨')).toHaveLength(1);
    expect(screen.getAllByLabelText('설명')).toHaveLength(1);
  });

  it('takes the description as multiline text', () => {
    render(<Stateful />);

    expect(screen.getByLabelText('설명').tagName).toBe('TEXTAREA');
  });

  it('reports an edited label as a whole array', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <InformationEntryFields
        legend="분류 설명"
        entries={[{ id: 'a', label: '', description: '' }]}
        onChange={onChange}
      />,
    );

    await user.type(screen.getByLabelText('라벨'), '봄');

    expect(onChange).toHaveBeenCalledWith([
      { id: 'a', label: '봄', description: '' },
    ]);
  });

  it('adds a row', async () => {
    const user = userEvent.setup();

    render(<Stateful initialEntries={[{ id: 'a', label: '가', description: '' }]} />);

    await user.click(screen.getByRole('button', { name: '항목 추가' }));

    expect(screen.getAllByLabelText('라벨')).toHaveLength(2);
  });

  it('removes the right row, leaving the other values in place', async () => {
    const user = userEvent.setup();

    render(
      <Stateful
        initialEntries={[
          { id: 'a', label: '가', description: '' },
          { id: 'b', label: '나', description: '' },
        ]}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: '항목 삭제' })[0]);

    const labels = screen.getAllByLabelText('라벨');

    expect(labels).toHaveLength(1);
    expect(labels[0]).toHaveValue('나');
  });

  it('hides the add button at the cap', () => {
    render(
      <Stateful
        initialEntries={Array.from(
          { length: MAX_INFORMATION_ENTRIES },
          (_, index) => ({ id: `e${index}`, label: `라벨 ${index}`, description: '' }),
        )}
      />,
    );

    expect(
      screen.queryByRole('button', { name: '항목 추가' }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/InformationEntryFields.test.jsx`
Expected: FAIL — `Failed to resolve import .../InformationEntryFields`

- [ ] **Step 3: Write the component**

Create `react-app/src/features/storefront/components/builder-workspace/field-selection/InformationEntryFields.jsx`:

```jsx
import { useId } from 'react';

import {
  MAX_INFORMATION_ENTRIES,
  createInformationEntry,
} from '../../../model/storefront-config/informationEntriesModel';
import styles from './FieldSelectionDock.module.css';

/**
 * 안내 항목을 추가·삭제하는 반복 입력. 단일 문자열을 받는 StorefrontTextFields와
 * 나눠 둔 이유는, 한 컴포넌트가 단일 필드와 반복 목록을 겸하면 양쪽 다 읽기
 * 나빠지기 때문이다.
 */
export function InformationEntryFields({
  legend,
  entries,
  onChange,
  descriptionPlaceholder = '',
}) {
  const idPrefix = useId().replace(/:/g, '-');
  // 빈 목록에 추가 버튼만 있으면 무슨 화면인지 알기 어렵다. 저장할 때 빈 항목은
  // 어차피 버려지므로 이 행은 공짜다.
  const rows = entries.length > 0 ? entries : [createInformationEntry()];

  function updateEntry(entryId, key, value) {
    onChange(
      rows.map((entry) =>
        entry.id === entryId ? { ...entry, [key]: value } : entry,
      ),
    );
  }

  function removeEntry(entryId) {
    onChange(rows.filter((entry) => entry.id !== entryId));
  }

  return (
    <fieldset className={styles.entryFields}>
      <legend className={styles.entryFieldsLegend}>{legend}</legend>

      {rows.map((entry) => {
        const labelId = `${idPrefix}-${entry.id}-label`;
        const descriptionId = `${idPrefix}-${entry.id}-description`;

        return (
          <div key={entry.id} className={styles.entryRow}>
            <div className={styles.entryRowInputs}>
              <label className={styles.entryFieldLabel} htmlFor={labelId}>
                라벨
              </label>
              <input
                id={labelId}
                type="text"
                className={styles.textFieldInput}
                value={entry.label}
                onChange={(event) =>
                  updateEntry(entry.id, 'label', event.target.value)
                }
              />

              <label className={styles.entryFieldLabel} htmlFor={descriptionId}>
                설명
              </label>
              <textarea
                id={descriptionId}
                className={`${styles.textFieldInput} ${styles.textFieldTextarea}`}
                value={entry.description}
                placeholder={descriptionPlaceholder}
                rows={3}
                onChange={(event) =>
                  updateEntry(entry.id, 'description', event.target.value)
                }
              />
            </div>

            <button
              type="button"
              className={styles.entryRemoveButton}
              onClick={() => removeEntry(entry.id)}
            >
              항목 삭제
            </button>
          </div>
        );
      })}

      {rows.length < MAX_INFORMATION_ENTRIES ? (
        <button
          type="button"
          className={styles.entryAddButton}
          onClick={() => onChange([...rows, createInformationEntry()])}
        >
          항목 추가
        </button>
      ) : null}
    </fieldset>
  );
}
```

- [ ] **Step 4: Append the stylesheet rules**

Append to the END of `FieldSelectionDock.module.css`:

```css
.entryFields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
}

.entryFieldsLegend {
  padding: 0;
  color: var(--corp-text);
  font-size: 0.84rem;
  font-weight: 700;
  word-break: keep-all;
}

.entryRow {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--corp-line);
  border-radius: var(--corp-radius);
  background: var(--corp-panel);
}

.entryRowInputs {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px 10px;
  flex: 1 1 auto;
  min-width: 0;
}

.entryFieldLabel {
  color: var(--corp-muted);
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  word-break: keep-all;
}

.entryRemoveButton {
  flex: 0 0 auto;
  padding: 6px 10px;
  border: 1px solid var(--corp-line-strong);
  border-radius: var(--corp-radius);
  background: transparent;
  color: var(--corp-muted);
  font-size: 0.76rem;
  cursor: pointer;
  word-break: keep-all;
}

.entryRemoveButton:hover {
  border-color: var(--corp-focus);
  color: var(--corp-text);
}

.entryAddButton {
  align-self: flex-start;
  padding: 8px 12px;
  border: 1px dashed var(--corp-line-strong);
  border-radius: var(--corp-radius);
  background: transparent;
  color: var(--corp-text);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  word-break: keep-all;
}

.entryAddButton:hover {
  border-style: solid;
  border-color: var(--corp-focus);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/InformationEntryFields.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/components/builder-workspace/field-selection/InformationEntryFields.jsx react-app/src/features/storefront/components/builder-workspace/field-selection/FieldSelectionDock.module.css react-app/src/features/storefront/__tests__/InformationEntryFields.test.jsx
git commit -m "feat(storefront): add the repeatable information entry input"
```

---

### Task 9: 빌더 배선

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/components/builder-workspace/field-selection/FieldSelectionDock.jsx`
- Test: `react-app/src/features/storefront/__tests__/fieldSelectionCommonTab.test.jsx` (modify)

**Interfaces:**
- Consumes: Task 1, Task 8 `InformationEntryFields`, Task 2 `buildStorefrontSavePayload({ officeInfoEntries, categoryInfoEntries })`
- Produces (`dataMode`):
  - `officeInfoEntries: Array<Entry>`, `setOfficeInfoEntries(nextEntries)`
  - `categoryInfoEntries: Array<Entry>`, `setCategoryInfoEntries(nextEntries)`

`textDraft.pageDescription` 과 `textDraft.categoryDescription` 은 제거한다. `textDraft.pageTitle` 만 남는다.

- [ ] **Step 1: Write the failing test**

In `fieldSelectionCommonTab.test.jsx`, replace `buildDataMode`'s `textDraft` / `setTextDraft` pair with the new fields (keep `pageTitle`):

```js
    textDraft: { pageTitle: '' },
    setTextDraft: vi.fn(),
    officeInfoEntries: [],
    setOfficeInfoEntries: vi.fn(),
    categoryInfoEntries: [],
    setCategoryInfoEntries: vi.fn(),
```

Delete the existing `takes the category description as multiline text` test and add:

```js
  it('edits the office entries on the common tab', async () => {
    const user = userEvent.setup();
    const dataMode = buildDataMode({
      officeInfoEntries: [{ id: 'o1', label: '', description: '' }],
    });

    render(<FieldSelectionDock dataMode={dataMode} onApply={vi.fn()} />);
    await user.type(screen.getByLabelText('라벨'), '영');

    expect(dataMode.setOfficeInfoEntries).toHaveBeenCalledWith([
      { id: 'o1', label: '영', description: '' },
    ]);
  });

  it('edits the category entries on a category tab', async () => {
    const user = userEvent.setup();
    const dataMode = buildDataMode({
      selectedCategoryId: '비료',
      categoryInfoEntries: [{ id: 'c1', label: '', description: '' }],
    });

    render(<FieldSelectionDock dataMode={dataMode} onApply={vi.fn()} />);
    await user.type(screen.getByLabelText('라벨'), '봄');

    expect(dataMode.setCategoryInfoEntries).toHaveBeenCalledWith([
      { id: 'c1', label: '봄', description: '' },
    ]);
  });
```

Also delete any assertion referencing `페이지 설명`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/fieldSelectionCommonTab.test.jsx`
Expected: FAIL — `Unable to find a label with the text of: 라벨`

- [ ] **Step 3: Rework `useStorefrontBuilder.js`**

Add the import:

```js
import { normalizeInformationEntries } from "../model/storefront-config/informationEntriesModel";
```

Replace the `textDraft` state with the title alone plus the two entry lists:

```js
  const [textDraft, setTextDraftState] = useState({ pageTitle: "" });
  const [officeInfoEntries, setOfficeInfoEntries] = useState([]);
  const [categoryInfoEntries, setCategoryInfoEntries] = useState([]);
```

`setTextDraft` stays as it is. Add the two entry setters beside it, each marking the form dirty:

```js
  function changeOfficeInfoEntries(nextEntries) {
    markDirty();
    setOfficeInfoEntries(nextEntries);
  }

  function changeCategoryInfoEntries(nextEntries) {
    markDirty();
    setCategoryInfoEntries(nextEntries);
  }
```

`hydratePageTextDraft` keeps only the title, and hydrates the office entries:

```js
  function hydratePageTextDraft(config, normalizedPageConfig) {
    setTextDraftState({
      pageTitle: toTrimmedString(
        config?.navConfig?.title ?? normalizedPageConfig.nav.title,
      ),
    });
    setOfficeInfoEntries(normalizedPageConfig.officeInfo);
  }
```

In `hydrateCategoryDraft`, replace the `setTextDraftState(... categoryDescription ...)` call with:

```js
    setCategoryInfoEntries(
      normalizeInformationEntries(
        findCategoryConfigRow(
          nextExistingConfig?.categoryConfigs,
          resolvedCategoryName,
        )?.categoryConfig?.info,
        {
          legacyText: findCategoryConfigRow(
            nextExistingConfig?.categoryConfigs,
            resolvedCategoryName,
          )?.categoryConfig?.description,
        },
      ),
    );
```

`draftNavConfig` loses its subtitle override — the office entries carry that copy now:

```js
  const draftNavConfig = {
    ...navConfig,
    title: textDraft.pageTitle,
  };
```

`buildCurrentSavePayload` and `buildPreviewConfig` both pass the two lists. Replace `categoryDescription: textDraft.categoryDescription,` in each with:

```js
      officeInfoEntries,
      categoryInfoEntries,
```

Extend `dataMode`:

```js
    officeInfoEntries,
    setOfficeInfoEntries: changeOfficeInfoEntries,
    categoryInfoEntries,
    setCategoryInfoEntries: changeCategoryInfoEntries,
```

- [ ] **Step 4: Rework `FieldSelectionDock.jsx`**

Replace the import of `StorefrontTextFields` so both components come in, and drop `PAGE_DESCRIPTION_PLACEHOLDER`:

```jsx
import { InformationEntryFields } from './InformationEntryFields';
import { StorefrontTextFields } from './StorefrontTextFields';
```

On the common tab, keep only the page-title field and add the office entries below it:

```jsx
        <>
          <StorefrontTextFields
            fields={[
              {
                id: 'pageTitle',
                label: '페이지 제목',
                value: dataMode.textDraft.pageTitle,
                placeholder: dataMode.derivedPageTitle,
                hint: '비워두면 위 문구가 그대로 표시됩니다.',
              },
            ]}
            onChange={dataMode.setTextDraft}
          />

          <InformationEntryFields
            legend="사무소 안내"
            entries={dataMode.officeInfoEntries}
            onChange={dataMode.setOfficeInfoEntries}
            descriptionPlaceholder="영세가격 : 농업경영체 등록자 구매가격"
          />
        </>
```

On a category tab, replace the `StorefrontTextFields` block with:

```jsx
          <InformationEntryFields
            legend="분류 안내"
            entries={dataMode.categoryInfoEntries}
            onChange={dataMode.setCategoryInfoEntries}
            descriptionPlaceholder="이 분류 상품 목록 위에 보여줄 안내 문구"
          />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/fieldSelectionCommonTab.test.jsx`
Expected: PASS

- [ ] **Step 6: Run the storefront suite**

Run: `cd react-app && npx vitest run src/features/storefront`

`StorefrontTextFields.test.jsx` still covers the multiline branch of `StorefrontTextFields`, which no caller now uses — keep the component's `multiline` branch and its test, since the page title field is the only live caller and a future single field may want it. `StorefrontBuilderPage.test.jsx` asserts on `페이지 설명` and on the preview's page description — replace those with the office-entry equivalents. Expected: no new failures.

- [ ] **Step 7: Build**

Run: `cd react-app && npx vite build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/
git commit -m "feat(storefront): edit the information entries in the builder"
```

---

### Task 10: 실제 화면 확인

**Files:** 없음 (검증 전용)

**Interfaces:**
- Consumes: Task 1-9 전부

- [ ] **Step 1: Start the dev server**

Use the preview tooling, not a shell command: `preview_start` with `{ name: "react-app" }`.

- [ ] **Step 2: Check the public storefront**

Open `http://localhost:<port>/?tool=store&office=1234`. No login needed.

Expected: 히어로에 설명 줄이 **없다**. 저장된 옛 `navConfig.subtitle`이 있으므로 대분류 칩에 `사무소 정보` 칩이 보이고, 눌렀을 때 그 문구가 폴백으로 항목 하나에 담겨 나온다. 콘솔 에러 0.

- [ ] **Step 3: Check the tab switches cleanly**

`사무소 정보` → 카드가 사라지고 패널만. 다른 대분류 → 패널이 사라지고 카드가 돌아온다.

- [ ] **Step 4: Check mobile**

`resize_window` preset `mobile`. 가로 스크롤이 없어야 한다(`document.documentElement.scrollWidth > innerWidth` 가 false).

- [ ] **Step 5: Check the builder**

사용자가 로그인한 뒤, `AI 페이지 만들기` → `카테고리별 표시항목선택` → `공통 요소` 탭.

Expected: `사무소 안내` 항목 목록에 라벨/설명 행과 `항목 추가` 버튼. 항목을 2개 넣고 저장 후 공개 화면 재확인 — 둘 다 나오고 줄바꿈이 유지된다.

- [ ] **Step 6: Check the AI chips shrank**

`AI 페이지 디자인` 칩 5개(`상단 설명 글자` 없음), `AI 카드 디자인` 칩 4개(`분류 설명 글자` 없음).

---

## Self-Review

**1. Spec coverage**

| 스펙 항목 | 태스크 |
| --- | --- |
| 결정 1 (항목 배열) | Task 1, 2 |
| 결정 2 (`사무소 정보` 탭) | Task 5 |
| 결정 3 (사무소 + 전체 분류 나열) | Task 3, 5 |
| 결정 4 (히어로에서 삭제) | Task 6 |
| 결정 5 (AI 대상 제외) | Task 6, 7 |
| 결정 6 (재정렬 없음, 상한 10) | Task 1, 8 |
| 결정 7 (분류명=그룹 제목, label=항목 제목) | Task 3, 4 |
| 기존 데이터 폴백 | Task 1, 2 |
| 빌더 입력 | Task 8, 9 |
| 중분류 패널 유지 | Task 4 |

**2. Placeholder scan** — "적절히", "TBD", "필요시" 없음. 모든 코드 단계에 실제 코드가 있다.

**3. Type consistency**

- 항목 모양은 전 구간 `{ id, label, description }`.
- 섹션이 싣는 이름은 전 구간 `infoEntries`. 저장 키는 page가 `officeInfo`, category가 `info`.
- 저장 파라미터 이름은 전 구간 `officeInfoEntries` / `categoryInfoEntries` (Task 2가 정의, Task 9가 사용).
- 뷰 반환값 `activeCategoryInfoEntries` 는 Task 5가 정의하고 `CategoryChipsBlock`(Task 5 Step 6)과 `StorefrontView`(Task 5 Step 5)가 읽는다.
- `InformationEntryFields` 는 named export (`StorefrontTextFields` 와 같은 모듈 관례).

**남은 위험**

- Task 5가 `activeSectionEntry` 정의 순서를 바꾼다. `isOfficeInformationActive` 가 `activeSectionName` 만 읽으므로 앞으로 끌어올 수 있지만, 순서를 틀리면 TDZ 오류가 난다. Task 5 Step 3의 순서 지시를 그대로 따를 것.
- Task 6, 7, 9는 기존 테스트를 여러 개 고쳐야 한다. 각 태스크의 "Fix the remaining references" 단계에서 전체 스위트를 돌려 실제 목록을 확인할 것.
- `StorefrontBuilderPage.test.jsx` 는 Task 5, 6, 9 모두에서 손댈 가능성이 있다. 병렬 부하에서 흔들리므로 실패 시 단독 재실행할 것.
