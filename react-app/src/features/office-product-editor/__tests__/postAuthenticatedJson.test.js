import { afterEach, describe, expect, it, vi } from 'vitest';

import { postAuthenticatedJson } from '../../../common/services/postAuthenticatedJson';

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

import supabase from '../../../lib/supabaseClient';

const OPTIONS = { failureLabel: 'AI bulk note request' };

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('postAuthenticatedJson', () => {
  it('throws the session-expired message when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(postAuthenticatedJson('/api/ai-bulk-note/analyze', {}, OPTIONS)).rejects.toThrow(
      '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.',
    );
  });

  it('posts the request body with the bearer token and returns the parsed response', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    const responseBody = { matches: [{ rowId: 'A100__01', note: '보조 1500원' }], unmatchedReason: null };
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    });
    vi.stubGlobal('fetch', fetchSpy);

    const requestBody = { officeCode: 'OFF-1', instruction: '조건' };
    const result = await postAuthenticatedJson('/api/ai-bulk-note/analyze', requestBody, OPTIONS);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/ai-bulk-note/analyze',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      }),
    );

    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody).toEqual(
      expect.objectContaining({
        officeCode: 'OFF-1',
        instruction: '조건',
        supabaseUrl: expect.any(String),
        supabasePublishableKey: expect.any(String),
      }),
    );
    expect(result).toEqual(responseBody);
  });

  it('throws the server error message when the response is not ok', async () => {
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

    await expect(postAuthenticatedJson('/api/ai-bulk-note/analyze', {}, OPTIONS)).rejects.toThrow(
      'officeCode does not match the authenticated user.',
    );
  });

  it('falls back to a status-coded failureLabel message when the error body is unparseable', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('not json');
        },
      }),
    );

    await expect(postAuthenticatedJson('/api/ai-bulk-note/analyze', {}, OPTIONS)).rejects.toThrow(
      'AI bulk note request failed with status 500.',
    );
  });
});
