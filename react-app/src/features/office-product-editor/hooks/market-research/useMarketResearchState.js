import { useEffect, useRef, useState } from 'react';

import { analyzeMarketResearchQuery } from '../../model/market-research/marketResearchAnalysisModel';
import {
  readStoredMarketResearchState,
  writeStoredMarketResearchState,
} from '../../model/market-research/marketResearchStorageModel';

export function useMarketResearchState(officeCode, rows = []) {
  const [activeQuery, setActiveQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('idle');
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setIsHydrated(false);

    const stored = readStoredMarketResearchState(globalThis.sessionStorage, officeCode);

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

    writeStoredMarketResearchState(globalThis.sessionStorage, officeCode, {
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

    const result = await analyzeMarketResearchQuery(productQuery, { officeCode, rows });

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
