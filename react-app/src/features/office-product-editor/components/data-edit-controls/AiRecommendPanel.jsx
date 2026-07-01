import panelStyles from '../shared/panel.module.css';
import styles from './AiRecommendPanel.module.css';
import recStyles from './AIRecommendations.module.css';

function countRecommendationsBySeverity(recommendations) {
  return recommendations.reduce(
    (counts, recommendation) => {
      const severity = recommendation.severity;

      if (severity === 'high' || severity === 'medium' || severity === 'low') {
        counts[severity] += 1;
      }

      return counts;
    },
    { high: 0, medium: 0, low: 0 },
  );
}

export function AIRecommendations({
  recommendations,
  analysisMode,
  activeRecommendationId,
  onRecommendationSelect,
}) {
  const severityCounts = countRecommendationsBySeverity(recommendations);

  return (
    <section className={`${panelStyles.panel} ${panelStyles.compactPanel}`}>
      <div className={panelStyles.panelHeader}>
        <div className={recStyles.aiPanelHeader}>
          <h2 className={panelStyles.panelTitle}>AI 추천</h2>
          {analysisMode === 'unavailable' ? (
            <span className={recStyles.aiBadge}>AI off</span>
          ) : null}
        </div>
        <span className={panelStyles.panelMeta}>
          {recommendations.length}건 추천
        </span>
      </div>

      <div className={recStyles.recommendationSummary}>
        <span className={recStyles.recommendationStat}>
          높음 {severityCounts.high}
        </span>
        <span className={recStyles.recommendationStat}>
          중간 {severityCounts.medium}
        </span>
        <span className={recStyles.recommendationStat}>
          낮음 {severityCounts.low}
        </span>
      </div>

      {recommendations.length === 0 ? (
        <p className={panelStyles.aiEmptyState}>
          아직 AI 분석 결과가 없습니다.
        </p>
      ) : null}

      {recommendations.length > 0 ? (
        <div className={recStyles.recommendationGrid}>
          {recommendations.map((recommendation) => {
            const isActive = recommendation.id === activeRecommendationId;

            return (
              <button
                key={recommendation.id}
                type="button"
                aria-pressed={isActive}
                className={`${recStyles.recommendationCard} ${
                  isActive ? recStyles.recommendationCardActive : ''
                }`.trim()}
                onClick={() => onRecommendationSelect(recommendation.id)}
              >
                <div className={recStyles.recommendationCardHeader}>
                  <strong>{recommendation.title}</strong>
                  <span className={recStyles.recommendationSeverity}>
                    {recommendation.severity}
                  </span>
                </div>
                <p className={recStyles.recommendationReason}>
                  {recommendation.reason}
                </p>
                <span className={recStyles.recommendationFooter}>
                  관련 행 {recommendation.relatedRowIds.length}건
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function AiRecommendPanel({
  onAiAnalyze,
  aiDisabled,
  hasRows,
  aiRecommendations = [],
  aiAnalysisMode = 'idle',
  aiActiveRecommendationId = null,
  onAiRecommendationSelect,
}) {
  const showPanel = aiAnalysisMode !== 'idle' || aiRecommendations.length > 0;

  return (
    <>
      <h3 className={styles.sectionTitle}>🤖 AI 분석</h3>
      <p className={styles.desc}>
        ✨ 업로드된 데이터를 AI가 분석하여 가격·품목 추천 사항을 제공합니다.
      </p>
      <button
        type="button"
        className={styles.aiButton}
        onClick={onAiAnalyze}
        disabled={aiDisabled || !hasRows}
      >
        AI 분석하기
      </button>
      {showPanel ? (
        <div className={styles.recommendSection}>
          <AIRecommendations
            recommendations={aiRecommendations}
            analysisMode={aiAnalysisMode}
            activeRecommendationId={aiActiveRecommendationId}
            onRecommendationSelect={onAiRecommendationSelect}
          />
        </div>
      ) : null}
    </>
  );
}
