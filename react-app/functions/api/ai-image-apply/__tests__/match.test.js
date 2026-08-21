import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { onRequestPost } from '../match';

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

  return new Request('https://example.com/api/ai-image-apply/match', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const sampleRows = [
  { row_id: 'A100__01', product_name: '복합비료', spec: '20kg', medium_category: '복합비료' },
];

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/ai-image-apply/match', () => {
  it('returns 401 when no bearer token is present', async () => {
    const request = buildRequest(
      { officeCode: 'OFF-1', instruction: '복합비료에 적용해줘', rows: sampleRows },
      { authorization: '' },
    );

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(401);
  });

  it('returns 403 when officeCode does not match the profile', async () => {
    createClient.mockReturnValue(buildSupabaseStub({ officeCode: 'OFF-OTHER' }));
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '복합비료에 적용해줘', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(403);
  });

  it('returns 422 when instruction is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns an empty match list without calling OpenAI when there are no rows', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '복합비료에 적용해줘', rows: [] });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ rowIds: [], unmatchedReason: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 502 when OpenAI fails', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '복합비료에 적용해줘', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(502);
  });

  it('drops a row_id OpenAI returns that was not among the rows actually sent', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    row_ids: ['A100__01', 'HALLUCINATED__99'],
                    unmatched_reason: null,
                  }),
                },
              ],
            },
          ],
        }),
      }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '복합비료에 적용해줘', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.rowIds).toEqual(['A100__01']);
  });

  it('returns 200 with normalized row ids on success', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({ row_ids: ['A100__01'], unmatched_reason: null }),
                },
              ],
            },
          ],
        }),
      }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '복합비료에 적용해줘', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ rowIds: ['A100__01'], unmatchedReason: null });
  });

  it('forwards has_img_url so "이미지 없는 상품" instructions can match rows lacking an image', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({ row_ids: ['NOIMG__01'], unmatched_reason: null }),
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const rowsWithMixedImages = [
      { row_id: 'HASIMG__01', product_name: '유기질비료', img_url: 'https://example.com/a.png' },
      { row_id: 'NOIMG__01', product_name: '복합비료', img_url: '' },
    ];
    const request = buildRequest({
      officeCode: 'OFF-1',
      instruction: '이미지 url 없는 상품에 적용해줘',
      rows: rowsWithMixedImages,
    });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    const [, fetchOptions] = fetchSpy.mock.calls[0];
    const sentBody = JSON.parse(fetchOptions.body);
    const userContent = JSON.parse(sentBody.input[1].content);

    expect(userContent.rows).toEqual([
      expect.objectContaining({ row_id: 'HASIMG__01', has_img_url: true }),
      expect.objectContaining({ row_id: 'NOIMG__01', has_img_url: false }),
    ]);
    expect(response.status).toBe(200);
    expect(body).toEqual({ rowIds: ['NOIMG__01'], unmatchedReason: null });
  });
});
