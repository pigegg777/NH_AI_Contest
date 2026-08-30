import { afterEach, describe, expect, it, vi } from 'vitest';
import supabase from '../../../lib/supabaseClient';
import {
  fetchOfficeProductDataCatalog,
  fetchOfficeProductDataEntries,
  fetchOfficeProductData,
} from '../services/office-product-data/officeProductDataReadService';
import {
  deleteOfficeProductData,
  saveOfficeProductData,
} from '../services/office-product-data/officeProductDataMutationService';
import {
  fetchAllOfficeProductRows,
} from '../services/office-product-data/publicOfficeProductService';

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

function mockOfficeProductDataRow(row) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));

  return { select, eq, maybeSingle };
}

describe('officeProductDataService.saveOfficeProductData', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new row when the office has no saved data yet', async () => {
    const { select: readSelect } = mockOfficeProductDataRow(null);
    const single = vi.fn().mockResolvedValue({
      data: { id: 1, updated_at: '2026-06-07T00:00:00Z' },
      error: null,
    });
    const writeSelect = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select: writeSelect }));

    supabase.from.mockReturnValue({ select: readSelect, upsert });

    await saveOfficeProductData({
      user: { employee_id: 'EMP-7', office_code: 'OFF-1', office_name: '본점' },
      rows: [{ row_id: 'A100__01', product_code: 'A100', note: 'memo', shadow: true }],
      categoryName: '농약',
      sourceFileName: 'demo.xlsx',
    });

    expect(supabase.from).toHaveBeenCalledWith('office_product_datas');
    expect(readSelect).toHaveBeenCalledWith('office_code, office_name, product_data');
    expect(upsert).toHaveBeenCalledWith(
      {
        office_code: 'OFF-1',
        office_name: '본점',
        product_data: [
          expect.objectContaining({
            category_name: '농약',
            row_count: 1,
            source_file_name: 'demo.xlsx',
            updated_at: expect.any(String),
            rows: [
              expect.objectContaining({
                row_id: 'A100__01',
                product_code: 'A100',
                note: 'memo',
                shadow: true,
              }),
            ],
          }),
        ],
        updated_who: 'EMP-7',
      },
      { onConflict: 'office_code' },
    );
  });

  it('removes product_usage before saving office product rows', async () => {
    const { select: readSelect } = mockOfficeProductDataRow(null);
    const single = vi.fn().mockResolvedValue({
      data: { id: 1, updated_at: '2026-06-07T00:00:00Z' },
      error: null,
    });
    const upsert = vi.fn(() => ({
      select: vi.fn(() => ({ single })),
    }));
    const rows = [
      {
        row_id: 'P1',
        product_name: '테스트농약',
        product_usage: [{ cropName: '벼' }],
      },
    ];

    supabase.from.mockReturnValue({ select: readSelect, upsert });

    await saveOfficeProductData({
      user: { employee_id: 'EMP-7', office_code: 'OFF-1', office_name: '본점' },
      rows,
      categoryName: '농약',
      sourceFileName: 'pesticide.xlsx',
    });

    const [savedRow] = upsert.mock.calls[0];
    expect(savedRow.product_data[0].rows).toEqual([
      { row_id: 'P1', product_name: '테스트농약' },
    ]);
    expect(rows[0]).toHaveProperty('product_usage');
  });

  it('replaces only the matching category entry, preserving the others', async () => {
    const existingRow = {
      id: 1,
      office_code: 'OFF-1',
      office_name: '본점',
      product_data: [
        { category_name: '비료', updated_at: '2026-06-01T00:00:00Z', row_count: 3, source_file_name: 'old.xlsx', rows: [{ row_id: 'F1' }] },
        { category_name: '농약', updated_at: '2026-06-02T00:00:00Z', row_count: 5, source_file_name: 'old2.xlsx', rows: [{ row_id: 'P1' }] },
      ],
    };
    const { select: readSelect } = mockOfficeProductDataRow(existingRow);
    const single = vi.fn().mockResolvedValue({
      data: { id: 1, updated_at: '2026-06-07T00:00:00Z' },
      error: null,
    });
    const writeSelect = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select: writeSelect }));

    supabase.from.mockReturnValue({ select: readSelect, upsert });

    await saveOfficeProductData({
      user: { employee_id: 'EMP-7', office_code: 'OFF-1', office_name: '본점' },
      rows: [{ row_id: 'P2' }],
      categoryName: '농약',
      sourceFileName: 'new.xlsx',
    });

    const [productData] = upsert.mock.calls[0];
    expect(productData.product_data).toEqual([
      existingRow.product_data[0],
      expect.objectContaining({
        category_name: '농약',
        row_count: 1,
        source_file_name: 'new.xlsx',
        rows: [{ row_id: 'P2' }],
      }),
    ]);
  });
});

