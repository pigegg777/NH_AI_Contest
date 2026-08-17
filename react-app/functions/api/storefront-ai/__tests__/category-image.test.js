import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { onRequestPost } from '../category-image';

const TEST_ENV = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  OPENAI_API_KEY: 'sk-test',
};

function buildSupabaseStub({ user = { id: 'user-1' }, officeCode = 'OFF-1' } = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { office_code: officeCode }, error: null }),
        })),
      })),
    })),
  };
}

function buildRequest(body, { authorization = 'Bearer test-token' } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });

  if (authorization) {
    headers.set('authorization', authorization);
  }

  return new Request('https://example.com/api/storefront-ai/category-image', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('POST /api/storefront-ai/category-image', () => {
  it('returns 401 when no bearer token is present', async () => {
    const request = buildRequest(
      { officeCode: 'OFF-1', mediumCategory: '복합비료' },
      { authorization: '' },
    );

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(401);
  });

  it('returns 403 when officeCode does not match the profile', async () => {
    createClient.mockReturnValue(buildSupabaseStub({ officeCode: 'OFF-OTHER' }));
    const request = buildRequest({ officeCode: 'OFF-1', mediumCategory: '복합비료' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(403);
  });

  it('returns 422 when mediumCategory is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: 'OFF-1', mediumCategory: '' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns 422 when promptOverride exceeds 2000 characters', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const longPrompt = 'a'.repeat(2001);
    const request = buildRequest({
      officeCode: 'OFF-1',
      mediumCategory: '복합비료',
      promptOverride: longPrompt,
    });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns 502 when OpenAI fails', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', mediumCategory: '복합비료' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(502);
  });

  it('returns 200 with mediumCategory, imageDataUri, and the auto-built prompt on success', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ b64_json: 'ZmFrZS1wbmc=' }] }),
      }),
    );
    const request = buildRequest({
      officeCode: 'OFF-1',
      mediumCategory: '복합비료',
      representativeProductFields: { spec: '20kg', nutrient: '18-18-18' },
    });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mediumCategory).toBe('복합비료');
    expect(body.imageDataUri).toBe('data:image/png;base64,ZmFrZS1wbmc=');
    expect(body.prompt).toContain('복합비료');
  });

  it('uses promptOverride verbatim when provided instead of the auto-built prompt', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: 'ZmFrZS1wbmc=' }] }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    const request = buildRequest({
      officeCode: 'OFF-1',
      mediumCategory: '복합비료',
      promptOverride: '파란색 톤으로, 논밭을 배경으로',
    });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(body.prompt).toBe('파란색 톤으로, 논밭을 배경으로');
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.prompt).toBe('파란색 톤으로, 논밭을 배경으로');
  });
});
