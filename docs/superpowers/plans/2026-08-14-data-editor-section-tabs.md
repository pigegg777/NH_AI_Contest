# DataEditorSection 탭 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DataEditorSection`을 "엑셀 업로드" / "AI 분석" 두 개의 탭으로 분리하고, 각 탭 내부를 좌/우 2-column으로 재구성하며 드래그 앤 드롭 업로드와 로직 없는 자연어 입력 UI를 추가한다.

**Architecture:** 새 `TabBar` 컴포넌트(로컬 `useState` 기반, 외부 라이브러리 없음)를 `DataEditorSection`이 소유하고, 활성 탭에 따라 기존 `ExcelUploadPanel` 또는 `WorkbookAiRecommendationPanel`을 조건부로 렌더링한다. 두 패널은 각각 내부에 `.tabColumns` 2-column grid를 갖도록 재구성되며, 데이터는 계속 `editorContexts`의 컨텍스트에서 흘러온다 (탭 전환 시 언마운트되어도 유실되지 않음).

**Tech Stack:** React 18 (함수형 컴포넌트 + hooks), CSS Modules, Vitest + @testing-library/react + @testing-library/user-event(불필요 시 `fireEvent`로 대체), jsdom.

## Global Constraints

- 상세 시각 스타일(색상, 카드 형태, 타이포그래피)은 현재 디자인 토큰(`--corp-*` 변수)과 기존 CSS 클래스를 재사용하고 새로 만들지 않는다.
- 탭 구현에 외부 라이브러리를 추가하지 않는다 — 커스텀 `useState` 기반으로 구현한다.
- 자연어 입력창은 로컬 state(`promptDraft`)만 가지며, `onAiAnalyze` 호출이나 백엔드로의 전달 로직을 추가하지 않는다.
- 드래그 앤 드롭은 기존 `onWorkbookChange` 파이프라인을 그대로 재사용한다 — 새로운 파일 검증 로직을 추가하지 않는다.
- 반응형: 760px 이하에서 각 탭 내부 2-column은 1-column으로 무너진다.
- 파일 경고(FileWarningsPanel)와 행 경고(WarningRowsPanel)는 오른쪽 컬럼에, "AI 분석하기" 버튼은 입력창과 무관하게 독립 동작한다.

---

## File Structure

| 파일 | 변경 | 책임 |
|---|---|---|
| `react-app/src/features/office-product-editor/components/data-edit-controls/TabBar.jsx` | 생성 | 탭 버튼 목록 렌더링, 활성 탭 표시, 클릭 시 `onTabChange` 호출 |
| `react-app/src/features/office-product-editor/components/data-edit-controls/TabBar.module.css` | 생성 | 탭 바 스타일 |
| `react-app/src/features/office-product-editor/components/data-edit-controls/ExcelUploadPanel.jsx` | 수정 | 좌(업로드+드롭존)/우(경고) 2-column 재구성, `DropzoneArea` 추가 |
| `react-app/src/features/office-product-editor/components/data-edit-controls/ExcelUploadSection.module.css` | 수정 | `.tabColumns`, `.tabColumnLeft/Right`, `.dropzone` 스타일 추가 |
| `react-app/src/features/office-product-editor/components/data-edit-controls/WorkbookAiRecommendationPanel.jsx` | 수정 | 좌(입력창+버튼)/우(결과) 2-column 재구성, `NaturalLanguagePromptInput` 추가 |
| `react-app/src/features/office-product-editor/components/data-edit-controls/WorkbookAiRecommendationPanel.module.css` | 수정 | `.tabColumns`, `.tabColumnLeft/Right`, `.promptBlock/.promptLabel/.promptInput` 스타일 추가 |
| `react-app/src/features/office-product-editor/components/DataEditorSection.jsx` | 수정 | 탭 상태 소유, `TabBar` + 활성 패널 렌더링 |
| `react-app/src/features/office-product-editor/components/DataEditorSection.module.css` | 수정 | 기존 `.controlBar`/`.controlColWide`/`.uploadSection` 제거, `.tabPanelWrap`/`.tabPanel` 추가 |
| `react-app/src/features/office-product-editor/__tests__/TabBar.test.jsx` | 생성 | TabBar 단위 테스트 |
| `react-app/src/features/office-product-editor/__tests__/ExcelUploadPanel.test.jsx` | 생성 | 레이아웃 + 드롭존 테스트 |
| `react-app/src/features/office-product-editor/__tests__/WorkbookAiRecommendationPanel.test.jsx` | 생성 | 레이아웃 + 입력창 독립성 테스트 |
| `react-app/src/features/office-product-editor/__tests__/DataEditorSection.test.jsx` | 생성 | 탭 전환 통합 테스트 |

