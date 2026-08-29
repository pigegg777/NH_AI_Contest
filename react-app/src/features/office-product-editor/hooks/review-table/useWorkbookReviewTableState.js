import { useDeferredValue, useEffect, useMemo, useState } from 'react';
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
import { loadStaticMergeLookup } from '../../model/static-data-merge/staticDataMergeModel';
import { useAiBulkRowDrafts } from '../ai-bulk-row-draft/useAiBulkRowDrafts';

import { createInitialFilters } from '../../model/review-table/reviewTableBuildModel';

const DEFAULT_SORT_STATE = { key: 'product_code', direction: 'asc' };

export function useWorkbookReviewTableState(
  extractedRows,
  workbookFingerprint,
  {
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
  const aiBulkRowDrafts = useAiBulkRowDrafts(
    extractedRows,
    workbookFingerprint,
  );

  useEffect(() => {
    setSearchQuery('');
    setFilters(createInitialFilters());
    setSortState(DEFAULT_SORT_STATE);
  }, [workbookFingerprint]);

  const annotatedRows = useMemo(
    () =>
      new ReviewTableAnnotationModel(
        aiBulkRowDrafts.rows,
        annotations,
      ).mergeRowsWithAnnotations(),
    [aiBulkRowDrafts.rows, annotations],
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
  const staticMergeProductCodeKey = isStaticMergeEnabled
    ? getStaticMergeProductCodes(aiBulkRowDrafts.rows).join('\u001f')
    : '';
  const staticMergeProductCodes = useMemo(
    () =>
      staticMergeProductCodeKey === ''
        ? []
        : staticMergeProductCodeKey.split('\u001f'),
    [staticMergeProductCodeKey],
  );
  const staticMergeRequestKey = `${workbookFingerprint}:${mergeKind}:${staticMergeProductCodeKey}`;
  const [staticMergeLookup, setStaticMergeLookup] = useState(null);
  const [isStaticMergeLoading, setIsStaticMergeLoading] = useState(false);

  useEffect(() => {
    setStaticMergeLookup(null);
    setIsStaticMergeLoading(false);
  }, [workbookFingerprint, tableNameMode]);

  useEffect(() => {
    if (
      !isStaticMergeEnabled ||
      staticMergeProductCodes.length === 0
    ) {
      setIsStaticMergeLoading(false);
      return;
    }

    let isCancelled = false;

    setIsStaticMergeLoading(true);

    void (async () => {
      const lookup = await loadStaticMergeLookup(mergeKind, staticMergeProductCodes);

      if (isCancelled) {
        return;
      }

      setStaticMergeLookup(lookup);
      setIsStaticMergeLoading(false);
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    isStaticMergeEnabled,
    mergeKind,
    staticMergeProductCodes,
    staticMergeRequestKey,
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
    appendRows: aiBulkRowDrafts.appendRows,
    patchRows: aiBulkRowDrafts.patchRows,
    removeAppendedRow: aiBulkRowDrafts.removeAppendedRow,
    isStaticMergeLoading,
  };
}
