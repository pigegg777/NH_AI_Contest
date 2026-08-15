import { useRef, useState } from 'react';
import { analyzeBulkNoteMatches } from '../../model/bulk-note/bulkNoteAnalysisModel';

export function useBulkNoteWriterState(officeCode, rows, tableNameMode, updateNote) {
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('idle');
  const [matches, setMatches] = useState([]);
  const [unmatchedReason, setUnmatchedReason] = useState(null);
  const [message, setMessage] = useState('');
  const [appliedCount, setAppliedCount] = useState(0);
  const requestIdRef = useRef(0);

  async function handlePreview(instruction) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setAppliedCount(0);

    const result = await analyzeBulkNoteMatches(rows, { officeCode, tableNameMode, instruction });

    if (requestIdRef.current !== requestId) {
      return;
    }

    setIsLoading(false);
    setMode(result.mode);
    setMatches(result.matches);
    setUnmatchedReason(result.unmatchedReason ?? null);
    setMessage(result.message ?? '');
  }

  function handleApply() {
    matches.forEach((match) => updateNote(match.rowId, match.note));
    setAppliedCount(matches.length);
    setMatches([]);
    setUnmatchedReason(null);
    setMode('idle');
  }

  function handleClear() {
    setMatches([]);
    setUnmatchedReason(null);
    setMode('idle');
    setMessage('');
    setAppliedCount(0);
  }

  return {
    isLoading,
    mode,
    matches,
    unmatchedReason,
    message,
    appliedCount,
    handlePreview,
    handleApply,
    handleClear,
  };
}
