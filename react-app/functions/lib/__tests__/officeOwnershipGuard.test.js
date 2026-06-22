import { describe, expect, it, vi } from 'vitest';

import { assertOfficeOwnership } from '../officeOwnershipGuard';

function buildSupabaseStub(maybeSingleResult) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue(maybeSingleResult),
        })),
      })),
    })),
  };
}

describe('assertOfficeOwnership', () => {
  it('passes when the profile office_code matches the payload officeCode', async () => {
    const supabase = buildSupabaseStub({ data: { office_code: 'OFF-1' }, error: null });

    await expect(
      assertOfficeOwnership({ supabase, authUserId: 'user-1', officeCode: 'OFF-1' }),
    ).resolves.toBeUndefined();
  });

  it('rejects with 403 when the office codes do not match', async () => {
    const supabase = buildSupabaseStub({ data: { office_code: 'OFF-1' }, error: null });

    await expect(
      assertOfficeOwnership({ supabase, authUserId: 'user-1', officeCode: 'OFF-2' }),
    ).rejects.toEqual(expect.objectContaining({ status: 403 }));
  });

  it('rejects with 403 when no profile row exists', async () => {
    const supabase = buildSupabaseStub({ data: null, error: null });

    await expect(
      assertOfficeOwnership({ supabase, authUserId: 'user-1', officeCode: 'OFF-1' }),
    ).rejects.toEqual(expect.objectContaining({ status: 403 }));
  });

  it('rejects with 403 when the lookup itself errors', async () => {
    const supabase = buildSupabaseStub({ data: null, error: new Error('db down') });

    await expect(
      assertOfficeOwnership({ supabase, authUserId: 'user-1', officeCode: 'OFF-1' }),
    ).rejects.toEqual(expect.objectContaining({ status: 403 }));
  });
});
