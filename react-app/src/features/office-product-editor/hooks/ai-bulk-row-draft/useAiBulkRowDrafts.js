import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyAiBulkRowDrafts,
  createEmptyAiBulkRowDrafts,
} from '../../model/ai-bulk-row-draft/aiBulkRowDraftModel';
import {
  readStoredAiBulkRowDrafts,
  writeStoredAiBulkRowDrafts,
} from '../../model/ai-bulk-row-draft/aiBulkRowDraftStorageModel';

const EMPTY_DRAFTS = createEmptyAiBulkRowDrafts();

export function useAiBulkRowDrafts(rows, workbookFingerprint) {
  const [drafts, setDrafts] = useState(createEmptyAiBulkRowDrafts);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hydratedFingerprint, setHydratedFingerprint] = useState(null);

  // Keyed on the fingerprint alone, never on the row set: appending a row
  // changes the row set, and re-reading storage at that moment would replace
  // the in-memory drafts (and annotations, in the sibling hook) with the
  // last-persisted copy — losing whatever the merchant just applied.
  useEffect(() => {
    setIsHydrated(false);
    setDrafts(readStoredAiBulkRowDrafts(globalThis.sessionStorage, workbookFingerprint));
    setHydratedFingerprint(workbookFingerprint);
    setIsHydrated(true);
  }, [workbookFingerprint]);

  useEffect(() => {
    if (!isHydrated || hydratedFingerprint !== workbookFingerprint) {
      return;
    }

    writeStoredAiBulkRowDrafts(globalThis.sessionStorage, workbookFingerprint, drafts);
  }, [drafts, hydratedFingerprint, isHydrated, workbookFingerprint]);

  const appendRows = useCallback((rowsToAppend) => {
    if (!Array.isArray(rowsToAppend) || rowsToAppend.length === 0) {
      return;
    }

    setDrafts((current) => {
      const appended = { ...current.appended };

      for (const row of rowsToAppend) {
        if (row?.row_id) {
          appended[row.row_id] = row;
        }
      }

      return { ...current, appended };
    });
  }, []);

  const patchRows = useCallback((patchesByRowId) => {
    const rowIds = Object.keys(patchesByRowId ?? {});

    if (rowIds.length === 0) {
      return;
    }

    setDrafts((current) => {
      const patched = { ...current.patched };

      for (const rowId of rowIds) {
        patched[rowId] = { ...patched[rowId], ...patchesByRowId[rowId] };
      }

      return { ...current, patched };
    });
  }, []);

  const removeAppendedRow = useCallback((rowId) => {
    if (!rowId) {
      return;
    }

    setDrafts((current) => {
      if (!(rowId in current.appended)) {
        return current;
      }

      const appended = { ...current.appended };
      delete appended[rowId];

      return { ...current, appended };
    });
  }, []);

  const activeDrafts =
    hydratedFingerprint === workbookFingerprint
      ? drafts
      : EMPTY_DRAFTS;
  const draftedRows = useMemo(
    () => applyAiBulkRowDrafts(rows, activeDrafts),
    [rows, activeDrafts],
  );

  return {
    rows: draftedRows,
    appendRows,
    patchRows,
    removeAppendedRow,
  };
}
