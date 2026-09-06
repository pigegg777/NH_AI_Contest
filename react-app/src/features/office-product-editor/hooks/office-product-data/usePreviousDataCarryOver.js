import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { carryOverPreviousRows } from '../../model/previous-data-carryover/previousRowsCarryOverModel';

export const CARRY_OVER_MODES = {
  carry: 'carry',
  reset: 'reset',
};

/**
 * Lets the merchant decide whether a re-uploaded workbook inherits the img_url,
 * note and hide flag it had before, or starts clean. The question is asked once, in a
 * dialog, as soon as a new workbook is parsed over a category that already has
 * saved rows — there is nothing to ask about otherwise.
 */
export function usePreviousDataCarryOver({
  newRows,
  previousRows,
  isReviewingNewWorkbook,
  // Whether the category already held saved data. Snapshotted per workbook,
  // because saving registers the category and turns this true mid-review.
  isCategoryRegistered,
  workbookFingerprint,
}) {
  const [mode, setMode] = useState(CARRY_OVER_MODES.carry);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const askedFingerprintRef = useRef(null);
  const registeredAtParseRef = useRef(null);

  const hasPreviousRows =
    Array.isArray(previousRows) && previousRows.length > 0;

  // Two separate reasons the dialog used to appear when it should not have:
  //
  // Registering a brand new category has nothing to carry over, but saving adds
  // it to the catalog and refetches, so previousRows fills with the rows just
  // written from this very workbook — it would offer the file its own contents.
  // Hence the snapshot of whether the category was registered when the file was
  // parsed, rather than reading the live flag.
  //
  // Re-saving an already-registered category likewise empties and refills
  // previousRows, which is why the fingerprint marks a workbook as already asked.
  const isAvailable =
    Boolean(isReviewingNewWorkbook) &&
    hasPreviousRows &&
    registeredAtParseRef.current === true;

  useEffect(() => {
    if (!workbookFingerprint) {
      askedFingerprintRef.current = null;
      registeredAtParseRef.current = null;
      setMode(CARRY_OVER_MODES.carry);
      setIsDialogOpen(false);
      return;
    }

    if (registeredAtParseRef.current === null) {
      registeredAtParseRef.current = Boolean(isCategoryRegistered);
    }

    if (
      registeredAtParseRef.current !== true ||
      !hasPreviousRows ||
      !isReviewingNewWorkbook ||
      askedFingerprintRef.current === workbookFingerprint
    ) {
      return;
    }

    askedFingerprintRef.current = workbookFingerprint;
    setMode(CARRY_OVER_MODES.carry);
    setIsDialogOpen(true);
  }, [
    hasPreviousRows,
    isCategoryRegistered,
    isReviewingNewWorkbook,
    workbookFingerprint,
  ]);

  // A different file over the same category starts a fresh snapshot.
  useEffect(() => {
    return () => {
      registeredAtParseRef.current = null;
    };
  }, [workbookFingerprint]);

  const carryOver = useMemo(() => {
    if (!isAvailable) {
      return null;
    }

    return carryOverPreviousRows(newRows, previousRows);
  }, [isAvailable, newRows, previousRows]);

  const choose = useCallback((nextMode) => {
    setMode(nextMode);
    setIsDialogOpen(false);
  }, []);

  // Dismissing is not a third answer: it keeps the non-destructive default, and
  // the review table shows what was carried either way.
  const dismiss = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const shouldCarry = isAvailable && mode === CARRY_OVER_MODES.carry;

  return {
    isAvailable,
    isDialogOpen: isDialogOpen && isAvailable,
    mode,
    choose,
    dismiss,
    rows: shouldCarry ? carryOver.rows : newRows,
    carriedImageCount: carryOver?.carriedImageCount ?? 0,
    carriedNoteCount: carryOver?.carriedNoteCount ?? 0,
    carriedShadowCount: carryOver?.carriedShadowCount ?? 0,
  };
}
