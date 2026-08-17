import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { onRequestPost } from '../analyze';

const TEST_ENV = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  OPENAI_API_KEY: 'sk-test',
};

const sampleRows = [
  {
    row_id: 'A100__01',
    product_code: 'A100',
    product_name: 'Alpha Fertilizer',
    tax_price: 1000,
    zero_tax_price: 1200,
  },
  {
    row_id: 'B200__01',
    product_code: 'B200',
    product_name: 'Alpha Fertilizer',
    tax_price: 950,
    zero_tax_price: 1200,
  },
];

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

function buildRequest(body, { authorization = 'Bearer test-token', url } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });

  if (authorization) {
    headers.set('authorization', authorization);
  }

  return new Request(url || 'https://example.com/api/ai-similarity-extraction/analyze', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('POST /api/ai-similarity-extraction/analyze', () => {
  it('returns 500 with a clear message when Supabase env is missing', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('VITE_SUPABASE_KEY', '');
    const request = buildRequest({ officeCode: 'OFF-1', rows: sampleRows });

    const response = await onRequestPost({
      request,
      env: {
        OPENAI_API_KEY: 'sk-test',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      },
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Server is missing Supabase environment configuration.');
  });

  it('accepts server-side Supabase env aliases when authenticating', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', rows: sampleRows });

    const response = await onRequestPost({
      request,
      env: {
        OPENAI_API_KEY: 'sk-test',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      },
    });

    expect(response.status).toBe(502);
  });

  it('falls back to process env aliases when request env omits Supabase config', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }),
    );
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'publishable-key');

    const request = buildRequest({ officeCode: 'OFF-1', rows: sampleRows });
    const response = await onRequestPost({
      request,
      env: { OPENAI_API_KEY: 'sk-test' },
    });

    expect(response.status).toBe(502);
  });

  it('accepts local request Supabase fallbacks when env is unavailable', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('VITE_SUPABASE_KEY', '');
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }),
    );

    const request = buildRequest(
      {
        officeCode: 'OFF-1',
        rows: sampleRows,
        supabaseUrl: 'https://example.supabase.co',
        supabasePublishableKey: 'publishable-key',
      },
      { url: 'http://127.0.0.1:8788/api/ai-similarity-extraction/analyze' },
    );
    const response = await onRequestPost({
      request,
      env: { OPENAI_API_KEY: 'sk-test' },
    });

    expect(response.status).toBe(502);
  });

  it('ignores request Supabase fallbacks outside local development hosts', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('VITE_SUPABASE_KEY', '');
    const request = buildRequest({
      officeCode: 'OFF-1',
      rows: sampleRows,
      supabaseUrl: 'https://example.supabase.co',
      supabasePublishableKey: 'publishable-key',
    });

    const response = await onRequestPost({
      request,
      env: { OPENAI_API_KEY: 'sk-test' },
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Server is missing Supabase environment configuration.');
  });

  it('returns 401 when no bearer token is present', async () => {
    const request = buildRequest({ officeCode: 'OFF-1', rows: sampleRows }, { authorization: '' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(401);
  });

  it('returns 403 when officeCode does not match the profile', async () => {
    createClient.mockReturnValue(buildSupabaseStub({ officeCode: 'OFF-OTHER' }));
    const request = buildRequest({ officeCode: 'OFF-1', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(403);
  });

  it('returns 422 when officeCode is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: '', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns an empty recommendation list without calling OpenAI when there are no rows', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const request = buildRequest({ officeCode: 'OFF-1', rows: [] });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recommendations).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 502 when OpenAI fails', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(502);
  });

  it('uses GPT-5.6 Luna by default', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_parsed: { recommendations: [] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: buildRequest({ officeCode: 'OFF-1', rows: sampleRows }),
      env: TEST_ENV,
    });

    expect(response.status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('gpt-5.6-luna');
  });

  it('returns 200 with normalized, sorted recommendations on success', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output_parsed: {
            recommendations: [
              {
                title: '영세단가가 과세단가보다 높습니다',
                reason: 'A100__01은 1000원, B200__01은 950원으로 과세단가가 상이합니다.',
                relatedRowIds: ['A100__01', 'B200__01'],
              },
              {
                title: '낮은 우선순위',
                reason: '검토 필요',
                relatedRowIds: ['A100__01', 'B200__01'],
              },
            ],
          },
        }),
      }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recommendations).toHaveLength(2);
    expect(body.recommendations[0].title).toBe('낮은 우선순위');
    expect(body.recommendations[1].title).toBe('영세단가가 과세단가보다 높습니다');
  });

  it('keeps an OpenAI-returned recommendation even when its rows have identical prices', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const equalPriceRows = [
      { row_id: 'A100__01', product_code: 'A100', product_name: 'Alpha', tax_price: 1000, zero_tax_price: 1200 },
      { row_id: 'B200__01', product_code: 'B200', product_name: 'Alpha', tax_price: 1000, zero_tax_price: 1200 },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output_parsed: {
            recommendations: [
              {
                groupType: 'same_product',
                title: '중복 의심',
                reason: '이름이 동일합니다.',
                relatedRowIds: ['A100__01', 'B200__01'],
              },
            ],
          },
        }),
      }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', rows: equalPriceRows });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recommendations).toHaveLength(1);
    expect(body.recommendations[0].title).toBe('중복 의심');
  });
});
