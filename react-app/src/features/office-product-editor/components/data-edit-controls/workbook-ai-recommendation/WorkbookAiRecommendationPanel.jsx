import { useState } from 'react';
import { TabBar } from '../TabBar';
import { AiSimilarityExtractionPanel } from './ai-similarity-extraction/AiSimilarityExtractionPanel';
import { AiMarketResearchPromptInput } from './ai-market-research/AiMarketResearchPromptInput';
import { AiMarketResearchPanel } from './ai-market-research/AiMarketResearchPanel';
import { AiBulkNoteWriterPanel } from './ai-bulk-note/AiBulkNoteWriterPanel';
import styles from './WorkbookAiRecommendationPanel.module.css';

const AI_ANALYSIS_SUB_TABS = [
  { id: 'similarity', label: '유사상품분석' },
  { id: 'marketResearch', label: '시장조사' },
  { id: 'bulkNote', label: '일괄비고작성' },
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
}) {
  const [analysisHint, setAnalysisHint] = useState('');
  const [activeSubTabId, setActiveSubTabId] = useState('similarity');

  return (
    <div className={styles.aiSubTabs}>
      <h4 className={styles.sectionTitle}>AI 분석</h4>

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
    </div>
  );
}
