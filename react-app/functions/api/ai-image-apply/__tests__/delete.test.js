import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { onRequestPost } from '../delete';

const TEST_ENV = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
};

function buildSupabaseStub({
  user = { id: 'user-1' },
  officeCode = 'OFF-1',
  removeResult = { data: [{ name: 'x.png' }], error: null },
} = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { office_code: officeCode }, error: null }),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn().mockResolvedValue(removeResult),
      })),
    },
  };
}

function buildRequest(body, { authorization = 'Bearer test-token' } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });

  if (authorization) {
    headers.set('authorization', authorization);
  }

  return new Request('https://example.com/api/ai-image-apply/delete', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/ai-image-apply/delete', () => {
  it('returns 401 when no bearer token is present', async () => {
    const request = buildRequest({ officeCode: 'OFF-1', path: 'OFF-1/x.png' }, { authorization: '' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(401);
  });

  it('returns 403 when officeCode does not match the profile', async () => {
    createClient.mockReturnValue(buildSupabaseStub({ officeCode: 'OFF-OTHER' }));
    const request = buildRequest({ officeCode: 'OFF-1', path: 'OFF-1/x.png' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(403);
  });

  it('returns 422 when path is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: 'OFF-1', path: '' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns 422 when path does not belong to the requesting office', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: 'OFF-1', path: 'OFF-OTHER/x.png' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns 502 when the storage remove call fails', async () => {
    createClient.mockReturnValue(
      buildSupabaseStub({ removeResult: { error: { message: 'not found' } } }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', path: 'OFF-1/x.png' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(502);
  });

  it('returns 502 when the storage remove call reports no error but deletes nothing (e.g. RLS silently blocking it)', async () => {
    createClient.mockReturnValue(
      buildSupabaseStub({ removeResult: { data: [], error: null } }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', path: 'OFF-1/x.png' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(502);
  });

  it('returns 200 on successful delete', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: 'OFF-1', path: 'OFF-1/x.png' });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deleted).toBe(true);
  });
});
