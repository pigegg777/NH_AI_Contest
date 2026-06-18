import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { toLowerTrimmedString } from '../../../common/utils/text';
import {
  getStaticFertilizerProductCodes,
  mergeRowsWithStaticFertilizer,
} from '../model/merge/staticFertilizerMergeModel';
import {
  getStaticPesticideProductCodes,
  mergeRowsWithStaticPesticide,
} from '../model/merge/staticPesticideMergeModel';
import {
  buildTableModel,
  createInitialFilters,
  createInitialSortState,
} from '../model/table';
import { fetchStaticFertilizerLookup } from '../services/staticFertilizerLookupService';
import { fetchStaticPesticideLookup } from '../services/staticPesticideLookupService';
import {
  mergeRowsWithAnnotations,
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

export function useWorkbookReviewTableState(
  extractedRows,
  workbookFingerprint,
  { hasResult = false, isStaticMergeEnabled = false, tableNameMode = null } = {},
) {
  const isPesticideMerge = tableNameMode === 'pesticide';
  const getStaticMergeProductCodes = isPesticideMerge
    ? getStaticPesticideProductCodes
    : getStaticFertilizerProductCodes;
  const fetchStaticMergeLookup = isPesticideMerge
    ? fetchStaticPesticideLookup
    : fetchStaticFertilizerLookup;
  const mergeRowsWithStaticData = isPesticideMerge
    ? mergeRowsWithStaticPesticide
    : mergeRowsWithStaticFertilizer;

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

  function updatePrice(rowId, key, value) {
    updateAnnotation(rowId, (currentValue) => ({
      ...currentValue,
      [key]: value,
    }));
  }

  const annotatedRows = useMemo(
    () => mergeRowsWithAnnotations(extractedRows, annotations),
    [extractedRows, annotations],
  );

  const [staticMergeLookup, setStaticMergeLookup] = useState(null);
  const [isMerged, setIsMerged] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [mergeSummary, setMergeSummary] = useState(null);
  const attemptedFingerprintRef = useRef(null);

  useEffect(() => {
    setStaticMergeLookup(null);
    setIsMerged(false);
    setIsMerging(false);
    setMergeError('');
    setMergeSummary(null);
    attemptedFingerprintRef.current = null;
  }, [workbookFingerprint]);

  async function handleStaticDataMerge() {
    const productCodes = getStaticMergeProductCodes(annotatedRows);

    setIsMerging(true);
    setMergeError('');

    try {
      const nextLookup =
        productCodes.length > 0 ? await fetchStaticMergeLookup(productCodes) : {};
      const matchedCount = productCodes.filter((productCode) => nextLookup[productCode]).length;

      startTransition(() => {
        setStaticMergeLookup(nextLookup);
        setIsMerged(true);
        setMergeSummary({
          requested: productCodes.length,
          matched: matchedCount,
        });
      });
    } catch (error) {
      setMergeError(
        error instanceof Error ? error.message : '정적 데이터 병합에 실패했습니다.',
      );
    } finally {
      setIsMerging(false);
    }
  }

  useEffect(() => {
    if (!isStaticMergeEnabled) {
      attemptedFingerprintRef.current = null;
      return;
    }

    if (!workbookFingerprint || !hasResult || isMerged || isMerging) {
      return;
    }

    if (attemptedFingerprintRef.current === workbookFingerprint) {
      return;
    }

    attemptedFingerprintRef.current = workbookFingerprint;
    void handleStaticDataMerge();
  }, [
    handleStaticDataMerge,
    hasResult,
    isMerged,
    isMerging,
    isStaticMergeEnabled,
    workbookFingerprint,
  ]);

  const mergedRows = useMemo(() => {
    if (!isStaticMergeEnabled || !isMerged || !staticMergeLookup) {
      return annotatedRows;
    }

    return mergeRowsWithStaticData(annotatedRows, staticMergeLookup);
  }, [annotatedRows, isMerged, isStaticMergeEnabled, mergeRowsWithStaticData, staticMergeLookup]);

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
    updatePrice,
    isMerging,
    isMerged,
    mergeError,
    mergeSummary,
    mergeStatusMessage,
    handleStaticDataMerge,
  };
}
