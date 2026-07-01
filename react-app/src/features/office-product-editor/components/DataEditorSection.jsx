import { ExcelUploadPanel } from './data-edit-controls/ExcelUploadPanel';
import { AiRecommendPanel } from './data-edit-controls/AiRecommendPanel';
import styles from './DataEditorSection.module.css';

export function DataEditorSection({
  onWorkbookChange,
  isRegisteredProductDataLoading,
  registeredProductDataErrorMessage,
  fileWarnings,
  warningRows = [],
  resultSectionProps,
}) {
  const {
    rows,
    aiRecommendations = [],
    aiAnalysisMode = 'idle',
    aiActiveRecommendationId = null,
    onAiAnalyze,
    onAiRecommendationSelect,
    aiDisabled = false,
  } = resultSectionProps;

  return (
    <section className={styles.workspace}>
      <div className={styles.controlBar}>
        <div className={styles.controlColWide}>
          <div className={styles.uploadSection}>
            <ExcelUploadPanel
              onWorkbookChange={onWorkbookChange}
              isLoading={isRegisteredProductDataLoading}
              loadingErrorMessage={registeredProductDataErrorMessage}
              fileWarnings={fileWarnings}
              warningRows={warningRows}
            />
          </div>
        </div>

        <div className={styles.controlColWide}>
          <AiRecommendPanel
            onAiAnalyze={onAiAnalyze}
            aiDisabled={aiDisabled}
            hasRows={rows.length > 0}
            aiRecommendations={aiRecommendations}
            aiAnalysisMode={aiAnalysisMode}
            aiActiveRecommendationId={aiActiveRecommendationId}
            onAiRecommendationSelect={onAiRecommendationSelect}
          />
        </div>

      </div>
    </section>
  );
}
