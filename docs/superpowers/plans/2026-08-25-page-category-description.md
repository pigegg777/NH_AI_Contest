# 페이지·분류 설명문 설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사장님이 스토어프론트 상단 제목·설명과 분류별 설명을 직접 입력할 수 있게 하고, 설명문 스타일을 AI 디자인으로 조정할 수 있게 한다.

**Architecture:** 이미 스키마에 있으나 편집 UI가 없어 항상 비어 있는 `navConfig.title` / `navConfig.subtitle`을 재사용한다. 새 최상위 필드도 DB 마이그레이션도 없다. 분류 설명만 `categoryConfig.description`으로 신설한다. 텍스트는 `navConfig`/`categoryConfig`, 스타일은 `pageStyle`에 두어 제목이 이미 따르는 분리 규칙을 그대로 지킨다.

**Tech Stack:** React 19, Vite, vitest + @testing-library/react, CSS Modules, Supabase (스키마 변경 없음)

**Spec:** `docs/superpowers/specs/2026-08-25-page-category-description-design.md`

## Global Constraints

- 저장소 규칙: `git add -A` 금지. 각 커밋은 해당 태스크가 만진 경로만 스테이징한다.
- 스토어프론트(고객 화면)의 색은 `--corp-*` 토큰이 아니라 하드코딩 hex를 쓴다. 관리자 화면(빌더)은 `--corp-*`를 쓴다.
- 한글 텍스트를 렌더하는 CSS에는 `word-break: keep-all`을 넣는다.
- 그라디언트를 쓰지 않는다.
- AI는 문구 텍스트를 절대 바꾸지 않는다. 스타일만 만진다.
- `page_title` 기본값은 `${농협명} ${사무소명} 농자재 정보` — `농자재 정보` 접미사를 유지한다.
- `page_description` 기본값은 없다. 입력칸 placeholder 문구는 `영세가격 : 농업경영체 등록자 구매가격`.
- 기존 실패 테스트 17개(`AppLayout`, `PublicStorefrontQrCard`, `excelExtractWorkbookReviewPage`, `excelExtractWorkbookReviewTable`)는 이 작업과 무관하다. 태스크마다 "새로 깨진 것 없음"만 확인한다.
- 전체 테스트: `cd react-app && npx vitest run`. 빌드: `cd react-app && npx vite build`.

---

## File Structure

| 파일 | 책임 |
| --- | --- |
| `model/page-design/style/pageStyleModel.js` | `pageStyle.description` 절 기본값·토큰·정규화 |
| `model/page-design/style/pageStyleCompiler.js` | `pageDescription` 스코프 분기 |
| `model/page-design/ai-request/pageAiDesignModel.js` | 스코프 옵션 6번째 |
| `model/page-design/ai-request/pageDesignScopeGuide.js` | 가이드 항목 |
| `model/page-design/ai-request/pageStyleAiPrompt.js` | 텍스트 금지 확장 + 설명 절 규칙 |
| `model/page-design/ai-response/pageStyleAiResponseSchema.js` | `description` 절 스키마 |
| `model/page-design/ai-response/pageStyleAiResponseNormalizer.js` | `description` 정규화 + 스코프 제한 |
| `model/storefront-config/storefrontBuilderModel.js` | `categoryConfig.description` 정규화, 저장 페이로드 확장 |
| `model/storefront-config/sectionMatching.js` | 섹션에 `description` 실어 나르기 |
| `model/storefront-view/storefrontViewStyleModel.js` | 설명문 CSS 변수 |
| `hooks/useStorefrontView.js` | `pageTitle` / `pageDescription` / `activeSectionDescription` 노출 |
| `hooks/useStorefrontBuilder.js` | 문구 상태 + 저장 배선 + `textMode` 노출 |
| `components/storefront-page/hero/HeroBlock.jsx` + css | eyebrow 제거, 제목·설명 두 줄 |
| `components/storefront-page/product-cards/CardGridSection.jsx` + css | 분류 설명 렌더 |
| `components/builder-workspace/field-selection/StorefrontTextFields.jsx` + css | 문구 입력 컴포넌트 (신규) |
| `components/builder-workspace/field-selection/FieldSelectionDock.jsx` | 공통 요소 탭 분기 |

---

## Task 1: pageStyle.description 절

**Files:**
- Modify: `react-app/src/features/storefront/model/page-design/style/pageStyleModel.js`
- Test: `react-app/src/features/storefront/__tests__/pageStyleDescription.test.js` (create)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `PAGE_STYLE_DESCRIPTION_FONT_SIZE_TOKENS = ['xs','sm','md','lg','xl','xxl']`
  - `PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES` — 토큰 → rem 문자열 맵
  - `DEFAULT_PAGE_STYLE.description = { colorHex, letterSpacing, fontWeight, fontSizeToken }`
  - `normalizePageStyle(...)` 반환값에 `description` 절 포함

**왜 제목의 크기 토큰을 재사용하지 않는가:** `PAGE_STYLE_HEADER_TITLE_SIZE_VALUES.md`는 `1.1rem`인데 현재 `.subtitle`은 `0.88rem`이다. 제목 스케일을 그대로 쓰면 기존 화면의 설명줄이 갑자기 커진다. 설명문 전용 스케일을 만들고 `md`를 현재 값에 맞춘다.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/pageStyleDescription.test.js`:

```js
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_STYLE,
  PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES,
  normalizePageStyle,
} from '../model/page-design/style/pageStyleModel';

