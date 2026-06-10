import styles from '../pages/ExcelExtractWorkbookReviewPage.module.css';

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

export function AiRecommendationPanel({
  recommendations,
  analysisMode,
  activeRecommendationId,
  isAnalyzing,
  errorMessage,
  onRecommendationSelect,
}) {
  const severityCounts = countRecommendationsBySeverity(recommendations);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.aiPanelHeader}>
          <h2 className={styles.panelTitle}>AI 추천</h2>
          {analysisMode === 'unavailable' ? <span className={styles.aiBadge}>AI off</span> : null}
        </div>
        <span className={styles.panelMeta}>{recommendations.length}건 추천</span>
      </div>

      <div className={styles.recommendationSummary}>
        <span className={styles.recommendationStat}>높음 {severityCounts.high}</span>
        <span className={styles.recommendationStat}>중간 {severityCounts.medium}</span>
        <span className={styles.recommendationStat}>낮음 {severityCounts.low}</span>
      </div>

      {isAnalyzing ? <div className={styles.statusMessage}>AI 추천 분석 중...</div> : null}
      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}

      {!isAnalyzing && !errorMessage && recommendations.length === 0 ? (
        <p className={styles.aiEmptyState}>아직 AI 분석 결과가 없습니다.</p>
      ) : null}

      {recommendations.length > 0 ? (
        <div className={styles.recommendationGrid}>
          {recommendations.map((recommendation) => {
            const isActive = recommendation.id === activeRecommendationId;

            return (
              <button
                key={recommendation.id}
                type="button"
                aria-pressed={isActive}
                className={`${styles.recommendationCard} ${
                  isActive ? styles.recommendationCardActive : ''
                }`.trim()}
                onClick={() => onRecommendationSelect(recommendation.id)}
              >
                <div className={styles.recommendationCardHeader}>
                  <strong>{recommendation.title}</strong>
                  <span className={styles.recommendationSeverity}>{recommendation.severity}</span>
                </div>
                <p className={styles.recommendationReason}>{recommendation.reason}</p>
                <span className={styles.recommendationFooter}>
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
