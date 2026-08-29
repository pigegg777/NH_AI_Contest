import { toTrimmedString } from '../../../../common/utils/text';
import {
  AI_BULK_ROW_PATCHABLE_FIELDS,
  buildAiBulkRowId,
} from '../ai-bulk-row-draft/aiBulkRowDraftModel';
import { normalizeAppendedRow } from '../ai-bulk-row-draft/aiBulkRowDraftStorageModel';
import { shouldUseStaticDataMerge } from '../static-data-merge/staticDataMergeModel';
import { fetchStaticProductLookup } from '../../services/staticProductLookupService';

// Written through updateNote/updatePrice rather than the draft layer, because
// the annotation layer sits above drafts and would otherwise mask them.
export const AI_BULK_ROW_ANNOTATION_FIELDS = [
  'note',
  'zero_tax_price',
  'tax_price',
  'exempt_tax_price',
];

export function createEmptyAiBulkNoteRowPlan() {
  return { appended: [], conflicting: [], ambiguous: [] };
}

export function isEmptyAiBulkNoteRowPlan(plan) {
  return (
    (plan?.appended.length ?? 0) === 0 &&
    (plan?.conflicting.length ?? 0) === 0 &&
    (plan?.ambiguous.length ?? 0) === 0
  );
}

export function countAiBulkNoteRowPlan(plan) {
  return (
    (plan?.appended.length ?? 0) +
    (plan?.conflicting.length ?? 0) +
    (plan?.ambiguous.length ?? 0)
  );
}

// Only fields the sheet actually supplied a value for are written — a blank
// column leaves the existing value alone.
export function splitAiBulkRowUpdate(newRow) {
  const annotationPatch = {};
  const rowPatch = {};

  for (const field of AI_BULK_ROW_ANNOTATION_FIELDS) {
    if (newRow?.[field] != null) {
      annotationPatch[field] = newRow[field];
    }
  }

  for (const field of AI_BULK_ROW_PATCHABLE_FIELDS) {
    if (newRow?.[field] != null) {
      rowPatch[field] = newRow[field];
    }
  }

  return { annotationPatch, rowPatch };
}

export function hasAiBulkRowUpdate(newRow) {
  const { annotationPatch, rowPatch } = splitAiBulkRowUpdate(newRow);
  return Object.keys(annotationPatch).length + Object.keys(rowPatch).length > 0;
}

function indexRowsByProductCode(rows) {
  const index = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const productCode = toTrimmedString(row?.product_code);

    if (productCode === '') {
      continue;
    }

    const bucket = index.get(productCode);

    if (bucket) {
      bucket.push(row);
    } else {
      index.set(productCode, [row]);
    }
  }

  return index;
}

export function buildAiBulkNoteRowPlan(newRows, existingRows) {
  const plan = createEmptyAiBulkNoteRowPlan();
  const existingByProductCode = indexRowsByProductCode(existingRows);

  for (const newRow of Array.isArray(newRows) ? newRows : []) {
    const targets = existingByProductCode.get(newRow.product_code) ?? [];

    if (targets.length === 0) {
      const appendedRow = normalizeAppendedRow({
        ...newRow,
        row_id: buildAiBulkRowId(newRow),
      });

      if (appendedRow) {
        plan.appended.push({ productCode: newRow.product_code, newRow, row: appendedRow });
      }

      continue;
    }

    if (!hasAiBulkRowUpdate(newRow)) {
      // The sheet carried nothing but a product_code that already exists —
      // applying it would be a no-op, so it never reaches the merchant.
      continue;
    }

    if (targets.length === 1) {
      plan.conflicting.push({
        productCode: newRow.product_code,
        newRow,
        targetRow: targets[0],
      });

      continue;
    }

    // One product_code spread across several 단가유형 rows: which of them the
    // sheet means is genuinely unknown, so the merchant picks.
    plan.ambiguous.push({
      productCode: newRow.product_code,
      newRow,
      targetRows: targets,
    });
  }

  return plan;
}

export function markAiBulkNoteRowPlanStaticData(plan, staticProductCodes) {
  const knownCodes = staticProductCodes instanceof Set ? staticProductCodes : new Set();
  const markEntry = (entry) => ({
    ...entry,
    hasStaticData: knownCodes.has(entry.productCode),
  });

  return {
    appended: plan.appended.map(markEntry),
    conflicting: plan.conflicting.map(markEntry),
    ambiguous: plan.ambiguous.map(markEntry),
  };
}

function collectRowPlanProductCodes(plan) {
  return [
    ...plan.appended,
    ...plan.conflicting,
    ...plan.ambiguous,
  ].map((entry) => entry.productCode);
}

// Fetching the lookup belongs to the row plan itself: the plan is the only
// thing that knows which product codes need looking up, and the static badge
// is meaningless without it.
export async function resolveAiBulkNoteRowPlanStaticData(plan, tableNameMode) {
  if (!shouldUseStaticDataMerge(tableNameMode)) {
    // Left unmarked rather than marked false, so the panel shows no badge.
    return plan;
  }

  let lookup = {};

  try {
    lookup = await fetchStaticProductLookup(tableNameMode, collectRowPlanProductCodes(plan));
  } catch {
    lookup = {};
  }

  return markAiBulkNoteRowPlanStaticData(plan, new Set(Object.keys(lookup)));
}
