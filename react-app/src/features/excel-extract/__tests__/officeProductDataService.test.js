import { afterEach, describe, expect, it, vi } from 'vitest';
import supabase from '../../../lib/supabaseClient';
import {
  fetchOfficeProductDataCatalog,
  saveOfficeProductData,
} from '../services/officeProductDataService';

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    from: vi.fn(),
  },
}));

describe('officeProductDataService.saveOfficeProductData', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('upserts office product data with office_code and category name', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 1, row_count: 1, updated_at: '2026-06-07T00:00:00Z' },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select }));

    supabase.from.mockReturnValue({ upsert });

    await saveOfficeProductData({
      user: { id: 7, office_code: 'OFF-1', office_name: '본점' },
      rows: [{ row_id: 'A100__01', product_code: 'A100', note: 'memo', shadow: true }],
      categoryName: '농약',
      sourceFileName: 'demo.xlsx',
    });

    expect(supabase.from).toHaveBeenCalledWith('office_product_datas');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        office_code: 'OFF-1',
        office_name: '본점',
        product_data_category_name: '농약',
        row_count: 1,
        source_file_name: 'demo.xlsx',
        updated_who: 7,
        product_data: [
          expect.objectContaining({
            row_id: 'A100__01',
            product_code: 'A100',
            note: 'memo',
            shadow: true,
          }),
        ],
      }),
      expect.objectContaining({
        onConflict: 'office_code,product_data_category_name',
      }),
    );
  });
});

describe('officeProductDataService.fetchOfficeProductDataCatalog', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads office product data summaries by office_code', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 11,
          office_code: 'OFF-1',
          office_name: '본점',
          product_data_category_name: '비료',
          row_count: 24,
          source_file_name: 'fertilizer.xlsx',
          updated_at: '2026-06-07T03:00:00Z',
        },
      ],
      error: null,
    });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));

    supabase.from.mockReturnValue({ select });

    const result = await fetchOfficeProductDataCatalog({ officeCode: ' OFF-1 ' });

    expect(supabase.from).toHaveBeenCalledWith('office_product_datas');
    expect(select).toHaveBeenCalledWith(
      'id, office_code, office_name, product_data_category_name, row_count, source_file_name, updated_at',
    );
    expect(eq).toHaveBeenCalledWith('office_code', 'OFF-1');
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(result).toEqual([
      {
        id: 11,
        officeCode: 'OFF-1',
        officeName: '본점',
        categoryName: '비료',
        rowCount: 24,
        sourceFileName: 'fertilizer.xlsx',
        updatedAt: '2026-06-07T03:00:00Z',
      },
    ]);
  });
});
