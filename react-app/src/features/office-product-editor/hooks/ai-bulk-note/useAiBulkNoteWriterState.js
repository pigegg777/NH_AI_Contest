import { useRef, useState } from 'react';
import { analyzeAiBulkNoteMatches } from '../../model/ai-bulk-note/aiBulkNoteAnalysisModel';
import { AI_BULK_NOTE_REFERENCE_SHEET_MAX_ROWS } from '../../model/ai-bulk-note/aiBulkNoteRequestBodyModel';
import { AI_BULK_NOTE_PRICE_FIELD_KEYS } from '../../model/ai-bulk-note/aiBulkNoteMatchModel';
import {
  buildAiBulkNoteRowPlan,
  countAiBulkNoteRowPlan,
  createEmptyAiBulkNoteRowPlan,
  markAiBulkNoteRowPlanStaticData,
  splitAiBulkRowUpdate,
} from '../../model/ai-bulk-note/aiBulkNoteRowPlanModel';
import { fetchStaticProductLookup } from '../../services/staticProductLookupService';
import { readWorkbookSheet } from '../../services/workbookSheetReader';

const REFERENCE_SHEET_ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

function hasAllowedReferenceSheetExtension(fileName) {
  const lowerName = (fileName || '').toLowerCase();
  return REFERENCE_SHEET_ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

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
      nextRowPlan = buildAiBulkNoteRowPlan(result.newRows, rows);

      if (tableNameMode === 'fertilizer' || tableNameMode === 'pesticide') {
        const productCodes = [
          ...nextRowPlan.appended,
          ...nextRowPlan.conflicting,
          ...nextRowPlan.ambiguous,
        ].map((entry) => entry.productCode);
        let lookup = {};

        try {
          lookup = await fetchStaticProductLookup(tableNameMode, productCodes);
        } catch {
          lookup = {};
        }

        if (requestIdRef.current !== requestId) {
          return;
        }

        nextRowPlan = markAiBulkNoteRowPlanStaticData(
          nextRowPlan,
          new Set(Object.keys(lookup)),
        );
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
    matches.forEach((match) => {
      if (match.note !== undefined) {
        updateNote(match.rowId, match.note);
      }

      AI_BULK_NOTE_PRICE_FIELD_KEYS.forEach((key) => {
        if (match[key] !== undefined) {
          updatePrice(match.rowId, key, match[key]);
        }
      });
    });
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
