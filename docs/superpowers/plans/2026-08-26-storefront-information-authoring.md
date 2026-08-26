# 안내 문구 작성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 판매자가 안내 항목을 여러 개 만들고, 설명 안에서 `<<제목>>` 과 `[[중요]]` 로 특정 문구를 강조할 수 있게 한다.

**Architecture:** 순수 파서(`informationTextModel`)가 문자열을 `{ text, style }` 조각으로 쪼개고, 얇은 렌더 컴포넌트(`InformationText`)가 그것을 `<strong>`/`<span>` 으로 그린다. `innerHTML` 은 쓰지 않는다. 빌더는 단일 문자열 입력을 항목 배열 입력으로 바꾸고, 그 행 안에 마커 삽입 버튼과 상시 설명을 단다.

**Tech Stack:** React 19, Vite 8, vitest 4, CSS Modules, `@testing-library/react`

**Spec:** `docs/superpowers/specs/2026-08-26-storefront-information-authoring-design.md`

## Global Constraints

- 테스트 명령: `cd react-app && npx vitest run <path>`. 전체는 `npx vitest run src/features/storefront`.
- 시작 시점 storefront 스위트가 몇 개 통과하는지 Task 1 에서 먼저 기록하고, 이후 태스크는 **새 실패를 만들지 않는다.**
- `AppLayout.test.jsx`, `PublicStorefrontQrCard.test.jsx`, `excelExtractWorkbookReviewPage.test.jsx`, `excelExtractWorkbookReviewTable.test.jsx` 는 이 브랜치 밖의 이유로 실패한다. 무시한다.
- `StorefrontBuilderPage.test.jsx` 는 병렬 부하에서 흔들린다. 실패하면 단독 재실행 후 판단한다.
- **고객용 스토어프론트 CSS 는 하드코딩 hex.** `--corp-*` 토큰은 관리자(빌더) 화면 전용이다.
- 한국어 텍스트에는 `word-break: keep-all`. **그라디언트 금지.**
- `git add -A` 금지. 실제로 고친 경로만 stage 한다.
- 항목 상한은 기존 `MAX_INFORMATION_ENTRIES = 10` 을 그대로 쓴다.
- 강조는 `description` 에만 적용한다. `label` 은 마커를 해석하지 않는다.
- 중요 색은 고정 `#c62828`, 제목은 `#2f4a39` + `font-size: 1.08em`.

---

### Task 1: 강조 마커 파서

**Files:**
- Create: `react-app/src/features/storefront/model/storefront-view/informationTextModel.js`
- Test: `react-app/src/features/storefront/__tests__/informationTextModel.test.js` (create)

**Interfaces:**
- Consumes: 없음 (순수 모델)
- Produces: `parseInformationText(text) -> Array<{ text: string, style: 'plain' | 'heading' | 'important' }>`

- [ ] **Step 1: Record the baseline**

Run: `cd react-app && npx vitest run src/features/storefront`
Write the passing/failing counts into your report. Every later task compares against this.

- [ ] **Step 2: Write the failing test**

Create `react-app/src/features/storefront/__tests__/informationTextModel.test.js`:

