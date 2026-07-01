import panelStyles from './shared/panel.module.css';
import { DataTableSection } from './DataTableSection';
import { AIRecommendations } from './data-edit-controls/AiRecommendPanel';
import { ExcelUploadPanel } from './data-edit-controls/ExcelUploadPanel';
import { ExcelUploadDropzone } from './data-upload/ExcelUploadDropzone';
import { NewTableNameCard } from './data-upload/NewTableNameCard';
import styles from './DataUploadSection.module.css';
import sectionStyles from './DataTableSection.module.css';

export function DataUploadSection({
  tableNameCardProps,
  result,
  warningRows,
  selectedFileName,
  onWorkbookChange,
  canUploadFile,
  onFileSelected,
  resultSectionProps,
}) {
  const {
    rows,
    searchQuery,
    onSearchQueryChange,
    filters,
    filterOptions,
    onFilterChange,
    onResetFilters,
    sortState,
    onSortChange,
    tableNameMode,
    onShadowToggle,
    onVisibleRowsShadowChange,
    onNoteChange,
    onPriceChange,
    aiRecommendations = [],
    aiAnalysisMode = 'idle',
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
  } = resultSectionProps ?? {};

  const showAiPanel =
    aiAnalysisMode !== 'idle' || (aiRecommendations ?? []).length > 0;

  return (
    <>
      <div className={styles.uploadWorkspace}>
        <NewTableNameCard {...tableNameCardProps} />

          {!result && (
          <div className={styles.uploadMain}>
            <ExcelUploadDropzone
              selectedFileName={selectedFileName}
              disabled={!canUploadFile}
              disabledHint="테이블을 만든 뒤 사이드바에서 선택하면 업로드할 수 있습니다."
              onFileSelected={onFileSelected}
            />
          </div>
        )}
      </div>

      {result ? (
        <div className={styles.resultArea}>
          <div className={sectionStyles.resultPanelHeaderActions}>
            <button
              type="button"
              className={sectionStyles.aiButton}
              onClick={onAiAnalyze}
              disabled={aiDisabled || !rows?.length}
            >
              AI 분석하기
            </button>
            {onSave ? (
              <button
                type="button"
                className={sectionStyles.saveButton}
                onClick={onSave}
                disabled={!canSave || isSaving}
              >
                {isSaving ? '저장 중...' : '저장하기'}
              </button>
            ) : null}
          </div>

          {saveDisabledMessage ? (
            <div className={panelStyles.statusMessage}>
              {saveDisabledMessage}
            </div>
          ) : null}
          {saveErrorMessage ? (
            <div className={panelStyles.errorBox}>{saveErrorMessage}</div>
          ) : null}
          {saveSuccessMessage ? (
            <div className={panelStyles.successBox}>{saveSuccessMessage}</div>
          ) : null}

          {showAiPanel ? (
            <AIRecommendations
              recommendations={aiRecommendations}
              analysisMode={aiAnalysisMode}
              activeRecommendationId={aiActiveRecommendationId}
              onRecommendationSelect={onAiRecommendationSelect}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
