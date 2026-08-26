# Storefront Nested Information Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 최상위 `안내` 아래에서 사무소와 각 상품 대분류 안내를 child category로 선택하고, 상품 대분류의 중분류 탐색에서는 안내 항목을 제거한다.

**Architecture:** 안내 item 생성·정렬·fallback을 `informationNavigationModel`이라는 Deep Module에 숨긴다. `useStorefrontView`는 상품 중분류 상태와 안내 child 상태를 분리하며, 미리보기와 Public storefront가 같은 hook 및 렌더 Module을 공유한다.

**Tech Stack:** React 19, JavaScript, CSS Modules, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-08-26-storefront-nested-information-navigation-design.md`

## Global Constraints

- 최상위 `안내`는 안내 데이터가 하나라도 있을 때만 표시한다.
- child category 순서는 `사무소 안내` 우선, 이후 storefront 상품 대분류 순서다.
- 데이터가 없는 child category는 표시하지 않는다.
- 상품 대분류의 중분류에는 `전체`와 실제 중분류만 표시한다.
- 안내 parent 재진입 시 유효한 이전 child 선택을 유지한다.
- 상품 대분류 선택 시 `전체` 상품을 기본 표시한다.
- 검색 시 안내 화면을 닫고 상품 검색 결과를 표시한다.
- 안내 저장 형식과 description 편집 Interface는 변경하지 않는다.
- dirty worktree의 비 storefront 변경은 수정하거나 커밋하지 않는다.

---

## File Structure

- Create `react-app/src/features/storefront/model/storefront-view/informationNavigationModel.js`: 안내 child item 생성, 안정 ID, 정렬, fallback 규칙.
- Create `react-app/src/features/storefront/__tests__/informationNavigationModel.test.js`: Deep Module Interface 테스트.
- Modify `react-app/src/features/storefront/hooks/useStorefrontView.js`: 안내 선택과 상품 중분류 선택 상태 분리.
- Create `react-app/src/features/storefront/components/storefront-page/category-nav/InformationNavigationBlock.jsx`: 안내 child category UI Adapter.
- Modify `react-app/src/features/storefront/components/storefront-page/StorefrontView.jsx`: 선택된 안내 패널 하나만 렌더.
- Modify `react-app/src/features/storefront/components/storefront-page/category-nav/CategoryChipsBlock.jsx`: 상품 중분류만 렌더.
- Modify `react-app/src/features/storefront/components/storefront-page/category-nav/OfficeInformationPanel.jsx`: 사무소 entries 전용 Interface로 축소.
- Modify `react-app/src/features/storefront/components/storefront-page/category-nav/CategoryInformationPanel.jsx`: 새 탐색 계층에 맞는 안내 문구.
- Modify `react-app/src/features/storefront/components/storefront-page/category-nav/CategoryNav.module.css`: 안내 child row 스타일.
- Modify `react-app/src/features/storefront/__tests__/categoryDescriptionRender.test.jsx`: 상품/안내 계층 integration.
- Modify `react-app/src/features/storefront/__tests__/officeInformationTab.test.jsx`: 안내 parent와 child navigation integration.
- Modify `react-app/src/features/storefront/__tests__/OfficeInformationPanel.test.jsx`: 축소된 Interface 테스트.
- Modify `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`: Builder preview 기대를 새 안내 계층에 맞춤.

---

### Task 1: Deep 안내 탐색 Module

**Files:**
- Create: `react-app/src/features/storefront/model/storefront-view/informationNavigationModel.js`
- Create: `react-app/src/features/storefront/__tests__/informationNavigationModel.test.js`

**Interfaces:**
- Consumes: `catalogSectionEntries: Array<{sectionName, section: {infoEntries?: InformationEntry[]}}>`와 정규화된 `officeEntries`.
- Produces: `buildInformationNavigationItems({ officeEntries, catalogSectionEntries })`, `resolveActiveInformationItem(items, requestedId)`, `OFFICE_INFORMATION_CHILD_ID`.

- [ ] **Step 1: Write the failing model tests**

```js
import { describe, expect, it } from 'vitest';
import {
  OFFICE_INFORMATION_CHILD_ID,
  buildInformationNavigationItems,
  resolveActiveInformationItem,
} from '../model/storefront-view/informationNavigationModel';

