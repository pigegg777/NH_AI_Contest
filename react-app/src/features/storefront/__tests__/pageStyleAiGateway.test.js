import { afterEach, describe, expect, it, vi } from 'vitest';

import { postPageStyleAiRequest } from '../services/page-design/pageStyleAiGateway';

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

describe('postPageStyleAiRequest', () => {
  it('throws a clear error when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(postPageStyleAiRequest({ officeCode: 'OFF-1' })).rejects.toThrow(
      '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.',
    );
  });

  it('posts the given request body as-is to the same-origin endpoint with the bearer token and returns the parsed response', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    const responseBody = { intent: { search: { sizeToken: 'lg' } }, explanation: 'ok', suggestion: null };
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    });
    vi.stubGlobal('fetch', fetchSpy);

    const requestBody = { officeCode: 'OFF-1', pageAiDesign: { prompt: 'make the search box larger' } };
    const result = await postPageStyleAiRequest(requestBody);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/storefront-ai/page-style',
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

    await expect(postPageStyleAiRequest({ officeCode: 'OFF-2' })).rejects.toThrow(
      'officeCode does not match the authenticated user.',
    );
  });
});
