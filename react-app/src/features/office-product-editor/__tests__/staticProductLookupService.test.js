import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  inFilter: vi.fn(),
}));

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    from: mocks.from,
  },
}));

import { fetchStaticProductLookup } from '../services/staticProductLookupService';

describe('static product lookup service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.inFilter.mockResolvedValue({
      data: [
        {
          product_code: 'P100',
          nutirent: '살충제',
          product_category: '농약',
          product_usage: [{ cropName: '벼' }],
          indict_symbl: '접촉독',
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue({ in: mocks.inFilter });
    mocks.from.mockReturnValue({ select: mocks.select });
  });

  it('does not request or return product_usage for pesticide lookups', async () => {
    const lookup = await fetchStaticProductLookup('pesticide', ['P100']);

    expect(mocks.from).toHaveBeenCalledWith('static_pesticide');
    expect(mocks.select).toHaveBeenCalledWith(
      'product_code,nutirent,product_category,indict_symbl',
    );
    expect(lookup.P100).not.toHaveProperty('product_usage');
  });
});
