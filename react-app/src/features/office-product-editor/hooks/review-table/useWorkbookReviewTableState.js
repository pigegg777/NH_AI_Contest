import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toLowerTrimmedString } from '../../../../common/utils/text';
import { useAnnotations } from './useAnnotations';
import {
  getStaticFertilizerProductCodes,
  mergeRowsWithStaticFertilizer,
} from '../../model/static-data-merge/staticFertilizerMergeModel';
import {
  getStaticPesticideProductCodes,
  mergeRowsWithStaticPesticide,
} from '../../model/static-data-merge/staticPesticideMergeModel';
import { ReviewTableAnnotationModel } from '../../model/review-table/reviewTableAnnotationModel';
import { ReviewTableBuildModel } from '../../model/review-table/reviewTableBuildModel';
import { fetchStaticProductLookup } from '../../services/staticProductLookupService';

import { createInitialFilters } from '../../model/review-table/reviewTableBuildModel';

const DEFAULT_SORT_STATE = { key: 'product_code', direction: 'asc' };

export function useWorkbookReviewTableState(
  extractedRows,
  workbookFingerprint,
  {
    hasResult = false,
    isStaticMergeEnabled = false,
    tableNameMode = '',
  } = {},
) {
  const {
    annotations,
    toggleShadow,
    setShadowForRows,
    updateNote,
    updatePrice,
    updateImgUrl,
  } = useAnnotations(workbookFingerprint, extractedRows);

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(() => createInitialFilters());
  const [sortState, setSortState] = useState(DEFAULT_SORT_STATE);

  useEffect(() => {
    setSearchQuery('');
    setFilters(createInitialFilters());
    setSortState(DEFAULT_SORT_STATE);
  }, [workbookFingerprint]);

  const annotatedRows = useMemo(
    () =>
      new ReviewTableAnnotationModel(
        extractedRows,
        annotations,
      ).mergeRowsWithAnnotations(),
    [extractedRows, annotations],
  );

  const mergeKind = tableNameMode === 'pesticide' ? 'pesticide' : 'fertilizer';
  const getStaticMergeProductCodes =
    mergeKind === 'pesticide'
      ? getStaticPesticideProductCodes
      : getStaticFertilizerProductCodes;
  const mergeRowsWithStaticData =
    mergeKind === 'pesticide'
      ? mergeRowsWithStaticPesticide
      : mergeRowsWithStaticFertilizer;
  const [staticMergeLookup, setStaticMergeLookup] = useState(null);
  const [isStaticMergeLoading, setIsStaticMergeLoading] = useState(false);
  const attemptedFingerprintRef = useRef(null);

  useEffect(() => {
    setStaticMergeLookup(null);
    attemptedFingerprintRef.current = null;
    setIsStaticMergeLoading(false);
  }, [workbookFingerprint, tableNameMode]);

  useEffect(() => {
    if (!isStaticMergeEnabled || !hasResult || !workbookFingerprint) {
      return;
    }

    if (attemptedFingerprintRef.current === workbookFingerprint) {
      return;
    }

    // Deliberately keyed on extractedRows, not annotatedRows: annotatedRows
    // gets a brand-new array reference the moment useAnnotations' own
    // hydration effect resolves (a separate effect, unrelated to this
    // fetch) even though product_code — all this effect actually reads —
    // never changes from that. Depending on annotatedRows made this effect
    // see a "changed" dependency right after the fetch started, tear itself
    // down (isCancelled = true) before the request resolved, and then get
    // blocked from retrying by attemptedFingerprintRef — so the fetched
    // static data was silently discarded and the table never showed it.
    const productCodes = getStaticMergeProductCodes(extractedRows);
    let isCancelled = false;

    attemptedFingerprintRef.current = workbookFingerprint;
    setIsStaticMergeLoading(true);

    void (async () => {
      try {
        const lookup =
          productCodes.length > 0
            ? await fetchStaticProductLookup(mergeKind, productCodes)
            : {};

        if (isCancelled) {
          return;
        }

        setStaticMergeLookup(lookup);
      } catch {
        if (isCancelled) {
          return;
        }

        setStaticMergeLookup({});
      } finally {
        if (!isCancelled) {
          setIsStaticMergeLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    extractedRows,
    getStaticMergeProductCodes,
    hasResult,
    isStaticMergeEnabled,
    mergeKind,
    workbookFingerprint,
  ]);

  const mergedRows = useMemo(() => {
    if (!isStaticMergeEnabled || staticMergeLookup == null) {
      return annotatedRows;
    }

    return mergeRowsWithStaticData(annotatedRows, staticMergeLookup);
  }, [
    annotatedRows,
    isStaticMergeEnabled,
    mergeRowsWithStaticData,
    staticMergeLookup,
  ]);

  const deferredMergedRows = useDeferredValue(mergedRows);
  const deferredSearchQuery = useDeferredValue(
    toLowerTrimmedString(searchQuery),
  );
  const tableModel = useMemo(
    () =>
      new ReviewTableBuildModel(
        deferredMergedRows,
        deferredSearchQuery,
        filters,
        sortState,
      ).build(),
    [deferredMergedRows, deferredSearchQuery, filters, sortState],
  );

  const filterOptions = useMemo(
    () => ReviewTableBuildModel.buildFilterOptions(deferredMergedRows),
    [deferredMergedRows],
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
    annotatedRows,
    mergedRows,
    searchQuery,
    setSearchQuery,
    filters,
    filterOptions,
    sortState,
    setSortState,
    handleFilterChange,
    resetFilters,
    toggleShadow,
    setShadowForRows,
    updateNote,
    updatePrice,
    updateImgUrl,
    isStaticMergeLoading,
  };
}
