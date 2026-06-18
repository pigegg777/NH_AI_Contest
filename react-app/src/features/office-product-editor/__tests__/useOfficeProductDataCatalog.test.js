import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useOfficeProductDataCatalog } from '../hooks/useOfficeProductDataCatalog';
import { fetchOfficeProductDataCatalog } from '../services/officeProductDataService';

vi.mock('../services/officeProductDataService', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    fetchOfficeProductDataCatalog: vi.fn(),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useOfficeProductDataCatalog', () => {
  it('skips loading when office_code is missing', () => {
    const { result } = renderHook(() => useOfficeProductDataCatalog({ office_code: ' ' }));

    expect(fetchOfficeProductDataCatalog).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.errorMessage).toBe('');
  });

  it('loads saved office data summaries for the current office', async () => {
    fetchOfficeProductDataCatalog.mockResolvedValue([
      {
        id: 1,
        officeCode: 'OFF-1',
        officeName: '본점',
        categoryName: '비료',
        rowCount: 12,
        sourceFileName: 'fertilizer.xlsx',
        updatedAt: '2026-06-07T00:00:00Z',
      },
    ]);

    const { result } = renderHook(() => useOfficeProductDataCatalog({ office_code: 'OFF-1' }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchOfficeProductDataCatalog).toHaveBeenCalledWith({ officeCode: 'OFF-1' });
    expect(result.current.items).toEqual([
      expect.objectContaining({
        categoryName: '비료',
        rowCount: 12,
      }),
    ]);
    expect(result.current.errorMessage).toBe('');
  });

  it('surfaces a friendly error when loading fails', async () => {
    fetchOfficeProductDataCatalog.mockRejectedValue(new Error('등록 데이터를 불러오지 못했습니다.'));

    const { result } = renderHook(() => useOfficeProductDataCatalog({ office_code: 'OFF-1' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.errorMessage).toBe('등록 데이터를 불러오지 못했습니다.');
  });
});