```js
import { describe, expect, it } from 'vitest';

import { parseInformationText } from '../model/storefront-view/informationTextModel';

describe('parseInformationText', () => {
  it('returns one plain segment for text with no markers', () => {
    expect(parseInformationText('영세가격 안내입니다')).toEqual([
      { text: '영세가격 안내입니다', style: 'plain' },
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseInformationText('')).toEqual([]);
    expect(parseInformationText(null)).toEqual([]);
    expect(parseInformationText(undefined)).toEqual([]);
    expect(parseInformationText(42)).toEqual([]);
  });

  it('reads a doubled angle pair as a heading', () => {
    expect(parseInformationText('<<봄철 밑거름>>')).toEqual([
      { text: '봄철 밑거름', style: 'heading' },
    ]);
  });

  it('reads a doubled square pair as important', () => {
    expect(parseInformationText('[[영세가격]]')).toEqual([
      { text: '영세가격', style: 'important' },
    ]);
  });

  it('keeps the text around a marker as plain segments', () => {
    expect(parseInformationText('가격은 [[영세가격]]만 해당합니다')).toEqual([
      { text: '가격은 ', style: 'plain' },
      { text: '영세가격', style: 'important' },
      { text: '만 해당합니다', style: 'plain' },
    ]);
  });

  it('leaves single brackets alone — merchants already write those', () => {
    expect(parseInformationText('[비료] 관련 안내입니다')).toEqual([
      { text: '[비료] 관련 안내입니다', style: 'plain' },
    ]);
    expect(parseInformationText('<20kg> 기준입니다')).toEqual([
      { text: '<20kg> 기준입니다', style: 'plain' },
    ]);
  });

  it('leaves an unclosed marker as plain text, swallowing nothing', () => {
    expect(parseInformationText('[[영세가격은 등록자 전용')).toEqual([
      { text: '[[영세가격은 등록자 전용', style: 'plain' },
    ]);
    expect(parseInformationText('<<봄철 밑거름')).toEqual([
      { text: '<<봄철 밑거름', style: 'plain' },
    ]);
  });

  it('does not nest — the inner marker stays literal', () => {
    expect(parseInformationText('<<[[가격]]>>')).toEqual([
      { text: '[[가격]]', style: 'heading' },
    ]);
  });

  it('leaves an empty marker as plain text rather than making an empty element', () => {
    expect(parseInformationText('[[]]')).toEqual([
      { text: '[[]]', style: 'plain' },
    ]);
    expect(parseInformationText('<<>>')).toEqual([
      { text: '<<>>', style: 'plain' },
    ]);
  });

  it('keeps newlines inside a segment', () => {
    expect(parseInformationText('첫째 줄\n둘째 줄')).toEqual([
      { text: '첫째 줄\n둘째 줄', style: 'plain' },
    ]);
    expect(parseInformationText('[[첫째\n둘째]]')).toEqual([
      { text: '첫째\n둘째', style: 'important' },
    ]);
  });

  it('handles both marker kinds in one string', () => {
    expect(
      parseInformationText('<<봄철>> 안내\n[[영세가격]]은 등록자 전용'),
    ).toEqual([
      { text: '봄철', style: 'heading' },
      { text: ' 안내\n', style: 'plain' },
      { text: '영세가격', style: 'important' },
      { text: '은 등록자 전용', style: 'plain' },
    ]);
  });

  it('takes the first pair that closes when markers interleave', () => {
    expect(parseInformationText('[[가격<<주의]]기타>>')).toEqual([
      { text: '가격<<주의', style: 'important' },
      { text: '기타>>', style: 'plain' },
    ]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/informationTextModel.test.js`
Expected: FAIL — `Failed to resolve import .../informationTextModel`

- [ ] **Step 4: Write the implementation**

Create `react-app/src/features/storefront/model/storefront-view/informationTextModel.js`:

```js
/**
 * 판매자가 안내 설명에 쓰는 강조 규칙. 기호를 두 번 겹쳐야 하는 이유는
 * `[비료]` `[신규]` 같은 홑대괄호 표기가 이 프로젝트 문구에 이미 쓰이고 있어,
 * 홑기호를 마커로 삼으면 평범하게 쓴 라벨이 갑자기 강조되기 때문이다.
 */
const MARKERS = [
  { open: '<<', close: '>>', style: 'heading' },
  { open: '[[', close: ']]', style: 'important' },
];

function findNextMarker(text, fromIndex) {
  let best = null;

  for (const marker of MARKERS) {
    const openAt = text.indexOf(marker.open, fromIndex);

    if (openAt === -1) {
      continue;
    }

    const closeAt = text.indexOf(marker.close, openAt + marker.open.length);

    // 닫히지 않은 여는 기호는 마커가 아니다. 뒷글자를 삼키지 않기 위해
    // 후보로 올리지 않고 평문으로 흘려보낸다.
    if (closeAt === -1) {
      continue;
    }

    // 빈 마커는 강조할 글자가 없으므로 평문으로 둔다. 빈 <strong> 을 만들지 않는다.
    if (closeAt === openAt + marker.open.length) {
      continue;
    }

    if (best === null || openAt < best.openAt) {
      best = { marker, openAt, closeAt };
    }
  }

  return best;
}

export function parseInformationText(text) {
  if (typeof text !== 'string' || text === '') {
    return [];
  }

  const segments = [];
  let cursor = 0;

  while (cursor < text.length) {
    const found = findNextMarker(text, cursor);

    if (found === null) {
      break;
    }

    if (found.openAt > cursor) {
      segments.push({ text: text.slice(cursor, found.openAt), style: 'plain' });
    }

    segments.push({
      text: text.slice(found.openAt + found.marker.open.length, found.closeAt),
      style: found.marker.style,
    });

    cursor = found.closeAt + found.marker.close.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), style: 'plain' });
  }

  return segments;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/informationTextModel.test.js`
