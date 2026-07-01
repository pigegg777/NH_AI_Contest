import { startTransition, useEffect, useState } from 'react';

import { analyzeWorkbookAiRecommendations } from '../model/ai-recommendations';

export function useWorkbookAiRecommendations(mergedRows, workbookFingerprint) {
  const [recommendations, setRecommendations] = useState([]);
  const [analysisMode, setAnalysisMode] = useState('idle');
  const [activeRecommendationId, setActiveRecommendationId] = useState(null);

  useEffect(() => {
    setRecommendations([]);
    setAnalysisMode('idle');
    setActiveRecommendationId(null);
  }, [workbookFingerprint]);

  async function handleAnalyze() {
    try {
      const result = await analyzeWorkbookAiRecommendations(mergedRows);

      startTransition(() => {
        setRecommendations(result.recommendations);
        setAnalysisMode(result.mode);
        setActiveRecommendationId(null);
      });
    } catch {
      startTransition(() => {
        setRecommendations([]);
        setAnalysisMode('error');
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
    activeRecommendationId,
    handleAnalyze,
    handleRecommendationSelect,
  };
}
