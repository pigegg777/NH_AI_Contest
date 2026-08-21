import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { onRequestPost } from '../list';

const TEST_ENV = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
};

function buildSupabaseStub({
  user = { id: 'user-1' },
  officeCode = 'OFF-1',
  listResult = {
    data: [
      { id: 'a', name: 'x.png', created_at: '2026-08-19T00:00:00Z' },
      { id: 'b', name: 'y.png', created_at: '2026-08-18T00:00:00Z' },
    ],
    error: null,
  },
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
        list: vi.fn().mockResolvedValue(listResult),
        getPublicUrl: vi.fn((path) => ({
          data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/product-images/${path}` },
        })),
      })),
    },
  };
}

function buildRequest(body, { authorization = 'Bearer test-token' } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });

  if (authorization) {
    headers.set('authorization', authorization);
  }

  return new Request('https://example.com/api/ai-image-apply/list', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/ai-image-apply/list', () => {
  it('returns 401 when no bearer token is present', async () => {
    const request = buildRequest({ officeCode: 'OFF-1' }, { authorization: '' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(401);
  });

  it('returns 403 when officeCode does not match the profile', async () => {
    createClient.mockReturnValue(buildSupabaseStub({ officeCode: 'OFF-OTHER' }));
    const request = buildRequest({ officeCode: 'OFF-1' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(403);
  });

  it('returns 502 when the storage list call fails', async () => {
    createClient.mockReturnValue(
      buildSupabaseStub({ listResult: { data: null, error: { message: 'bucket not found' } } }),
    );
    const request = buildRequest({ officeCode: 'OFF-1' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(502);
  });

  it('returns 200 with the office image list, newest first', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: 'OFF-1' });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.images).toEqual([
      {
        path: 'OFF-1/x.png',
        url: 'https://example.supabase.co/storage/v1/object/public/product-images/OFF-1/x.png',
        createdAt: '2026-08-19T00:00:00Z',
      },
      {
        path: 'OFF-1/y.png',
        url: 'https://example.supabase.co/storage/v1/object/public/product-images/OFF-1/y.png',
        createdAt: '2026-08-18T00:00:00Z',
      },
    ]);
  });
});
