const EMPTY_ANNOTATION = {};

function hasRowId(row) {
  return typeof row?.row_id === 'string' && row.row_id !== '';
}

function normalizeAnnotation(annotation) {
  const normalized = {};

  if (typeof annotation?.shadow === 'boolean') {
    normalized.shadow = annotation.shadow;
  }

  if (typeof annotation?.note === 'string') {
    normalized.note = annotation.note;
  }

  if (Number.isFinite(annotation?.tax_price)) {
    normalized.tax_price = annotation.tax_price;
  }

  if (Number.isFinite(annotation?.zero_tax_price)) {
    normalized.zero_tax_price = annotation.zero_tax_price;
  }

  if (Number.isFinite(annotation?.exempt_tax_price)) {
    normalized.exempt_tax_price = annotation.exempt_tax_price;
  }

  if (typeof annotation?.img_url === 'string') {
    normalized.img_url = annotation.img_url;
  }

  return normalized;
}

function createWorkbookReviewStorageKey(workbookFingerprint) {
  return `excel-review:annotations:${workbookFingerprint}`;
}

export function sanitizeAnnotationsForRows(annotations, rows) {
  const nextAnnotations = {};

  for (const row of rows) {
    if (!hasRowId(row)) {
      continue;
    }

    if (annotations && row.row_id in annotations) {
      nextAnnotations[row.row_id] = normalizeAnnotation(annotations[row.row_id]);
    }
  }

  return nextAnnotations;
}

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

export class ReviewTableAnnotationModel {
  constructor(rows, annotations) {
    this.rows = rows;
    this.annotations = annotations;
  }

  mergeRowsWithAnnotations() {
    return this.rows.map((row) => {
      const annotation = hasRowId(row)
        ? normalizeAnnotation(this.annotations[row.row_id] ?? EMPTY_ANNOTATION)
        : EMPTY_ANNOTATION;

      return {
        ...row,
        shadow: annotation.shadow ?? (row.shadow === true),
        note:
          annotation.note ??
          (typeof row.note === 'string' ? row.note : ''),
        tax_price: annotation.tax_price ?? row.tax_price,
        zero_tax_price: annotation.zero_tax_price ?? row.zero_tax_price,
        exempt_tax_price: annotation.exempt_tax_price ?? row.exempt_tax_price,
        img_url: annotation.img_url ?? row.img_url,
      };
    });
  }
}