Expected: PASS (12 tests)

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/model/storefront-view/informationTextModel.js react-app/src/features/storefront/__tests__/informationTextModel.test.js
git commit -m "feat(storefront): parse the information emphasis markers"
```

---

### Task 2: 강조 렌더 컴포넌트

**Files:**
- Create: `react-app/src/features/storefront/components/storefront-page/category-nav/InformationText.jsx`
- Create: `react-app/src/features/storefront/components/storefront-page/category-nav/InformationText.module.css`
- Test: `react-app/src/features/storefront/__tests__/InformationText.test.jsx` (create)

**Interfaces:**
- Consumes: Task 1 의 `parseInformationText`
- Produces: `<InformationText text={string} />` — default export

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/InformationText.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import InformationText from '../components/storefront-page/category-nav/InformationText';

describe('InformationText', () => {
  it('renders plain text without wrapping it in an emphasis element', () => {
    const { container } = render(<InformationText text="영세가격 안내입니다" />);

    expect(container.textContent).toBe('영세가격 안내입니다');
    expect(container.querySelector('strong')).toBeNull();
  });

  it('wraps a heading marker in its own element', () => {
    render(<InformationText text="<<봄철 밑거름>>" />);

    const heading = screen.getByTestId('information-text-heading');

    expect(heading.textContent).toBe('봄철 밑거름');
    expect(heading.tagName).toBe('STRONG');
  });

  it('wraps an important marker in its own element', () => {
    render(<InformationText text="[[영세가격]]" />);

    const important = screen.getByTestId('information-text-important');

    expect(important.textContent).toBe('영세가격');
    expect(important.tagName).toBe('STRONG');
  });

  it('keeps the surrounding text outside the emphasis element', () => {
    const { container } = render(
      <InformationText text="가격은 [[영세가격]]만 해당합니다" />,
    );

    expect(container.textContent).toBe('가격은 영세가격만 해당합니다');
    expect(screen.getByTestId('information-text-important').textContent).toBe(
      '영세가격',
    );
  });

  it('never interprets the merchant text as markup', () => {
    const { container } = render(
      <InformationText text="<script>alert(1)</script>" />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toBe('<script>alert(1)</script>');
  });

  it('renders nothing for empty text', () => {
    const { container } = render(<InformationText text="" />);

    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/InformationText.test.jsx`
Expected: FAIL — `Failed to resolve import .../InformationText`

- [ ] **Step 3: Write the component**

Create `react-app/src/features/storefront/components/storefront-page/category-nav/InformationText.jsx`:

