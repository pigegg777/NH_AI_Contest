import {
  createWorkbookReviewStorageKey,
  sanitizeAnnotationsForRows,
} from '../model/workbook-review/annotations/annotationModel';

export function readStoredAnnotations(storage, workbookFingerprint, rows) {
  if (!storage || !workbookFingerprint) {
    return {};
  }

  const rawValue = storage.getItem(createWorkbookReviewStorageKey(workbookFingerprint));
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);
    return sanitizeAnnotationsForRows(parsed, rows);
  } catch {
    return {};
  }
}

export function writeStoredAnnotations(storage, workbookFingerprint, annotations) {
  if (!storage || !workbookFingerprint) {
    return;
  }

  storage.setItem(
    createWorkbookReviewStorageKey(workbookFingerprint),
    JSON.stringify(annotations),
  );
}
