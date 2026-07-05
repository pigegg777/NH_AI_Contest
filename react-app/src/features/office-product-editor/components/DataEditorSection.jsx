import { useActiveCategoryCtx, useAiCtx, useExtractionCtx, useTableCtx } from '../contexts/editorContexts';
import { ExcelUploadPanel } from './data-edit-controls/ExcelUploadPanel';
import { WorkbookAiRecommendationPanel } from './data-edit-controls/WorkbookAiRecommendationPanel';
import styles from './DataEditorSection.module.css';

export function DataEditorSection() {
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
      <div className={styles.controlBar}>
        <div className={styles.controlColWide}>
          <div className={styles.uploadSection}>
            <ExcelUploadPanel
              onWorkbookChange={handleWorkbookChange}
              isLoading={isRegisteredProductDataLoading}
              loadingErrorMessage={registeredProductDataErrorMessage}
              fileWarnings={result?.warnings}
              warningRows={warningRows}
            />
          </div>
        </div>

        <div className={styles.controlColWide}>
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
        </div>
      </div>
    </section>
  );
}
