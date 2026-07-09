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

  it('returns the raw office row and category rows exactly as supabase returned them, with no normalization', async () => {
    const rawOfficeRow = { office_code: 'OFF-1', page_config: { anything: 'goes' }, hidden_products: null, updated_at: 't' };
    const rawCategoryRows = [{ product_category_name: 'X', category_config: { anything: 'goes' } }];
    const maybeSingle = vi.fn().mockResolvedValue({ data: rawOfficeRow, error: null });
    const officeEq = vi.fn(() => ({ maybeSingle }));
    const officeSelect = vi.fn(() => ({ eq: officeEq }));
    const categoryOrder = vi.fn().mockResolvedValue({ data: rawCategoryRows, error: null });
    const categoryEq = vi.fn(() => ({ order: categoryOrder }));
    const categorySelect = vi.fn(() => ({ eq: categoryEq }));

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') return { select: officeSelect };
      if (tableName === 'office_page_category_configs') return { select: categorySelect };
      throw new Error(`Unexpected table: ${tableName}`);
    });

    const result = await fetchOfficeConfigRows({ officeCode: 'OFF-1' });

    expect(result).toEqual({ officeRow: rawOfficeRow, categoryRows: rawCategoryRows });
  });

  it('skips the category query and returns an empty category list when no office row exists', async () => {
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

  it('upserts the page config and category rows exactly as given, then deletes stale category names', async () => {
    const officeUpsert = vi.fn().mockResolvedValue({ error: null });
    const categorySelectEq = vi.fn().mockResolvedValue({
      data: [{ product_category_name: 'Obsolete' }, { product_category_name: 'Kept' }],
      error: null,
    });
    const categorySelect = vi.fn(() => ({ eq: categorySelectEq }));
    const categoryUpsert = vi.fn().mockResolvedValue({ error: null });
    const categoryDeleteIn = vi.fn().mockResolvedValue({ error: null });
    const categoryDeleteEq = vi.fn(() => ({ in: categoryDeleteIn }));
    const categoryDelete = vi.fn(() => ({ eq: categoryDeleteEq }));

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') return { upsert: officeUpsert };
      if (tableName === 'office_page_category_configs') {
        return { select: categorySelect, upsert: categoryUpsert, delete: categoryDelete };
      }

      throw new Error(`Unexpected table: ${tableName}`);
    });

    const pageConfigPayload = { anything: 'goes' };
    const categoryRows = [{ office_code: 'OFF-1', product_category_name: 'Kept', sort_order: 0, category_config: {} }];

    await saveOfficeConfigRows({
      officeCode: 'OFF-1',
      pageConfigPayload,
      hiddenProducts: [{ product_name: 'Hidden' }],
      categoryRows,
    });

    expect(officeUpsert).toHaveBeenCalledWith(
      { office_code: 'OFF-1', page_config: pageConfigPayload, hidden_products: [{ product_name: 'Hidden' }] },
      { onConflict: 'office_code' },
    );
    expect(categoryUpsert).toHaveBeenCalledWith(categoryRows, { onConflict: 'office_code,product_category_name' });
    expect(categoryDeleteIn).toHaveBeenCalledWith('product_category_name', ['Obsolete']);
  });

  it('skips the category upsert call when given no category rows', async () => {
    const officeUpsert = vi.fn().mockResolvedValue({ error: null });
    const categorySelectEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const categorySelect = vi.fn(() => ({ eq: categorySelectEq }));
    const categoryUpsert = vi.fn();

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'office_page_config') return { upsert: officeUpsert };
      if (tableName === 'office_page_category_configs') return { select: categorySelect, upsert: categoryUpsert };
      throw new Error(`Unexpected table: ${tableName}`);
    });

    await saveOfficeConfigRows({
      officeCode: 'OFF-1',
      pageConfigPayload: {},
      hiddenProducts: [],
      categoryRows: [],
    });

    expect(categoryUpsert).not.toHaveBeenCalled();
  });
});