describe('officeProductDataService.fetchOfficeProductDataCatalog', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads and normalizes catalog entries for the office, newest first', async () => {
    const { select } = mockOfficeProductDataRow({
      office_code: 'OFF-1',
      office_name: '본점',
      product_data: [
        { category_name: '비료', updated_at: '2026-06-07T03:00:00Z', row_count: 24, source_file_name: 'fertilizer.xlsx' },
        { category_name: '농약', updated_at: '2026-06-08T03:00:00Z', row_count: 10, source_file_name: 'pesticide.xlsx' },
      ],
    });

    supabase.from.mockReturnValue({ select });

    const result = await fetchOfficeProductDataCatalog({ officeCode: ' OFF-1 ' });

    expect(supabase.from).toHaveBeenCalledWith('office_product_datas');
    expect(select).toHaveBeenCalledWith('office_code, office_name, product_data');
    expect(result).toEqual([
      {
        officeCode: 'OFF-1',
        officeName: '본점',
        categoryName: '농약',
        rowCount: 10,
        sourceFileName: 'pesticide.xlsx',
        updatedAt: '2026-06-08T03:00:00Z',
      },
      {
        officeCode: 'OFF-1',
        officeName: '본점',
        categoryName: '비료',
        rowCount: 24,
        sourceFileName: 'fertilizer.xlsx',
        updatedAt: '2026-06-07T03:00:00Z',
      },
    ]);
  });

  it('returns an empty list when the office has no saved row', async () => {
    const { select } = mockOfficeProductDataRow(null);

    supabase.from.mockReturnValue({ select });

    const result = await fetchOfficeProductDataCatalog({ officeCode: 'OFF-1' });

    expect(result).toEqual([]);
  });
});

describe('officeProductDataService.fetchOfficeProductDataEntries', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns normalized product-category entries with their rows for the builder wizard', async () => {
    const { select } = mockOfficeProductDataRow({
      office_code: 'OFF-1',
      office_name: 'Demo Office',
      product_data: [
        {
          category_name: 'Fertilizer Upload',
          updated_at: '2026-06-07T03:00:00Z',
          row_count: 2,
          source_file_name: 'fertilizer.xlsx',
          rows: [{ row_id: 'F1', medium_category: 'Premium' }],
        },
      ],
    });

    supabase.from.mockReturnValue({ select });

    const result = await fetchOfficeProductDataEntries({ officeCode: ' OFF-1 ' });

    expect(result).toEqual([
      {
        officeCode: 'OFF-1',
        officeName: 'Demo Office',
        categoryName: 'Fertilizer Upload',
        rowCount: 2,
        sourceFileName: 'fertilizer.xlsx',
        updatedAt: '2026-06-07T03:00:00Z',
        rows: [{ row_id: 'F1', medium_category: 'Premium', product_category_name: 'Fertilizer Upload' }],
      },
    ]);
  });

  it('removes legacy product_usage from saved rows while reading entries', async () => {
    const { select } = mockOfficeProductDataRow({
      office_code: 'OFF-1',
      office_name: '본점',
      product_data: [
        {
          category_name: '농약',
          rows: [
            {
              row_id: 'P1',
              product_name: '테스트농약',
              product_usage: [{ cropName: '벼' }],
            },
          ],
        },
      ],
    });

    supabase.from.mockReturnValue({ select });

    const [entry] = await fetchOfficeProductDataEntries({ officeCode: 'OFF-1' });

    expect(entry.rows).toEqual([
      {
        row_id: 'P1',
        product_name: '테스트농약',
        product_category_name: '농약',
      },
    ]);
  });
});

