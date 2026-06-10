import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { toLowerTrimmedString } from '../../../common/utils/text';

import { mergeRowsWithAnnotations } from '../model/annotations/annotationModel';
import {
  getStaticFertilizerProductCodes,
  mergeRowsWithStaticFertilizer,
} from '../model/enrichment/staticFertilizerMergeModel';
import {
  buildTableModel,
  createInitialFilters,
  createInitialSortState,
} from '../model/table';
import { fetchStaticFertilizerLookup } from '../services/staticFertilizerLookupService';
import {
  readStoredAnnotations,
  writeStoredAnnotations,
} from '../services/workbookReviewAnnotationStorage';

function buildRowIdentityKey(rows) {
  return rows.map((row) => row?.row_id ?? '').join('|');
}

function buildMergeStatusMessage(mergeSummary) {
  if (!mergeSummary) {
    return '';
  }

  return `병합 완료 ${mergeSummary.matched}/${mergeSummary.requested}`;
}

const EMPTY_ANNOTATION = { shadow: false, note: '' };

/**
 * Owns the row-transformation chain for a single workbook:
 *   extractedRows -> annotatedRows -> mergedRows -> displayed rows
 * `mergedRows` is the stable output that parallel consumers (AI recommendations,
 * save) take as their own input.
 */
export function useWorkbookReviewTableState(
  extractedRows,
  workbookFingerprint,
  { isStaticMergeEnabled = false } = {},
) {
  const [annotations, setAnnotations] = useState({});
  const [isAnnotationsHydrated, setIsAnnotationsHydrated] = useState(false);
  const rowIdentityKey = useMemo(() => buildRowIdentityKey(extractedRows), [extractedRows]);

  useEffect(() => {
    setIsAnnotationsHydrated(false);
    setAnnotations(
      readStoredAnnotations(globalThis.sessionStorage, workbookFingerprint, extractedRows),
    );
    setIsAnnotationsHydrated(true);
  }, [rowIdentityKey, workbookFingerprint]);

  useEffect(() => {
    if (!isAnnotationsHydrated) {
      return;
    }

    writeStoredAnnotations(globalThis.sessionStorage, workbookFingerprint, annotations);
  }, [annotations, isAnnotationsHydrated, workbookFingerprint]);

  function updateAnnotation(rowId, updater) {
    if (!rowId) {
      return;
    }

    setAnnotations((currentAnnotations) => {
      const currentValue = currentAnnotations[rowId] ?? EMPTY_ANNOTATION;

      return {
        ...currentAnnotations,
        [rowId]: updater(currentValue),
      };
    });
  }

  function toggleShadow(rowId) {
    updateAnnotation(rowId, (currentValue) => ({
      ...currentValue,
      shadow: !currentValue.shadow,
    }));
  }

  function setShadowForRows(rowIds, nextShadow) {
    if (!Array.isArray(rowIds) || rowIds.length === 0) {
      return;
    }

    setAnnotations((currentAnnotations) => {
      const nextAnnotations = { ...currentAnnotations };

      rowIds.forEach((rowId) => {
        if (!rowId) {
          return;
        }

        const currentValue = currentAnnotations[rowId] ?? EMPTY_ANNOTATION;
        nextAnnotations[rowId] = {
          ...currentValue,
          shadow: nextShadow,
        };
      });

      return nextAnnotations;
    });
  }

  function updateNote(rowId, note) {
    updateAnnotation(rowId, (currentValue) => ({
      ...currentValue,
      note,
    }));
  }

  const annotatedRows = useMemo(
    () => mergeRowsWithAnnotations(extractedRows, annotations),
    [extractedRows, annotations],
  );

  const [staticFertilizerLookup, setStaticFertilizerLookup] = useState(null);
  const [isMerged, setIsMerged] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [mergeSummary, setMergeSummary] = useState(null);

  useEffect(() => {
    setStaticFertilizerLookup(null);
    setIsMerged(false);
    setIsMerging(false);
    setMergeError('');
    setMergeSummary(null);
  }, [workbookFingerprint]);

  async function handleStaticDataMerge() {
    const productCodes = getStaticFertilizerProductCodes(annotatedRows);

    setIsMerging(true);
    setMergeError('');

    try {
      const nextLookup =
        productCodes.length > 0 ? await fetchStaticFertilizerLookup(productCodes) : {};
      const matchedCount = productCodes.filter(
        (productCode) => nextLookup[productCode],
      ).length;

      startTransition(() => {
        setStaticFertilizerLookup(nextLookup);
        setIsMerged(true);
        setMergeSummary({
          requested: productCodes.length,
          matched: matchedCount,
        });
      });
    } catch (error) {
      setMergeError(
        error instanceof Error ? error.message : '정적 비료 데이터 병합에 실패했습니다.',
      );
    } finally {
      setIsMerging(false);
    }
  }

  const mergedRows = useMemo(() => {
    if (!isStaticMergeEnabled || !isMerged || !staticFertilizerLookup) {
      return annotatedRows;
    }

    return mergeRowsWithStaticFertilizer(annotatedRows, staticFertilizerLookup);
  }, [annotatedRows, isMerged, isStaticMergeEnabled, staticFertilizerLookup]);

  const mergeStatusMessage = isStaticMergeEnabled ? buildMergeStatusMessage(mergeSummary) : '';

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(createInitialFilters);
  const [sortState, setSortState] = useState(createInitialSortState);

  const deferredMergedRows = useDeferredValue(mergedRows);
  const deferredSearchQuery = useDeferredValue(toLowerTrimmedString(searchQuery));
  const tableModel = useMemo(
    () => buildTableModel(deferredMergedRows, deferredSearchQuery, filters, sortState),
    [deferredMergedRows, deferredSearchQuery, filters, sortState],
  );

  function handleFilterChange(key, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  function resetFilters() {
    setSearchQuery('');
    setFilters(createInitialFilters());
  }

  return {
    rows: tableModel.sortedRows,
    warningRows: tableModel.warningRows,
    mergedRows,

    searchQuery,
    setSearchQuery,
    filters,
    filterOptions: tableModel.filterOptions,
    sortState,
    setSortState,
    handleFilterChange,
    resetFilters,

    toggleShadow,
    setShadowForRows,
    updateNote,

    isMerging,
    isMerged,
    mergeError,
    mergeSummary,
    mergeStatusMessage,
    handleStaticDataMerge,
  };
}
