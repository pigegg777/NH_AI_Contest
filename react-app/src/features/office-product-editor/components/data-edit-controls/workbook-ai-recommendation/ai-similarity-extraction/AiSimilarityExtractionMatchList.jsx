import primitives from '../shared/panelPrimitives.module.css';
import styles from './AiSimilarityExtractionMatchList.module.css';

export function AiSimilarityExtractionMatchList({
  recommendations,
  isLoading = false,
  analysisMode,
  analysisMessage = '',
  activeRecommendationId,
  onRecommendationSelect,
}) {
  void analysisMode;
  void analysisMessage;

  return (
    <section className={`${primitives.panel} ${primitives.compactPanel}`}>
      <div className={primitives.panelHeader}>
        <div className={styles.aiPanelHeader}>
          <h2 className={primitives.panelTitle}>AI 추천</h2>
        </div>
      </div>

      {isLoading ? (
        <p className={styles.statusMessage}>AI가 데이터를 분석하고 있습니다</p>
      ) : null}

      {!isLoading && recommendations.length > 0 ? (
        <>
          <p className={styles.filterHint}>
            카드를 클릭하면 관련된 행만 필터링해 보여줍니다. 필터를 해제하려면 테이블의 &apos;필터
            초기화&apos;를 눌러주세요.
          </p>
          <div className={styles.recommendationGrid}>
            {recommendations.map((recommendation) => {
              const isActive = recommendation.id === activeRecommendationId;

              return (
                <button
                  key={recommendation.id}
                  type="button"
                  aria-pressed={isActive}
                  className={`${primitives.recommendationCard} ${
                    isActive ? styles.recommendationCardActive : ''
                  }`.trim()}
                  onClick={() => onRecommendationSelect(recommendation.id)}
                >
                  <div className={styles.recommendationCardHeader}>
                    <strong>{recommendation.title}</strong>
                  </div>
                  <p className={styles.recommendationReason}>
                    {recommendation.reason}
                  </p>
                  <span className={styles.recommendationFooter}>
                    관련 행 {recommendation.relatedRowIds.length}건
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
