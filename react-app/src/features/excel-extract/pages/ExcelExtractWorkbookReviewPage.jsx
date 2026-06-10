import { useEffect, useRef, useState } from 'react';

import { AiRecommendationPanel } from '../components/AiRecommendationPanel';
import { ResultTableSection } from '../components/ResultTableSection';
import { FileWarningsPanel, WarningRowsPanel } from '../components/WarningPanels';
import { useWorkbookAiRecommendations } from '../hooks/useWorkbookAiRecommendations';
import { useOfficeProductDataCatalog } from '../hooks/useOfficeProductDataCatalog';
import { useWorkbookExtraction } from '../hooks/useWorkbookExtraction';
import { useWorkbookSave } from '../hooks/useWorkbookSave';
import { useWorkbookStaticMergeTrigger } from '../hooks/useWorkbookStaticMergeTrigger';
import { useWorkbookReviewTableState } from '../hooks/useWorkbookReviewTableState';
import { buildOfficeProductDataCatalogModel } from '../model/catalog/officeProductDataCatalogModel';
import { shouldUseStaticDataMerge } from '../model/save/workbookSaveModel';
import styles from './ExcelExtractWorkbookReviewPage.module.css';

const EMPTY_ROWS = [];

function HomeLink({ onGoHome }) {
  if (typeof onGoHome === 'function') {
    return (
      <button type="button" className={styles.backLink} onClick={onGoHome}>
        홈으로 돌아가기
      </button>
    );
  }

  return (
    <a className={styles.backLink} href="/">
      홈으로 돌아가기
    </a>
  );
}

