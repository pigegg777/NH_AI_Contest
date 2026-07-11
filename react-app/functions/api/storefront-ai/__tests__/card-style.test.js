import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { onRequestPost } from '../card-style';

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

  return new Request('https://example.com/api/storefront-ai/card-style', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('POST /api/storefront-ai/card-style', () => {
  it('returns 401 when no bearer token is present', async () => {
    const request = buildRequest(
      { officeCode: 'OFF-1', cardAiDesign: { prompt: 'bold title' }, visibleFields: ['product_name'] },
      { authorization: '' },
    );

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(401);
  });

  it('returns 403 when officeCode does not match the profile', async () => {
    createClient.mockReturnValue(buildSupabaseStub({ officeCode: 'OFF-OTHER' }));
    const request = buildRequest({
      officeCode: 'OFF-1',
      cardAiDesign: { prompt: 'bold title' },
      visibleFields: ['product_name'],
    });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(403);
  });

  it('returns 422 when the prompt is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({
      officeCode: 'OFF-1',
      cardAiDesign: { prompt: '' },
      visibleFields: ['product_name'],
    });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns 502 when OpenAI fails', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }));
    const request = buildRequest({
      officeCode: 'OFF-1',
      cardAiDesign: { prompt: 'make the title bolder' },
      visibleFields: ['product_name'],
    });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(502);
  });

  it('returns 200 with a normalized intent, explanation, and suggestion on success', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output_parsed: {
            structuralPresetRequest: null,
            titleModeRequest: null,
            layout: null,
            shell: null,
            header: { backgroundColor: null, titleColorHex: null, letterSpacing: null, fontWeight: 800 },
            image: null,
            info: null,
            field: null,
            explanation: '제목을 더 굵게 바꿨습니다.',
            suggestion: '이미지 섹션도 같이 밝게 해보면 어울릴 것 같아요.',
          },
        }),
      }),
    );
    const request = buildRequest({
      officeCode: 'OFF-1',
      cardAiDesign: { prompt: 'make the title bolder', targetScope: 'header' },
      visibleFields: ['product_name'],
      history: [{ role: 'user', text: '제목을 굵게 해줘' }],
    });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.intent.header).toEqual({ fontWeight: 800 });
    expect(body.explanation).toBe('제목을 더 굵게 바꿨습니다.');
    expect(body.suggestion).toBe('이미지 섹션도 같이 밝게 해보면 어울릴 것 같아요.');
  });

  it('returns 422 when history has more than 12 turns', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const history = Array.from({ length: 13 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      text: `turn ${index}`,
    }));
    const request = buildRequest({
      officeCode: 'OFF-1',
      cardAiDesign: { prompt: 'make the title bolder' },
      visibleFields: ['product_name'],
      history,
    });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });
});