describe('officeProductDataService.fetchOfficeProductData', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the rows for the matching category entry', async () => {
    const { select } = mockOfficeProductDataRow({
      office_code: 'OFF-1',
      office_name: '본점',
      product_data: [
        { category_name: '비료', updated_at: '2026-06-07T03:00:00Z', row_count: 1, source_file_name: 'fertilizer.xlsx', rows: [{ row_id: 'F1' }] },
      ],
    });

    supabase.from.mockReturnValue({ select });

    const result = await fetchOfficeProductData({ officeCode: 'OFF-1', categoryName: '비료' });

    expect(result).toEqual({
      rows: [{ row_id: 'F1', product_category_name: '비료' }],
      sourceFileName: 'fertilizer.xlsx',
      updatedAt: '2026-06-07T03:00:00Z',
      rowCount: 1,
    });
  });

  it('returns null when the category has not been saved', async () => {
    const { select } = mockOfficeProductDataRow({
      office_code: 'OFF-1',
      office_name: '본점',
      product_data: [],
    });

    supabase.from.mockReturnValue({ select });

    const result = await fetchOfficeProductData({ officeCode: 'OFF-1', categoryName: '비료' });

    expect(result).toBeNull();
  });
});

describe('officeProductDataService.fetchAllOfficeProductRows', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty array without calling the RPC when officeCode is empty', async () => {
    const result = await fetchAllOfficeProductRows({ officeCode: '  ' });

    expect(result).toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('calls get_public_store_products with the trimmed office code and returns the rows', async () => {
    const rows = [
      {
        product_category_name: 'Fertilizer Upload',
        product_name: 'Alpha',
        spec: '20kg',
        large_category: '비료',
        medium_category: '복합',
        small_category: '일반',
        detail_category: null,
        nutrient: 'N-P-K',
        img_url: 'https://example.com/a.png',
        product_url: 'https://example.com/a',
        tax_price: 1000,
      },
    ];

    supabase.rpc.mockResolvedValue({ data: rows, error: null });

    const result = await fetchAllOfficeProductRows({ officeCode: ' OFF-1 ' });

    expect(supabase.rpc).toHaveBeenCalledWith('get_public_store_products', {
      p_office_code: 'OFF-1',
    });
    expect(result).toEqual(rows);
    expect(Object.keys(result[0])).not.toContain('price_subsidy');
    expect(Object.keys(result[0])).not.toContain('manufacturer_list');
  });

  it('removes legacy product_usage returned by the public product RPC', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          row_id: 'P1',
          product_name: '테스트농약',
          product_usage: '[{"cropName":"벼"}]',
        },
      ],
      error: null,
    });

    const result = await fetchAllOfficeProductRows({ officeCode: 'OFF-1' });

    expect(result).toEqual([{ row_id: 'P1', product_name: '테스트농약' }]);
  });

  it('throws when the RPC returns an error', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

    await expect(fetchAllOfficeProductRows({ officeCode: 'OFF-1' })).rejects.toThrow('rpc failed');
  });

  it('returns an empty array when the RPC returns no rows', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    const result = await fetchAllOfficeProductRows({ officeCode: 'OFF-1' });

    expect(result).toEqual([]);
  });
});

describe('officeProductDataService.deleteOfficeProductData', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('removes only the matching category entry and updates the row', async () => {
    const existingRow = {
      office_code: 'OFF-1',
      office_name: '본점',
      product_data: [
        { category_name: '비료', rows: [{ row_id: 'F1' }] },
        { category_name: '농약', rows: [{ row_id: 'P1' }] },
      ],
    };
    const { select: readSelect } = mockOfficeProductDataRow(existingRow);
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));

    supabase.from.mockReturnValue({ select: readSelect, update });

    await deleteOfficeProductData({ officeCode: 'OFF-1', categoryName: '비료' });

    expect(update).toHaveBeenCalledWith({
      product_data: [{ category_name: '농약', rows: [{ row_id: 'P1' }] }],
    });
    expect(eq).toHaveBeenCalledWith('office_code', 'OFF-1');
  });

  it('does nothing when the office has no saved row', async () => {
    const { select: readSelect } = mockOfficeProductDataRow(null);
    const update = vi.fn();

    supabase.from.mockReturnValue({ select: readSelect, update });

    await deleteOfficeProductData({ officeCode: 'OFF-1', categoryName: '비료' });

    expect(update).not.toHaveBeenCalled();
  });
});
