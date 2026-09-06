import { describe, expect, it, vi } from 'vitest';
import { fetchNongyakSuggestions } from './nongyakSuggestionService';

function buildClient(response) {
  return { rpc: vi.fn().mockResolvedValue(response) };
}

describe('fetchNongyakSuggestions', () => {
  it('calls suggest_office_pesticide_field for the inventory tab with a trimmed query', async () => {
    const client = buildClient({ data: [{ suggestion: '사과' }, { suggestion: '사과배' }], error: null });

    const rows = await fetchNongyakSuggestions(client, {
      tab: 'inventory',
      officeCode: 'OFFICE-1',
      field: 'crop',
      query: '  사 ',
    });

    expect(client.rpc).toHaveBeenCalledWith('suggest_office_pesticide_field', {
      p_office_code: 'OFFICE-1',
      p_field: 'crop',
      p_query: '사',
    });
    expect(rows).toEqual(['사과', '사과배']);
  });

  it('calls suggest_static_pesticide_field for the catalog tab without an office code', async () => {
    const client = buildClient({ data: [], error: null });

    await fetchNongyakSuggestions(client, {
      tab: 'catalog',
      officeCode: 'OFFICE-1',
      field: 'productName',
      query: '부란',
    });

    expect(client.rpc).toHaveBeenCalledWith('suggest_static_pesticide_field', {
      p_field: 'productName',
      p_query: '부란',
    });
  });

  it('returns an empty array without calling the client when the query is blank', async () => {
    const client = buildClient({ data: [], error: null });

    const rows = await fetchNongyakSuggestions(client, {
      tab: 'inventory',
      officeCode: 'OFFICE-1',
      field: 'productName',
      query: '   ',
    });

    expect(rows).toEqual([]);
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('returns an empty array when the RPC returns null', async () => {
    const client = buildClient({ data: null, error: null });

    const rows = await fetchNongyakSuggestions(client, {
      tab: 'inventory',
      officeCode: 'OFFICE-1',
      field: 'crop',
      query: '사과',
    });

    expect(rows).toEqual([]);
  });

  it('throws the Supabase error when the RPC call fails', async () => {
    const client = buildClient({ data: null, error: new Error('boom') });

    await expect(
      fetchNongyakSuggestions(client, {
        tab: 'inventory',
        officeCode: 'OFFICE-1',
        field: 'crop',
        query: '사과',
      }),
    ).rejects.toThrow('boom');
  });

  it('rejects an unknown tab before calling the client', async () => {
    const client = buildClient({ data: [], error: null });

    await expect(
      fetchNongyakSuggestions(client, { tab: 'unknown', field: 'crop', query: '사과' }),
    ).rejects.toThrow('Unknown nongyak tab: unknown');
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