```jsx
import { parseInformationText } from '../../../model/storefront-view/informationTextModel';
import styles from './InformationText.module.css';

const SEGMENT_CLASS_NAMES = {
  heading: styles.heading,
  important: styles.important,
};

const SEGMENT_TEST_IDS = {
  heading: 'information-text-heading',
  important: 'information-text-important',
};

/**
 * 판매자가 쓴 안내 문구를 강조 규칙대로 그린다. 조각을 React 요소로 만들 뿐
 * innerHTML 을 쓰지 않으므로, 판매자가 무엇을 적든 태그로 해석되지 않는다.
 */
export default function InformationText({ text }) {
  const segments = parseInformationText(text);

  if (segments.length === 0) {
    return null;
  }

  return segments.map((segment, index) =>
    segment.style === 'plain' ? (
      // 조각은 순서로만 식별된다. 같은 글자가 반복될 수 있어 text 는 key 가 될 수 없다.
      // eslint-disable-next-line react/no-array-index-key
      <span key={index}>{segment.text}</span>
    ) : (
      <strong
        // eslint-disable-next-line react/no-array-index-key
        key={index}
        className={SEGMENT_CLASS_NAMES[segment.style]}
        data-testid={SEGMENT_TEST_IDS[segment.style]}
      >
        {segment.text}
      </strong>
    ),
  );
}
```

- [ ] **Step 4: Write the stylesheet**

Create `react-app/src/features/storefront/components/storefront-page/category-nav/InformationText.module.css`:

```css
/* 고객용 화면이므로 --corp-* 토큰이 아니라 하드코딩 hex 를 쓴다. */

/* em 을 쓰는 이유는 설명 본문 크기가 바뀌어도 비율이 따라오게 하기 위해서다. */
.heading {
  font-weight: 700;
  font-size: 1.08em;
  color: #2f4a39;
}

/* 브랜드 색을 따르면 초록 테마에서 "중요"가 초록이 되어 의미가 사라진다.
   그래서 고정 hex. 패널 배경(거의 흰색) 위에서 대비 5.36:1 로 AA 를 통과한다. */
.important {
  font-weight: 700;
  color: #c62828;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/InformationText.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/components/storefront-page/category-nav/InformationText.jsx react-app/src/features/storefront/components/storefront-page/category-nav/InformationText.module.css react-app/src/features/storefront/__tests__/InformationText.test.jsx
git commit -m "feat(storefront): render the information emphasis markers"
```

---

### Task 3: 두 패널에 강조 적용

**Files:**
- Modify: `react-app/src/features/storefront/components/storefront-page/category-nav/OfficeInformationPanel.jsx`
- Modify: `react-app/src/features/storefront/components/storefront-page/category-nav/CategoryInformationPanel.jsx`
- Test: `react-app/src/features/storefront/__tests__/informationPanelEmphasis.test.jsx` (create)

**Interfaces:**
- Consumes: Task 2 의 `<InformationText text={string} />`
- Produces: 두 패널이 `entry.description` 을 `InformationText` 로 그린다

두 파일 모두 지금 `<dd className={styles.entryDescription}>{entry.description}</dd>` 로 그린다. `{entry.description}` 자리를 `<InformationText text={entry.description} />` 로 바꾼다. `entry.label` 은 **건드리지 않는다** — 라벨은 마커를 해석하지 않는다.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/informationPanelEmphasis.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import OfficeInformationPanel from '../components/storefront-page/category-nav/OfficeInformationPanel';
import CategoryInformationPanel from '../components/storefront-page/category-nav/CategoryInformationPanel';

