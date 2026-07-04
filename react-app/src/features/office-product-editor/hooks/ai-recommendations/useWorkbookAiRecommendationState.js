import { startTransition, useEffect, useState } from 'react';

import { analyzeWorkbookAiRecommendations } from '../../model/ai-recommendations/workbookAiAnalysisModel';

export function useWorkbookAiRecommendationState(
  mergedRows,
  workbookFingerprint,
  officeCode,
) {
  const [recommendations, setRecommendations] = useState([]);
  const [analysisMode, setAnalysisMode] = useState('idle');
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [activeRecommendationId, setActiveRecommendationId] = useState(null);

  useEffect(() => {
    setRecommendations([]);
    setAnalysisMode('idle');
    setAnalysisMessage('');
    setActiveRecommendationId(null);
  }, [workbookFingerprint]);

  async function handleAnalyze() {
    try {
      const result = await analyzeWorkbookAiRecommendations(mergedRows, { officeCode });

      startTransition(() => {
        setRecommendations(result.recommendations);
        setAnalysisMode(result.mode);
        setAnalysisMessage(result.message ?? '');
        setActiveRecommendationId(null);
      });
    } catch {
      startTransition(() => {
        setRecommendations([]);
        setAnalysisMode('error');
        setAnalysisMessage('OpenAI 보조 분석에 실패했습니다.');
        setActiveRecommendationId(null);
      });
    }
  }

  function handleRecommendationSelect(recommendationId) {
    setActiveRecommendationId((currentId) =>
      currentId === recommendationId ? null : recommendationId,
    );
  }

  return {
    recommendations,
    analysisMode,
    analysisMessage,
    activeRecommendationId,
    handleAnalyze,
    handleRecommendationSelect,
  };
}
