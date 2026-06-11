import { useEffect, useRef, useState } from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import { ResultTableSection, WorkbookDropzone } from '../components/ResultTableSection';
import { FileWarningsPanel, WarningRowsPanel } from '../components/WarningPanels';
import { useWorkbookAiRecommendations } from '../hooks/useWorkbookAiRecommendations';
import { useOfficeProductDataCatalog } from '../hooks/useOfficeProductDataCatalog';
import { useRegisteredProductData } from '../hooks/useRegisteredProductData';
import { useWorkbookExtraction } from '../hooks/useWorkbookExtraction';
import { useWorkbookSave } from '../hooks/useWorkbookSave';
import { useWorkbookStaticMergeTrigger } from '../hooks/useWorkbookStaticMergeTrigger';
import { useWorkbookReviewTableState } from '../hooks/useWorkbookReviewTableState';
import {
  buildOfficeProductDataCatalogModel,
  validateCustomCategoryName,
} from '../model/catalog/officeProductDataCatalogModel';
import {
  resolveTableNameModeFromCategoryName,
  shouldUseStaticDataMerge,
} from '../model/save/workbookSaveModel';
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

function CurrentDataBanner({ categoryName, statusLabel, statusVariant }) {
  if (!categoryName) {
    return (
      <div className={styles.dataNameBanner}>
        <span className={styles.dataNameLabel}>현재 작업</span>
        <h1 className={styles.dataNameTitle}>왼쪽에서 데이터를 선택하세요</h1>
      </div>
    );
  }

  return (
    <div className={styles.dataNameBanner}>
      <span className={styles.dataNameLabel}>현재 등록/편집 데이터</span>
      <h1 className={styles.dataNameTitle}>{categoryName}</h1>
      <span
        className={[
          styles.dataNameStatus,
          statusVariant === 'registered'
            ? styles.dataNameStatusRegistered
            : styles.dataNameStatusNew,
        ].join(' ')}
      >
        {statusLabel}
      </span>
    </div>
  );
}

function SidebarCatalogItem({ card, isSelected, onSelect }) {
  const isEditingRegistered = isSelected && !card.isEmpty && card.variant !== 'add';
  const statusLabel = isEditingRegistered ? '편집 중' : card.statusLabel;

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
        onClick={onSelect}
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
            isEditingRegistered
              ? styles.catalogListStatusActive
              : card.isEmpty
                ? styles.catalogListStatusEmpty
                : styles.catalogListStatusRegistered,
          ].join(' ')}
        >
          {statusLabel}
        </span>
      </button>
    </li>
  );
}

function TableNameCard({
  tableNameMode,
  customTableName,
  inputRef,
  onTableNameChange,
  fixedCategoryName,
  showsTableNameInput,
  validationError,
  canCreateTable,
  onCreateTable,
}) {
  const isCustomTableNameEmpty = customTableName.trim().length === 0;

  if (showsTableNameInput) {
    return (
      <aside className={styles.tableNameCard} aria-label="테이블 이름 설정">
        <div className={styles.tableNameCardHeader}>
          <h3 className={styles.tableNameCardTitle}>새 테이블 이름</h3>
          <span className={styles.tableNameRequiredBadge}>필수</span>
        </div>

        <p className={styles.tableNameCardDescription}>
          추가할 테이블 이름을 입력한 뒤 업로드하세요
        </p>

        <div className={styles.tableNameRow}>
          <label
            className={`${styles.catalogInlineField} ${styles.tableNameRowField}`}
            htmlFor="table-name-input"
          >
            <span className={styles.catalogInlineLabel}>테이블 이름</span>
            <input
              ref={inputRef}
              id="table-name-input"
              className={styles.catalogInlineInput}
              type="text"
              value={customTableName}
              onChange={onTableNameChange}
              placeholder="예: 자재, 종자, 사료"
            />
          </label>

          <button
            type="button"
            className={styles.createTableButton}
            onClick={onCreateTable}
            disabled={!canCreateTable}
          >
            만들기
          </button>
        </div>

        {isCustomTableNameEmpty ? (
          <p className={styles.catalogInlineHint}>저장 전에 테이블 이름을 입력하세요</p>
        ) : validationError ? (
          <p className={styles.tableNameError}>{validationError}</p>
        ) : null}
      </aside>
    );
  }

  return (
    <aside className={styles.tableNameCard} aria-label="테이블 이름 설정">
      <div className={styles.tableNameCardHeader}>
        <h3 className={styles.tableNameCardTitle}>테이블 이름</h3>
        <span className={styles.tableNameRequiredBadge}>필수</span>
      </div>
      <p className={styles.tableNameCardDescription}>
        {tableNameMode === 'custom' ? '직접 추가한 테이블 이름입니다' : '자동으로 지정된 테이블 이름입니다'}
      </p>
      <div className={styles.tableNameFixedValue}>{fixedCategoryName}</div>
    </aside>
  );
}

