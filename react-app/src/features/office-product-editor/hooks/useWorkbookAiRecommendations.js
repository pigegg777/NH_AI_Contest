import { startTransition, useEffect, useState } from 'react';

import { analyzeWorkbookAiRecommendations } from '../model/ai-recommendations';

const AI_ANALYSIS_ERROR_MESSAGE = 'AI 추천 분석 중 오류가 발생했습니다.';

/**
 * Analyzes a fixed snapshot of `mergedRows` — independent of the caller's
 * current search/filter/sort view, since it only ever sees what it's given.
 */
export function useWorkbookAiRecommendations(mergedRows, workbookFingerprint) {
  const [recommendations, setRecommendations] = useState([]);
  const [analysisMode, setAnalysisMode] = useState('idle');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeRecommendationId, setActiveRecommendationId] = useState(null);

  useEffect(() => {
    setRecommendations([]);
    setAnalysisMode('idle');
    setIsAnalyzing(false);
    setErrorMessage('');
    setActiveRecommendationId(null);
  }, [workbookFingerprint]);

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setErrorMessage('');

    try {
      const result = await analyzeWorkbookAiRecommendations(mergedRows);

      startTransition(() => {
        setRecommendations(result.recommendations);
        setAnalysisMode(result.mode);
        setActiveRecommendationId(null);
      });
      setErrorMessage(result.message ?? '');
    } catch (error) {
      startTransition(() => {
        setRecommendations([]);
        setAnalysisMode('error');
        setActiveRecommendationId(null);
      });
      setErrorMessage(error instanceof Error ? error.message : AI_ANALYSIS_ERROR_MESSAGE);
    } finally {
      setIsAnalyzing(false);
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
    isAnalyzing,
    errorMessage,
    activeRecommendationId,
    handleAnalyze,
    handleRecommendationSelect,
  };
}