---

### Task 1: TabBar 컴포넌트

**Files:**
- Create: `react-app/src/features/office-product-editor/components/data-edit-controls/TabBar.jsx`
- Create: `react-app/src/features/office-product-editor/components/data-edit-controls/TabBar.module.css`
- Test: `react-app/src/features/office-product-editor/__tests__/TabBar.test.jsx`

**Interfaces:**
- Produces: `TabBar({ tabs, activeTabId, onTabChange })` — named export. `tabs: { id: string, label: string }[]`. 클릭 시 `onTabChange(tab.id)` 호출. 활성 탭 버튼에 `aria-selected="true"`, 나머지는 `"false"`. 루트 요소는 `role="tablist"`, 각 버튼은 `role="tab"`.

- [ ] **Step 1: 실패하는 테스트 작성**

`react-app/src/features/office-product-editor/__tests__/TabBar.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TabBar } from '../components/data-edit-controls/TabBar';

const tabs = [
  { id: 'upload', label: '엑셀 업로드' },
  { id: 'ai', label: 'AI 분석' },
];

describe('TabBar', () => {
  it('marks the active tab as selected and calls onTabChange for the clicked tab', () => {
    const onTabChange = vi.fn();
    render(<TabBar tabs={tabs} activeTabId="upload" onTabChange={onTabChange} />);

    expect(screen.getByRole('tab', { name: '엑셀 업로드' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'AI 분석' })).toHaveAttribute(
      'aria-selected',
      'false'
    );

    fireEvent.click(screen.getByRole('tab', { name: 'AI 분석' }));

    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith('ai');
  });
});
```

- [ ] **Step 2: 테스트 실행 후 실패 확인**

Run: `npm run test -- TabBar.test.jsx`
Expected: FAIL — `../components/data-edit-controls/TabBar` 모듈을 찾을 수 없음

- [ ] **Step 3: TabBar 구현**

`react-app/src/features/office-product-editor/components/data-edit-controls/TabBar.jsx`:

```jsx
import styles from './TabBar.module.css';

export function TabBar({ tabs, activeTabId, onTabChange }) {
  return (
    <div className={styles.tabBar} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`.trim()}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
```

`react-app/src/features/office-product-editor/components/data-edit-controls/TabBar.module.css`:

```css
.tabBar {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--corp-line);
}

.tabButton {
  padding: 10px 16px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--corp-muted);
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    color var(--corp-transition),
    border-color var(--corp-transition);
}

.tabButton:hover {
  color: var(--corp-text);
}

.tabButtonActive {
  color: var(--corp-primary);
  border-bottom-color: var(--corp-primary);
}