function SidebarCatalogItem({ card, isSelected, onSelect }) {
  if (card.isSelectable) {
    return (
      <li role="listitem" className={styles.catalogListItem}>
        <button
          type="button"
          className={[
            styles.catalogListItemButton,
            isSelected ? styles.catalogListItemButtonActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={isSelected}
          onClick={() => onSelect(card.selectionMode)}
        >
          <div className={styles.catalogListMain}>
            <span className={styles.catalogListName}>{card.categoryName}</span>
            {card.meta.length > 0 ? (
              <span className={styles.catalogListMeta}>{card.meta[0]}</span>
            ) : (
              <span className={styles.catalogListMeta}>{card.description || card.statusLabel}</span>
            )}
          </div>
          <span
            className={[
              styles.catalogListStatus,
              card.isEmpty ? styles.catalogListStatusEmpty : styles.catalogListStatusRegistered,
            ].join(' ')}
          >
            {card.statusLabel}
          </span>
        </button>
      </li>
    );
  }

  return (
    <li role="listitem" className={styles.catalogListItem}>
      <div className={styles.catalogListItemStatic}>
        <div className={styles.catalogListMain}>
          <span className={styles.catalogListName}>{card.categoryName}</span>
          {card.meta.length > 0 ? (
            <span className={styles.catalogListMeta}>{card.meta[0]}</span>
          ) : card.isEmpty || card.variant === 'add' ? (
            <span className={styles.catalogListMeta}>{card.description || card.statusLabel}</span>
          ) : null}
        </div>
        <span
          className={[
            styles.catalogListStatus,
            card.isEmpty ? styles.catalogListStatusEmpty : styles.catalogListStatusRegistered,
          ].join(' ')}
        >
          {card.statusLabel}
        </span>
      </div>
    </li>
  );
}

function CatalogInlineAddPanel({ customTableName, inputRef, onTableNameChange }) {
  const isCustomTableNameEmpty = customTableName.trim().length === 0;

  return (
    <div className={styles.catalogInlinePanel}>
      <div className={styles.catalogInlinePanelHeader}>
        <h3 className={styles.catalogInlinePanelTitle}>새 테이블 이름</h3>
        <p className={styles.catalogInlinePanelDescription}>
          추가할 테이블 이름을 입력한 뒤 저장하세요
        </p>
      </div>

      <label className={styles.catalogInlineField} htmlFor="sidebar-table-name-input">
        <span className={styles.catalogInlineLabel}>테이블 이름</span>
        <input
          ref={inputRef}
          id="sidebar-table-name-input"
          className={styles.catalogInlineInput}
          type="text"
          value={customTableName}
          onChange={onTableNameChange}
          placeholder="예: 자재, 종자, 사료"
        />
      </label>

      {isCustomTableNameEmpty ? (
        <p className={styles.catalogInlineHint}>저장 전에 테이블 이름을 입력하세요</p>
      ) : null}
    </div>
  );
}

export default function ExcelExtractWorkbookReviewPage({ onGoHome, user }) {
  const [tableNameMode, setTableNameMode] = useState('');
  const [customTableName, setCustomTableName] = useState('');
  const customTableNameInputRef = useRef(null);

  const {
    selectedFileName,
    workbookFingerprint,
    isExtracting,
    errorMessage,
    result,
    handleWorkbookChange,
  } = useWorkbookExtraction();

  const extractedRows = result?.rows ?? EMPTY_ROWS;
  const isCustomTableNameMode = tableNameMode === 'custom';
  const isStaticMergeEnabled = shouldUseStaticDataMerge(tableNameMode);

  useEffect(() => {
    if (!isCustomTableNameMode) {
      return;
    }

    customTableNameInputRef.current?.focus();
  }, [isCustomTableNameMode]);

  const {
    rows,
    warningRows,
    mergedRows,
    searchQuery,
    setSearchQuery,
    filters,
    filterOptions,
    sortState,
    setSortState,
    handleFilterChange,
    resetFilters,
    toggleShadow,
    setShadowForRows,
    updateNote,
    isMerging,
    isMerged,
    mergeError,
    mergeStatusMessage,
    handleStaticDataMerge,
  } = useWorkbookReviewTableState(extractedRows, workbookFingerprint, {
    isStaticMergeEnabled,
  });

  useWorkbookStaticMergeTrigger({
    workbookFingerprint,
    hasResult: Boolean(result),
    isStaticMergeEnabled,
    isMerged,
    isMerging,
    handleStaticDataMerge,
  });

  const {
    recommendations: aiRecommendations,
    analysisMode: aiAnalysisMode,
    isAnalyzing: aiIsAnalyzing,
    errorMessage: aiErrorMessage,
    activeRecommendationId: aiActiveRecommendationId,
    highlightedRowIds: aiHighlightedRowIds,
    handleAnalyze: handleAiAnalyze,
    handleRecommendationSelect: handleAiRecommendationSelect,
  } = useWorkbookAiRecommendations(mergedRows, workbookFingerprint);

  const {
    items: officeProductCatalogItems,
    isLoading: isOfficeProductCatalogLoading,
    errorMessage: officeProductCatalogErrorMessage,
  } = useOfficeProductDataCatalog(user);

  const {
    canSave,
    isSaving,
    saveErrorMessage,
    saveSuccessMessage,
    handleSave,
  } = useWorkbookSave({
    user,
    result,
    mergedRows,
    selectedFileName,
    workbookFingerprint,
    tableNameMode,
    customTableName,
  });

  const { cards: catalogCards, registeredCount } = buildOfficeProductDataCatalogModel(
    officeProductCatalogItems,
  );

  function handleCustomTableNameChange(event) {
    setCustomTableName(event.target.value);
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.topbarLabel}>매출단가 검토</span>
          <h1 className={styles.topbarTitle}>엑셀 데이터 검토</h1>
        </div>
        <HomeLink onGoHome={onGoHome} />
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="등록 데이터 현황">
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHeader}>
              <h2 className={styles.sidebarTitle}>등록 데이터</h2>
              <span className={styles.sidebarBadge}>{registeredCount}개</span>
            </div>

            {isOfficeProductCatalogLoading ? (
              <p className={styles.sidebarMutedText}>등록 데이터 불러오는 중...</p>
            ) : null}

            {officeProductCatalogErrorMessage ? (
              <p className={styles.sidebarErrorText}>{officeProductCatalogErrorMessage}</p>
            ) : null}

            <ul className={styles.catalogList} role="list" aria-label="등록 데이터 목록">
              {catalogCards.map((card) => (
                <SidebarCatalogItem
                  key={card.categoryName}
                  card={card}
                  isSelected={card.selectionMode === tableNameMode}
                  onSelect={setTableNameMode}
                />
              ))}
            </ul>

            {isCustomTableNameMode ? (
              <CatalogInlineAddPanel
                customTableName={customTableName}
                inputRef={customTableNameInputRef}
                onTableNameChange={handleCustomTableNameChange}
              />
            ) : null}
          </div>

          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarTitle}>현재 상태</h2>
            <dl className={styles.sidebarStats}>
              <div className={styles.sidebarStatRow}>
                <dt className={styles.sidebarStatLabel}>파일</dt>
                <dd className={styles.sidebarStatValue}>{selectedFileName || '선택 전'}</dd>
              </div>
              <div className={styles.sidebarStatRow}>
                <dt className={styles.sidebarStatLabel}>표시 행</dt>
                <dd className={styles.sidebarStatValue}>{rows.length}건</dd>
              </div>
              <div className={styles.sidebarStatRow}>
                <dt className={styles.sidebarStatLabel}>경고</dt>
                <dd
                  className={[
                    styles.sidebarStatValue,
                    warningRows.length > 0 ? styles.sidebarStatValueWarning : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {warningRows.length}건
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className={styles.content}>
          <div className={styles.uploadGroup}>
            <section id="section-upload" className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>업로드 / 작업</h2>
              </div>

              <div className={styles.uploadRow}>
                <label className={styles.uploadButton} htmlFor="excel-workbook-input">
                  파일 선택
                </label>
                <input
                  id="excel-workbook-input"
                  className={styles.fileInput}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleWorkbookChange}
                />
                <span className={styles.fileName}>
                  {selectedFileName || '선택된 파일이 없습니다'}
                </span>
              </div>

              <div className={styles.mergeActionRow}>
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={handleSave}
                  disabled={!canSave || isExtracting || isMerging || aiIsAnalyzing || isSaving}
                >
                  {isSaving ? '저장 중...' : '저장하기'}
                </button>
                {isMerged && mergeStatusMessage ? (
                  <span className={styles.mergeMeta}>{mergeStatusMessage}</span>
                ) : null}
              </div>

              {isExtracting ? <div className={styles.statusMessage}>엑셀 추출 중...</div> : null}
              {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
              {mergeError ? <div className={styles.errorBox}>{mergeError}</div> : null}
              {saveErrorMessage ? <div className={styles.errorBox}>{saveErrorMessage}</div> : null}
              {saveSuccessMessage ? (
                <div className={styles.successBox}>{saveSuccessMessage}</div>
              ) : null}
            </section>

            {result ? (
              <>
                <FileWarningsPanel warnings={result.warnings} />
                <WarningRowsPanel rows={warningRows} />
              </>
            ) : null}
          </div>

          <div className={styles.aiGroup} id="section-ai">
            <div className={styles.aiGroupHeader}>
              <h2 className={styles.panelTitle}>AI 분석</h2>
              <button
                type="button"
                className={styles.aiButton}
                onClick={handleAiAnalyze}
                disabled={!result || isExtracting || isMerging || aiIsAnalyzing}
              >
                {aiIsAnalyzing ? 'AI 분석 중...' : 'AI 분석하기'}
              </button>
            </div>

            <AiRecommendationPanel
              recommendations={aiRecommendations}
              analysisMode={aiAnalysisMode}
              activeRecommendationId={aiActiveRecommendationId}
              isAnalyzing={aiIsAnalyzing}
              errorMessage={aiErrorMessage}
              onRecommendationSelect={handleAiRecommendationSelect}
            />
          </div>

          {result ? (
            <div id="section-result" className={styles.resultSection}>
              <ResultTableSection
                rows={rows}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                filters={filters}
                filterOptions={filterOptions}
                onFilterChange={handleFilterChange}
                onResetFilters={resetFilters}
                sortState={sortState}
                onSortChange={setSortState}
                onShadowToggle={toggleShadow}
                onVisibleRowsShadowChange={setShadowForRows}
                onNoteChange={updateNote}
                highlightedRowIds={aiHighlightedRowIds}
              />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
