import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PAGE_STYLE } from '../model/pageStyleModel';
import { requestPageStyleAiIntent } from '../services/pageStyleAiGateway';

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
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('requestPageStyleAiIntent', () => {
  it('uses the local heuristic and skips the network call when VITE_STOREFRONT_AI_LOCAL_HEURISTIC is true', async () => {
    vi.stubEnv('VITE_STOREFRONT_AI_LOCAL_HEURISTIC', 'true');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const intent = await requestPageStyleAiIntent({
      pageAiDesign: { prompt: 'make it feel blue and trustworthy' },
      currentPageStyle: DEFAULT_PAGE_STYLE,
      officeCode: 'OFF-1',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(intent.palette.accentHex).toBe('#2563eb');
  });

  it('throws a clear error when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(
      requestPageStyleAiIntent({
        pageAiDesign: { prompt: 'warm' },
        currentPageStyle: DEFAULT_PAGE_STYLE,
        officeCode: 'OFF-1',
      }),
    ).rejects.toThrow('로그인 정보가 만료되었습니다');
  });

  it('posts to the same-origin endpoint with the bearer token and normalizes the response', async () => {
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
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const intent = await requestPageStyleAiIntent({
      pageAiDesign: { prompt: 'make the search box larger', targetScope: 'search' },
      currentPageStyle: DEFAULT_PAGE_STYLE,
      officeCode: 'OFF-1',
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
    expect(sentBody.pageAiDesign).toEqual({ prompt: 'make the search box larger', targetScope: 'search' });
    expect(intent.search).toEqual({ sizeToken: 'lg' });
    expect(intent.palette).toBeNull();
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