describe('information panel emphasis', () => {
  it('emphasises marked text in the office panel', () => {
    render(
      <OfficeInformationPanel
        entries={[
          { id: 'o1', label: '가격 안내', description: '[[영세가격]]은 등록자 전용' },
        ]}
      />,
    );

    expect(screen.getByTestId('information-text-important').textContent).toBe(
      '영세가격',
    );
  });

  it('emphasises marked text in the category panel', () => {
    render(
      <CategoryInformationPanel
        categoryName="비료"
        entries={[
          { id: 'c1', label: '', description: '<<봄철 밑거름>> 안내입니다' },
        ]}
      />,
    );

    expect(screen.getByTestId('information-text-heading').textContent).toBe(
      '봄철 밑거름',
    );
  });

  it('leaves the label alone — markers there stay literal', () => {
    render(
      <OfficeInformationPanel
        entries={[{ id: 'o1', label: '[[가격]]', description: '본문' }]}
      />,
    );

    expect(screen.getByText('[[가격]]')).toBeInTheDocument();
    expect(
      screen.queryByTestId('information-text-important'),
    ).not.toBeInTheDocument();
  });

  it('still renders ordinary text unchanged', () => {
    render(
      <OfficeInformationPanel
        entries={[{ id: 'o1', label: '', description: '[비료] 관련 안내입니다' }]}
      />,
    );

    expect(screen.getByText('[비료] 관련 안내입니다')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/informationPanelEmphasis.test.jsx`
Expected: FAIL — `Unable to find an element by: [data-testid="information-text-important"]`

- [ ] **Step 3: Wire both panels**

In BOTH files add the import beside the styles import:

```jsx
import InformationText from './InformationText';
```

In `OfficeInformationPanel.jsx`, replace the description line inside `InformationEntryList`:

```jsx
          {entry.description ? (
            <dd className={styles.entryDescription}>
              <InformationText text={entry.description} />
            </dd>
          ) : null}
```

In `CategoryInformationPanel.jsx`, replace the equivalent line:

```jsx
            {entry.description ? (
              <dd className={styles.entryDescription}>
                <InformationText text={entry.description} />
              </dd>
            ) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/informationPanelEmphasis.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the storefront suite**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: no new failures against the Task 1 baseline. Tests that assert a description with `getByText('전체 문장')` still pass, because the segments are all inside one `<dd>` and testing-library matches across child elements for a single text node — but a description containing markers will now split into several nodes, so any test asserting such a string needs `{ exact: false }` or a testid. Fix by targeting the segment testids, not by removing the assertion.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/components/storefront-page/category-nav/OfficeInformationPanel.jsx react-app/src/features/storefront/components/storefront-page/category-nav/CategoryInformationPanel.jsx react-app/src/features/storefront/__tests__/informationPanelEmphasis.test.jsx
git commit -m "feat(storefront): emphasise marked text in the information panels"
```

---

### Task 4: 반복 입력 컴포넌트 + 삽입 버튼 + 설명

**Files:**
- Create: `react-app/src/features/storefront/components/builder-workspace/field-selection/InformationEntryFields.jsx`
- Modify: `react-app/src/features/storefront/components/builder-workspace/field-selection/FieldSelectionDock.module.css`
- Test: `react-app/src/features/storefront/__tests__/InformationEntryFields.test.jsx` (create)

**Interfaces:**
- Consumes: `MAX_INFORMATION_ENTRIES`, `createInformationEntry` from `model/storefront-config/informationEntriesModel.js`
- Produces: `<InformationEntryFields legend entries onChange descriptionPlaceholder />` — named export. `onChange(nextEntries)` always receives the whole array.

**빌더(관리자) 화면이므로 CSS 는 `--corp-*` 토큰을 쓴다.** CSS 는 기존 `FieldSelectionDock.module.css` 끝에 **덧붙인다.**

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
      legend="사무소 안내"
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

  it('explains both rules where the merchant can see them without hovering', () => {
    render(<Stateful />);

    const help = screen.getByTestId('information-entry-help');

    expect(help.textContent).toContain('<< >>');
    expect(help.textContent).toContain('제목');
    expect(help.textContent).toContain('[[ ]]');
    expect(help.textContent).toContain('중요');
  });

  it('reports an edited label as a whole array', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <InformationEntryFields
        legend="사무소 안내"
        entries={[{ id: 'a', label: '', description: '' }]}
        onChange={onChange}
      />,
    );

    await user.type(screen.getByLabelText('라벨'), '영');

    expect(onChange).toHaveBeenCalledWith([
      { id: 'a', label: '영', description: '' },
    ]);
  });

  it('wraps the selected description text when the 중요 button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Stateful initialEntries={[{ id: 'a', label: '', description: '영세가격 안내' }]} />,
    );

    const description = screen.getByLabelText('설명');

    description.setSelectionRange(0, 4);
    await user.click(screen.getByRole('button', { name: '중요' }));

    expect(description).toHaveValue('[[영세가격]] 안내');
  });

  it('wraps the selected description text when the 제목 button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Stateful initialEntries={[{ id: 'a', label: '', description: '봄철 안내' }]} />,
    );

    const description = screen.getByLabelText('설명');

    description.setSelectionRange(0, 2);
    await user.click(screen.getByRole('button', { name: '제목' }));

    expect(description).toHaveValue('<<봄철>> 안내');
  });

  it('inserts an empty pair when nothing is selected', async () => {
    const user = userEvent.setup();

    render(<Stateful initialEntries={[{ id: 'a', label: '', description: '' }]} />);

    await user.click(screen.getByRole('button', { name: '중요' }));

    expect(screen.getByLabelText('설명')).toHaveValue('[[]]');
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
import { useId, useRef } from 'react';

import {
  MAX_INFORMATION_ENTRIES,
  createInformationEntry,
} from '../../../model/storefront-config/informationEntriesModel';
import styles from './FieldSelectionDock.module.css';

const EMPHASIS_BUTTONS = [
  { id: 'heading', label: '제목', open: '<<', close: '>>' },
  { id: 'important', label: '중요', open: '[[', close: ']]' },
];

/**
 * 안내 항목을 추가·삭제하는 반복 입력. 단일 문자열을 받는 StorefrontTextFields 와
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
  const descriptionRefs = useRef(new Map());
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

  // 판매자가 기호를 외워서 타이핑할 이유가 없어야 한다. 선택 영역을 감싸고,
  // 선택이 없으면 빈 쌍을 넣은 뒤 커서를 가운데로 옮긴다.
  function wrapSelection(entry, marker) {
    const field = descriptionRefs.current.get(entry.id);

    if (!field) {
      return;
    }

    const start = field.selectionStart ?? entry.description.length;
    const end = field.selectionEnd ?? entry.description.length;
    const selected = entry.description.slice(start, end);
    const nextValue =
      entry.description.slice(0, start) +
      marker.open +
      selected +
      marker.close +
      entry.description.slice(end);

    updateEntry(entry.id, 'description', nextValue);

    const caret = start + marker.open.length + selected.length;

    // 값이 반영된 뒤에 커서를 놓아야 한다. 같은 틱에 두면 리렌더가 덮어쓴다.
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(caret, caret);
    });
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
              <div className={styles.entryDescriptionCell}>
                <textarea
                  id={descriptionId}
                  ref={(node) => {
                    if (node) {
                      descriptionRefs.current.set(entry.id, node);
                    } else {
                      descriptionRefs.current.delete(entry.id);
                    }
                  }}
                  className={`${styles.textFieldInput} ${styles.textFieldTextarea}`}
                  value={entry.description}
                  placeholder={descriptionPlaceholder}
                  rows={3}
                  onChange={(event) =>
                    updateEntry(entry.id, 'description', event.target.value)
                  }
                />

                <div className={styles.entryEmphasisRow}>
                  {EMPHASIS_BUTTONS.map((marker) => (
                    <button
                      key={marker.id}
                      type="button"
                      className={styles.entryEmphasisButton}
                      onClick={() => wrapSelection(entry, marker)}
                    >
                      {marker.label}
                    </button>
                  ))}
                </div>
              </div>
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

      <p className={styles.entryHelp} data-testid="information-entry-help">
        글자를 선택하고 버튼을 누르면 표시됩니다. {'<< >>'} 는 제목, {'[[ ]]'} 는
        중요로 보입니다. {'[비료]'} 처럼 하나만 쓴 괄호는 그대로 나옵니다.
      </p>

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
  align-items: start;
  gap: 8px 10px;
  flex: 1 1 auto;
  min-width: 0;
}

.entryFieldLabel {
  padding-top: 8px;
  color: var(--corp-muted);
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  word-break: keep-all;
}

.entryDescriptionCell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.entryEmphasisRow {
  display: flex;
  gap: 6px;
}

.entryEmphasisButton {
  padding: 4px 10px;
  border: 1px solid var(--corp-line-strong);
  border-radius: var(--corp-radius);
  background: transparent;
  color: var(--corp-text);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  word-break: keep-all;
}

.entryEmphasisButton:hover {
  border-color: var(--corp-focus);
  background: var(--corp-panel-strong, transparent);
}

/* 툴팁이 아니라 상시 노출한다. 판매자는 hover 하지 않는다. */
.entryHelp {
  margin: 0;
  color: var(--corp-muted);
  font-size: 0.74rem;
  line-height: 1.6;
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
Expected: PASS (10 tests)

If the two `wrapSelection` tests fail because `requestAnimationFrame` does not run in jsdom, the assertion on the textarea VALUE still holds — the caret move is the only part inside the callback. Do not move the value update into the callback to make a test pass.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/pigeg/OneDrive/Desktop/AI 경진대회"
git add react-app/src/features/storefront/components/builder-workspace/field-selection/InformationEntryFields.jsx react-app/src/features/storefront/components/builder-workspace/field-selection/FieldSelectionDock.module.css react-app/src/features/storefront/__tests__/InformationEntryFields.test.jsx
git commit -m "feat(storefront): add the repeatable information entry input"
```

---

### Task 5: 빌더 배선

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/components/builder-workspace/field-selection/FieldSelectionDock.jsx`
- Test: `react-app/src/features/storefront/__tests__/fieldSelectionCommonTab.test.jsx` (modify)

**Interfaces:**
- Consumes: Task 4 의 `InformationEntryFields`; `normalizeInformationEntries` from `model/storefront-config/informationEntriesModel.js`; `buildStorefrontSavePayload({ officeInfoEntries, categoryInfoEntries })` from `model/storefront-config/storefrontBuilderModel.js`
- Produces (`dataMode`):
  - `officeInfoEntries: Array<Entry>`, `setOfficeInfoEntries(nextEntries)`
  - `categoryInfoEntries: Array<Entry>`, `setCategoryInfoEntries(nextEntries)`

`textDraft.pageDescription` 과 `textDraft.categoryDescription` 을 제거한다. `textDraft.pageTitle` 만 남는다.

- [ ] **Step 1: Write the failing test**

In `fieldSelectionCommonTab.test.jsx`, replace `buildDataMode`'s text fields with:

```js
    textDraft: { pageTitle: '' },
    setTextDraft: vi.fn(),
    officeInfoEntries: [],
    setOfficeInfoEntries: vi.fn(),
    categoryInfoEntries: [],
    setCategoryInfoEntries: vi.fn(),
```

Delete any existing test that asserts on `페이지 설명` or `분류 설명`, and add:

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

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/fieldSelectionCommonTab.test.jsx`
Expected: FAIL — `Unable to find a label with the text of: 라벨`

- [ ] **Step 3: Rework `useStorefrontBuilder.js`**

Add the import beside the other model imports:

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

`hydratePageTextDraft` keeps only the title and hydrates the office entries:

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
    const categoryRow = findCategoryConfigRow(
      nextExistingConfig?.categoryConfigs,
      resolvedCategoryName,
    );

    setCategoryInfoEntries(
      normalizeInformationEntries(categoryRow?.categoryConfig?.info, {
        legacyText: categoryRow?.categoryConfig?.description,
      }),
    );
```

`draftNavConfig` loses its subtitle override — the office entries carry that copy now:

```js
  const draftNavConfig = {
    ...navConfig,
    title: textDraft.pageTitle,
  };
```

In `buildCurrentSavePayload` AND `buildPreviewConfig`, replace whatever passes the old description strings with:

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

Add the import beside the `StorefrontTextFields` import, and drop `PAGE_DESCRIPTION_PLACEHOLDER` if it becomes unused:

```jsx
import { InformationEntryFields } from './InformationEntryFields';
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

`StorefrontBuilderPage.test.jsx` asserts on `페이지 설명` and on the preview's page description — replace those with the office-entry equivalents. `StorefrontTextFields.test.jsx` still covers that component's own behaviour; keep it and its `multiline` branch, since the page title is still a live caller. Expected: no new failures against the Task 1 baseline.

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

### Task 6: 실제 화면 확인

**Files:** 없음 (검증 전용)

**Interfaces:**
- Consumes: Task 1-5 전부

- [ ] **Step 1: Start the dev server**

Use the preview tooling, not a shell command: `preview_start` with `{ name: "react-app" }`.

- [ ] **Step 2: Check the public storefront**

Open `http://localhost:<port>/?tool=store&office=1234`. No login needed.

Expected: `안내` 칩이 보이고, 누르면 `사무소 안내` 자식 탭이 뜬다. 저장된 옛 문구가 항목 하나로 나온다. 콘솔 에러 0.

- [ ] **Step 3: Check the markers render**

In the browser console, confirm the emphasis elements exist once a marked description is saved (Step 5). Before that, verify the parser is wired by checking that a description containing `[[` shows no literal `[[` on screen.

- [ ] **Step 4: Check mobile**

`resize_window` preset `mobile`. `document.documentElement.scrollWidth > innerWidth` must be false.

- [ ] **Step 5: Check the builder**

After the user logs in: `AI 페이지 만들기` → `카테고리별 표시항목선택` → `공통 요소` 탭.

Expected: `사무소 안내` 아래에 라벨/설명 행, `제목` `중요` 버튼, 그리고 규칙 설명 한 줄이 **항상 보인다.** 설명에 글자를 선택하고 `중요` 를 누르면 `[[ ]]` 가 감싸진다. 항목을 2개 만들고 저장한 뒤 공개 화면에서 둘 다 나오고 강조가 적용되는지 확인한다.

- [ ] **Step 6: Check a single bracket survives**

설명에 `[비료] 관련 안내입니다` 를 넣고 저장한다. 공개 화면에 **대괄호가 그대로** 보이고 빨갛지 않아야 한다.

---

## Self-Review

**1. Spec coverage**

| 스펙 항목 | 태스크 |
| --- | --- |
| 결정 1 (빌더가 항목 배열 편집) | Task 4, 5 |
| 결정 2 (규칙 2개) | Task 1 |
| 결정 3 (기호 겹치기) | Task 1 |
| 결정 4 (`description` 에만, `label` 제외) | Task 3 |
| 결정 5 (조각 배열 + `<strong>`, `innerHTML` 금지) | Task 1, 2 |
| 결정 6 (고정 hex) | Task 2 |
| 결정 7 (삽입 버튼 + 상시 설명) | Task 4 |
| 결정 8 (재정렬 없음, 상한 10) | Task 4 |
| 파서 계약 5개 규칙 | Task 1 |
| 스타일 값 | Task 2 |
| 브라우저 검증 | Task 6 |

**2. Placeholder scan** — "적절히", "TBD", "필요시" 없음. 모든 코드 단계에 실제 코드가 있다.

**3. Type consistency**

- 조각 모양은 전 구간 `{ text, style }`, `style` 값은 `'plain' | 'heading' | 'important'`.
- 항목 모양은 전 구간 `{ id, label, description }` (기존 `informationEntriesModel` 과 동일).
- 저장 파라미터 이름은 `officeInfoEntries` / `categoryInfoEntries` — 이미 `buildStorefrontSavePayload` 가 받는 이름이다.
- `InformationText` 는 default export, `InformationEntryFields` 는 named export (`StorefrontTextFields` 와 같은 관례).
- testid: `information-text-heading` / `information-text-important` / `information-entry-help`.

**남은 위험**

- Task 3 이후 설명을 통짜 문자열로 단언하던 기존 테스트가 깨질 수 있다. 마커가 없는 문자열은 조각이 1개라 그대로 통과하지만, 마커가 들어간 픽스처가 있으면 노드가 쪼개진다. Task 3 Step 5 에서 전체 스위트로 확인한다.
- Task 4 의 `wrapSelection` 은 `requestAnimationFrame` 을 쓴다. jsdom 에서 콜백이 안 돌아도 textarea 값 단언은 통과한다. 값 갱신을 콜백 안으로 옮겨 테스트를 통과시키지 말 것 — 그러면 실제 입력이 한 프레임 늦어진다.
- Task 5 는 `useStorefrontBuilder.js` 의 여러 곳을 건드린다. `buildCurrentSavePayload` 와 `buildPreviewConfig` 를 **둘 다** 고쳐야 미리보기와 저장이 어긋나지 않는다.
