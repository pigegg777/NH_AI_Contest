import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../supabaseServerAuth', () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

import { requireAuthenticatedSupabaseUser } from '../supabaseServerAuth';
import { assertOfficeOwnership, requireOwnedOffice } from '../officeOwnershipGuard';

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

function buildRequest(url) {
  return new Request(url, { method: 'POST' });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('requireOwnedOffice', () => {
  it('authenticates then verifies ownership, returning supabase + user', async () => {
    const supabase = buildSupabaseStub({ data: { office_code: 'OFF-1' }, error: null });
    requireAuthenticatedSupabaseUser.mockResolvedValue({ supabase, user: { id: 'user-1' } });

    const result = await requireOwnedOffice({
      request: buildRequest('https://example.com/api/ai-bulk-note/analyze'),
      env: { SUPABASE_URL: 'https://example.supabase.co' },
      officeCode: 'OFF-1',
    });

    expect(result).toEqual({ supabase, user: { id: 'user-1' } });
  });

  it('defaults body to {} when omitted, so the local-dev fallback is a no-op', async () => {
    const supabase = buildSupabaseStub({ data: { office_code: 'OFF-1' }, error: null });
    requireAuthenticatedSupabaseUser.mockResolvedValue({ supabase, user: { id: 'user-1' } });
    const env = { SUPABASE_URL: 'https://example.supabase.co' };

    await requireOwnedOffice({
      request: buildRequest('http://localhost:8788/api/ai-bulk-note/analyze'),
      env,
      officeCode: 'OFF-1',
    });

    expect(requireAuthenticatedSupabaseUser).toHaveBeenCalledWith(expect.anything(), env);
  });

  it('merges the local-dev Supabase env fallback in for a localhost request with body values', async () => {
    const supabase = buildSupabaseStub({ data: { office_code: 'OFF-1' }, error: null });
    requireAuthenticatedSupabaseUser.mockResolvedValue({ supabase, user: { id: 'user-1' } });

    await requireOwnedOffice({
      request: buildRequest('http://localhost:8788/api/ai-bulk-note/analyze'),
      env: {},
      officeCode: 'OFF-1',
      body: { supabaseUrl: 'https://local.supabase.co', supabasePublishableKey: 'local-key' },
    });

    expect(requireAuthenticatedSupabaseUser).toHaveBeenCalledWith(
      expect.anything(),
      { SUPABASE_URL: 'https://local.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'local-key' },
    );
  });

  it('rejects when the office code does not match the authenticated user', async () => {
    const supabase = buildSupabaseStub({ data: { office_code: 'OFF-OTHER' }, error: null });
    requireAuthenticatedSupabaseUser.mockResolvedValue({ supabase, user: { id: 'user-1' } });

    await expect(
      requireOwnedOffice({
        request: buildRequest('https://example.com/api/ai-bulk-note/analyze'),
        env: {},
        officeCode: 'OFF-1',
      }),
    ).rejects.toEqual(expect.objectContaining({ status: 403 }));
  });

  it('propagates an authentication failure without checking ownership', async () => {
    requireAuthenticatedSupabaseUser.mockRejectedValue(new Error('Missing bearer token.'));

    await expect(
      requireOwnedOffice({
        request: buildRequest('https://example.com/api/ai-bulk-note/analyze'),
        env: {},
        officeCode: 'OFF-1',
      }),
    ).rejects.toThrow('Missing bearer token.');
  });
});
