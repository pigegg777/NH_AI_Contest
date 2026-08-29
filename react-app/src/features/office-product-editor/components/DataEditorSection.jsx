import { useState } from 'react';
import {
  useActiveCategoryCtx,
  useAiCtx,
  useExtractionCtx,
  useTableCtx,
  useUploadCtx,
} from '../contexts/editorContexts';
import { TabBar } from './data-edit-controls/TabBar';
import { ExcelUploadPanel } from './data-edit-controls/excel-upload/ExcelUploadPanel';
import { FileWarningsPanel } from './data-edit-controls/excel-upload/FileWarningsPanel';
import { WorkbookAiRecommendationPanel } from './data-edit-controls/workbook-ai-recommendation/WorkbookAiRecommendationPanel';
import { AiBulkNoteWriterPanel } from './data-edit-controls/workbook-ai-recommendation/ai-bulk-note/AiBulkNoteWriterPanel';
import { AiFeatureNotice } from './data-edit-controls/workbook-ai-recommendation/shared/AiFeatureNotice';
import styles from './DataEditorSection.module.css';

const TABS = [
  { id: 'upload', label: '엑셀 업로드' },
  { id: 'ai', label: 'AI 작업실' },
];

const UPLOAD_TABS = [
  { id: 'workbook', label: '엑셀 양식 데이터 업로드' },
  { id: 'aiBulkEdit', label: 'AI 데이터 추가·수정' },
];

export function DataEditorSection() {
  const [activeTabId, setActiveTabId] = useState('upload');
  const [activeUploadTabId, setActiveUploadTabId] = useState('workbook');
  const { handleWorkbookChange, result } = useExtractionCtx();
  const { isRegisteredProductDataLoading, registeredProductDataErrorMessage } =
    useActiveCategoryCtx();
  const { rows, warningRows } = useTableCtx();
  const { carryOver } = useUploadCtx();
  const {
    recommendations: aiRecommendations,
    isLoading: aiIsLoading = false,
    analysisMode: aiAnalysisMode,
    analysisMessage: aiAnalysisMessage,
    activeRecommendationId: aiActiveRecommendationId,
    handleAnalyze: onAiAnalyze,
    handleRecommendationSelect: onAiRecommendationSelect,
    marketResearch,
    bulkNoteWriter,
    imageApply,
  } = useAiCtx();

  return (
    <section className={styles.workspace}>
      <div className={styles.tabPanelWrap}>
        <TabBar
          tabs={TABS}
          activeTabId={activeTabId}
          onTabChange={setActiveTabId}
        />

        <div role="tabpanel" className={styles.tabPanel}>
          {activeTabId === 'upload' ? (
            <div className={styles.uploadWorkspace}>
              <h4 className={styles.sectionTitle}>엑셀 업로드</h4>

              <div className={styles.uploadColumns}>
                <div className={styles.uploadRegistrationColumn}>
                  <TabBar
                    tabs={UPLOAD_TABS}
                    activeTabId={activeUploadTabId}
                    onTabChange={setActiveUploadTabId}
                  />
                  <AiFeatureNotice
                    featureId={
                      activeUploadTabId === 'workbook' ? 'excelUpload' : 'bulkNote'
                    }
                  />
                  {activeUploadTabId === 'workbook' ? (
                    <ExcelUploadPanel
                      onWorkbookChange={handleWorkbookChange}
                      isLoading={isRegisteredProductDataLoading}
                      loadingErrorMessage={registeredProductDataErrorMessage}
                      carryOver={carryOver}
                      showWarnings={false}
                    />
                  ) : (
                    <AiBulkNoteWriterPanel bulkNoteWriter={bulkNoteWriter} />
                  )}
                </div>

                <aside
                  className={styles.warningColumn}
                  role="region"
                  aria-label="데이터 경고"
                >
                  <h4 className={styles.columnLabel}>데이터 경고</h4>
                  <FileWarningsPanel
                    fileWarnings={result?.warnings}
                    warningRows={warningRows}
                  />
                </aside>
              </div>
            </div>
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
              marketResearch={marketResearch}
              imageApply={imageApply}
            />
          )}
        </div>
      </div>
    </section>
  );
}
