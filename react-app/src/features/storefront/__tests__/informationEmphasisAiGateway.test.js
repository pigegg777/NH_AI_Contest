import { afterEach, describe, expect, it, vi } from 'vitest';

import { postInformationEmphasisAiRequest } from '../services/information-emphasis/informationEmphasisAiGateway';

vi.mock('../../../lib/supabaseClient', () => ({
  default: { auth: { getSession: vi.fn() } },
}));

import supabase from '../../../lib/supabaseClient';

const REQUEST = {
  officeCode: 'OFF-1',
  label: '영세가격 안내',
  description: '비료: 요소 20kg 15,000원',
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('postInformationEmphasisAiRequest', () => {
  it('throws a clear error when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(postInformationEmphasisAiRequest(REQUEST)).rejects.toThrow(
      '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.',
    );
  });

  it('posts to the information-emphasis endpoint with the bearer token', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    const responseBody = { description: '<<비료:>> 요소 20kg 15,000원' };
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => responseBody });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await postInformationEmphasisAiRequest(REQUEST);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/storefront-ai/information-emphasis',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(REQUEST),
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
        status: 502,
        json: async () => ({ error: 'AI 응답이 원문을 바꿔 적용하지 않았습니다.' }),
      }),
    );

    await expect(postInformationEmphasisAiRequest(REQUEST)).rejects.toThrow(
      'AI 응답이 원문을 바꿔 적용하지 않았습니다.',
    );
  });
});
