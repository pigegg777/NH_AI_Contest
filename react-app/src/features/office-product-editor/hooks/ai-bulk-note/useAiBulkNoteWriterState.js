import { useRef, useState } from 'react';
import { analyzeAiBulkNoteMatches } from '../../model/ai-bulk-note/aiBulkNoteAnalysisModel';
import {
  AI_BULK_NOTE_REFERENCE_SHEET_ERROR,
  readAiBulkNoteReferenceSheet,
} from '../../model/ai-bulk-note/aiBulkNoteReferenceSheetModel';
import { AI_BULK_NOTE_PRICE_FIELD_KEYS } from '../../model/ai-bulk-note/aiBulkNoteMatchModel';
import {
  buildAiBulkNoteRowPlan,
  countAiBulkNoteRowPlan,
  createEmptyAiBulkNoteRowPlan,
  resolveAiBulkNoteRowPlanStaticData,
  splitAiBulkRowUpdate,
} from '../../model/ai-bulk-note/aiBulkNoteRowPlanModel';

const REFERENCE_SHEET_ERROR_MESSAGES = {
  [AI_BULK_NOTE_REFERENCE_SHEET_ERROR.UNSUPPORTED_EXTENSION]: () =>
    '엑셀(.xlsx, .xls) 파일만 업로드할 수 있습니다.',
  [AI_BULK_NOTE_REFERENCE_SHEET_ERROR.UNREADABLE]: () => '엑셀 파일을 읽을 수 없습니다.',
  [AI_BULK_NOTE_REFERENCE_SHEET_ERROR.TOO_MANY_ROWS]: (maxRows) =>
    `참고 엑셀은 ${maxRows}행 이하만 지원합니다.`,
};

function normalizeWriterOptions(optionsOrOfficeCode, rows, tableNameMode, updateNote, updatePrice) {
  return optionsOrOfficeCode && typeof optionsOrOfficeCode === 'object'
    ? optionsOrOfficeCode
    : { officeCode: optionsOrOfficeCode, rows, tableNameMode, updateNote, updatePrice };
}

