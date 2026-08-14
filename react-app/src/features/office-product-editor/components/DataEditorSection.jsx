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
