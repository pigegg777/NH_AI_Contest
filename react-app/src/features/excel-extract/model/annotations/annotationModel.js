const DEFAULT_ANNOTATION = Object.freeze({
  shadow: false,
  note: '',
});

function normalizeAnnotation(annotation) {
  const normalized = {
    shadow: annotation?.shadow === true,
    note: typeof annotation?.note === 'string' ? annotation.note : '',
  };

  if (Number.isFinite(annotation?.tax_price)) {
    normalized.tax_price = annotation.tax_price;
  }

  if (Number.isFinite(annotation?.zero_tax_price)) {
    normalized.zero_tax_price = annotation.zero_tax_price;
  }

  return normalized;
}

function hasRowId(row) {
  return typeof row?.row_id === 'string' && row.row_id !== '';
}

export function createWorkbookReviewStorageKey(workbookFingerprint) {
  return `excel-review:annotations:${workbookFingerprint}`;
}

export function buildWorkbookFingerprint(file) {
  if (
    !file ||
    typeof file.name !== 'string' ||
    typeof file.size !== 'number' ||
    typeof file.lastModified !== 'number'
  ) {
    return null;
  }

  return `${file.name}:${file.size}:${file.lastModified}`;
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

export function getAnnotationForRow(annotations, rowId) {
  return normalizeAnnotation(annotations?.[rowId] ?? DEFAULT_ANNOTATION);
}

export function mergeRowsWithAnnotations(rows, annotations) {
  return rows.map((row) => {
    const annotation = hasRowId(row)
      ? getAnnotationForRow(annotations, row.row_id)
      : DEFAULT_ANNOTATION;

    return {
      ...row,
      shadow: annotation.shadow,
      note: annotation.note,
      tax_price: annotation.tax_price ?? row.tax_price,
      zero_tax_price: annotation.zero_tax_price ?? row.zero_tax_price,
    };
  });
}
