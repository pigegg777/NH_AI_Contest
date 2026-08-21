import { useEffect, useMemo, useState } from 'react';
import {
  readStoredAnnotations,
  writeStoredAnnotations,
} from '../../model/review-table/reviewTableAnnotationModel';

function buildRowIdentityKey(rows) {
  return rows.map((row) => row?.row_id ?? '').join('|');
}

function applyAnnotation(annotations, rowId, updater) {
  const current = annotations[rowId] ?? {};
  return { ...annotations, [rowId]: updater(current) };
}

function applyBulkShadow(annotations, rowIds, nextShadow) {
  const next = { ...annotations };
  for (const rowId of rowIds) {
    if (!rowId) continue;
    const current = annotations[rowId] ?? {};
    next[rowId] = { ...current, shadow: nextShadow };
  }
  return next;
}

export function useAnnotations(workbookFingerprint, rows) {
  const [annotations, setAnnotations] = useState({});
  const [isAnnotationsHydrated, setIsAnnotationsHydrated] = useState(false);
  const rowIdentityKey = useMemo(() => buildRowIdentityKey(rows), [rows]);
  const rowLookup = useMemo(
    () =>
      new Map(
        rows
          .filter((row) => typeof row?.row_id === 'string' && row.row_id !== '')
          .map((row) => [row.row_id, row]),
      ),
    [rows],
  );

  useEffect(() => {
    setIsAnnotationsHydrated(false);
    setAnnotations(readStoredAnnotations(globalThis.sessionStorage, workbookFingerprint, rows));
    setIsAnnotationsHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowIdentityKey, workbookFingerprint]);

  useEffect(() => {
    if (!isAnnotationsHydrated) {
      return;
    }

    writeStoredAnnotations(globalThis.sessionStorage, workbookFingerprint, annotations);
  }, [annotations, isAnnotationsHydrated, workbookFingerprint]);

  function toggleShadow(rowId) {
    if (!rowId) return;
    setAnnotations((curr) =>
      applyAnnotation(curr, rowId, (a) => {
        const currentShadow =
          typeof a.shadow === 'boolean'
            ? a.shadow
            : rowLookup.get(rowId)?.shadow === true;

        return { ...a, shadow: !currentShadow };
      }),
    );
  }

  function setShadowForRows(rowIds, nextShadow) {
    if (!Array.isArray(rowIds) || rowIds.length === 0) return;
    setAnnotations((curr) => applyBulkShadow(curr, rowIds, nextShadow));
  }

  function updateNote(rowId, note) {
    if (!rowId) return;
    setAnnotations((curr) => applyAnnotation(curr, rowId, (a) => ({ ...a, note })));
  }

  function updatePrice(rowId, key, value) {
    if (!rowId) return;
    setAnnotations((curr) =>
      applyAnnotation(curr, rowId, (a) => ({ ...a, [key]: value })),
    );
  }

  function updateImgUrl(rowId, imgUrl) {
    if (!rowId) return;
    setAnnotations((curr) => applyAnnotation(curr, rowId, (a) => ({ ...a, img_url: imgUrl })));
  }

  return {
    annotations,
    toggleShadow,
    setShadowForRows,
    updateNote,
    updatePrice,
    updateImgUrl,
  };
}
