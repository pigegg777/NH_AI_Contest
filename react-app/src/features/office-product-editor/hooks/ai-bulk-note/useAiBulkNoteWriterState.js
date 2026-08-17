import { useRef, useState } from 'react';
import { analyzeAiBulkNoteMatches } from '../../model/ai-bulk-note/aiBulkNoteAnalysisModel';
import { AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS } from '../../model/ai-bulk-note/aiBulkNoteRequestBodyModel';
import { readWorkbookSheet } from '../../services/workbookSheetReader';

const REFERENCE_SHEET_ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

function hasAllowedReferenceSheetExtension(fileName) {
  const lowerName = (fileName || '').toLowerCase();
  return REFERENCE_SHEET_ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

export function useAiBulkNoteWriterState(officeCode, rows, tableNameMode, updateNote) {
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('idle');
  const [matches, setMatches] = useState([]);
  const [unmatchedReason, setUnmatchedReason] = useState(null);
  const [message, setMessage] = useState('');
  const [appliedCount, setAppliedCount] = useState(0);
  const [referenceSheet, setReferenceSheet] = useState(null);
  const [referenceSheetError, setReferenceSheetError] = useState(null);
  const requestIdRef = useRef(0);

  async function handleUploadReferenceSheet(file) {
    if (!file) {
      return;
    }

    if (!hasAllowedReferenceSheetExtension(file.name)) {
      setReferenceSheetError('엑셀(.xlsx, .xls) 파일만 업로드할 수 있습니다.');
      return;
    }

    let sheetName;
    let sheetRows;

    try {
      ({ sheetName, sheetRows } = await readWorkbookSheet(file));
    } catch {
      setReferenceSheetError('엑셀 파일을 읽을 수 없습니다.');
      return;
    }

    if (sheetRows.length > AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS) {
      setReferenceSheetError(`참고 엑셀은 ${AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS}행 이하만 지원합니다.`);
      return;
    }

    setReferenceSheet({ fileName: file.name, sheetName, rows: sheetRows });
    setReferenceSheetError(null);
  }

  function handleRemoveReferenceSheet() {
    setReferenceSheet(null);
    setReferenceSheetError(null);
  }

  async function handlePreview(instruction) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setAppliedCount(0);

    const result = await analyzeAiBulkNoteMatches(rows, {
      officeCode,
      tableNameMode,
      instruction,
      referenceSheet: referenceSheet
        ? { sheetName: referenceSheet.sheetName, rows: referenceSheet.rows }
        : null,
    });

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
    referenceSheet,
    referenceSheetError,
    handlePreview,
    handleApply,
    handleClear,
    handleUploadReferenceSheet,
    handleRemoveReferenceSheet,
  };
}
