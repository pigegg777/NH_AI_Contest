import { useEffect, useRef, useState } from 'react';

import { analyzeAiMarketResearchQuery } from '../../model/ai-market-research/aiMarketResearchAnalysisModel';
import {
  readStoredAiMarketResearchState,
  writeStoredAiMarketResearchState,
} from '../../model/ai-market-research/aiMarketResearchStorageModel';

export function useAiMarketResearchState(officeCode, rows = []) {
  const [activeQuery, setActiveQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('idle');
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setIsHydrated(false);

    const stored = readStoredAiMarketResearchState(globalThis.sessionStorage, officeCode);

    setActiveQuery(stored?.activeQuery ?? '');
    setMode(stored?.mode ?? 'idle');
    setReport(stored?.report ?? null);
    setMessage(stored?.message ?? '');
    setIsHydrated(true);
  }, [officeCode]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    writeStoredAiMarketResearchState(globalThis.sessionStorage, officeCode, {
      activeQuery,
      mode,
      report,
      message,
    });
  }, [activeQuery, mode, report, message, isHydrated, officeCode]);

  async function handleMarketResearch(productQuery) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setActiveQuery(productQuery);
    setIsLoading(true);

    const result = await analyzeAiMarketResearchQuery(productQuery, { officeCode, rows });

    if (requestIdRef.current !== requestId) {
      return;
    }

    setIsLoading(false);
    setMode(result.mode);
    setReport(result.report);
    setMessage(result.message ?? '');
  }

  return { activeQuery, isLoading, mode, report, message, handleMarketResearch };
}
