import { useEffect, useState } from 'react';

function applyAnnotation(annotations, rowId, updater) {
  const current = annotations[rowId] ?? { shadow: false, note: '' };
  return { ...annotations, [rowId]: updater(current) };
}

function applyBulkShadow(annotations, rowIds, nextShadow) {
  const next = { ...annotations };
  for (const rowId of rowIds) {
    if (!rowId) continue;
    const current = annotations[rowId] ?? { shadow: false, note: '' };
    next[rowId] = { ...current, shadow: nextShadow };
  }
  return next;
}

export function useAnnotations(workbookFingerprint) {
  const [annotations, setAnnotations] = useState({});

  useEffect(() => {
    setAnnotations({});
  }, [workbookFingerprint]);

  function toggleShadow(rowId) {
    if (!rowId) return;
    setAnnotations((curr) =>
      applyAnnotation(curr, rowId, (a) => ({ ...a, shadow: !a.shadow })),
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

  return {
    annotations,
    toggleShadow,
    setShadowForRows,
    updateNote,
    updatePrice,
  };
}
