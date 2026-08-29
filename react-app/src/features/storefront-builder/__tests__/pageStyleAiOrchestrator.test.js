import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PAGE_STYLE } from '../../storefront-view/model/page-design/style/pageStyleModel';
import { requestPageStyleAiIntent } from '../model/page-design/ai-request/pageStyleAiOrchestrator';

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

describe('requestPageStyleAiIntent', () => {
  it('throws a clear error when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(
      requestPageStyleAiIntent({
        pageAiDesign: { prompt: 'warm' },
        currentPageStyle: DEFAULT_PAGE_STYLE,
        officeCode: 'OFF-1',
      }),
    ).rejects.toThrow('로그인 정보가 만료되었습니다. 다시 로그인해 주세요.');
  });

  it('posts to the same-origin endpoint with the bearer token, the history, and normalizes the response', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        intent: {
          palette: null,
          header: null,
          categoryChips: null,
          search: { sizeToken: 'lg', borderStrengthToken: null },
        },
        explanation: '검색창을 더 크게 바꿨습니다.',
        suggestion: '헤더 색상도 같이 어울리게 바꿔보면 좋을 것 같아요.',
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await requestPageStyleAiIntent({
      pageAiDesign: { prompt: 'make the search box larger', targetScope: 'search' },
      currentPageStyle: DEFAULT_PAGE_STYLE,
      officeCode: 'OFF-1',
      history: [{ role: 'user', text: '검색창이 더 잘 보이게 해줘' }],
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/storefront-ai/page-style',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.officeCode).toBe('OFF-1');
    expect(sentBody.pageAiDesign).toEqual({
      prompt: 'make the search box larger',
      targetScope: 'search',
    });
    expect(sentBody.history).toEqual([{ role: 'user', text: '검색창이 더 잘 보이게 해줘' }]);
    expect(result.intent.search).toEqual({ sizeToken: 'lg' });
    expect(result.intent.palette).toBeNull();
    expect(result.explanation).toBe('검색창을 더 크게 바꿨습니다.');
    expect(result.suggestion).toBe('헤더 색상도 같이 어울리게 바꿔보면 좋을 것 같아요.');
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

    await expect(
      requestPageStyleAiIntent({
        pageAiDesign: { prompt: 'warm' },
        currentPageStyle: DEFAULT_PAGE_STYLE,
        officeCode: 'OFF-2',
      }),
    ).rejects.toThrow('officeCode does not match the authenticated user.');
  });
});