export function useAiBulkNoteWriterState(
  optionsOrOfficeCode,
  legacyRows,
  legacyTableNameMode,
  legacyUpdateNote,
  legacyUpdatePrice,
) {
  const {
    officeCode,
    rows = [],
    tableNameMode,
    updateNote = () => {},
    updatePrice = () => {},
    setShadowForRows = () => {},
    appendRows = () => {},
    patchRows = () => {},
  } = normalizeWriterOptions(
    optionsOrOfficeCode,
    legacyRows,
    legacyTableNameMode,
    legacyUpdateNote,
    legacyUpdatePrice,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('idle');
  const [matches, setMatches] = useState([]);
  const [unmatchedReason, setUnmatchedReason] = useState(null);
  const [message, setMessage] = useState('');
  const [appliedCount, setAppliedCount] = useState(0);
  const [referenceSheet, setReferenceSheet] = useState(null);
  const [referenceSheetError, setReferenceSheetError] = useState(null);
  const [action, setAction] = useState('none');
  const [rowPlan, setRowPlan] = useState(createEmptyAiBulkNoteRowPlan);
  const [ambiguousSelection, setAmbiguousSelection] = useState(() => new Set());
  const [appliedSummary, setAppliedSummary] = useState('');
  const requestIdRef = useRef(0);

  async function handleUploadReferenceSheet(file) {
    if (!file) {
      return;
    }

    const { referenceSheet: readSheet, error, maxRows } =
      await readAiBulkNoteReferenceSheet(file);

    if (error) {
      setReferenceSheetError(REFERENCE_SHEET_ERROR_MESSAGES[error](maxRows));
      return;
    }

    setReferenceSheet(readSheet);
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
    setAppliedSummary('');

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
    const nextAction =
      result.action ??
      (Array.isArray(result.matches) && result.matches.length > 0
        ? 'edit_rows'
        : 'none');
    let nextRowPlan = createEmptyAiBulkNoteRowPlan();

    if (nextAction === 'append_rows') {
      nextRowPlan = await resolveAiBulkNoteRowPlanStaticData(
        buildAiBulkNoteRowPlan(result.newRows, rows),
        tableNameMode,
      );

      if (requestIdRef.current !== requestId) {
        return;
      }
    }

    setAction(nextAction);
    setRowPlan(nextRowPlan);
    setAmbiguousSelection(new Set());
    setMode(result.mode);
    setMatches(nextAction === 'edit_rows' ? result.matches : []);
    setUnmatchedReason(result.unmatchedReason ?? null);
    setMessage(result.message ?? '');
  }

  function handleApply() {
    const rowIdsToHide = [];
    const rowIdsToShow = [];

    matches.forEach((match) => {
      if (match.note !== undefined) {
        updateNote(match.rowId, match.note);
      }

      AI_BULK_NOTE_PRICE_FIELD_KEYS.forEach((key) => {
        if (match[key] !== undefined) {
          updatePrice(match.rowId, key, match[key]);
        }
      });

      if (match.shadow !== undefined) {
        (match.shadow ? rowIdsToHide : rowIdsToShow).push(match.rowId);
      }
    });

    // Collected first, then written in one call per value: every annotation
    // setter rewrites the whole annotation map, so a per-row call would
    // rebuild it once per match.
    if (rowIdsToHide.length > 0) {
      setShadowForRows(rowIdsToHide, true);
    }
    if (rowIdsToShow.length > 0) {
      setShadowForRows(rowIdsToShow, false);
    }

    setAppliedCount(matches.length);
    setMatches([]);
    setUnmatchedReason(null);
    setMode('idle');
  }

  function handleToggleAmbiguousTarget(productCode, rowId) {
    const key = `${productCode}::${rowId}`;
    setAmbiguousSelection((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function applyRowUpdate(entry, targetRow) {
    const { annotationPatch, rowPatch } = splitAiBulkRowUpdate(entry.newRow);

    if (annotationPatch.note !== undefined) {
      updateNote(targetRow.row_id, annotationPatch.note);
    }
    for (const key of AI_BULK_NOTE_PRICE_FIELD_KEYS) {
      if (annotationPatch[key] !== undefined) {
        updatePrice(targetRow.row_id, key, annotationPatch[key]);
      }
    }

    return rowPatch;
  }

  function handleApplyRowPlan({ includeConflicts = false } = {}) {
    const appended = rowPlan.appended.map((entry) => entry.row);
    const patches = {};
    let updatedCount = 0;

    if (includeConflicts) {
      for (const entry of rowPlan.conflicting) {
        patches[entry.targetRow.row_id] = applyRowUpdate(entry, entry.targetRow);
        updatedCount += 1;
      }

      for (const entry of rowPlan.ambiguous) {
        for (const targetRow of entry.targetRows) {
          if (ambiguousSelection.has(`${entry.productCode}::${targetRow.row_id}`)) {
            patches[targetRow.row_id] = applyRowUpdate(entry, targetRow);
            updatedCount += 1;
          }
        }
      }
    }

    appendRows(appended);
    patchRows(patches);
    setAppliedSummary(
      [
        appended.length > 0 ? `${appended.length}개 상품을 추가했습니다.` : '',
        updatedCount > 0 ? `${updatedCount}개 상품을 갱신했습니다.` : '',
      ].filter(Boolean).join(' '),
    );
    setRowPlan(createEmptyAiBulkNoteRowPlan());
    setAmbiguousSelection(new Set());
    setAction('none');
    setMode('idle');
  }

  function handleClear() {
    setMatches([]);
    setUnmatchedReason(null);
    setMode('idle');
    setMessage('');
    setAppliedCount(0);
    setAction('none');
    setRowPlan(createEmptyAiBulkNoteRowPlan());
    setAmbiguousSelection(new Set());
    setAppliedSummary('');
  }

  return {
    isLoading,
    mode,
    matches,
    unmatchedReason,
    message,
    appliedCount,
    action,
    rowPlan,
    rowPlanCount: countAiBulkNoteRowPlan(rowPlan),
    ambiguousSelection,
    selectedAmbiguousCount: ambiguousSelection.size,
    appliedSummary,
    referenceSheet,
    referenceSheetError,
    handlePreview,
    handleApply,
    handleApplyRowPlan,
    handleToggleAmbiguousTarget,
    handleClear,
    handleUploadReferenceSheet,
    handleRemoveReferenceSheet,
  };
}
