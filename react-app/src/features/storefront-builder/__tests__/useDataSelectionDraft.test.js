import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDataSelectionDraft } from '../hooks/useDataSelectionDraft';

describe('useDataSelectionDraft', () => {
  it('starts with draft === committed and isConfirmed true', () => {
    const { result } = renderHook(() => useDataSelectionDraft({ initialFields: ['product_name', 'spec'] }));

    expect(result.current.draft).toEqual(['product_name', 'spec']);
    expect(result.current.committed).toEqual(['product_name', 'spec']);
    expect(result.current.isConfirmed).toBe(true);
  });

  it('toggling a field marks the draft unconfirmed without touching committed', () => {
    const { result } = renderHook(() => useDataSelectionDraft({ initialFields: ['product_name', 'spec'] }));

    act(() => result.current.toggleField('tax_price'));

    expect(result.current.draft).toContain('tax_price');
    expect(result.current.committed).toEqual(['product_name', 'spec']);
    expect(result.current.isConfirmed).toBe(false);
  });

  it('cannot remove the mandatory product_name field', () => {
    const { result } = renderHook(() => useDataSelectionDraft({ initialFields: ['product_name', 'spec'] }));

    act(() => result.current.toggleField('product_name'));

    expect(result.current.draft).toContain('product_name');
  });

  it('confirm() promotes draft into committed', () => {
    const { result } = renderHook(() => useDataSelectionDraft({ initialFields: ['product_name'] }));

    act(() => result.current.toggleField('spec'));
    act(() => result.current.confirm());

    expect(result.current.committed).toEqual(result.current.draft);
    expect(result.current.isConfirmed).toBe(true);
  });

  it('reset() replaces both draft and committed with a fresh normalized value', () => {
    const { result } = renderHook(() => useDataSelectionDraft({ initialFields: ['product_name'] }));

    act(() => result.current.toggleField('spec'));
    act(() => result.current.reset(['tax_price']));

    expect(result.current.draft).toEqual(['product_name', 'tax_price']);
    expect(result.current.committed).toEqual(['product_name', 'tax_price']);
    expect(result.current.isConfirmed).toBe(true);
  });
});
