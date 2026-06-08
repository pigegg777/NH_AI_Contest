import { AiRecommendationPanel } from '../components/AiRecommendationPanel';
import { OfficeProductDataCatalogPanel } from '../components/OfficeProductDataCatalogPanel';
import { ResultTableSection } from '../components/ResultTableSection';
import { FileWarningsPanel, WarningRowsPanel } from '../components/WarningPanels';
import { useWorkbookAiRecommendations } from '../hooks/workbook-review/useWorkbookAiRecommendations';
import { useOfficeProductDataCatalog } from '../hooks/workbook-review/useOfficeProductDataCatalog';
import { useWorkbookExtraction } from '../hooks/workbook-review/useWorkbookExtraction';
import { useWorkbookReviewPipeline } from '../hooks/workbook-review/useWorkbookReviewPipeline';
import { useWorkbookReviewSave } from '../hooks/workbook-review/useWorkbookReviewSave';
import { TABLE_NAME_OPTIONS } from '../model/workbook-review/save';
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

export default function ExcelExtractWorkbookReviewPage({ onGoHome, user }) {
  const {
    selectedFileName,
    workbookFingerprint,
    isExtracting,
    errorMessage,
    result,
    handleWorkbookChange,
  } = useWorkbookExtraction();
  const extractedRows = result?.rows ?? EMPTY_ROWS;
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
    handleMerge,
  } = useWorkbookReviewPipeline(extractedRows, workbookFingerprint);

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
    tableNameMode,
    setTableNameMode,
    customTableName,
    setCustomTableName,
    canSave,
    isSaving,
    saveErrorMessage,
    saveSuccessMessage,
    handleSave,
  } = useWorkbookReviewSave({
    user,
    result,
    mergedRows,
    selectedFileName,
    workbookFingerprint,
  });

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.title}>매출단가 엑셀 테스트 페이지</h1>
        </div>

        <HomeLink onGoHome={onGoHome} />
      </section>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="현황 요약 및 바로가기">
          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarTitle}>현재 상태</h2>
            <dl className={styles.sidebarStats}>
              <div className={styles.sidebarStatRow}>
                <dt className={styles.sidebarStatLabel}>파일</dt>
                <dd className={styles.sidebarStatValue}>{selectedFileName || '선택 안 됨'}</dd>
              </div>
              <div className={styles.sidebarStatRow}>
                <dt className={styles.sidebarStatLabel}>표시 행</dt>
                <dd className={styles.sidebarStatValue}>{rows.length}건</dd>
              </div>
              <div className={styles.sidebarStatRow}>
                <dt className={styles.sidebarStatLabel}>경고</dt>
                <dd className={styles.sidebarStatValue}>{warningRows.length}건</dd>
              </div>
            </dl>
          </div>

          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarTitle}>바로가기</h2>
            <nav className={styles.sidebarNav} aria-label="섹션 바로가기">
              <a className={styles.sidebarNavLink} href="#section-catalog">등록 데이터</a>
              <a className={styles.sidebarNavLink} href="#section-upload">업로드 / 작업</a>
              {result ? (
                <>
                  <a className={styles.sidebarNavLink} href="#section-ai">AI 추천</a>
                  <a className={styles.sidebarNavLink} href="#section-result">집계 결과</a>
                </>
              ) : null}
            </nav>
          </div>
        </aside>

        <div className={styles.content}>
          <div id="section-catalog">
            <OfficeProductDataCatalogPanel
              items={officeProductCatalogItems}
              isLoading={isOfficeProductCatalogLoading}
              errorMessage={officeProductCatalogErrorMessage}
            />
          </div>

          <section id="section-upload" className={styles.panel}>
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
              <span className={styles.fileName}>{selectedFileName || '선택된 파일이 없습니다'}</span>
            </div>

            <div className={styles.tableNameControls}>
              <label className={styles.filterField} htmlFor="table-name-select">
                <span className={styles.filterLabel}>테이블 이름</span>
                <select
                  id="table-name-select"
                  className={styles.filterSelect}
                  value={tableNameMode}
                  onChange={(event) => setTableNameMode(event.target.value)}
                >
                  {TABLE_NAME_OPTIONS.map((option) => (
                    <option key={option.value || 'placeholder'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {tableNameMode === 'custom' ? (
                <label className={styles.filterField} htmlFor="table-name-custom-input">
                  <span className={styles.filterLabel}>직접 입력</span>
                  <input
                    id="table-name-custom-input"
                    className={styles.filterInput}
                    type="text"
                    value={customTableName}
                    onChange={(event) => setCustomTableName(event.target.value)}
                    placeholder="예: 자재, 종자, 사료"
                  />
                </label>
              ) : null}
            </div>

            <div className={styles.mergeActionRow}>
              <button
                type="button"
                className={styles.mergeButton}
                onClick={handleMerge}
                disabled={!result || isExtracting || isMerging}
              >
                {isMerging ? '병합 중..' : '병합하기'}
              </button>
              <button
                type="button"
                className={styles.saveButton}
                onClick={handleSave}
                disabled={!canSave || isExtracting || isMerging || aiIsAnalyzing || isSaving}
              >
                {isSaving ? '저장 중..' : '저장하기'}
              </button>
              <button
                type="button"
                className={styles.aiButton}
                onClick={handleAiAnalyze}
                disabled={!result || isExtracting || isMerging || aiIsAnalyzing}
              >
                {aiIsAnalyzing ? 'AI 분석 중..' : 'AI 분석하기'}
              </button>
              {isMerged && mergeStatusMessage ? (
                <span className={styles.mergeMeta}>{mergeStatusMessage}</span>
              ) : null}
            </div>

            {isExtracting ? <div className={styles.statusMessage}>엑셀 추출 중..</div> : null}
            {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
            {mergeError ? <div className={styles.errorBox}>{mergeError}</div> : null}
            {saveErrorMessage ? <div className={styles.errorBox}>{saveErrorMessage}</div> : null}
            {saveSuccessMessage ? <div className={styles.successBox}>{saveSuccessMessage}</div> : null}
          </section>

          {result ? (
            <>
              <FileWarningsPanel warnings={result.warnings} />
              <WarningRowsPanel rows={warningRows} />
              <div id="section-ai">
                <AiRecommendationPanel
                  recommendations={aiRecommendations}
                  analysisMode={aiAnalysisMode}
                  activeRecommendationId={aiActiveRecommendationId}
                  isAnalyzing={aiIsAnalyzing}
                  errorMessage={aiErrorMessage}
                  onRecommendationSelect={handleAiRecommendationSelect}
                />
              </div>
              <div id="section-result">
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
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
