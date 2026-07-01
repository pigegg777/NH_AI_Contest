import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { toLowerTrimmedString } from '../../../common/utils/text';
import { buildTableModel } from '../model/review-table/reviewTableBuildModel';
import { createInitialSortState } from '../model/review-table/reviewTableConfigModel';
import { createInitialFilters } from '../model/review-table/reviewTableFilterModel';

const EMPTY_ANNOTATION = { shadow: false, note: '' };

function mergeRowsWithAnnotations(rows, annotations) {
  return rows.map((row) => {
    const annotation =
      typeof row?.row_id === 'string' && row.row_id !== ''
        ? annotations[row.row_id] ?? EMPTY_ANNOTATION
        : EMPTY_ANNOTATION;

    return {
      ...row,
      shadow: annotation.shadow === true,
      note: typeof annotation.note === 'string' ? annotation.note : '',
      tax_price: Number.isFinite(annotation.tax_price) ? annotation.tax_price : row.tax_price,
      zero_tax_price: Number.isFinite(annotation.zero_tax_price)
        ? annotation.zero_tax_price
        : row.zero_tax_price,
      exempt_tax_price: Number.isFinite(annotation.exempt_tax_price)
        ? annotation.exempt_tax_price
        : row.exempt_tax_price,
    };
  });
}

export function useWorkbookReviewTableState(extractedRows, workbookFingerprint) {
  const [annotations, setAnnotations] = useState({});

  useEffect(() => {
    setAnnotations({});
  }, [workbookFingerprint]);

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

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(createInitialFilters);
  const [sortState, setSortState] = useState(createInitialSortState);

  const deferredAnnotatedRows = useDeferredValue(annotatedRows);
  const deferredSearchQuery = useDeferredValue(toLowerTrimmedString(searchQuery));
  const tableModel = useMemo(
    () => buildTableModel(deferredAnnotatedRows, deferredSearchQuery, filters, sortState),
    [deferredAnnotatedRows, deferredSearchQuery, filters, sortState],
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
  };
}
