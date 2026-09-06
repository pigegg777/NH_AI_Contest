import { describe, expect, it, vi } from 'vitest';
import { searchNongyakCatalog } from './nongyakSearchService';

function buildClient(response) {
  return { rpc: vi.fn().mockResolvedValue(response) };
}

const baseFilters = {
  officeCode: 'OFFICE-1',
  crop: '',
  productName: '',
  indictSymbl: '',
  nutirent: '',
  category: '전체',
  diseaseWeed: '',
};

describe('searchNongyakCatalog', () => {
  it('calls search_office_pesticide_products for the inventory tab with each field trimmed independently', async () => {
    const client = buildClient({ data: [{ product_code: '1' }], error: null });

    const rows = await searchNongyakCatalog(client, {
      tab: 'inventory',
      ...baseFilters,
      crop: '  사과  ',
      productName: ' 부란카트 ',
      indictSymbl: '아4',
      nutirent: '폴리옥신',
      category: '살균',
      diseaseWeed: ' 노균병 ',
    });

    expect(client.rpc).toHaveBeenCalledWith('search_office_pesticide_products', {
      p_office_code: 'OFFICE-1',
      p_crop: '사과',
      p_product_name: '부란카트',
      p_indict_symbl: '아4',
      p_nutirent: '폴리옥신',
      p_category: '살균',
      p_disease_weed: '노균병',
    });
    expect(rows).toEqual([{ product_code: '1' }]);
  });

  it('calls search_static_pesticide for the catalog tab, sending null for blank fields and no office code', async () => {
    const client = buildClient({ data: [], error: null });

    await searchNongyakCatalog(client, { tab: 'catalog', ...baseFilters });

    expect(client.rpc).toHaveBeenCalledWith('search_static_pesticide', {
      p_crop: null,
      p_product_name: null,
      p_indict_symbl: null,
      p_nutirent: null,
      p_category: null,
      p_disease_weed: null,
    });
  });

  it('maps only the filled-in fields, leaving the rest null', async () => {
    const client = buildClient({ data: [], error: null });

    await searchNongyakCatalog(client, {
      tab: 'inventory',
      ...baseFilters,
      crop: '고추',
    });

    expect(client.rpc).toHaveBeenCalledWith('search_office_pesticide_products', {
      p_office_code: 'OFFICE-1',
      p_crop: '고추',
      p_product_name: null,
      p_indict_symbl: null,
      p_nutirent: null,
      p_category: null,
      p_disease_weed: null,
    });
  });

  it('sends a null office code when the logged-in user has none', async () => {
    const client = buildClient({ data: [], error: null });

    await searchNongyakCatalog(client, {
      tab: 'inventory',
      ...baseFilters,
      officeCode: '   ',
    });

    expect(client.rpc).toHaveBeenCalledWith(
      'search_office_pesticide_products',
      expect.objectContaining({ p_office_code: null }),
    );
  });

  it('throws the Supabase error when the RPC call fails', async () => {
    const client = buildClient({ data: null, error: new Error('boom') });

    await expect(
      searchNongyakCatalog(client, { tab: 'inventory', ...baseFilters }),
    ).rejects.toThrow('boom');
  });

  it('rejects an unknown tab before calling the client', async () => {
    const client = buildClient({ data: [], error: null });

    await expect(
      searchNongyakCatalog(client, { tab: 'unknown', ...baseFilters }),
    ).rejects.toThrow('Unknown nongyak tab: unknown');
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
