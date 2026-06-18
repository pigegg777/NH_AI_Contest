import { getTableColumnsByMode } from '../../model/table';
import panelStyles from '../shared/panel.module.css';
import { WorkbookReviewFilters } from './review-table-ui/WorkbookReviewFilters';
import { WorkbookReviewRecommendations } from './review-table-ui/WorkbookReviewRecommendations';
import { WorkbookReviewTable } from './review-table-ui/WorkbookReviewTable';
import styles from './WorkbookReviewTableSection.module.css';

export function WorkbookReviewTableSection({
  rows,
  searchQuery,
  onSearchQueryChange,
  filters,
  filterOptions,
  onFilterChange,
  onResetFilters,
  sortState,
  onSortChange,
  onShadowToggle,
  onVisibleRowsShadowChange,
  onNoteChange,
  onPriceChange,
  tableNameMode,
  aiRecommendations = [],
  aiAnalysisMode = 'idle',
  aiIsAnalyzing = false,
  aiErrorMessage = '',
  aiActiveRecommendationId = null,
  onAiAnalyze,
  onAiRecommendationSelect,
  aiDisabled = false,
  onSave,
  canSave = false,
  isSaving = false,
  saveErrorMessage = '',
  saveSuccessMessage = '',
  saveDisabledMessage = '',
  onResetData,
  isResetting = false,
}) {
  const columns = getTableColumnsByMode(tableNameMode);
  const showAiPanel =
    aiAnalysisMode !== 'idle' ||
    aiIsAnalyzing ||
    Boolean(aiErrorMessage) ||
    aiRecommendations.length > 0;

  function handleResetClick() {
    if (
      !window.confirm(
        '데이터를 초기화하면 저장된 내용을 모두 삭제하고 복구할 수 없습니다. 계속할까요?',
      )
    ) {
      return;
    }

    onResetData?.();
  }

  return (
    <section
      id="section-result"
      className={`${panelStyles.panel} ${styles.resultSection}`.trim()}
    >
      <div className={panelStyles.panelHeader}>
        <div className={styles.resultPanelHeaderMain}>
          <h2 className={panelStyles.panelTitle}>집계 결과</h2>
          <span className={panelStyles.panelMeta}>{rows.length}건 표시</span>
        </div>

        <div className={styles.resultPanelHeaderActions}>
          {onSave ? (
            <button
              type="button"
              className={styles.saveButton}
              onClick={onSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          ) : null}

          {onResetData ? (
            <button
              type="button"
              className={styles.dangerButton}
              onClick={handleResetClick}
              disabled={isResetting || rows.length === 0}
            >
              {isResetting ? '초기화 중...' : '데이터 초기화'}
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.resultControlStack}>
        {saveDisabledMessage ? (
          <div className={panelStyles.statusMessage}>{saveDisabledMessage}</div>
        ) : null}
        {saveErrorMessage ? (
          <div className={panelStyles.errorBox}>{saveErrorMessage}</div>
        ) : null}
        {saveSuccessMessage ? (
          <div className={panelStyles.successBox}>{saveSuccessMessage}</div>
        ) : null}

        {showAiPanel ? (
          <WorkbookReviewRecommendations
            recommendations={aiRecommendations}
            analysisMode={aiAnalysisMode}
            activeRecommendationId={aiActiveRecommendationId}
            isAnalyzing={aiIsAnalyzing}
            errorMessage={aiErrorMessage}
            onRecommendationSelect={onAiRecommendationSelect}
          />
        ) : null}

        <WorkbookReviewFilters
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={onFilterChange}
          onResetFilters={onResetFilters}
          onAiAnalyze={onAiAnalyze}
          aiDisabled={aiDisabled}
          aiIsAnalyzing={aiIsAnalyzing}
          hasRows={rows.length > 0}
        />
      </div>

      <WorkbookReviewTable
        rows={rows}
        columns={columns}
        tableNameMode={tableNameMode}
        sortState={sortState}
        onSortChange={onSortChange}
        onShadowToggle={onShadowToggle}
        onVisibleRowsShadowChange={onVisibleRowsShadowChange}
        onNoteChange={onNoteChange}
        onPriceChange={onPriceChange}
      />
    </section>
  );
}