.tabButton:focus-visible {
  outline: none;
  box-shadow: var(--corp-focus-ring);
}
```

- [ ] **Step 4: 테스트 실행 후 통과 확인**

Run: `npm run test -- TabBar.test.jsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add react-app/src/features/office-product-editor/components/data-edit-controls/TabBar.jsx react-app/src/features/office-product-editor/components/data-edit-controls/TabBar.module.css react-app/src/features/office-product-editor/__tests__/TabBar.test.jsx
git commit -m "feat(office-product-editor): add TabBar component"
```

---

### Task 2: ExcelUploadPanel 좌/우 재구성 + 드롭존

**Files:**
- Modify: `react-app/src/features/office-product-editor/components/data-edit-controls/ExcelUploadPanel.jsx`
- Modify: `react-app/src/features/office-product-editor/components/data-edit-controls/ExcelUploadSection.module.css`
- Test: `react-app/src/features/office-product-editor/__tests__/ExcelUploadPanel.test.jsx`

**Interfaces:**
- Consumes: 없음 (독립 컴포넌트, props는 기존과 동일)
- Produces: `ExcelUploadPanel({ onWorkbookChange, isLoading, loadingErrorMessage, fileWarnings, warningRows })` — named export, 시그니처 변경 없음. 내부에 `data-testid="excel-upload-dropzone"`을 가진 드롭존 div 추가. 드롭 시 `onWorkbookChange({ target: { files } })` 형태로 호출.

- [ ] **Step 1: 실패하는 테스트 작성**

`react-app/src/features/office-product-editor/__tests__/ExcelUploadPanel.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExcelUploadPanel } from '../components/data-edit-controls/ExcelUploadPanel';

describe('ExcelUploadPanel', () => {
  it('renders upload controls on the left and warnings on the right', () => {
    render(
      <ExcelUploadPanel
        onWorkbookChange={vi.fn()}
        isLoading={false}
        loadingErrorMessage=""
        fileWarnings={['시트 이름이 비어 있습니다']}
        warningRows={[
          {
            product_code: 'A100',
            product_name: 'Alpha',
            sale_price_type_code: '01',
            warnings: ['가격이 0입니다'],
          },
        ]}
      />
    );

    expect(screen.getByText('📂 파일 선택')).toBeInTheDocument();
    expect(screen.getByTestId('excel-upload-dropzone')).toBeInTheDocument();
    expect(screen.getByText('파일 경고')).toBeInTheDocument();
    expect(screen.getByText('행 경고')).toBeInTheDocument();
  });

  it('forwards dropped files to onWorkbookChange using the same event shape as the file input', () => {
    const onWorkbookChange = vi.fn();
    render(
      <ExcelUploadPanel
        onWorkbookChange={onWorkbookChange}
        isLoading={false}
        loadingErrorMessage=""
        fileWarnings={[]}
        warningRows={[]}
      />
    );

    const file = new File(['dummy'], 'workbook.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const dropzone = screen.getByTestId('excel-upload-dropzone');

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(onWorkbookChange).toHaveBeenCalledTimes(1);
    const eventArg = onWorkbookChange.mock.calls[0][0];
    expect(eventArg.target.files[0]).toBe(file);
  });
});
```

- [ ] **Step 2: 테스트 실행 후 실패 확인**

Run: `npm run test -- ExcelUploadPanel.test.jsx`
Expected: FAIL — `getByTestId('excel-upload-dropzone')`를 찾을 수 없음 (아직 드롭존 없음), 레이아웃은 이미 통과할 수 있음

- [ ] **Step 3: ExcelUploadPanel 좌/우 레이아웃 + DropzoneArea 구현**

`react-app/src/features/office-product-editor/components/data-edit-controls/ExcelUploadPanel.jsx` 전체 내용을 다음으로 교체:

```jsx
import { useState } from 'react';
import styles from './ExcelUploadSection.module.css';
import warningStyles from './FileWarningsPanel.module.css';

function FileWarningsPanel({ warnings }) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <section className={`${styles.panel} ${styles.compactPanel}`}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>파일 경고</h2>
      </div>
      <ul className={warningStyles.warningList}>
        {warnings.map((warning) => (
          <li key={warning} className={warningStyles.warningItem}>
            {warning}
          </li>
        ))}
      </ul>
    </section>
  );
}

