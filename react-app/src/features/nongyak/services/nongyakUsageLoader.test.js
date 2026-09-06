import { describe, expect, it, vi } from 'vitest';
import { fetchNongyakUsage } from './nongyakUsageLoader';

function buildClient(response) {
  return { rpc: vi.fn().mockResolvedValue(response) };
}

describe('fetchNongyakUsage', () => {
  it('calls get_office_pesticide_usage for the inventory tab', async () => {
    const client = buildClient({ data: [{ cropName: '사과' }], error: null });

    const rows = await fetchNongyakUsage(client, { tab: 'inventory', productCode: '123' });

    expect(client.rpc).toHaveBeenCalledWith('get_office_pesticide_usage', {
      p_product_code: '123',
    });
    expect(rows).toEqual([{ cropName: '사과' }]);
  });

  it('calls get_static_pesticide_usage for the catalog tab', async () => {
    const client = buildClient({ data: [], error: null });

    await fetchNongyakUsage(client, { tab: 'catalog', productCode: '456' });

    expect(client.rpc).toHaveBeenCalledWith('get_static_pesticide_usage', {
      p_product_code: '456',
    });
  });

  it('returns an empty array when the RPC returns null', async () => {
    const client = buildClient({ data: null, error: null });

    const rows = await fetchNongyakUsage(client, { tab: 'inventory', productCode: 'missing' });

    expect(rows).toEqual([]);
  });

  it('throws on a Supabase error', async () => {
    const client = buildClient({ data: null, error: new Error('boom') });

    await expect(
      fetchNongyakUsage(client, { tab: 'inventory', productCode: '1' }),
    ).rejects.toThrow('boom');
  });

  it('rejects an unknown tab before calling the client', async () => {
    const client = buildClient({ data: [], error: null });

    await expect(
      fetchNongyakUsage(client, { tab: 'unknown', productCode: '1' }),
    ).rejects.toThrow('Unknown nongyak tab: unknown');
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