describe('pageStyle.description', () => {
  it('defaults to the size the hero subtitle already renders at', () => {
    expect(DEFAULT_PAGE_STYLE.description.fontSizeToken).toBe('md');
    expect(PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES.md).toBe('0.88rem');
  });

  it('defaults to the colour and weight the hero subtitle already uses', () => {
    expect(DEFAULT_PAGE_STYLE.description.colorHex).toBe('#51635a');
    expect(DEFAULT_PAGE_STYLE.description.fontWeight).toBe(400);
    expect(DEFAULT_PAGE_STYLE.description.letterSpacing).toBe('normal');
  });

  it('fills the section in when a saved style predates it', () => {
    const style = normalizePageStyle({ palette: { backgroundHex: '#ffffff' } });

    expect(style.description).toEqual(DEFAULT_PAGE_STYLE.description);
  });

  it('keeps values it recognises', () => {
    const style = normalizePageStyle({
      description: {
        colorHex: '#123456',
        letterSpacing: '0.02em',
        fontWeight: 700,
        fontSizeToken: 'lg',
      },
    });

    expect(style.description).toEqual({
      colorHex: '#123456',
      letterSpacing: '0.02em',
      fontWeight: 700,
      fontSizeToken: 'lg',
    });
  });

  it('falls back on values it does not recognise', () => {
    const style = normalizePageStyle({
      description: {
        colorHex: 'not-a-colour',
        letterSpacing: 42,
        fontWeight: 'bold',
        fontSizeToken: 'gigantic',
      },
    });

    expect(style.description).toEqual(DEFAULT_PAGE_STYLE.description);
  });

  it('does not force the description colour for contrast the way the header does', () => {
    // The header runs titleColorHex through ensureReadableTextColor against the
    // page background. The description is a secondary line the merchant may
    // deliberately want faint, so its colour is taken as given.
    const style = normalizePageStyle({
      palette: { backgroundHex: '#ffffff' },
      description: { colorHex: '#eeeeee' },
    });

    expect(style.description.colorHex).toBe('#eeeeee');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleDescription.test.js`
Expected: FAIL — `PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `pageStyleModel.js`, after `PAGE_STYLE_HEADER_TITLE_SIZE_VALUES`:

```js
export const PAGE_STYLE_DESCRIPTION_FONT_SIZE_TOKENS = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

// A scale of its own rather than the title's: md matches the 0.88rem the hero
// subtitle already renders at, so adding this section changes nothing on screen.
export const PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES = {
  xs: '0.76rem',
  sm: '0.82rem',
  md: '0.88rem',
  lg: '0.94rem',
  xl: '1rem',
  xxl: '1.06rem',
};
```

Add to `DEFAULT_PAGE_STYLE`, after `header`:

```js
  description: {
    colorHex: '#51635a',
    letterSpacing: 'normal',
    fontWeight: 400,
    fontSizeToken: 'md',
  },
```

Add the normalizer next to `normalizeHeader`:

```js
function normalizeDescription(description) {
  const source = description ?? {};

  return {
    colorHex: normalizeHexColor(source.colorHex, DEFAULT_PAGE_STYLE.description.colorHex),
    letterSpacing:
      typeof source.letterSpacing === 'string' && source.letterSpacing
        ? source.letterSpacing
        : DEFAULT_PAGE_STYLE.description.letterSpacing,
    fontWeight: Number.isFinite(source.fontWeight)
      ? source.fontWeight
      : DEFAULT_PAGE_STYLE.description.fontWeight,
    fontSizeToken: PAGE_STYLE_DESCRIPTION_FONT_SIZE_TOKENS.includes(source.fontSizeToken)
      ? source.fontSizeToken
      : DEFAULT_PAGE_STYLE.description.fontSizeToken,
  };
}
```

In `normalizePageStyle`, add to the returned object after `header`:

```js
    description: normalizeDescription(source.description),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleDescription.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Fix the existing pageStyleModel snapshot**

`src/features/storefront/__tests__/pageStyleModel.test.js` has a `toEqual` on the whole normalized style. Add the new section to its expected object, right after the `header` block:

```js
      description: {
        colorHex: '#51635a',
        letterSpacing: 'normal',
        fontWeight: 400,
        fontSizeToken: 'md',
      },
```

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleModel.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/model/page-design/style/pageStyleModel.js react-app/src/features/storefront/__tests__/pageStyleDescription.test.js react-app/src/features/storefront/__tests__/pageStyleModel.test.js
git commit -m "feat(storefront): add a description section to the page style"
```

---

## Task 2: 히어로 제목·설명 렌더

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontView.js`
- Modify: `react-app/src/features/storefront/model/storefront-view/storefrontViewStyleModel.js`
- Modify: `react-app/src/features/storefront/components/storefront-page/hero/HeroBlock.jsx`
- Modify: `react-app/src/features/storefront/components/storefront-page/hero/HeroSection.module.css`
- Test: `react-app/src/features/storefront/__tests__/heroPageText.test.jsx` (create)

**Interfaces:**
- Consumes: Task 1의 `PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES`, `pageStyle.description`
- Produces:
  - `useStorefrontView(...)` 반환값에 `pageTitle: string`, `pageDescription: string`
  - `buildStorefrontViewCssVars(view)`에 `--page-description-color`, `--page-description-size`, `--page-description-weight`, `--page-description-letter-spacing`
  - 히어로에서 `view.coopName` 사용 제거

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/heroPageText.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import StorefrontView from '../components/storefront-page/StorefrontView';

const PRODUCT_ROWS = [
  { product_category_name: '비료', product_name: '알파 비료', tax_price: 1000 },
];

const CONFIG = {
  pageConfig: { schemaVersion: 1 },
  navConfig: { title: '', subtitle: '' },
  categoryConfigs: [
    {
      productCategoryName: '비료',
      categoryConfig: {
        displayName: '비료',
        sourceCategoryName: '비료',
        cardDesign: { visibleFields: ['product_name', 'tax_price'] },
      },
    },
  ],
  hiddenProducts: [],
};

function renderView(navConfig) {
  render(
    <StorefrontView
      config={{ ...CONFIG, navConfig: { ...CONFIG.navConfig, ...navConfig } }}
      productRows={PRODUCT_ROWS}
      officeName="영농센터"
      nhName="발안농협"
    />,
  );
}

describe('hero page title and description', () => {
  it('falls back to the derived org line when no title is set', () => {
    renderView({});

    expect(
      screen.getByRole('heading', { name: '발안농협 영농센터 농자재 정보' }),
    ).toBeInTheDocument();
  });

  it('keeps the 농자재 정보 suffix in the fallback', () => {
    renderView({});

    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/농자재 정보$/);
  });

  it('uses the merchant title when one is set', () => {
    renderView({ title: '발안농협 봄맞이 자재전' });

    expect(
      screen.getByRole('heading', { name: '발안농협 봄맞이 자재전' }),
    ).toBeInTheDocument();
  });

  it('renders nothing for the description when it is empty', () => {
    renderView({});

    expect(
      screen.queryByTestId('storefront-page-description'),
    ).not.toBeInTheDocument();
  });

  it('renders the description under the title when one is set', () => {
    renderView({ subtitle: '영세가격 : 농업경영체 등록자 구매가격' });

    expect(screen.getByTestId('storefront-page-description').textContent).toBe(
      '영세가격 : 농업경영체 등록자 구매가격',
    );
  });

  it('no longer renders the unused eyebrow line', () => {
    renderView({ title: '발안농협 봄맞이 자재전' });

    // The eyebrow used to show navConfig.title above the h1. The title now IS
    // the h1, so the same text must appear exactly once.
    expect(screen.getAllByText('발안농협 봄맞이 자재전')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/heroPageText.test.jsx`
Expected: FAIL — the heading is the derived line even when a title is set, and the eyebrow duplicates it.

- [ ] **Step 3: Write the implementation**

In `useStorefrontView.js`, replace the `coopName` / `title` / `headerOrgLine` / `subtitle` block (around lines 196-210) with:

```js
  const officeName =
    toTrimmedString(externalOfficeName) ||
    resolveOfficeName(activeSectionEntry?.section?.products) ||
    resolveOfficeName(baseVisibleProducts);
  const headerOrgName = [toTrimmedString(nhName), officeName]
    .filter(Boolean)
    .join(' ');
  // The title the merchant sees as the default in their input box, and what the
  // storefront falls back to when they leave it blank.
  const derivedPageTitle = headerOrgName ? `${headerOrgName} 농자재 정보` : '상품 안내';
  const pageTitle =
    toTrimmedString(config?.navConfig?.title) ||
    toTrimmedString(resolvedPageConfig.nav.title) ||
    derivedPageTitle;
  const pageDescription =
    toTrimmedString(config?.navConfig?.subtitle) ||
    toTrimmedString(resolvedPageConfig.nav.subtitle) ||
    '';
```

Delete the now-unused `coopName`, `title`, `headerOrgLine`, `subtitle` locals. In the returned object, replace `coopName`, `headerOrgLine` and `subtitle` with:

```js
    derivedPageTitle,
    pageTitle,
    pageDescription,
```

Keep `officeName` in the return if it is already there.

In `storefrontViewStyleModel.js`, add to `buildStorefrontViewCssVars`, next to the existing title vars:

```js
    '--page-description-color': view.pageStyle.description.colorHex,
    '--page-description-size':
      PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES[view.pageStyle.description.fontSizeToken],
    '--page-description-weight': view.pageStyle.description.fontWeight,
    '--page-description-letter-spacing': view.pageStyle.description.letterSpacing,
```

and add the import:

```js
import { PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES } from '../page-design/style/pageStyleModel';
```

(If that file already imports from `pageStyleModel`, add the name to the existing import instead of a second statement.)

Replace `HeroBlock.jsx` body with:

```jsx
import styles from './HeroSection.module.css';

export default function HeroBlock({ view, brandLogoSrc }) {
  return (
    <div className={styles.heroTop}>
      {view.productUpdatedAtLabel ? (
        <p
          className={styles.updatedAt}
          data-testid="storefront-product-updated-at"
        >
          단가 기준일 : {view.productUpdatedAtLabel}
        </p>
      ) : null}

      <div className={styles.brandBlock}>
        <div className={styles.brandIdentity}>
          <div className={styles.logoShell} aria-hidden="true">
            <img
              className={styles.logo}
              src={brandLogoSrc}
              alt=""
              data-testid="storefront-brand-logo"
            />
          </div>
          <div className={styles.brandCopy}>
            <h1 className={styles.title}>{view.pageTitle}</h1>
            {view.pageDescription ? (
              <p
                className={styles.description}
                data-testid="storefront-page-description"
              >
                {view.pageDescription}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
```

In `HeroSection.module.css`, rename `.subtitle` to `.description` and point it at the new variables. Delete the `.eyebrow` rule.

```css
.description {
  margin: 6px 0 0;
  font-size: var(--page-description-size, 0.88rem);
  font-weight: var(--page-description-weight, 400);
  letter-spacing: var(--page-description-letter-spacing, normal);
  line-height: 1.5;
  color: var(--page-description-color, #51635a);
  word-break: keep-all;
  overflow-wrap: break-word;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/heroPageText.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Repair any test that referenced the removed fields**

Run: `cd react-app && npx vitest run src/features/storefront src/features/public-storefront`
Any failure naming `coopName`, `headerOrgLine`, `subtitle` or `eyebrow` is this task's to fix: point the assertion at `pageTitle` / `pageDescription` / `storefront-page-description`. Expected: no new failures beyond the known 17.

- [ ] **Step 6: Verify nothing moved visually**

Run: `cd react-app && npx vite build`
Expected: build succeeds. The default style values were chosen to equal the previous hardcoded CSS, so a storefront with no title or description set renders exactly as before.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/hooks/useStorefrontView.js react-app/src/features/storefront/model/storefront-view/storefrontViewStyleModel.js react-app/src/features/storefront/components/storefront-page/hero/ react-app/src/features/storefront/__tests__/
git commit -m "feat(storefront): make the hero title editable and render a page description"
```

---

## Task 3: categoryConfig.description

**Files:**
- Modify: `react-app/src/features/storefront/model/storefront-config/storefrontBuilderModel.js`
- Modify: `react-app/src/features/storefront/model/storefront-config/sectionMatching.js`
- Test: `react-app/src/features/storefront/__tests__/categoryDescriptionModel.test.js` (create)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `normalizeCategoryConfig(...)` 반환값에 `description: string`
  - `buildCategoryConfigRow({ ..., categoryDescription })` — 새 선택 인자
  - `buildStorefrontSavePayload({ ..., categoryDescription })` — 새 선택 인자
  - `buildSections(...)` 각 섹션에 `description: string`

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/categoryDescriptionModel.test.js`:

```js
import { describe, expect, it } from 'vitest';

import { normalizeCategoryConfig } from '../model/storefront-config/storefrontBuilderModel';
import { buildSections } from '../model/storefront-config/sectionMatching';

describe('categoryConfig.description', () => {
  it('defaults to an empty string', () => {
    expect(normalizeCategoryConfig({}, '비료').description).toBe('');
  });

  it('keeps and trims a description it is given', () => {
    expect(
      normalizeCategoryConfig({ description: '  봄철 밑거름 모음  ' }, '비료').description,
    ).toBe('봄철 밑거름 모음');
  });

  it('ignores a description that is not a string', () => {
    expect(normalizeCategoryConfig({ description: 42 }, '비료').description).toBe('');
  });
});

describe('buildSections description', () => {
  const ROW = { product_category_name: '비료', product_name: '알파 비료' };

  it('carries the configured description onto the section', () => {
    const [section] = buildSections(
      [
        {
          productCategoryName: '비료',
          categoryConfig: {
            displayName: '비료',
            sourceCategoryName: '비료',
            description: '봄철 밑거름 모음',
          },
        },
      ],
      [ROW],
    );

    expect(section.description).toBe('봄철 밑거름 모음');
  });

  it('gives an unconfigured category an empty description', () => {
    const [section] = buildSections([], [ROW]);

    expect(section.description).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/categoryDescriptionModel.test.js`
Expected: FAIL — `description` is undefined.

- [ ] **Step 3: Write the implementation**

In `storefrontBuilderModel.js`, inside `normalizeCategoryConfig`'s returned object, after `sourceCategoryName`:

```js
    description: toTrimmedString(source.description),
```

In `buildCategoryConfigRow`, add `categoryDescription` to the destructured parameters and pass it into the object handed to `normalizeCategoryConfig`:

```js
export function buildCategoryConfigRow({
  productCategoryName,
  existingConfig,
  selectedMediumCategories,
  representativeMediumCategory,
  cardFields,
  cardStyle,
  bodySlots,
  categoryDescription,
  allowedScalarKeys,
}) {
```

and where it builds `nextCategoryConfig`, add after the existing spread:

```js
      description:
        categoryDescription === undefined
          ? existingRow?.categoryConfig?.description
          : categoryDescription,
```

In `buildStorefrontSavePayload`, add `categoryDescription` to the destructured parameters and forward it to `buildCategoryConfigRow`.

In `sectionMatching.js`, add `description` to both section builders:

```js
        description: categoryConfig.description || '',
```

in the configured branch, and in `buildDefaultSection`:

```js
    description: '',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/categoryDescriptionModel.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Check nothing else broke**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: no new failures. `storefrontBuilderModel.test.js` may have a `toEqual` on a normalized category config — add `description: ''` to its expected object if so.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/model/storefront-config/ react-app/src/features/storefront/__tests__/
git commit -m "feat(storefront): carry a per-category description through the config"
```

---

## Task 4: 분류 설명 렌더

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontView.js`
- Modify: `react-app/src/features/storefront/components/storefront-page/product-cards/CardGridSection.jsx`
- Modify: `react-app/src/features/storefront/components/storefront-page/product-cards/CardGridSection.module.css`
- Test: `react-app/src/features/storefront/__tests__/categoryDescriptionRender.test.jsx` (create)

**Interfaces:**
- Consumes: Task 3의 `section.description`
- Produces: `CardGridSection` accepts `description` prop, renders `data-testid="storefront-category-description"` above the grid

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/categoryDescriptionRender.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CardGridSection from '../components/storefront-page/product-cards/CardGridSection';

const SECTION = {
  products: [{ product_name: '알파 비료', tax_price: 1000 }],
};

function renderSection(description) {
  render(
    <CardGridSection
      sectionId="s1"
      section={SECTION}
      fields={['product_name', 'tax_price']}
      description={description}
    />,
  );
}

describe('category description', () => {
  it('renders above the card grid', () => {
    renderSection('봄철 밑거름 모음');

    const note = screen.getByTestId('storefront-category-description');
    const grid = screen.getByTestId('storefront-card-grid-section');

    expect(note.textContent).toBe('봄철 밑거름 모음');
    expect(grid.contains(note)).toBe(true);
    expect(
      note.compareDocumentPosition(screen.getByText('알파 비료')),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders nothing when the category has no description', () => {
    renderSection('');

    expect(
      screen.queryByTestId('storefront-category-description'),
    ).not.toBeInTheDocument();
  });

  it('renders nothing when the prop is missing entirely', () => {
    render(
      <CardGridSection
        sectionId="s1"
        section={SECTION}
        fields={['product_name']}
      />,
    );

    expect(
      screen.queryByTestId('storefront-category-description'),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/categoryDescriptionRender.test.jsx`
Expected: FAIL — the element is never rendered.

- [ ] **Step 3: Write the implementation**

In `CardGridSection.jsx`, add `description = ''` to the destructured props, and render it between `sectionHeaderContent` and `<div className={styles.grid}>`:

```jsx
      {description ? (
        <p
          className={styles.categoryDescription}
          data-testid="storefront-category-description"
        >
          {description}
        </p>
      ) : null}
```

In `CardGridSection.module.css`:

```css
.categoryDescription {
  margin: 0 0 10px;
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.55;
  color: #51635a;
  word-break: keep-all;
  overflow-wrap: break-word;
}
```

In `useStorefrontView.js`, the `sectionEntries` mapping already carries `section`. In `StorefrontView.jsx`, pass it down where `CardGridSection` is rendered:

```jsx
                  description={section?.description}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/categoryDescriptionRender.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/components/storefront-page/ react-app/src/features/storefront/__tests__/
git commit -m "feat(storefront): show the category description above its cards"
```

---

## Task 5: 문구 입력 컴포넌트

**Files:**
- Create: `react-app/src/features/storefront/components/builder-workspace/field-selection/StorefrontTextFields.jsx`
- Modify: `react-app/src/features/storefront/components/builder-workspace/field-selection/FieldSelectionDock.module.css`
- Test: `react-app/src/features/storefront/__tests__/StorefrontTextFields.test.jsx` (create)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `PAGE_DESCRIPTION_PLACEHOLDER = '영세가격 : 농업경영체 등록자 구매가격'`
  - `<StorefrontTextFields fields={[{ id, label, value, placeholder, hint, fillLabel }]} onChange={(id, value) => {}} />`

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/StorefrontTextFields.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  PAGE_DESCRIPTION_PLACEHOLDER,
  StorefrontTextFields,
} from '../components/builder-workspace/field-selection/StorefrontTextFields';

function renderFields(overrides = {}) {
  const props = {
    fields: [
      {
        id: 'pageTitle',
        label: '페이지 제목',
        value: '',
        placeholder: '발안농협 영농센터 농자재 정보',
        hint: '비워두면 위 문구가 그대로 표시됩니다.',
      },
      {
        id: 'pageDescription',
        label: '페이지 설명',
        value: '',
        placeholder: PAGE_DESCRIPTION_PLACEHOLDER,
        fillLabel: '예시문구 넣기',
      },
    ],
    onChange: vi.fn(),
    ...overrides,
  };

  render(<StorefrontTextFields {...props} />);

  return props;
}

describe('StorefrontTextFields', () => {
  it('labels each input', () => {
    renderFields();

    expect(screen.getByLabelText('페이지 제목')).toBeInTheDocument();
    expect(screen.getByLabelText('페이지 설명')).toBeInTheDocument();
  });

  it('shows the derived title as the placeholder so the merchant sees the default', () => {
    renderFields();

    expect(screen.getByLabelText('페이지 제목')).toHaveAttribute(
      'placeholder',
      '발안농협 영농센터 농자재 정보',
    );
  });

  it('reports edits by field id', async () => {
    const user = userEvent.setup();
    const { onChange } = renderFields();

    await user.type(screen.getByLabelText('페이지 제목'), '봄');

    expect(onChange).toHaveBeenCalledWith('pageTitle', '봄');
  });

  it('fills the example text in one click', async () => {
    const user = userEvent.setup();
    const { onChange } = renderFields();

    await user.click(screen.getByRole('button', { name: '예시문구 넣기' }));

    expect(onChange).toHaveBeenCalledWith('pageDescription', PAGE_DESCRIPTION_PLACEHOLDER);
  });

  it('offers the fill button only on fields that name one', () => {
    renderFields();

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('hides the fill button once the field has a value', () => {
    renderFields({
      fields: [
        {
          id: 'pageDescription',
          label: '페이지 설명',
          value: '이미 적었습니다',
          placeholder: PAGE_DESCRIPTION_PLACEHOLDER,
          fillLabel: '예시문구 넣기',
        },
      ],
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a hint when one is given', () => {
    renderFields();

    expect(
      screen.getByText('비워두면 위 문구가 그대로 표시됩니다.'),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontTextFields.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `StorefrontTextFields.jsx`:

```jsx
import { useId } from 'react';

import styles from './FieldSelectionDock.module.css';

export const PAGE_DESCRIPTION_PLACEHOLDER = '영세가격 : 농업경영체 등록자 구매가격';

/**
 * The free-text side of the field selection dock: page title, page description
 * and per-category description. Kept apart from the field tables because it
 * edits config text rather than toggling which columns a card shows.
 */
export function StorefrontTextFields({ fields, onChange }) {
  const idPrefix = useId().replace(/:/g, '-');

  return (
    <div className={styles.textFields} data-testid="storefront-text-fields">
      {fields.map((field) => {
        const inputId = `${idPrefix}-${field.id}`;
        // Offering to fill text the merchant has already written would only
        // risk clobbering it.
        const showsFill = Boolean(field.fillLabel) && !field.value;

        return (
          <div key={field.id} className={styles.textField}>
            <label className={styles.textFieldLabel} htmlFor={inputId}>
              {field.label}
            </label>

            <div className={styles.textFieldRow}>
              <input
                id={inputId}
                type="text"
                className={styles.textFieldInput}
                value={field.value}
                placeholder={field.placeholder}
                onChange={(event) => onChange(field.id, event.target.value)}
              />

              {showsFill ? (
                <button
                  type="button"
                  className={styles.textFieldFillButton}
                  onClick={() => onChange(field.id, field.placeholder)}
                >
                  {field.fillLabel}
                </button>
              ) : null}
            </div>

            {field.hint ? (
              <p className={styles.textFieldHint}>{field.hint}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
```

Append to `FieldSelectionDock.module.css`:

```css
.textFields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0 12px;
}

.textField {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.textFieldLabel {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--corp-text);
  word-break: keep-all;
}

.textFieldRow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.textFieldInput {
  flex: 1 1 auto;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--corp-line-strong);
  border-radius: var(--corp-radius-sm);
  background: var(--corp-panel);
  color: var(--corp-text);
  font-size: 0.84rem;
}

.textFieldFillButton {
  flex: 0 0 auto;
  padding: 8px 10px;
  border: 1px solid var(--corp-line-strong);
  border-radius: var(--corp-radius-sm);
  background: var(--corp-panel);
  color: var(--corp-text);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  word-break: keep-all;
}

.textFieldHint {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 500;
  line-height: 1.5;
  color: var(--corp-muted);
  word-break: keep-all;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontTextFields.test.jsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/components/builder-workspace/field-selection/ react-app/src/features/storefront/__tests__/StorefrontTextFields.test.jsx
git commit -m "feat(storefront): add the text input block for storefront copy"
```

---

## Task 6: 공통 요소 탭 + 저장 배선

**Files:**
- Modify: `react-app/src/features/storefront/components/builder-workspace/field-selection/FieldSelectionDock.jsx`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Test: `react-app/src/features/storefront/__tests__/fieldSelectionCommonTab.test.jsx` (create)

**Interfaces:**
- Consumes: Task 5의 `StorefrontTextFields`, `PAGE_DESCRIPTION_PLACEHOLDER`; Task 3의 `buildStorefrontSavePayload({ categoryDescription })`
- Produces:
  - `dataMode.categoryTabs`의 첫 항목이 `{ id: 'common', label: '공통 요소' }`
  - `dataMode.textDraft = { pageTitle, pageDescription, categoryDescription }`
  - `dataMode.setTextDraft(fieldId, value)`
  - `dataMode.derivedPageTitle: string`
  - `applyChanges`가 문구 3종을 함께 저장

`COMMON_TAB_ID = 'common'`은 디자인 모드가 이미 쓰는 값과 같다.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/fieldSelectionCommonTab.test.jsx`:

```jsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import FieldSelectionDock from '../components/builder-workspace/field-selection/FieldSelectionDock';

function buildDataMode(overrides = {}) {
  return {
    categoryTabs: [
      { id: 'common', label: '공통 요소' },
      { id: '비료', label: '비료' },
    ],
    selectedCategoryId: 'common',
    selectCategory: vi.fn(),
    availableCategoryFields: [
      { key: 'product_name', label: '상품명', isSelectable: true },
    ],
    draftFields: ['product_name'],
    committedFields: ['product_name'],
    toggleField: vi.fn(),
    hasPendingChanges: false,
    goBack: vi.fn(),
    derivedPageTitle: '발안농협 영농센터 농자재 정보',
    textDraft: { pageTitle: '', pageDescription: '', categoryDescription: '' },
    setTextDraft: vi.fn(),
    ...overrides,
  };
}

describe('field selection common tab', () => {
  it('offers 공통 요소 in the tab row', () => {
    render(<FieldSelectionDock dataMode={buildDataMode()} onApply={vi.fn()} />);

    const tabs = screen.getByTestId('storefront-sticky-category-tabs');

    expect(within(tabs).getByRole('tab', { name: '공통 요소' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('shows page title and description on the common tab, not field tables', () => {
    render(<FieldSelectionDock dataMode={buildDataMode()} onApply={vi.fn()} />);

    expect(screen.getByLabelText('페이지 제목')).toBeInTheDocument();
    expect(screen.getByLabelText('페이지 설명')).toBeInTheDocument();
    expect(
      screen.queryByTestId('data-field-table-description'),
    ).not.toBeInTheDocument();
  });

  it('shows the derived title as the page title placeholder', () => {
    render(<FieldSelectionDock dataMode={buildDataMode()} onApply={vi.fn()} />);

    expect(screen.getByLabelText('페이지 제목')).toHaveAttribute(
      'placeholder',
      '발안농협 영농센터 농자재 정보',
    );
  });

  it('shows the category description and the field tables on a category tab', () => {
    render(
      <FieldSelectionDock
        dataMode={buildDataMode({ selectedCategoryId: '비료' })}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('분류 설명')).toBeInTheDocument();
    expect(screen.getByTestId('data-field-table-description')).toBeInTheDocument();
    expect(screen.queryByLabelText('페이지 제목')).not.toBeInTheDocument();
  });

  it('reports text edits back to the builder', async () => {
    const user = userEvent.setup();
    const dataMode = buildDataMode();

    render(<FieldSelectionDock dataMode={dataMode} onApply={vi.fn()} />);
    await user.type(screen.getByLabelText('페이지 제목'), '봄');

    expect(dataMode.setTextDraft).toHaveBeenCalledWith('pageTitle', '봄');
  });

  it('keeps the save button on both tabs', () => {
    const { rerender } = render(
      <FieldSelectionDock dataMode={buildDataMode()} onApply={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: '저장하기' })).toBeInTheDocument();

    rerender(
      <FieldSelectionDock
        dataMode={buildDataMode({ selectedCategoryId: '비료' })}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '저장하기' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/fieldSelectionCommonTab.test.jsx`
Expected: FAIL — no text inputs exist in the dock.

- [ ] **Step 3: Implement the dock**

In `FieldSelectionDock.jsx`, import the new component and branch the body:

```jsx
import CategoryTabs from '../category-tabs/CategoryTabs';
import DataFieldGroupTable from './DataFieldGroupTable';
import {
  PAGE_DESCRIPTION_PLACEHOLDER,
  StorefrontTextFields,
} from './StorefrontTextFields';
import { groupAvailableFields } from '../../../model/data-selection/dataSelectionFieldGroupModel';
import styles from './FieldSelectionDock.module.css';

const COMMON_TAB_ID = 'common';
```

Replace the `<div className={styles.tables}>` block with:

```jsx
      {dataMode.selectedCategoryId === COMMON_TAB_ID ? (
        <StorefrontTextFields
          fields={[
            {
              id: 'pageTitle',
              label: '페이지 제목',
              value: dataMode.textDraft.pageTitle,
              placeholder: dataMode.derivedPageTitle,
              hint: '비워두면 위 문구가 그대로 표시됩니다.',
            },
            {
              id: 'pageDescription',
              label: '페이지 설명',
              value: dataMode.textDraft.pageDescription,
              placeholder: PAGE_DESCRIPTION_PLACEHOLDER,
              fillLabel: '예시문구 넣기',
              hint: '비워두면 제목 아래에 아무것도 표시되지 않습니다.',
            },
          ]}
          onChange={dataMode.setTextDraft}
        />
      ) : (
        <>
          <StorefrontTextFields
            fields={[
              {
                id: 'categoryDescription',
                label: '분류 설명',
                value: dataMode.textDraft.categoryDescription,
                placeholder: '이 분류 상품 목록 위에 보여줄 안내 문구',
                hint: '비워두면 아무것도 표시되지 않습니다.',
              },
            ]}
            onChange={dataMode.setTextDraft}
          />

          <div className={styles.tables}>
            <DataFieldGroupTable
              groupLabel="상품개요"
              fields={groups.description}
              draftFields={dataMode.draftFields}
              onToggleField={dataMode.toggleField}
              testId="data-field-table-description"
            />
            <DataFieldGroupTable
              groupLabel="가격"
              fields={groups.price}
              draftFields={dataMode.draftFields}
              onToggleField={dataMode.toggleField}
              testId="data-field-table-price"
            />
            <DataFieldGroupTable
              groupLabel="분류"
              fields={groups.category}
              draftFields={dataMode.draftFields}
              onToggleField={dataMode.toggleField}
              testId="data-field-table-category"
            />
          </div>
        </>
      )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/fieldSelectionCommonTab.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Wire the builder**

In `useStorefrontBuilder.js`:

Add state next to the other drafts:

```js
  const [textDraft, setTextDraftState] = useState({
    pageTitle: '',
    pageDescription: '',
    categoryDescription: '',
  });

  function setTextDraft(fieldId, value) {
    markDirty();
    setTextDraftState((current) => ({ ...current, [fieldId]: value }));
  }
```

Hydrate it wherever `setNavConfig` is called on load (around line 278) and in `hydrateCategoryDraft`:

```js
  setTextDraftState((current) => ({
    ...current,
    pageTitle: toTrimmedString(config?.navConfig?.title),
    pageDescription: toTrimmedString(config?.navConfig?.subtitle),
  }));
```

and in `hydrateCategoryDraft`, after `resolvedDraft` is computed:

```js
  setTextDraftState((current) => ({
    ...current,
    categoryDescription: toTrimmedString(
      findCategoryConfigRow(nextExistingConfig?.categoryConfigs, resolvedCategoryName)
        ?.categoryConfig?.description,
    ),
  }));
```

(`findCategoryConfigRow` is already exported from `storefrontBuilderModel`; add it to that import if missing.)

Extend `buildCurrentSavePayload`:

```js
  function buildCurrentSavePayload({ cardFields = dataSelection.committed } = {}) {
    return buildStorefrontSavePayload({
      officeCode,
      existingConfig,
      hiddenProducts,
      selectedProductCategoryName,
      selectedMediumCategories,
      representativeMediumCategory,
      cardStyle: cardAi.cardStyle,
      cardFields,
      bodySlots: cardAi.bodySlots,
      navConfig: {
        ...navConfig,
        title: textDraft.pageTitle,
        subtitle: textDraft.pageDescription,
      },
      categoryDescription: textDraft.categoryDescription,
      mobileUiTree,
      pageStyle: pageAi.pageStyle,
      allowedScalarKeys: effectiveScalarKeys,
    });
  }
```

Extend `dataMode`:

```js
    categoryTabs: [
      { id: 'common', label: '공통 요소' },
      ...productCategoryOptions.map((option) => ({
        id: option.categoryName,
        label: option.categoryName,
        rowCount: option.rowCount,
        hasDraft: option.hasDraft,
      })),
    ],
    selectedCategoryId: dataTabId,
    selectCategory: selectDataTab,
    derivedPageTitle,
    textDraft,
    setTextDraft,
```

Add the tab state and handler above `dataMode`:

```js
  const [dataTabId, setDataTabId] = useState('common');

  function selectDataTab(tabId) {
    setDataTabId(tabId);

    if (tabId !== 'common') {
      selectProductCategory(tabId);
    }
  }
```

`derivedPageTitle` comes from the same rule the storefront uses:

```js
  const derivedPageTitle = [toTrimmedString(nhName), officeName]
    .filter(Boolean)
    .join(' ');
  const resolvedDerivedPageTitle = derivedPageTitle
    ? `${derivedPageTitle} 농자재 정보`
    : '상품 안내';
```

Pass `resolvedDerivedPageTitle` as `derivedPageTitle` in `dataMode`.

Also expose it to the preview so the storefront and the input box agree — the storefront already derives it independently, so nothing else changes.

- [ ] **Step 6: Run the whole storefront suite**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: no new failures. `StorefrontBuilderPage.test.jsx` exercises data mode — if a test drives the field tables directly it may now need to click the category tab first; fix by selecting the tab.

- [ ] **Step 7: Build**

Run: `cd react-app && npx vite build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/components/builder-workspace/field-selection/FieldSelectionDock.jsx react-app/src/features/storefront/hooks/useStorefrontBuilder.js react-app/src/features/storefront/__tests__/
git commit -m "feat(storefront): add a 공통 요소 tab for page and category copy"
```

---

## Task 7: AI 스코프 + 스키마 + 컴파일러

**Files:**
- Modify: `react-app/src/features/storefront/model/page-design/ai-request/pageAiDesignModel.js`
- Modify: `react-app/src/features/storefront/model/page-design/ai-response/pageStyleAiResponseSchema.js`
- Modify: `react-app/src/features/storefront/model/page-design/ai-response/pageStyleAiResponseNormalizer.js`
- Modify: `react-app/src/features/storefront/model/page-design/style/pageStyleCompiler.js`
- Test: `react-app/src/features/storefront/__tests__/pageDescriptionAiScope.test.js` (create)

**Interfaces:**
- Consumes: Task 1의 `PAGE_STYLE_DESCRIPTION_FONT_SIZE_TOKENS`
- Produces:
  - `PAGE_AI_TARGET_SCOPE_OPTIONS`에 `{ id: 'pageDescription', label: '상단 설명 글자', detail: '글자색, 굵기, 글자 크기, 자간' }`
  - `PAGE_STYLE_AI_SCHEMA.properties.description`
  - `normalizePageStyleAiIntent(...)` 반환값에 `description`
  - `compilePageStyle({ targetScope: 'pageDescription' })` 분기

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/pageDescriptionAiScope.test.js`:

```js
import { describe, expect, it } from 'vitest';

import { PAGE_AI_TARGET_SCOPE_OPTIONS } from '../model/page-design/ai-request/pageAiDesignModel';
import { PAGE_STYLE_AI_SCHEMA } from '../model/page-design/ai-response/pageStyleAiResponseSchema';
import { normalizePageStyleAiIntent } from '../model/page-design/ai-response/pageStyleAiResponseNormalizer';
import { compilePageStyle } from '../model/page-design/style/pageStyleCompiler';
import { DEFAULT_PAGE_STYLE } from '../model/page-design/style/pageStyleModel';

describe('page description AI scope', () => {
  it('is the sixth chip', () => {
    expect(PAGE_AI_TARGET_SCOPE_OPTIONS).toHaveLength(6);
    expect(
      PAGE_AI_TARGET_SCOPE_OPTIONS.some((option) => option.id === 'pageDescription'),
    ).toBe(true);
  });

  it('offers only style fields, never the text', () => {
    const description = PAGE_STYLE_AI_SCHEMA.properties.description;

    expect(Object.keys(description.properties).sort()).toEqual([
      'colorHex',
      'fontSizeToken',
      'fontWeight',
      'letterSpacing',
    ]);
  });

  it('limits the intent to the description when that scope is chosen', () => {
    const intent = normalizePageStyleAiIntent(
      {
        palette: { accentHex: '#123456' },
        header: { titleColorHex: '#111111' },
        description: { colorHex: '#222222' },
        search: { sizeToken: 'lg' },
      },
      '#1d4a2e',
      'pageDescription',
    );

    expect(intent.description).toEqual({ colorHex: '#222222' });
    expect(intent.palette).toBeNull();
    expect(intent.header).toBeNull();
    expect(intent.search).toBeNull();
  });

  it('applies the description and leaves every other section alone', () => {
    const style = compilePageStyle({
      intent: { description: { colorHex: '#222222', fontSizeToken: 'lg' } },
      previousPageStyle: DEFAULT_PAGE_STYLE,
      targetScope: 'pageDescription',
    });

    expect(style.description.colorHex).toBe('#222222');
    expect(style.description.fontSizeToken).toBe('lg');
    expect(style.header).toEqual(DEFAULT_PAGE_STYLE.header);
    expect(style.palette).toEqual(DEFAULT_PAGE_STYLE.palette);
  });

  it('leaves the description alone when another scope is chosen', () => {
    const style = compilePageStyle({
      intent: { description: { colorHex: '#222222' } },
      previousPageStyle: DEFAULT_PAGE_STYLE,
      targetScope: 'header',
    });

    expect(style.description).toEqual(DEFAULT_PAGE_STYLE.description);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageDescriptionAiScope.test.js`
Expected: FAIL — only five scope options exist.

- [ ] **Step 3: Write the implementation**

In `pageAiDesignModel.js`, add to `PAGE_AI_TARGET_SCOPE_OPTIONS` right after the `header` entry:

```js
  {
    id: 'pageDescription',
    label: '상단 설명 글자',
    detail: '글자색, 굵기, 글자 크기, 자간',
  },
```

In `pageStyleAiResponseSchema.js`, add next to `NULLABLE_HEADER_SCHEMA`:

```js
const NULLABLE_DESCRIPTION_SCHEMA = nullableObject({
  colorHex: nullableHex(),
  letterSpacing: {
    type: ['string', 'null'],
    pattern: LETTER_SPACING_SCHEMA_PATTERN,
  },
  fontWeight: {
    type: ['number', 'null'],
    enum: [...FONT_WEIGHT_TOKENS, null],
  },
  fontSizeToken: nullableToken(PAGE_STYLE_DESCRIPTION_FONT_SIZE_TOKENS),
});
```

Import `PAGE_STYLE_DESCRIPTION_FONT_SIZE_TOKENS` from `../style/pageStyleModel`, add `description: NULLABLE_DESCRIPTION_SCHEMA` to `PAGE_STYLE_AI_SCHEMA.properties`, and add `'description'` to its `required` array.

In `pageStyleAiResponseNormalizer.js`, add:

```js
export function normalizeDescriptionIntent(rawDescription) {
  if (!rawDescription) return null;

  const intent = toRecognizedObject(rawDescription, ['colorHex']);

  if (typeof rawDescription.letterSpacing === 'string' && rawDescription.letterSpacing) {
    intent.letterSpacing = rawDescription.letterSpacing;
  }
  if (Number.isFinite(rawDescription.fontWeight)) {
    intent.fontWeight = rawDescription.fontWeight;
  }
  if (PAGE_STYLE_DESCRIPTION_FONT_SIZE_TOKENS.includes(rawDescription.fontSizeToken)) {
    intent.fontSizeToken = rawDescription.fontSizeToken;
  }

  return Object.keys(intent).length > 0 ? intent : null;
}
```

Add `description: 'description'` to `limitIntentToTargetScope`'s `scopedKeyByTarget` under key `pageDescription`:

```js
  const scopedKeyByTarget = {
    palette: 'palette',
    header: 'header',
    pageDescription: 'description',
    categoryChips: 'categoryChips',
    productCategoryChips: 'productCategoryChips',
    search: 'search',
  };
```

and add `description: normalizeDescriptionIntent(payload?.description)` to the object passed into it.

In `pageStyleCompiler.js`, add a resolver and a scope branch:

```js
function resolveDescription(intentDescription, previousDescription) {
  return {
    colorHex: intentDescription?.colorHex ?? previousDescription.colorHex,
    letterSpacing: intentDescription?.letterSpacing ?? previousDescription.letterSpacing,
    fontWeight: intentDescription?.fontWeight ?? previousDescription.fontWeight,
    fontSizeToken: intentDescription?.fontSizeToken ?? previousDescription.fontSizeToken,
  };
}
```

Add `description: resolveDescription(intent.description, previous.description)` to the no-scope branch, `description: previous.description` to every other existing branch, and add the new branch:

```js
  if (normalizedTargetScope === 'pageDescription') {
    return normalizePageStyle({
      palette: previous.palette,
      header: previous.header,
      description: resolveDescription(intent.description, previous.description),
      search: previous.search,
      categoryChips: previous.categoryChips,
      productCategoryChips: previous.productCategoryChips,
    });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageDescriptionAiScope.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Check the AI contract suite**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleAiContract.test.js src/features/storefront/__tests__/pageStyleCompiler.test.js
Expected: PASS. `pageStyleAiContract.test.js` walks the schema for strict-mode violations; a property missing from `required` fails there.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/model/page-design/ react-app/src/features/storefront/__tests__/
git commit -m "feat(storefront): let AI design style the page description"
```

---

## Task 8: AI 프롬프트 + 스코프 가이드

**Files:**
- Modify: `react-app/src/features/storefront/model/page-design/ai-request/pageStyleAiPrompt.js`
- Modify: `react-app/src/features/storefront/model/page-design/ai-request/pageDesignScopeGuide.js`
- Test: `react-app/src/features/storefront/__tests__/pageDesignScopeGuide.test.js` (modify)

**Interfaces:**
- Consumes: Task 7의 `pageDescription` 스코프 id
- Produces: `PAGE_DESIGN_SCOPE_GUIDES`에 `scopeId: 'pageDescription'` 항목

`pageDesignScopeGuide.test.js`는 이미 `title === option.label`을 검사한다. 새 가이드 항목의 title은 `상단 설명 글자`여야 한다.

- [ ] **Step 1: Write the failing test**

Append to `src/features/storefront/__tests__/pageDesignScopeGuide.test.js`, inside the existing `describe`:

```js
  it('tells the merchant the AI never rewrites their words', () => {
    expect(getPageDesignScopeGuide('pageDescription').note).toContain('문구');
  });
```

And create `src/features/storefront/__tests__/pageStylePromptTextGuard.test.js`:

```js
import { describe, expect, it } from 'vitest';

import { PAGE_STYLE_AI_OPENAI_SYSTEM_INSTRUCTIONS } from '../model/page-design/ai-request/pageStyleAiPrompt';

describe('page style prompt text guard', () => {
  const prompt = PAGE_STYLE_AI_OPENAI_SYSTEM_INSTRUCTIONS.join('\n');

  it('forbids rewriting the description as well as the title', () => {
    expect(prompt).toMatch(/never rewrite the title or description text/i);
  });

  it('describes what the description scope may change', () => {
    expect(prompt).toContain('description');
    expect(prompt).toMatch(/colorHex, letterSpacing, fontWeight, and fontSizeToken/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageDesignScopeGuide.test.js src/features/storefront/__tests__/pageStylePromptTextGuard.test.js`
Expected: FAIL — the guide entry and the prompt rule do not exist.

- [ ] **Step 3: Write the implementation**

In `pageStyleAiPrompt.js`, replace the header rule line:

```js
  'Header may only carry titleColorHex, letterSpacing, fontWeight, and titleFontSizeToken. Never rewrite the title text.',
```

with:

```js
  'Header may only carry titleColorHex, letterSpacing, fontWeight, and titleFontSizeToken.',
  'Description is the line under the page title. It may only carry colorHex, letterSpacing, fontWeight, and fontSizeToken.',
  'Never rewrite the title or description text. The merchant writes those words; you only style them.',
```

In `pageDesignScopeGuide.js`, add after the `header` guide:

```js
  {
    scopeId: 'pageDescription',
    title: '상단 설명 글자',
    rows: [
      { element: '글자색', example: '상단 설명을 연한 회색으로 해줘' },
      { element: '글자 크기', example: '상단 설명을 한 단계 작게 해줘' },
      { element: '굵기', example: '상단 설명을 조금 굵게 해줘' },
      { element: '자간', example: '상단 설명 자간을 넓혀줘' },
    ],
    note: '문구 자체는 표시항목 선택의 공통 요소 탭에서 적습니다. 여기서는 모양만 바꿉니다.',
  },
```

Also add a row to the `''` (공통 요소) guide so the all-scope table mentions it:

```js
      { element: '상단 설명', example: '상단 설명을 조금 작게 해줘' },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageDesignScopeGuide.test.js src/features/storefront/__tests__/pageStylePromptTextGuard.test.js`
Expected: PASS

- [ ] **Step 5: Full suite and build**

Run: `cd react-app && npx vitest run`
Expected: only the known 17 failures.

Run: `cd react-app && npx vite build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/model/page-design/ai-request/ react-app/src/features/storefront/__tests__/
git commit -m "feat(storefront): document the page description scope and guard its text"
```

---

## Task 9: 실제 화면 확인

**Files:** 없음 (검증 전용)

**Interfaces:**
- Consumes: Task 1-8 전부

- [ ] **Step 1: Start the dev server**

Use the preview tooling, not a shell command: `preview_start` with `{ name: "react-app" }` (defined in `.claude/launch.json`, port 5200).

- [ ] **Step 2: Check the public storefront is unchanged**

Open `http://localhost:5200/?tool=store&office=1234`. No login needed.

Expected: the hero shows the same title as before (`발안농협 영농센터 농자재 정보`), no description line, no eyebrow. Console errors: 0.

This is the regression that matters most — nobody has entered any copy yet, so the customer page must look exactly as it did.

- [ ] **Step 3: Enter copy in the builder**

Log in (the user does this — never enter credentials), open `AI 페이지 만들기` → `카테고리별 표시항목선택` → `공통 요소` tab.

Expected: 페이지 제목 input shows the derived title as its placeholder; 페이지 설명 input shows the example placeholder and an 예시문구 넣기 button.

Type a title and click the fill button, then check the preview updates live.

- [ ] **Step 4: Check a category tab**

Switch to a category tab.

Expected: 분류 설명 input plus the three field tables. Type a description and confirm it appears above that category's cards in the preview.

- [ ] **Step 5: Save and reload**

Click 저장하기, then reload the public storefront.

Expected: the title, description and category description all persist.

- [ ] **Step 6: Try the AI chip**

In `AI 페이지 디자인`, select the `상단 설명 글자` chip and ask for a smaller, fainter description.

Expected: the description restyles; **the text itself is unchanged**.

---

## Self-Review

**Spec coverage**

| 스펙 항목 | 태스크 |
| --- | --- |
| 결정 1 (h1 대체, eyebrow 제거) | Task 2 |
| 결정 2 (접미사 포함 기본값) | Task 2 |
| 결정 3 (빈 값 폴백) | Task 2 |
| 결정 4 (placeholder만) | Task 2, 5 |
| 결정 5 (카드 위 분류 설명) | Task 3, 4 |
| 결정 6 (AI 문구 변경 금지) | Task 7, 8 |
| 결정 7 (칩 6개) | Task 7, 8 |
| 결정 8 (분류 설명 AI 제외) | 어느 태스크도 추가하지 않음 — 의도적 |
| 스키마 (navConfig 재사용) | Task 2, 6 |
| 스키마 (pageStyle.description) | Task 1 |
| field-selection 공통 요소 탭 | Task 6 |
| 저장 경로 확장 | Task 3, 6 |
| 렌더 (히어로/분류) | Task 2, 4 |

**Type consistency**

- `pageStyle.description` 필드명은 Task 1에서 `colorHex / letterSpacing / fontWeight / fontSizeToken`으로 정하고 Task 7 스키마·노멀라이저·컴파일러가 같은 이름을 쓴다. 제목의 `titleColorHex` / `titleFontSizeToken`과 이름이 다른 것은 의도적이다 — 설명문 절 안에서는 `title` 접두사가 무의미하다.
- 스코프 id는 전 구간 `pageDescription`. 스타일 절 키는 `description`. 둘을 잇는 곳은 `limitIntentToTargetScope`의 `scopedKeyByTarget` 하나뿐이다.
- `textDraft` 필드 id(`pageTitle` / `pageDescription` / `categoryDescription`)는 Task 5의 `field.id`, Task 6의 `setTextDraft` 인자와 같다.

**남은 위험**

- Task 6이 `StorefrontBuilderPage.test.jsx`의 데이터 모드 테스트를 건드릴 수 있다. 탭 첫 항목이 `공통 요소`로 바뀌므로, 표시항목 표를 바로 찾는 테스트는 분류 탭을 먼저 눌러야 한다. Task 6 Step 6에서 처리한다.
- Task 2가 `coopName` / `headerOrgLine` / `subtitle`을 제거한다. 이 이름을 참조하는 테스트가 있으면 Task 2 Step 5에서 고친다.
