import { useState } from 'react';
import styles from './WorkbookAiRecommendationPanel.module.css';
import recStyles from './WorkbookAiRecommendations.module.css';

export function WorkbookAiRecommendations({
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
    <section className={`${styles.panel} ${styles.compactPanel}`}>
      <div className={styles.panelHeader}>
        <div className={recStyles.aiPanelHeader}>
          <h2 className={styles.panelTitle}>AI 추천</h2>
        </div>
      </div>

      {isLoading ? (
        <p className={styles.statusMessage}>
          AI가 데이터를 분석하고 있습니다
        </p>
      ) : null}

      {!isLoading && recommendations.length > 0 ? (
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

function NaturalLanguagePromptInput() {
  const [promptDraft, setPromptDraft] = useState('');

  return (
    <section className={`${styles.panel} ${styles.compactPanel} ${styles.promptBlock}`}>
      <div className={styles.panelHeader}>
        <h4 id="ai-natural-language-prompt-label" className={styles.panelTitle}>
          💬 자연어로 요청하기
        </h4>
      </div>
      <textarea
        id="ai-natural-language-prompt"
        aria-labelledby="ai-natural-language-prompt-label"
        className={styles.promptInput}
        value={promptDraft}
        onChange={(event) => setPromptDraft(event.target.value)}
        placeholder="예: 마진율이 낮은 상품 위주로 검토해줘"
        rows={5}
      />
    </section>
  );
}

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
}) {
  const showPanel =
    aiIsLoading || aiAnalysisMode !== 'idle' || aiRecommendations.length > 0;

  return (
    <div className={styles.tabColumns}>
      <div className={styles.tabColumnLeft}>
        <h3 className={styles.sectionTitle}>AI 분석</h3>

        <section className={`${styles.panel} ${styles.compactPanel} ${styles.autoAnalysisBlock}`}>
          <div className={styles.panelHeader}>
            <h4 className={styles.panelTitle}>⚙️ 자동 분석</h4>
          </div>
          <p className={styles.desc}>
            업로드한 데이터를 AI가 분석하여 가격과 품목명 관련 추천 사항을 제공합니다.
          </p>
          <button
            type="button"
            className={styles.aiButton}
            onClick={onAiAnalyze}
            disabled={aiDisabled || !hasRows || aiIsLoading}
          >
            AI 분석하기
          </button>
        </section>

        <NaturalLanguagePromptInput />
      </div>

      <div className={styles.tabColumnRight}>
        {showPanel ? (
          <div className={styles.recommendSection}>
            <WorkbookAiRecommendations
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
    </div>
  );
}
