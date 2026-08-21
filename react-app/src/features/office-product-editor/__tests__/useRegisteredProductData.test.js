import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useRegisteredProductData } from '../hooks/office-product-data/useRegisteredProductData';
import { fetchOfficeProductData } from '../services/office-product-data/officeProductDataReadService';

vi.mock('../services/office-product-data/officeProductDataReadService', () => ({
  fetchOfficeProductData: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('useRegisteredProductData', () => {
  it('refetches when refreshToken changes, so a just-saved category picks up the fresh data instead of staying on the stale pre-save fetch', async () => {
    fetchOfficeProductData
      .mockResolvedValueOnce({ rows: [{ row_id: 'A100__01', note: 'old' }] })
      .mockResolvedValueOnce({ rows: [{ row_id: 'A100__01', note: 'new' }] });

    const { result, rerender } = renderHook(
      ({ refreshToken }) =>
        useRegisteredProductData({
          user: { office_code: 'OFF-1' },
          categoryName: '비료',
          isEnabled: true,
          refreshToken,
        }),
      { initialProps: { refreshToken: '2026-06-07T00:00:00Z' } },
    );

    await waitFor(() => {
      expect(result.current.data?.rows[0].note).toBe('old');
    });

    rerender({ refreshToken: '2026-06-08T00:00:00Z' });

    await waitFor(() => {
      expect(result.current.data?.rows[0].note).toBe('new');
    });

    expect(fetchOfficeProductData).toHaveBeenCalledTimes(2);
  });

  it('does not refetch when unrelated props are the same and refreshToken is unchanged', async () => {
    fetchOfficeProductData.mockResolvedValue({ rows: [{ row_id: 'A100__01', note: 'value' }] });

    const { result, rerender } = renderHook(
      ({ refreshToken }) =>
        useRegisteredProductData({
          user: { office_code: 'OFF-1' },
          categoryName: '비료',
          isEnabled: true,
          refreshToken,
        }),
      { initialProps: { refreshToken: '2026-06-07T00:00:00Z' } },
    );

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    rerender({ refreshToken: '2026-06-07T00:00:00Z' });

    expect(fetchOfficeProductData).toHaveBeenCalledTimes(1);
  });
});
