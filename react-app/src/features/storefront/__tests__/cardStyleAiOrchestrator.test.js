import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_CARD_STYLE } from '../model/card-design/cardStyleModel';
import { requestCardStyleAiIntent } from '../model/card-design/cardStyleAiOrchestrator';

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

describe('requestCardStyleAiIntent', () => {
  it('throws a clear error when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(
      requestCardStyleAiIntent({
        cardAiDesign: { prompt: 'warm' },
        visibleFields: ['product_name'],
        currentCardStyle: DEFAULT_CARD_STYLE,
        officeCode: 'OFF-1',
      }),
    ).rejects.toThrow('로그인 정보가 만료되었습니다');
  });

  it('posts to the same-origin endpoint with the bearer token, the history, and normalizes the response', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        intent: {
          structuralPresetRequest: null,
          titleModeRequest: null,
          layout: null,
          shell: null,
          header: { backgroundColor: null, titleColorHex: null, letterSpacing: null, fontWeight: 800 },
          image: null,
          info: null,
          field: null,
        },
        explanation: '제목을 더 굵게 바꿨습니다.',
        suggestion: '이미지도 같이 밝게 해보면 어울릴 것 같아요.',
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await requestCardStyleAiIntent({
      cardAiDesign: { prompt: 'make the title bolder', targetScope: 'header' },
      visibleFields: ['product_name', 'tax_price'],
      productCategoryName: 'Fertilizer Upload',
      currentCardStyle: DEFAULT_CARD_STYLE,
      officeCode: 'OFF-1',
      history: [{ role: 'user', text: '제목을 굵게 해줘' }],
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/storefront-ai/card-style',
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
    expect(sentBody.visibleFields).toEqual(['product_name', 'tax_price']);
    expect(sentBody.productCategoryName).toBe('Fertilizer Upload');
    expect(sentBody.history).toEqual([{ role: 'user', text: '제목을 굵게 해줘' }]);
    expect(result.intent.header).toEqual({ fontWeight: 800 });
    expect(result.explanation).toBe('제목을 더 굵게 바꿨습니다.');
    expect(result.suggestion).toBe('이미지도 같이 밝게 해보면 어울릴 것 같아요.');
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
      requestCardStyleAiIntent({
        cardAiDesign: { prompt: 'warm' },
        visibleFields: ['product_name'],
        currentCardStyle: DEFAULT_CARD_STYLE,
        officeCode: 'OFF-2',
      }),
    ).rejects.toThrow('officeCode does not match the authenticated user.');
  });
});