export default function ExcelExtractWorkbookReviewPage({ onGoHome, user }) {
  const [tableNameMode, setTableNameMode] = useState('');
  const [customTableName, setCustomTableName] = useState('');
  const [pendingCustomCategories, setPendingCustomCategories] = useState([]);
  const [selectedCustomCategoryName, setSelectedCustomCategoryName] = useState('');
  const customTableNameInputRef = useRef(null);

  const {
    selectedFileName,
    workbookFingerprint,
    isExtracting,
    errorMessage,
    result,
    handleWorkbookChange,
    processFile,
  } = useWorkbookExtraction();

  const isShowingExistingCustomCategory =
    tableNameMode === 'custom' && selectedCustomCategoryName !== '';
  const showsCustomTableNameInput = tableNameMode === 'custom' && !isShowingExistingCustomCategory;
  const effectiveCustomTableName = isShowingExistingCustomCategory
    ? selectedCustomCategoryName
    : customTableName;
  const isStaticMergeEnabled = shouldUseStaticDataMerge(tableNameMode);

  useEffect(() => {
    if (!showsCustomTableNameInput) {
      return;
    }

    customTableNameInputRef.current?.focus();
  }, [showsCustomTableNameInput]);

  const {
    items: officeProductCatalogItems,
    isLoading: isOfficeProductCatalogLoading,
    errorMessage: officeProductCatalogErrorMessage,
  } = useOfficeProductDataCatalog(user);

  const activeCategoryName =
    tableNameMode === 'fertilizer'
      ? '비료'
      : tableNameMode === 'pesticide'
        ? '농약'
        : tableNameMode === 'custom'
          ? toTrimmedString(effectiveCustomTableName)
          : '';

  const registeredCatalogItem =
    officeProductCatalogItems.find((item) => item.categoryName === activeCategoryName) ?? null;

  const isViewingRegisteredData = Boolean(registeredCatalogItem) && !result;
  const isUploadMode = tableNameMode !== '' && !isViewingRegisteredData;

  const {
    data: registeredProductData,
    isLoading: isRegisteredProductDataLoading,
    errorMessage: registeredProductDataErrorMessage,
  } = useRegisteredProductData({
    user,
    categoryName: activeCategoryName,
    isEnabled: Boolean(registeredCatalogItem) && !result,
  });

  const extractedRows = result?.rows ?? registeredProductData?.rows ?? EMPTY_ROWS;
  const registeredFingerprint = registeredCatalogItem
    ? `registered:${activeCategoryName}:${registeredCatalogItem.updatedAt ?? ''}`
    : null;
  const effectiveFingerprint = workbookFingerprint ?? registeredFingerprint;

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
    updatePrice,
    isMerging,
    isMerged,
    mergeError,
    mergeStatusMessage,
    handleStaticDataMerge,
  } = useWorkbookReviewTableState(extractedRows, effectiveFingerprint, {
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
  } = useWorkbookAiRecommendations(mergedRows, effectiveFingerprint);

  const {
    canSave,
    isSaving,
    saveErrorMessage,
    saveSuccessMessage,
    resolvedCategoryName,
    handleSave,
  } = useWorkbookSave({
    user,
    result,
    mergedRows,
    selectedFileName,
    workbookFingerprint,
    tableNameMode,
    customTableName: effectiveCustomTableName,
  });

  const { cards: catalogCards, registeredCount } = buildOfficeProductDataCatalogModel(
    officeProductCatalogItems,
    pendingCustomCategories,
  );

  const canUploadFile = toTrimmedString(resolvedCategoryName).length > 0;

  const trimmedCustomTableName = toTrimmedString(customTableName);
  const existingCategoryNames = [
    ...officeProductCatalogItems.map((item) => item.categoryName),
    ...pendingCustomCategories,
  ];
  const tableNameValidationError =
    showsCustomTableNameInput && trimmedCustomTableName.length > 0
      ? validateCustomCategoryName(trimmedCustomTableName, existingCategoryNames)
      : null;
  const canCreateTable =
    showsCustomTableNameInput && trimmedCustomTableName.length > 0 && !tableNameValidationError;

  const bannerStatusLabel = result
    ? '신규 데이터 검토 중'
    : registeredCatalogItem
      ? '등록됨 · 편집 중'
      : '신규 등록';
  const bannerStatusVariant = result || registeredCatalogItem ? 'registered' : 'new';

  function handleCustomTableNameChange(event) {
    setCustomTableName(event.target.value);
  }

  function handleCreateCustomTable() {
    if (!canCreateTable) {
      return;
    }

    setPendingCustomCategories((previous) => [...previous, trimmedCustomTableName]);
    setSelectedCustomCategoryName(trimmedCustomTableName);
    setCustomTableName('');
  }

  function isCardSelected(card) {
    if (card.variant === 'add') {
      return tableNameMode === 'custom' && !isShowingExistingCustomCategory;
    }

    if (card.variant === 'default') {
      return resolveTableNameModeFromCategoryName(card.categoryName) === tableNameMode;
    }

    return isShowingExistingCustomCategory && selectedCustomCategoryName === card.categoryName;
  }

  function handleCatalogSelect(card) {
    if (card.variant === 'add') {
      setTableNameMode('custom');
      setSelectedCustomCategoryName('');
      return;
    }

    const mode = resolveTableNameModeFromCategoryName(card.categoryName);

    if (mode) {
      setTableNameMode(mode);
      setSelectedCustomCategoryName('');
      return;
    }

    setTableNameMode('custom');
    setSelectedCustomCategoryName(card.categoryName);
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

      <CurrentDataBanner
        categoryName={activeCategoryName}
        statusLabel={bannerStatusLabel}
        statusVariant={bannerStatusVariant}
      />

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
                  isSelected={isCardSelected(card)}
                  onSelect={() => handleCatalogSelect(card)}
                />
              ))}
            </ul>
          </div>
        </aside>

        <div className={styles.content}>
          {tableNameMode === '' ? (
            <div className={styles.emptySelectionState}>
              <p className={styles.emptySelectionTitle}>등록 데이터를 선택하거나 추가하세요</p>
              <p className={styles.emptySelectionHint}>
                왼쪽 목록에서 비료, 농약 또는 등록된 데이터를 선택하면 이곳에 표시됩니다.
              </p>
            </div>
          ) : isViewingRegisteredData ? (
            <>
              <div className={styles.viewToolbar}>
                <div className={styles.viewToolbarFile}>
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
                <p className={styles.viewToolbarHint}>
                  새 엑셀 파일을 선택하면 이 데이터를 신규로 등록(덮어쓰기)합니다.
                </p>
              </div>

              {isExtracting ? <div className={styles.statusMessage}>엑셀 추출 중...</div> : null}
              {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
              {isRegisteredProductDataLoading ? (
                <div className={styles.statusMessage}>등록된 데이터를 불러오는 중...</div>
              ) : null}
              {registeredProductDataErrorMessage ? (
                <div className={styles.errorBox}>{registeredProductDataErrorMessage}</div>
              ) : null}

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
                  onPriceChange={updatePrice}
                  tableNameMode={tableNameMode}
                  highlightedRowIds={aiHighlightedRowIds}
                  aiRecommendations={aiRecommendations}
                  aiAnalysisMode={aiAnalysisMode}
                  aiIsAnalyzing={aiIsAnalyzing}
                  aiErrorMessage={aiErrorMessage}
                  aiActiveRecommendationId={aiActiveRecommendationId}
                  onAiAnalyze={handleAiAnalyze}
                  onAiRecommendationSelect={handleAiRecommendationSelect}
                  aiDisabled={isExtracting || isMerging}
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.uploadWorkspace}>
                <TableNameCard
                  tableNameMode={tableNameMode}
                  customTableName={customTableName}
                  inputRef={customTableNameInputRef}
                  onTableNameChange={handleCustomTableNameChange}
                  fixedCategoryName={activeCategoryName}
                  showsTableNameInput={showsCustomTableNameInput}
                  validationError={tableNameValidationError}
                  canCreateTable={canCreateTable}
                  onCreateTable={handleCreateCustomTable}
                />

                <div className={styles.uploadMain}>
                  {result ? (
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

                      <FileWarningsPanel warnings={result.warnings} />
                      <WarningRowsPanel rows={warningRows} />
                    </div>
                  ) : (
                    <WorkbookDropzone
                      selectedFileName={selectedFileName}
                      isExtracting={isExtracting}
                      disabled={!canUploadFile}
                      disabledHint="테이블 이름을 입력하면 업로드할 수 있습니다."
                      onFileSelected={processFile}
                    />
                  )}
                </div>
              </div>

              {!result && errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}

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
                    onPriceChange={updatePrice}
                    tableNameMode={tableNameMode}
                    highlightedRowIds={aiHighlightedRowIds}
                    aiRecommendations={aiRecommendations}
                    aiAnalysisMode={aiAnalysisMode}
                    aiIsAnalyzing={aiIsAnalyzing}
                    aiErrorMessage={aiErrorMessage}
                    aiActiveRecommendationId={aiActiveRecommendationId}
                    onAiAnalyze={handleAiAnalyze}
                    onAiRecommendationSelect={handleAiRecommendationSelect}
                    aiDisabled={isExtracting || isMerging}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
