import { useState } from 'react';
import { TabBar } from '../TabBar';
import { AiSimilarityExtractionPanel } from './ai-similarity-extraction/AiSimilarityExtractionPanel';
import { AiMarketResearchPromptInput } from './ai-market-research/AiMarketResearchPromptInput';
import { AiMarketResearchPanel } from './ai-market-research/AiMarketResearchPanel';
import { AiBulkNoteWriterPanel } from './ai-bulk-note/AiBulkNoteWriterPanel';
import { AiImageApplyPanel } from './ai-image-apply/AiImageApplyPanel';
import styles from './WorkbookAiRecommendationPanel.module.css';

const AI_ANALYSIS_SUB_TABS = [
  { id: 'similarity', label: 'AI 유사상품 유효성검사' },
  { id: 'marketResearch', label: 'AI 시장조사' },
  { id: 'bulkNote', label: 'AI 일괄 데이터수정' },
  { id: 'imageApply', label: 'AI 상품이미지생성 적용' },
];

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
  marketResearch,
  bulkNoteWriter,
  imageApply,
}) {
  const [analysisHint, setAnalysisHint] = useState('');
  const [activeSubTabId, setActiveSubTabId] = useState('similarity');

  return (
    <div className={styles.aiSubTabs}>
      <h4 className={styles.sectionTitle}>AI 작업실</h4>

      <TabBar
        tabs={AI_ANALYSIS_SUB_TABS}
        activeTabId={activeSubTabId}
        onTabChange={setActiveSubTabId}
      />

      {activeSubTabId === 'similarity' ? (
        <AiSimilarityExtractionPanel
          analysisHint={analysisHint}
          onAnalysisHintChange={setAnalysisHint}
          onAiAnalyze={onAiAnalyze}
          aiDisabled={aiDisabled}
          hasRows={hasRows}
          aiIsLoading={aiIsLoading}
          aiRecommendations={aiRecommendations}
          aiAnalysisMode={aiAnalysisMode}
          aiAnalysisMessage={aiAnalysisMessage}
          aiActiveRecommendationId={aiActiveRecommendationId}
          onAiRecommendationSelect={onAiRecommendationSelect}
        />
      ) : null}

      {activeSubTabId === 'marketResearch' ? (
        <div className={styles.aiSubTabPanel}>
          <AiMarketResearchPromptInput marketResearch={marketResearch} />
          <AiMarketResearchPanel marketResearch={marketResearch} />
        </div>
      ) : null}

      {activeSubTabId === 'bulkNote' ? (
        <div className={styles.aiSubTabPanel}>
          <AiBulkNoteWriterPanel bulkNoteWriter={bulkNoteWriter} />
        </div>
      ) : null}

      {activeSubTabId === 'imageApply' ? (
        <div className={styles.aiSubTabPanel}>
          <AiImageApplyPanel imageApply={imageApply} />
        </div>
      ) : null}
    </div>
  );
}
