import { AiSimilarityExtractionMatchList } from './AiSimilarityExtractionMatchList';
import primitives from '../shared/panelPrimitives.module.css';
import styles from './AiSimilarityExtractionPanel.module.css';

export function AiSimilarityExtractionPanel({
  analysisHint,
  onAnalysisHintChange,
  onAiAnalyze,
  aiDisabled,
  hasRows,
  aiIsLoading,
  aiRecommendations,
  aiAnalysisMode,
  aiAnalysisMessage,
  aiActiveRecommendationId,
  onAiRecommendationSelect,
}) {
  const showPanel =
    aiIsLoading || aiAnalysisMode !== 'idle' || aiRecommendations.length > 0;

  return (
    <div className={primitives.aiSubTabPanel}>
      <section
        className={`${primitives.panel} ${primitives.compactPanel} ${styles.autoAnalysisBlock}`}
      >
        <div className={primitives.panelHeader}>
          <h4 className={primitives.panelTitle}>⚙️ 요청사항 입력</h4>
        </div>
        <p className={styles.desc}>
          요청사항을 바탕으로 AI가 유사상품을 추출합니다.
        </p>
        <div className={primitives.promptRow}>
          <textarea
            id="ai-analysis-hint"
            aria-label="AI 분석 참고사항"
            className={primitives.promptInput}
            value={analysisHint}
            onChange={(event) => onAnalysisHintChange(event.target.value)}
            placeholder="예: 필름과 비닐은 같은 상품으로 봐주세요 (선택)"
            rows={1}
          />
          <button
            type="button"
            className={styles.aiButton}
            onClick={() => onAiAnalyze(analysisHint)}
            disabled={aiDisabled || !hasRows || aiIsLoading}
          >
            AI 분석하기
          </button>
        </div>
      </section>

      {showPanel ? (
        <div className={styles.recommendSection}>
          <AiSimilarityExtractionMatchList
            recommendations={aiRecommendations}
            isLoading={aiIsLoading}
            analysisMode={aiAnalysisMode}
            analysisMessage={aiAnalysisMessage}
            activeRecommendationId={aiActiveRecommendationId}
            onRecommendationSelect={onAiRecommendationSelect}
          />
        </div>
      ) : null}
    </div>
  );
}