function WarningRowsPanel({ rows }) {
  if (rows.length === 0) {
    return null;
  }
  const MAX_WARNING_ROW_COUNT = 30;
  const visibleRows = rows.slice(0, MAX_WARNING_ROW_COUNT);

  return (
    <section className={`${styles.panel} ${styles.compactPanel}`}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>행 경고</h2>
        <span className={styles.panelMeta}>{visibleRows.length}건</span>
      </div>

      <div className={warningStyles.warningRows}>
        {visibleRows.map((row) => (
          <article
            key={`${row.product_code ?? 'missing-code'}-${row.sale_price_type_code ?? 'missing-type'}`}
            className={warningStyles.warningRowCard}
          >
            <div className={warningStyles.warningRowHeader}>
              <strong>
                {row.product_name || row.product_code || '이름 없는 행'}
              </strong>
              <span className={warningStyles.warningRowMeta}>
                {row.product_code || '-'} / {row.sale_price_type_code || '-'}
              </span>
            </div>
            <ul className={warningStyles.warningList}>
              {row.warnings.map((warning) => (
                <li
                  key={`${row.product_code}-${warning}`}
                  className={warningStyles.warningItem}
                >
                  {warning}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function DropzoneArea({ onWorkbookChange }) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      onWorkbookChange({ target: { files } });
    }
  }

  return (
    <div
      className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`.trim()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="excel-upload-dropzone"
    >
      여기로 파일을 끌어다 놓으세요
    </div>
  );
}

export function ExcelUploadPanel({
  onWorkbookChange,
  isLoading,
  loadingErrorMessage,
  fileWarnings,
  warningRows = [],
}) {
  return (
    <>
      {onWorkbookChange ? (
        <div className={styles.tabColumns}>
          <div className={styles.tabColumnLeft}>
            <div className={styles.uploadBlock}>
              <h3 className={styles.sectionTitle}>
                📊 엑셀 업로드 (31-6447에서 엑셀파일을 다운로드한 뒤 선택하세요.)
              </h3>
              <p className={styles.desc}>
                새 파일 선택 시 현재 저장된 데이터가 삭제되고 새 파일로 완전히
                교체됩니다.
              </p>
              <label className={styles.uploadBtn} htmlFor="excel-workbook-input">
                📂 파일 선택
              </label>
              <input
                id="excel-workbook-input"
                className={styles.fileInput}
                type="file"
                accept=".xlsx,.xls"
                onChange={onWorkbookChange}
              />
              <DropzoneArea onWorkbookChange={onWorkbookChange} />
            </div>

            {isLoading || loadingErrorMessage ? (
              <div className={styles.statusArea}>
                {isLoading ? (
                  <div className={styles.statusMessage}>
                    등록 데이터를 불러오는 중...
                  </div>
                ) : null}
                {loadingErrorMessage ? (
                  <div className={styles.errorBox}>{loadingErrorMessage}</div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={styles.tabColumnRight}>
            <FileWarningsPanel warnings={fileWarnings} />
            <WarningRowsPanel rows={warningRows} />
          </div>
        </div>
      ) : null}
    </>
  );
}
```

`react-app/src/features/office-product-editor/components/data-edit-controls/ExcelUploadSection.module.css`에 다음을 파일 끝에 추가 (기존 규칙은 그대로 유지):

```css
.tabColumns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
}

.tabColumnLeft,
.tabColumnRight {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.dropzone {
  margin-top: 10px;
  padding: 18px 12px;
  border: 1px dashed var(--corp-line);
  border-radius: var(--corp-radius);
  background: var(--corp-surface-muted);
  color: var(--corp-muted);
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
  transition:
    border-color var(--corp-transition),
    background var(--corp-transition),
    color var(--corp-transition);
}

.dropzoneActive {
  border-color: var(--corp-primary);
  background: var(--corp-primary-soft);
  color: var(--corp-primary);
}

@media (max-width: 760px) {
  .tabColumns {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: 테스트 실행 후 통과 확인**

Run: `npm run test -- ExcelUploadPanel.test.jsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add react-app/src/features/office-product-editor/components/data-edit-controls/ExcelUploadPanel.jsx react-app/src/features/office-product-editor/components/data-edit-controls/ExcelUploadSection.module.css react-app/src/features/office-product-editor/__tests__/ExcelUploadPanel.test.jsx
git commit -m "feat(office-product-editor): add drag-and-drop dropzone and left/right layout to ExcelUploadPanel"
```

---

### Task 3: WorkbookAiRecommendationPanel 좌/우 재구성 + 자연어 입력창

**Files:**
- Modify: `react-app/src/features/office-product-editor/components/data-edit-controls/WorkbookAiRecommendationPanel.jsx`
- Modify: `react-app/src/features/office-product-editor/components/data-edit-controls/WorkbookAiRecommendationPanel.module.css`
- Test: `react-app/src/features/office-product-editor/__tests__/WorkbookAiRecommendationPanel.test.jsx`

**Interfaces:**
- Consumes: 없음 (독립 컴포넌트, props는 기존과 동일)
- Produces: `WorkbookAiRecommendationPanel({ onAiAnalyze, aiDisabled, hasRows, aiRecommendations, aiIsLoading, aiAnalysisMode, aiAnalysisMessage, aiActiveRecommendationId, onAiRecommendationSelect })` — named export, 시그니처 변경 없음. `WorkbookAiRecommendations`도 named export 유지.

- [ ] **Step 1: 실패하는 테스트 작성**

`react-app/src/features/office-product-editor/__tests__/WorkbookAiRecommendationPanel.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkbookAiRecommendationPanel } from '../components/data-edit-controls/WorkbookAiRecommendationPanel';

describe('WorkbookAiRecommendationPanel', () => {
  it('keeps the natural language prompt input independent from the analyze button', () => {
    const onAiAnalyze = vi.fn();
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={onAiAnalyze}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
      />
    );

    const textarea = screen.getByPlaceholderText(
      '예: 마진율이 낮은 상품 위주로 검토해줘'
    );
    fireEvent.change(textarea, { target: { value: '마진율 낮은 상품 검토해줘' } });
    expect(textarea).toHaveValue('마진율 낮은 상품 검토해줘');
    expect(onAiAnalyze).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'AI 분석하기' }));
    expect(onAiAnalyze).toHaveBeenCalledTimes(1);
  });

  it('renders recommendations in the right column when results exist', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[
          {
            id: 'rec-1',
            title: '가격 확인 필요',
            severity: 'high',
            reason: '동일 상품 가격 상이',
            relatedRowIds: ['A100'],
          },
        ]}
        aiIsLoading={false}
      />
    );

    expect(screen.getByText('가격 확인 필요')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행 후 실패 확인**

Run: `npm run test -- WorkbookAiRecommendationPanel.test.jsx`
Expected: FAIL — `getByPlaceholderText('예: 마진율이 낮은 상품 위주로 검토해줘')`를 찾을 수 없음 (아직 입력창 없음)

- [ ] **Step 3: WorkbookAiRecommendationPanel 좌/우 레이아웃 + NaturalLanguagePromptInput 구현**

`react-app/src/features/office-product-editor/components/data-edit-controls/WorkbookAiRecommendationPanel.jsx` 전체 내용을 다음으로 교체:

```jsx
import { useState } from 'react';
import styles from './WorkbookAiRecommendationPanel.module.css';
import recStyles from './WorkbookAiRecommendations.module.css';

export function WorkbookAiRecommendations({
  recommendations,
  isLoading = false,
  analysisMode,
  analysisMessage = '',
  activeRecommendationId,
  onRecommendationSelect,
}) {
  void analysisMode;
  void analysisMessage;

  return (
    <section className={`${styles.panel} ${styles.compactPanel}`}>
      <div className={styles.panelHeader}>
        <div className={recStyles.aiPanelHeader}>
          <h2 className={styles.panelTitle}>AI 추천</h2>
        </div>
      </div>

      {isLoading ? (
        <p className={styles.statusMessage}>
          AI가 데이터를 분석하고 있습니다
        </p>
      ) : null}

      {!isLoading && recommendations.length > 0 ? (
        <div className={recStyles.recommendationGrid}>
          {recommendations.map((recommendation) => {
            const isActive = recommendation.id === activeRecommendationId;

            return (
              <button
                key={recommendation.id}
                type="button"
                aria-pressed={isActive}
                className={`${recStyles.recommendationCard} ${
                  isActive ? recStyles.recommendationCardActive : ''
                }`.trim()}
                onClick={() => onRecommendationSelect(recommendation.id)}
              >
                <div className={recStyles.recommendationCardHeader}>
                  <strong>{recommendation.title}</strong>
                  <span className={recStyles.recommendationSeverity}>
                    {recommendation.severity}
                  </span>
                </div>
                <p className={recStyles.recommendationReason}>
                  {recommendation.reason}
                </p>
                <span className={recStyles.recommendationFooter}>
                  관련 행 {recommendation.relatedRowIds.length}건
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function NaturalLanguagePromptInput() {
  const [promptDraft, setPromptDraft] = useState('');

  return (
    <div className={styles.promptBlock}>
      <label className={styles.promptLabel} htmlFor="ai-natural-language-prompt">
        자연어로 요청하기
      </label>
      <textarea
        id="ai-natural-language-prompt"
        className={styles.promptInput}
        value={promptDraft}
        onChange={(event) => setPromptDraft(event.target.value)}
        placeholder="예: 마진율이 낮은 상품 위주로 검토해줘"
        rows={5}
      />
    </div>
  );
}

export function WorkbookAiRecommendationPanel({
  onAiAnalyze,
  aiDisabled,
  hasRows,
  aiRecommendations = [],
  aiIsLoading = false,
  aiAnalysisMode = 'idle',
  aiAnalysisMessage = '',
  aiActiveRecommendationId = null,
  onAiRecommendationSelect,
}) {
  const showPanel =
    aiIsLoading || aiAnalysisMode !== 'idle' || aiRecommendations.length > 0;

  return (
    <div className={styles.tabColumns}>
      <div className={styles.tabColumnLeft}>
        <h3 className={styles.sectionTitle}>AI 분석</h3>
        <p className={styles.desc}>
          업로드한 데이터를 AI가 분석하여 가격과 품목명 관련 추천 사항을 제공합니다.
        </p>
        <NaturalLanguagePromptInput />
        <button
          type="button"
          className={styles.aiButton}
          onClick={onAiAnalyze}
          disabled={aiDisabled || !hasRows || aiIsLoading}
        >
          AI 분석하기
        </button>
      </div>

      <div className={styles.tabColumnRight}>
        {showPanel ? (
          <div className={styles.recommendSection}>
            <WorkbookAiRecommendations
              recommendations={aiRecommendations}
              isLoading={aiIsLoading}
              analysisMode={aiAnalysisMode}
              analysisMessage={aiAnalysisMessage}
              activeRecommendationId={aiActiveRecommendationId}
              onRecommendationSelect={onAiRecommendationSelect}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

`react-app/src/features/office-product-editor/components/data-edit-controls/WorkbookAiRecommendationPanel.module.css`에 다음을 파일 끝에 추가 (기존 규칙은 그대로 유지):

```css
.tabColumns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
}

.tabColumnLeft,
.tabColumnRight {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.promptBlock {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.promptLabel {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--corp-text);
}

.promptInput {
  padding: 10px 12px;
  border: 1px solid var(--corp-line);
  border-radius: var(--corp-radius);
  background: white;
  color: var(--corp-text);
  font-size: 0.82rem;
  font-family: inherit;
  resize: vertical;
}

.promptInput:focus-visible {
  outline: none;
  box-shadow: var(--corp-focus-ring);
}

@media (max-width: 760px) {
  .tabColumns {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: 테스트 실행 후 통과 확인**

Run: `npm run test -- WorkbookAiRecommendationPanel.test.jsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add react-app/src/features/office-product-editor/components/data-edit-controls/WorkbookAiRecommendationPanel.jsx react-app/src/features/office-product-editor/components/data-edit-controls/WorkbookAiRecommendationPanel.module.css react-app/src/features/office-product-editor/__tests__/WorkbookAiRecommendationPanel.test.jsx
git commit -m "feat(office-product-editor): add natural language prompt input and left/right layout to WorkbookAiRecommendationPanel"
```

---

### Task 4: DataEditorSection 탭 통합

**Files:**
- Modify: `react-app/src/features/office-product-editor/components/DataEditorSection.jsx`
- Modify: `react-app/src/features/office-product-editor/components/DataEditorSection.module.css`
- Test: `react-app/src/features/office-product-editor/__tests__/DataEditorSection.test.jsx`

**Interfaces:**
- Consumes: `TabBar({ tabs, activeTabId, onTabChange })` (Task 1), `ExcelUploadPanel(...)` (Task 2), `WorkbookAiRecommendationPanel(...)` (Task 3) — 모두 시그니처 변경 없이 그대로 사용.
- Produces: `DataEditorSection()` — named export, props 없음, 기존과 동일하게 `OfficeProductEditorPage.jsx`에서 `<DataEditorSection />`로 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`react-app/src/features/office-product-editor/__tests__/DataEditorSection.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../contexts/editorContexts', () => ({
  useExtractionCtx: () => ({
    handleWorkbookChange: vi.fn(),
    result: { warnings: [] },
  }),
  useActiveCategoryCtx: () => ({
    isRegisteredProductDataLoading: false,
    registeredProductDataErrorMessage: '',
  }),
  useTableCtx: () => ({
    rows: [{ row_id: 'A100__01' }],
    warningRows: [],
  }),
  useAiCtx: () => ({
    recommendations: [],
    isLoading: false,
    analysisMode: 'idle',
    analysisMessage: '',
    activeRecommendationId: null,
    handleAnalyze: vi.fn(),
    handleRecommendationSelect: vi.fn(),
  }),
}));

import { DataEditorSection } from '../components/DataEditorSection';

describe('DataEditorSection', () => {
  it('shows the excel upload tab by default and switches to the AI tab on click', () => {
    render(<DataEditorSection />);

    expect(screen.getByText('📂 파일 선택')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'AI 분석하기' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'AI 분석' }));

    expect(
      screen.getByRole('button', { name: 'AI 분석하기' })
    ).toBeInTheDocument();
    expect(screen.queryByText('📂 파일 선택')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행 후 실패 확인**

Run: `npm run test -- DataEditorSection.test.jsx`
Expected: FAIL — `role="tab"` 이름 'AI 분석'을 찾을 수 없음 (아직 TabBar가 연결되지 않음)

- [ ] **Step 3: DataEditorSection 탭 통합 구현**

`react-app/src/features/office-product-editor/components/DataEditorSection.jsx` 전체 내용을 다음으로 교체:

```jsx
import { useState } from 'react';
import { useActiveCategoryCtx, useAiCtx, useExtractionCtx, useTableCtx } from '../contexts/editorContexts';
import { TabBar } from './data-edit-controls/TabBar';
import { ExcelUploadPanel } from './data-edit-controls/ExcelUploadPanel';
import { WorkbookAiRecommendationPanel } from './data-edit-controls/WorkbookAiRecommendationPanel';
import styles from './DataEditorSection.module.css';

const TABS = [
  { id: 'upload', label: '엑셀 업로드' },
  { id: 'ai', label: 'AI 분석' },
];

export function DataEditorSection() {
  const [activeTabId, setActiveTabId] = useState('upload');
  const { handleWorkbookChange, result } = useExtractionCtx();
  const { isRegisteredProductDataLoading, registeredProductDataErrorMessage } = useActiveCategoryCtx();
  const { rows, warningRows } = useTableCtx();
  const {
    recommendations: aiRecommendations,
    isLoading: aiIsLoading = false,
    analysisMode: aiAnalysisMode,
    analysisMessage: aiAnalysisMessage,
    activeRecommendationId: aiActiveRecommendationId,
    handleAnalyze: onAiAnalyze,
    handleRecommendationSelect: onAiRecommendationSelect,
  } = useAiCtx();

  return (
    <section className={styles.workspace}>
      <div className={styles.tabPanelWrap}>
        <TabBar tabs={TABS} activeTabId={activeTabId} onTabChange={setActiveTabId} />

        <div role="tabpanel" className={styles.tabPanel}>
          {activeTabId === 'upload' ? (
            <ExcelUploadPanel
              onWorkbookChange={handleWorkbookChange}
              isLoading={isRegisteredProductDataLoading}
              loadingErrorMessage={registeredProductDataErrorMessage}
              fileWarnings={result?.warnings}
              warningRows={warningRows}
            />
          ) : (
            <WorkbookAiRecommendationPanel
              onAiAnalyze={onAiAnalyze}
              aiDisabled={false}
              hasRows={rows.length > 0}
              aiRecommendations={aiRecommendations}
              aiIsLoading={aiIsLoading}
              aiAnalysisMode={aiAnalysisMode}
              aiAnalysisMessage={aiAnalysisMessage}
              aiActiveRecommendationId={aiActiveRecommendationId}
              onAiRecommendationSelect={onAiRecommendationSelect}
            />
          )}
        </div>
      </div>
    </section>
  );
}
```

`react-app/src/features/office-product-editor/components/DataEditorSection.module.css` 전체 내용을 다음으로 교체:

```css
/* ─── Workspace (display:contents → children join page grid) */
.workspace {
  display: contents;
}

/* ─── Tab panel wrapper (spans full 2-col page grid) ────── */
.tabPanelWrap {
  grid-column: 1 / -1;
}

.tabPanel {
  border: 1px solid var(--corp-line);
  border-radius: var(--corp-radius-sm);
  padding: 16px;
  margin-top: 8px;
  background: white;
}
```

- [ ] **Step 4: 테스트 실행 후 통과 확인**

Run: `npm run test -- DataEditorSection.test.jsx`
Expected: PASS

- [ ] **Step 5: 관련 스위트 전체 실행으로 회귀 확인**

Run: `npm run test -- office-product-editor`
Expected: PASS (모든 기존 + 신규 테스트, 특히 `excelExtractWorkbookReviewPage.test.jsx`가 여전히 통과하는지 확인 — `OfficeProductEditorPage`가 `DataEditorSection`을 렌더링하는 경로를 포함)

- [ ] **Step 6: 커밋**

```bash
git add react-app/src/features/office-product-editor/components/DataEditorSection.jsx react-app/src/features/office-product-editor/components/DataEditorSection.module.css react-app/src/features/office-product-editor/__tests__/DataEditorSection.test.jsx
git commit -m "feat(office-product-editor): split DataEditorSection into upload/AI tabs"
```

---

## Self-Review Notes

- **Spec coverage:** 탭 분리(Task 4), 엑셀 업로드 탭 좌(버튼+드롭존)/우(경고)(Task 2), AI 분석 탭 좌(입력창+버튼)/우(결과)(Task 3), 커스텀 useState 탭(Task 1/4), 파일 경고 우측 배치(Task 2) — 스펙의 모든 결정 사항이 태스크에 반영됨.
- **Placeholder scan:** 없음 — 모든 스텝에 완전한 코드 포함.
- **Type/signature consistency:** `TabBar({ tabs, activeTabId, onTabChange })` 시그니처가 Task 1과 Task 4에서 동일. `ExcelUploadPanel`/`WorkbookAiRecommendationPanel`의 props는 기존 시그니처를 그대로 유지하므로 `DataEditorSection.jsx`의 호출부는 변경 없음.
