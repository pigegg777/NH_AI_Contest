import { afterEach, describe, expect, it, vi } from 'vitest';

import { postCategoryImageRequest } from '../services/card-design/categoryImageGateway';

vi.mock('../../../lib/supabaseClient', () => ({
  default: { auth: { getSession: vi.fn() } },
}));

import supabase from '../../../lib/supabaseClient';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('postCategoryImageRequest', () => {
  it('throws a clear error when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(postCategoryImageRequest({ officeCode: 'OFF-1', mediumCategory: '복합비료' })).rejects.toThrow(
      '로그인 정보가 만료되었습니다',
    );
  });

  it('posts the request body as-is with the bearer token and returns the parsed response', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
    const responseBody = { mediumCategory: '복합비료', imageDataUri: 'data:image/png;base64,abc', prompt: 'x' };
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => responseBody });
    vi.stubGlobal('fetch', fetchSpy);

    const requestBody = { officeCode: 'OFF-1', mediumCategory: '복합비료' };
    const result = await postCategoryImageRequest(requestBody);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/storefront-ai/category-image',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }),
        body: JSON.stringify(requestBody),
      }),
    );
    expect(result).toEqual(responseBody);
  });

  it('throws with the server error message when the response is not ok', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'officeCode mismatch.' }) }),
    );

    await expect(postCategoryImageRequest({ officeCode: 'OFF-2', mediumCategory: 'x' })).rejects.toThrow(
      'officeCode mismatch.',
    );
  });
});
