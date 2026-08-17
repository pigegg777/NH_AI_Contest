import { afterEach, describe, expect, it, vi } from 'vitest';

import supabase from '../../../lib/supabaseClient';
import { fetchOfficeConfigRows, saveOfficeConfigRows } from '../services/storefront-config/storefrontConfigService';

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    from: vi.fn(),
  },
}));

describe('storefrontConfigService.fetchOfficeConfigRows', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty rows without querying when officeCode is empty', async () => {
    const result = await fetchOfficeConfigRows({ officeCode: '  ' });

    expect(result).toEqual({ officeRow: null, categoryRows: [] });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns the raw office row and its embedded category_detail_config exactly as supabase returned them', async () => {
    const rawCategoryRows = [{ product_category_name: 'X', updated_at: 't', category_config: { anything: 'goes' } }];
    const rawOfficeRow = {
      office_code: 'OFF-1',
      page_config: { anything: 'goes' },
      hidden_products: null,
      category_detail_config: rawCategoryRows,
      updated_at: 't',
    };
    const maybeSingle = vi.fn().mockResolvedValue({ data: rawOfficeRow, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') return { select };
      throw new Error(`Unexpected table: ${tableName}`);
    });

    const result = await fetchOfficeConfigRows({ officeCode: 'OFF-1' });

    expect(select).toHaveBeenCalledWith('office_code, page_config, hidden_products, category_detail_config, updated_at');
    expect(result).toEqual({ officeRow: rawOfficeRow, categoryRows: rawCategoryRows });
  });

  it('returns an empty category list when no office row exists', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') return { select };
      throw new Error(`Unexpected table: ${tableName}`);
    });

    const result = await fetchOfficeConfigRows({ officeCode: 'OFF-1' });

    expect(result).toEqual({ officeRow: null, categoryRows: [] });
  });

  it('defaults categoryRows to an empty array when category_detail_config is missing', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { office_code: 'OFF-1', page_config: {}, hidden_products: [], category_detail_config: null, updated_at: 't' },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') return { select };
      throw new Error(`Unexpected table: ${tableName}`);
    });

    const result = await fetchOfficeConfigRows({ officeCode: 'OFF-1' });

    expect(result.categoryRows).toEqual([]);
  });
});

describe('storefrontConfigService.saveOfficeConfigRows', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws without calling supabase when officeCode is empty', async () => {
    await expect(
      saveOfficeConfigRows({ officeCode: '  ', pageConfigPayload: {}, hiddenProducts: [], categoryRows: [] }),
    ).rejects.toThrow(/officeCode/i);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('upserts the page config, hidden products, and category_detail_config in one office_page_config row', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') return { upsert };
      throw new Error(`Unexpected table: ${tableName}`);
    });

    const pageConfigPayload = { anything: 'goes' };
    const categoryRows = [{ product_category_name: 'Kept', updated_at: 't', category_config: {} }];

    await saveOfficeConfigRows({
      officeCode: 'OFF-1',
      pageConfigPayload,
      hiddenProducts: [{ product_name: 'Hidden' }],
      categoryRows,
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        office_code: 'OFF-1',
        page_config: pageConfigPayload,
        hidden_products: [{ product_name: 'Hidden' }],
        category_detail_config: categoryRows,
      },
      { onConflict: 'office_code' },
    );
  });

  it('writes an empty category_detail_config array when given no category rows', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') return { upsert };
      throw new Error(`Unexpected table: ${tableName}`);
    });

    await saveOfficeConfigRows({
      officeCode: 'OFF-1',
      pageConfigPayload: {},
      hiddenProducts: [],
      categoryRows: [],
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ category_detail_config: [] }),
      { onConflict: 'office_code' },
    );
  });

  it('throws when the upsert fails', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'boom' } });

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') return { upsert };
      throw new Error(`Unexpected table: ${tableName}`);
    });

    await expect(
      saveOfficeConfigRows({ officeCode: 'OFF-1', pageConfigPayload: {}, hiddenProducts: [], categoryRows: [] }),
    ).rejects.toThrow('boom');
  });
});
