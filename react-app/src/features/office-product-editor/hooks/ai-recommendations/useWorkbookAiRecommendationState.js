import { startTransition, useEffect, useRef, useState } from 'react';

import { analyzeWorkbookAiRecommendations } from '../../model/ai-recommendations/workbookAiAnalysisModel';

export function useWorkbookAiRecommendationState(
  mergedRows,
  workbookFingerprint,
  officeCode,
  tableNameMode,
) {
  const [recommendations, setRecommendations] = useState([]);
  const [analysisMode, setAnalysisMode] = useState('idle');
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [activeRecommendationId, setActiveRecommendationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const activeRequestIdRef = useRef(0);
  const isAnalyzingRef = useRef(false);

  useEffect(() => {
    activeRequestIdRef.current += 1;
    isAnalyzingRef.current = false;
    setRecommendations([]);
    setAnalysisMode('idle');
    setAnalysisMessage('');
    setActiveRecommendationId(null);
    setIsLoading(false);
  }, [workbookFingerprint]);

  async function handleAnalyze() {
    if (isAnalyzingRef.current) {
      return;
    }

    isAnalyzingRef.current = true;
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;
    setIsLoading(true);

    startTransition(() => {
      setRecommendations([]);
      setAnalysisMode('idle');
      setAnalysisMessage('');
      setActiveRecommendationId(null);
    });

    try {
      const result = await analyzeWorkbookAiRecommendations(mergedRows, {
        officeCode,
        tableNameMode,
      });

      if (activeRequestIdRef.current !== requestId) {
        return;
      }

      startTransition(() => {
        setRecommendations(result.recommendations);
        setAnalysisMode(result.mode);
        setAnalysisMessage(result.message ?? '');
        setActiveRecommendationId(null);
      });
    } catch {
      if (activeRequestIdRef.current !== requestId) {
        return;
      }

      startTransition(() => {
        setRecommendations([]);
        setAnalysisMode('error');
        setAnalysisMessage('OpenAI 보조 분석에 실패했습니다.');
        setActiveRecommendationId(null);
      });
    } finally {
      if (activeRequestIdRef.current === requestId) {
        isAnalyzingRef.current = false;
        setIsLoading(false);
      }
    }
  }

  function handleRecommendationSelect(recommendationId) {
    setActiveRecommendationId((currentId) =>
      currentId === recommendationId ? null : recommendationId,
    );
  }

  return {
    recommendations,
    isLoading,
    analysisMode,
    analysisMessage,
    activeRecommendationId,
    handleAnalyze,
    handleRecommendationSelect,
  };
}
