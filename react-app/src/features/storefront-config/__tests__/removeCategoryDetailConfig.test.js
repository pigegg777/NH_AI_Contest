import { afterEach, describe, expect, it, vi } from 'vitest';

import supabase from '../../../lib/supabaseClient';
import { removeCategoryDetailConfig } from '../services/storefrontConfigService';

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    from: vi.fn(),
  },
}));

function mockOfficePageConfig(categoryDetailConfig, { updateError = null } = {}) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: { category_detail_config: categoryDetailConfig }, error: null });
  const selectEq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: selectEq }));
  const updateEq = vi.fn().mockResolvedValue({ error: updateError });
  const update = vi.fn(() => ({ eq: updateEq }));

  supabase.from.mockImplementation((tableName) => {
    if (tableName === 'office_page_config') {
      return { select, update };
    }

    throw new Error(`Unexpected table: ${tableName}`);
  });

  return { select, update, updateEq };
}

describe('removeCategoryDetailConfig', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('writes back every row but the deleted category', async () => {
    const { update, updateEq } = mockOfficePageConfig([
      { product_category_name: '비료', category_config: { displayName: '비료' } },
      { product_category_name: '농약', category_config: { displayName: '농약' } },
    ]);

    await expect(
      removeCategoryDetailConfig({ officeCode: 'OFF-1', categoryName: '비료' }),
    ).resolves.toBe(true);

    expect(update).toHaveBeenCalledWith({
      category_detail_config: [
        { product_category_name: '농약', category_config: { displayName: '농약' } },
      ],
    });
    expect(updateEq).toHaveBeenCalledWith('office_code', 'OFF-1');
  });

  // Older rows spell the name in camelCase, so both have to be matched.
  it('matches a camelCase category name too', async () => {
    const { update } = mockOfficePageConfig([
      { productCategoryName: '비료', category_config: {} },
      { product_category_name: '농약', category_config: {} },
    ]);

    await expect(
      removeCategoryDetailConfig({ officeCode: 'OFF-1', categoryName: '비료' }),
    ).resolves.toBe(true);

    expect(update).toHaveBeenCalledWith({
      category_detail_config: [{ product_category_name: '농약', category_config: {} }],
    });
  });

  it('skips the write when the category has no saved design', async () => {
    const { update } = mockOfficePageConfig([
      { product_category_name: '농약', category_config: {} },
    ]);

    await expect(
      removeCategoryDetailConfig({ officeCode: 'OFF-1', categoryName: '비료' }),
    ).resolves.toBe(false);

    expect(update).not.toHaveBeenCalled();
  });

  it('does nothing without an office code or a category name', async () => {
    await expect(
      removeCategoryDetailConfig({ officeCode: '  ', categoryName: '비료' }),
    ).resolves.toBe(false);
    await expect(
      removeCategoryDetailConfig({ officeCode: 'OFF-1', categoryName: '  ' }),
    ).resolves.toBe(false);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('throws when the write fails', async () => {
    mockOfficePageConfig([{ product_category_name: '비료', category_config: {} }], {
      updateError: { message: 'update denied' },
    });

    await expect(
      removeCategoryDetailConfig({ officeCode: 'OFF-1', categoryName: '비료' }),
    ).rejects.toThrow('update denied');
  });
});
