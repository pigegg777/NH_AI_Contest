import { afterEach, describe, expect, it, vi } from 'vitest';

import { postCardStyleAiRequest } from '../services/card-design/cardStyleAiGateway';

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

import supabase from '../../../lib/supabaseClient';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('postCardStyleAiRequest', () => {
  it('throws a clear error when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(postCardStyleAiRequest({ officeCode: 'OFF-1' })).rejects.toThrow(
      '로그인 정보가 만료되었습니다',
    );
  });

  it('posts the given request body as-is to the same-origin endpoint with the bearer token and returns the parsed response', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    const responseBody = { intent: { header: { fontWeight: 800 } }, explanation: 'ok', suggestion: null };
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    });
    vi.stubGlobal('fetch', fetchSpy);

    const requestBody = { officeCode: 'OFF-1', cardAiDesign: { prompt: 'make it bold' } };
    const result = await postCardStyleAiRequest(requestBody);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/storefront-ai/card-style',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(requestBody),
      }),
    );
    expect(result).toEqual(responseBody);
  });

  it('throws with the server error message when the response is not ok', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'officeCode does not match the authenticated user.' }),
      }),
    );

    await expect(postCardStyleAiRequest({ officeCode: 'OFF-2' })).rejects.toThrow(
      'officeCode does not match the authenticated user.',
    );
  });
});
