import { toTrimmedString } from '../../../../common/utils/text';

const DRAFT_STORAGE_VERSION = 1;

function createDraftStorageKey(officeCode) {
  const normalizedOfficeCode = toTrimmedString(officeCode);
  return normalizedOfficeCode
    ? `office-product-editor:draft:${normalizedOfficeCode}`
    : '';
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map((entry) => toTrimmedString(entry)).filter(Boolean)
    : [];
}

function sanitizeWorkbookRows(rows) {
  return Array.isArray(rows)
    ? rows.filter((row) => row && typeof row === 'object').map((row) => ({ ...row }))
    : [];
}

function sanitizeExtractionResult(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.rows)) {
    return null;
  }

  return {
    sheetName: toTrimmedString(result.sheetName),
    headerRowIndex: Number.isInteger(result.headerRowIndex) ? result.headerRowIndex : null,
    dataStartRowIndex: Number.isInteger(result.dataStartRowIndex) ? result.dataStartRowIndex : null,
    dataEndRowIndex: Number.isInteger(result.dataEndRowIndex) ? result.dataEndRowIndex : null,
    warnings: normalizeStringArray(result.warnings),
    rows: sanitizeWorkbookRows(result.rows),
  };
}

function sanitizeSelectionDraft(selection) {
  return {
    tableNameMode: toTrimmedString(selection?.tableNameMode),
    customTableName: toTrimmedString(selection?.customTableName),
    pendingCustomCategories: normalizeStringArray(selection?.pendingCustomCategories),
    activeCustomCategoryName: toTrimmedString(selection?.activeCustomCategoryName),
  };
}

function sanitizeExtractionDraft(extraction) {
  return {
    selectedFileName: toTrimmedString(extraction?.selectedFileName),
    workbookFingerprint: toTrimmedString(extraction?.workbookFingerprint) || null,
    result: sanitizeExtractionResult(extraction?.result),
  };
}

function sanitizeOfficeProductEditorDraft(draft) {
  return {
    selection: sanitizeSelectionDraft(draft?.selection),
    extraction: sanitizeExtractionDraft(draft?.extraction),
  };
}

function hasMeaningfulDraft(draft) {
  return Boolean(
    draft.selection.tableNameMode ||
      draft.selection.customTableName ||
      draft.selection.pendingCustomCategories.length > 0 ||
      draft.selection.activeCustomCategoryName ||
      draft.extraction.selectedFileName ||
      draft.extraction.workbookFingerprint ||
      draft.extraction.result,
  );
}

export function readStoredOfficeProductEditorDraft(storage, officeCode) {
  const storageKey = createDraftStorageKey(officeCode);

  if (!storage || !storageKey) {
    return null;
  }

  const rawValue = storage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (parsed?.version !== DRAFT_STORAGE_VERSION) {
      return null;
    }

    const sanitizedDraft = sanitizeOfficeProductEditorDraft(parsed);
    return hasMeaningfulDraft(sanitizedDraft) ? sanitizedDraft : null;
  } catch {
    return null;
  }
}

export function writeStoredOfficeProductEditorDraft(storage, officeCode, draft) {
  const storageKey = createDraftStorageKey(officeCode);

  if (!storage || !storageKey) {
    return;
  }

  const sanitizedDraft = sanitizeOfficeProductEditorDraft(draft);

  if (!hasMeaningfulDraft(sanitizedDraft)) {
    storage.removeItem(storageKey);
    return;
  }

  storage.setItem(
    storageKey,
    JSON.stringify({
      version: DRAFT_STORAGE_VERSION,
      ...sanitizedDraft,
    }),
  );
}

export function clearStoredOfficeProductEditorDraft(storage, officeCode) {
  const storageKey = createDraftStorageKey(officeCode);

  if (!storage || !storageKey) {
    return;
  }

  storage.removeItem(storageKey);
}
