import { startTransition, useEffect, useRef, useState } from 'react';

import { analyzeAiSimilarityExtractionMatches } from '../../model/ai-similarity-extraction/aiSimilarityExtractionAnalysisModel';
import {
  readStoredAiSimilarityExtractionState,
  writeStoredAiSimilarityExtractionState,
} from '../../model/ai-similarity-extraction/aiSimilarityExtractionStorageModel';

export function useAiSimilarityExtractionState(
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
  const [isHydrated, setIsHydrated] = useState(false);
  const activeRequestIdRef = useRef(0);
  const isAnalyzingRef = useRef(false);

  useEffect(() => {
    activeRequestIdRef.current += 1;
    isAnalyzingRef.current = false;
    setIsLoading(false);
    setIsHydrated(false);

    const stored = readStoredAiSimilarityExtractionState(
      globalThis.sessionStorage,
      workbookFingerprint,
    );

    setRecommendations(stored?.recommendations ?? []);
    setAnalysisMode(stored?.analysisMode ?? 'idle');
    setAnalysisMessage(stored?.analysisMessage ?? '');
    setActiveRecommendationId(stored?.activeRecommendationId ?? null);
    setIsHydrated(true);
  }, [workbookFingerprint]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    writeStoredAiSimilarityExtractionState(globalThis.sessionStorage, workbookFingerprint, {
      recommendations,
      analysisMode,
      analysisMessage,
      activeRecommendationId,
    });
  }, [
    recommendations,
    analysisMode,
    analysisMessage,
    activeRecommendationId,
    isHydrated,
    workbookFingerprint,
  ]);

  async function handleAnalyze(userHint) {
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
      const result = await analyzeAiSimilarityExtractionMatches(mergedRows, {
        officeCode,
        tableNameMode,
        userHint,
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

  function clearActiveRecommendation() {
    setActiveRecommendationId(null);
  }

  return {
    recommendations,
    isLoading,
    analysisMode,
    analysisMessage,
    activeRecommendationId,
    handleAnalyze,
    handleRecommendationSelect,
    clearActiveRecommendation,
  };
}
