import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePreviousDataCarryOver } from '../hooks/office-product-data/usePreviousDataCarryOver';

const NEW_ROWS = [{ product_code: 'P1', sale_price_type_code: '01', img_url: '', note: '' }];
const SAVED_ROWS = [
  { product_code: 'P1', sale_price_type_code: '01', img_url: 'https://img/p1.png', note: '' },
];

const BASE = {
  newRows: NEW_ROWS,
  previousRows: SAVED_ROWS,
  isReviewingNewWorkbook: true,
  isCategoryRegistered: true,
  workbookFingerprint: 'file-a',
};

function renderCarryOver(props = {}) {
  return renderHook((next) => usePreviousDataCarryOver(next), {
    initialProps: { ...BASE, ...props },
  });
}

describe('usePreviousDataCarryOver', () => {
  it('asks as soon as a parsed workbook meets saved rows', () => {
    const { result } = renderCarryOver();

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.carriedImageCount).toBe(1);
  });

  it('stays shut while no workbook is under review', () => {
    const { result } = renderCarryOver({ isReviewingNewWorkbook: false });

    expect(result.current.isDialogOpen).toBe(false);
  });

  it('stays shut when the category has no saved rows', () => {
    const { result } = renderCarryOver({ previousRows: [] });

    expect(result.current.isDialogOpen).toBe(false);
  });

  it('asks once the saved rows finish loading, not before', () => {
    const { result, rerender } = renderCarryOver({ previousRows: [] });

    expect(result.current.isDialogOpen).toBe(false);

    rerender({ ...BASE });

    expect(result.current.isDialogOpen).toBe(true);
  });

  it('never asks for a category that was not registered when the file was parsed', () => {
    // Registering a brand new category: nothing existed to carry over. Saving
    // then adds it to the catalog and refetches, so previousRows fills with the
    // rows just written from this very workbook. Offering to carry those over
    // would be offering the file its own contents back.
    const { result, rerender } = renderCarryOver({
      previousRows: [],
      isCategoryRegistered: false,
    });

    expect(result.current.isDialogOpen).toBe(false);

    rerender({
      ...BASE,
      previousRows: SAVED_ROWS,
      isCategoryRegistered: true,
    });

    expect(result.current.isDialogOpen).toBe(false);
  });

  it('does not ask again when saving refetches the saved rows', () => {
    const { result, rerender } = renderCarryOver();

    act(() => result.current.choose('reset'));
    expect(result.current.isDialogOpen).toBe(false);

    rerender({ ...BASE, previousRows: [] });
    rerender({ ...BASE, previousRows: [...SAVED_ROWS] });

    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.mode).toBe('reset');
  });

  it('does not reopen after the merchant dismisses it', () => {
    const { result, rerender } = renderCarryOver();

    act(() => result.current.dismiss());
    expect(result.current.isDialogOpen).toBe(false);

    rerender({ ...BASE, newRows: [...NEW_ROWS], previousRows: [...SAVED_ROWS] });

    expect(result.current.isDialogOpen).toBe(false);
  });

  it('asks again for a different workbook, back on the default', () => {
    const { result, rerender } = renderCarryOver();

    act(() => result.current.choose('reset'));

    rerender({ ...BASE, workbookFingerprint: 'file-b' });

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.mode).toBe('carry');
  });

  it('asks again when the same file comes back after a reset', () => {
    const { result, rerender } = renderCarryOver();

    act(() => result.current.choose('reset'));

    rerender({
      ...BASE,
      newRows: [],
      isReviewingNewWorkbook: false,
      workbookFingerprint: null,
    });
    expect(result.current.isDialogOpen).toBe(false);

    rerender({ ...BASE });

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.mode).toBe('carry');
  });

  it('asks for the next file uploaded over a category that has just become registered', () => {
    // The new category from earlier is now registered. Uploading a *different*
    // file over it is a genuine re-upload and must ask again.
    const { result, rerender } = renderCarryOver({
      previousRows: [],
      isCategoryRegistered: false,
    });

    rerender({ ...BASE, isCategoryRegistered: true });
    expect(result.current.isDialogOpen).toBe(false);

    rerender({ ...BASE, isCategoryRegistered: true, workbookFingerprint: 'file-b' });

    expect(result.current.isDialogOpen).toBe(true);
  });

  it('applies the chosen mode to the rows it hands back', () => {
    const { result } = renderCarryOver();

    expect(result.current.rows[0].img_url).toBe('https://img/p1.png');

    act(() => result.current.choose('reset'));

    expect(result.current.rows[0].img_url).toBe('');
  });
});
