import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useAiBulkRowDrafts } from '../hooks/ai-bulk-row-draft/useAiBulkRowDrafts';
import { normalizeAppendedRow } from '../model/ai-bulk-row-draft/aiBulkRowDraftStorageModel';

const workbookRows = [
  { row_id: 'A100__01', product_code: 'A100', product_name: '기존 비료' },
];

function buildAppendedRow(productCode = 'Z999') {
  return normalizeAppendedRow({
    row_id: `${productCode}__01`,
    product_code: productCode,
    product_name: '새 상품',
  });
}

beforeEach(() => {
  globalThis.sessionStorage.clear();
});

afterEach(() => {
  globalThis.sessionStorage.clear();
});

describe('useAiBulkRowDrafts', () => {
  it('passes the rows straight through before anything is drafted', () => {
    const { result } = renderHook(() => useAiBulkRowDrafts(workbookRows, 'fp-1'));

    expect(result.current.rows).toBe(workbookRows);
  });

  it('appends drafted rows behind the workbook rows', () => {
    const { result } = renderHook(() => useAiBulkRowDrafts(workbookRows, 'fp-1'));

    act(() => {
      result.current.appendRows([buildAppendedRow()]);
    });

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[1]).toMatchObject({
      row_id: 'Z999__01',
      is_ai_appended: true,
    });
  });

  it('merges a patch onto an existing row', () => {
    const { result } = renderHook(() => useAiBulkRowDrafts(workbookRows, 'fp-1'));

    act(() => {
      result.current.patchRows({ A100__01: { product_name: '갱신된 이름' } });
    });

    expect(result.current.rows[0].product_name).toBe('갱신된 이름');
  });

  it('merges successive patches for the same row instead of replacing them', () => {
    const { result } = renderHook(() => useAiBulkRowDrafts(workbookRows, 'fp-1'));

    act(() => {
      result.current.patchRows({ A100__01: { product_name: '갱신된 이름' } });
    });
    act(() => {
      result.current.patchRows({ A100__01: { spec: '20kg' } });
    });

    expect(result.current.rows[0]).toMatchObject({
      product_name: '갱신된 이름',
      spec: '20kg',
    });
  });

  it('removes an appended row again', () => {
    const { result } = renderHook(() => useAiBulkRowDrafts(workbookRows, 'fp-1'));

    act(() => {
      result.current.appendRows([buildAppendedRow()]);
    });
    act(() => {
      result.current.removeAppendedRow('Z999__01');
    });

    expect(result.current.rows).toHaveLength(1);
  });

  it('restores drafts from session storage for the same fingerprint', () => {
    const first = renderHook(() => useAiBulkRowDrafts(workbookRows, 'fp-1'));

    act(() => {
      first.result.current.appendRows([buildAppendedRow()]);
    });
    first.unmount();

    const second = renderHook(() => useAiBulkRowDrafts(workbookRows, 'fp-1'));

    expect(second.result.current.rows).toHaveLength(2);
  });

  it('keeps drafts scoped to their own workbook fingerprint', () => {
    const { result, rerender } = renderHook(
      ({ fingerprint }) => useAiBulkRowDrafts(workbookRows, fingerprint),
      { initialProps: { fingerprint: 'fp-1' } },
    );

    act(() => {
      result.current.appendRows([buildAppendedRow()]);
    });

    rerender({ fingerprint: 'fp-2' });

    expect(result.current.rows).toHaveLength(1);

    rerender({ fingerprint: 'fp-1' });

    expect(result.current.rows).toHaveLength(2);
  });

  it('does not expose drafts from the previous fingerprint during a category switch', () => {
    const { result, rerender } = renderHook(
      ({ fingerprint }) => useAiBulkRowDrafts(workbookRows, fingerprint),
      { initialProps: { fingerprint: 'category:비료:empty' } },
    );

    act(() => {
      result.current.appendRows([buildAppendedRow()]);
    });

    rerender({ fingerprint: 'category:농약:empty' });

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].product_code).toBe('A100');
  });

  it('ignores an append with no rows and a remove with no id', () => {
    const { result } = renderHook(() => useAiBulkRowDrafts(workbookRows, 'fp-1'));

    act(() => {
      result.current.appendRows([]);
      result.current.patchRows({});
      result.current.removeAppendedRow('');
    });

    expect(result.current.rows).toBe(workbookRows);
  });
});