const officeEntries = [{ id: 'o1', label: '', description: '사무소 내용' }];
const catalogSectionEntries = [
  { sectionName: '비료', section: { infoEntries: [{ id: 'f1', label: '', description: '비료 내용' }] } },
  { sectionName: '농약', section: { infoEntries: [] } },
  { sectionName: '일반자재', section: { infoEntries: [{ id: 'm1', label: '', description: '자재 내용' }] } },
];

describe('information navigation model', () => {
  it('puts office first and keeps only categories with information', () => {
    expect(buildInformationNavigationItems({ officeEntries, catalogSectionEntries })).toEqual([
      { id: OFFICE_INFORMATION_CHILD_ID, kind: 'office', label: '사무소 안내', categoryName: '', entries: officeEntries },
      { id: 'category:비료', kind: 'category', label: '비료 안내', categoryName: '비료', entries: catalogSectionEntries[0].section.infoEntries },
      { id: 'category:일반자재', kind: 'category', label: '일반자재 안내', categoryName: '일반자재', entries: catalogSectionEntries[2].section.infoEntries },
    ]);
  });

  it('falls back to the first valid item when the requested id is stale', () => {
    const items = buildInformationNavigationItems({ officeEntries: [], catalogSectionEntries });
    expect(resolveActiveInformationItem(items, 'category:삭제됨')?.id).toBe('category:비료');
  });

  it('returns null when no information exists', () => {
    expect(resolveActiveInformationItem([], OFFICE_INFORMATION_CHILD_ID)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/informationNavigationModel.test.js`

Expected: FAIL because `informationNavigationModel.js` does not exist.

- [ ] **Step 3: Implement the minimal Deep Module**

```js
export const OFFICE_INFORMATION_CHILD_ID = 'office';

function buildCategoryInformationId(categoryName) {
  return `category:${categoryName}`;
}

export function buildInformationNavigationItems({
  officeEntries = [],
  catalogSectionEntries = [],
} = {}) {
  const items = officeEntries.length > 0
    ? [{
        id: OFFICE_INFORMATION_CHILD_ID,
        kind: 'office',
        label: '사무소 안내',
        categoryName: '',
        entries: officeEntries,
      }]
    : [];

  for (const { sectionName, section } of catalogSectionEntries) {
    const entries = Array.isArray(section?.infoEntries) ? section.infoEntries : [];
    if (!sectionName || entries.length === 0) continue;
    items.push({
      id: buildCategoryInformationId(sectionName),
      kind: 'category',
      label: `${sectionName} 안내`,
      categoryName: sectionName,
      entries,
    });
  }

  return items;
}

export function resolveActiveInformationItem(items, requestedId) {
  const source = Array.isArray(items) ? items : [];
  return source.find((item) => item.id === requestedId) ?? source[0] ?? null;
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/informationNavigationModel.test.js`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit only Task 1 files**

```bash
git add react-app/src/features/storefront/model/storefront-view/informationNavigationModel.js react-app/src/features/storefront/__tests__/informationNavigationModel.test.js
git commit -m "feat(storefront): model nested information navigation"
```

---

### Task 2: 안내 상태와 상품 중분류 상태 분리

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontView.js`
- Test: `react-app/src/features/storefront/__tests__/officeInformationTab.test.jsx`

**Interfaces:**
- Consumes: Task 1의 `buildInformationNavigationItems`와 `resolveActiveInformationItem`.
- Produces: view fields `informationNavigationItems`, `activeInformationItem`, `activeInformationItemId`, `handleInformationItemSelect`; 상품용 `activeMediumCategory`에는 안내 sentinel이 들어가지 않는다.

- [ ] **Step 1: Replace the first office integration test with a failing hierarchy test**

```jsx
it('opens information with office and category child navigation', async () => {
  const user = userEvent.setup();
  render(<StorefrontView
    config={buildConfig({
      officeInfo: [{ id: 'o1', label: '영세가격', description: '등록자 구매가격' }],
      fertilizerInfo: [{ id: 'c1', label: '봄철 밑거름', description: '3월부터' }],
    })}
    productRows={PRODUCT_ROWS}
  />);

  await user.click(screen.getByRole('button', { name: '안내' }));
  expect(screen.getByRole('button', { name: '사무소 안내' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '비료 안내' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('등록자 구매가격')).toBeInTheDocument();
  expect(screen.queryByText('3월부터')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the hierarchy test and verify RED**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/officeInformationTab.test.jsx -t "opens information with office and category child navigation"`

Expected: FAIL because child navigation does not exist and the old panel renders all groups.

- [ ] **Step 3: Refactor `useStorefrontView` state and derived values**

Implement these exact invariants:

```js
const [activeMediumCategory, setActiveMediumCategory] = useState(ALL_MEDIUM_CATEGORY_LABEL);
const [activeInformationItemId, setActiveInformationItemId] = useState('');

const informationNavigationItems = buildInformationNavigationItems({
  officeEntries: officeInformationEntries,
  catalogSectionEntries,
});
const activeInformationItem = resolveActiveInformationItem(
  informationNavigationItems,
  activeInformationItemId,
);
const canRenderInformationNavigation = informationNavigationItems.length > 0;
const isInformationNavigationActive =
  canRenderInformationNavigation &&
  activeSectionName === OFFICE_INFORMATION_ITEM_ID &&
  searchQuery === '';
```

Remove `CATEGORY_INFORMATION_ITEM_ID`, `categoryInformationChipId`, `categoryInformationPanelId`, `canRenderCategoryInformation`, `isCategoryInformationActive`, and the category-information focus effect. Compute `visibleProducts` as empty only when `isInformationNavigationActive`; otherwise apply search and medium-category filters.

Return the new fields and handler:

```js
function handleInformationItemSelect(itemId) {
  setActiveInformationItemId(itemId);
}
```

When selecting the top 안내 parent, retain `activeInformationItemId`; fallback is derived by `resolveActiveInformationItem`. When selecting a product category or receiving a new `selectedSectionName`, set `activeMediumCategory` to `전체`.

- [ ] **Step 4: Run the model and hierarchy tests**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/informationNavigationModel.test.js src/features/storefront/__tests__/officeInformationTab.test.jsx -t "information|opens information"`

Expected: model tests PASS; hierarchy test still fails only because the UI Adapter is not created until Task 3. Confirm hook-related runtime errors are absent.

- [ ] **Step 5: Commit the hook state refactor**

```bash
git add react-app/src/features/storefront/hooks/useStorefrontView.js react-app/src/features/storefront/__tests__/officeInformationTab.test.jsx
git commit -m "refactor(storefront): separate information and product selection"
```

---

### Task 3: 안내 child navigation과 단일 패널 렌더

**Files:**
- Create: `react-app/src/features/storefront/components/storefront-page/category-nav/InformationNavigationBlock.jsx`
- Modify: `react-app/src/features/storefront/components/storefront-page/StorefrontView.jsx`
- Modify: `react-app/src/features/storefront/components/storefront-page/category-nav/CategoryChipsBlock.jsx`
- Modify: `react-app/src/features/storefront/components/storefront-page/category-nav/OfficeInformationPanel.jsx`
- Modify: `react-app/src/features/storefront/components/storefront-page/category-nav/CategoryInformationPanel.jsx`
- Modify: `react-app/src/features/storefront/components/storefront-page/category-nav/CategoryNav.module.css`
- Test: `react-app/src/features/storefront/__tests__/officeInformationTab.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/categoryDescriptionRender.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/OfficeInformationPanel.test.jsx`

**Interfaces:**
- Consumes: Task 2의 view fields와 `activeInformationItem.kind` discriminant.
- Produces: `InformationNavigationBlock({ view })`; `OfficeInformationPanel({ entries })`; `CategoryInformationPanel({ categoryName, entries })`.

- [ ] **Step 1: Add failing UI behavior tests**

Add assertions covering:

```jsx
await user.click(screen.getByRole('button', { name: '안내' }));
await user.click(screen.getByRole('button', { name: '비료 안내' }));
expect(screen.getByText('3월부터')).toBeInTheDocument();
expect(screen.queryByText('등록자 구매가격')).not.toBeInTheDocument();

await user.click(screen.getByRole('button', { name: '비료' }));
expect(screen.queryByRole('button', { name: '비료 안내' })).not.toBeInTheDocument();
expect(screen.getByRole('button', { name: '전체' })).toHaveAttribute('aria-pressed', 'true');
expect(screen.getByText('알파')).toBeInTheDocument();
```

For category-only data, assert `비료 안내` is the default child. For no information, assert top `안내` is absent.

- [ ] **Step 2: Run the UI tests and verify RED**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/officeInformationTab.test.jsx src/features/storefront/__tests__/categoryDescriptionRender.test.jsx src/features/storefront/__tests__/OfficeInformationPanel.test.jsx`

Expected: FAIL on missing child buttons and old aggregated panel Interface.

- [ ] **Step 3: Create `InformationNavigationBlock`**

```jsx
import styles from './CategoryNav.module.css';

export default function InformationNavigationBlock({ view }) {
  if (!view.isInformationNavigationActive || view.informationNavigationItems.length === 0) {
    return null;
  }

  return (
    <nav className={styles.informationNavigation} aria-label="안내 분류">
      <div className={styles.informationNavigationList}>
        {view.informationNavigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.categoryChip} ${view.activeInformationItem?.id === item.id ? styles.categoryChipActive : ''}`}
            aria-pressed={view.activeInformationItem?.id === item.id}
            onClick={() => view.handleInformationItemSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
```

Add CSS that reuses compact chip sizing, horizontal overflow, white background, and the existing accent CSS variable. Do not create a second visual system.

- [ ] **Step 4: Render one selected panel and simplify existing Interfaces**

In `StorefrontView.jsx`, render `InformationNavigationBlock` followed by exactly one panel:

```jsx
{view.isInformationNavigationActive ? <InformationNavigationBlock view={view} /> : null}
{view.isInformationNavigationActive && view.activeInformationItem?.kind === 'office' ? (
  <OfficeInformationPanel entries={view.activeInformationItem.entries} />
) : null}
{view.isInformationNavigationActive && view.activeInformationItem?.kind === 'category' ? (
  <CategoryInformationPanel
    categoryName={view.activeInformationItem.categoryName}
    entries={view.activeInformationItem.entries}
  />
) : null}
```

Change `OfficeInformationPanel` to accept only `entries`, remove `categoryGroups`, and render `사무소 안내` plus its entries. Remove the `{대분류} 안내` sentinel logic from `CategoryChipsBlock`; it receives and renders `mediumCategoryItems` only. Update `CategoryInformationPanel` helper copy to `다른 안내는 위 안내 항목에서 선택하세요.`

- [ ] **Step 5: Run UI tests and verify GREEN**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/officeInformationTab.test.jsx src/features/storefront/__tests__/categoryDescriptionRender.test.jsx src/features/storefront/__tests__/OfficeInformationPanel.test.jsx`

Expected: all tests PASS.

- [ ] **Step 6: Commit the navigation UI**

```bash
git add react-app/src/features/storefront/components/storefront-page/category-nav/InformationNavigationBlock.jsx react-app/src/features/storefront/components/storefront-page/category-nav/CategoryNav.module.css react-app/src/features/storefront/components/storefront-page/category-nav/CategoryChipsBlock.jsx react-app/src/features/storefront/components/storefront-page/category-nav/OfficeInformationPanel.jsx react-app/src/features/storefront/components/storefront-page/category-nav/CategoryInformationPanel.jsx react-app/src/features/storefront/components/storefront-page/StorefrontView.jsx react-app/src/features/storefront/__tests__/officeInformationTab.test.jsx react-app/src/features/storefront/__tests__/categoryDescriptionRender.test.jsx react-app/src/features/storefront/__tests__/OfficeInformationPanel.test.jsx
git commit -m "feat(storefront): nest information under the guide tab"
```

---

### Task 4: 왕복 상태, 검색, Builder preview 회귀 검증

**Files:**
- Modify: `react-app/src/features/storefront/__tests__/officeInformationTab.test.jsx`
- Modify: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Modify if tests expose a bug: `react-app/src/features/storefront/hooks/useStorefrontView.js`

**Interfaces:**
- Consumes: Tasks 1–3의 완성된 안내 탐색 Interface.
- Produces: 안내 왕복 선택 유지, 검색 전환, Builder preview 동등성에 대한 회귀 보호.

- [ ] **Step 1: Write failing round-trip and search tests**

```jsx
await user.click(screen.getByRole('button', { name: '안내' }));
await user.click(screen.getByRole('button', { name: '비료 안내' }));
await user.click(screen.getByRole('button', { name: '농약' }));
await user.click(screen.getByRole('button', { name: '안내' }));
expect(screen.getByRole('button', { name: '비료 안내' })).toHaveAttribute('aria-pressed', 'true');

await user.type(screen.getByRole('searchbox'), '알파');
expect(screen.queryByTestId('storefront-category-information')).not.toBeInTheDocument();
expect(screen.getByText('알파')).toBeInTheDocument();
```

In `StorefrontBuilderPage.test.jsx`, replace old expectations that category selection focuses `{category} 정보`. Enter preview 안내, select the matching `{category} 안내`, and assert the edited description is shown there.

- [ ] **Step 2: Run focused tests and verify RED where behavior is incomplete**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/officeInformationTab.test.jsx src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx -t "information|안내|description"`

Expected: any remaining state reset or Builder expectation fails for the specific new hierarchy, not from missing elements unrelated to this feature.

- [ ] **Step 3: Apply minimal hook corrections**

If the active child resets unnecessarily, never overwrite `activeInformationItemId` on parent or product selection; let `resolveActiveInformationItem` handle fallback. If search does not reveal products, ensure `isInformationNavigationActive` includes `searchQuery === ''` and `activeSectionEntry` falls back to the first catalog section during search.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/informationNavigationModel.test.js src/features/storefront/__tests__/officeInformationTab.test.jsx src/features/storefront/__tests__/categoryDescriptionRender.test.jsx src/features/storefront/__tests__/OfficeInformationPanel.test.jsx src/features/storefront/__tests__/CategoryInformationPanel.test.jsx src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

Expected: all feature-related tests PASS. If unrelated assertions in `StorefrontBuilderPage.test.jsx` remain stale, report them separately and run the exact new test names independently.

- [ ] **Step 5: Run production verification**

Run: `cd react-app && npm run build`

Expected: exit code 0. The existing chunk-size warning is allowed; new compile or import errors are not.

Run: `cd react-app && npm test -- --run`

Expected: record exact pass/fail counts. Do not attribute existing dirty-worktree UI assertion failures to this feature without a diff-based cause trace.

- [ ] **Step 6: Review the final diff and commit only feature files**

```bash
git diff --check
git diff -- react-app/src/features/storefront/model/storefront-view/informationNavigationModel.js react-app/src/features/storefront/hooks/useStorefrontView.js react-app/src/features/storefront/components/storefront-page/category-nav react-app/src/features/storefront/components/storefront-page/StorefrontView.jsx react-app/src/features/storefront/__tests__/informationNavigationModel.test.js react-app/src/features/storefront/__tests__/officeInformationTab.test.jsx react-app/src/features/storefront/__tests__/categoryDescriptionRender.test.jsx react-app/src/features/storefront/__tests__/OfficeInformationPanel.test.jsx react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
git add <the exact feature files listed above>
git commit -m "test(storefront): cover nested information navigation"
```
