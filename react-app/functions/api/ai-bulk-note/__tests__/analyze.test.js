import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { onRequestPost } from '../analyze';

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

  return new Request('https://example.com/api/ai-bulk-note/analyze', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const sampleRows = [
  { row_id: 'A100__01', product_name: '유기질비료', spec: '20kg', small_category: '가축분퇴비' },
];

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/ai-bulk-note/analyze', () => {
  it('returns 401 when no bearer token is present', async () => {
    const request = buildRequest(
      { officeCode: 'OFF-1', instruction: '조건', rows: sampleRows },
      { authorization: '' },
    );

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(401);
  });

  it('returns 403 when officeCode does not match the profile', async () => {
    createClient.mockReturnValue(buildSupabaseStub({ officeCode: 'OFF-OTHER' }));
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '조건', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(403);
  });

  it('returns 422 when officeCode is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: '', instruction: '조건', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
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
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '조건', rows: [] });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ matches: [], unmatchedReason: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 502 when OpenAI fails', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '조건', rows: sampleRows });

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
                    matches: [
                      { row_id: 'A100__01', note: '보조 1500원' },
                      { row_id: 'HALLUCINATED__99', note: '보조 1500원' },
                    ],
                    unmatched_reason: null,
                  }),
                },
              ],
            },
          ],
        }),
      }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', instruction: '조건', rows: sampleRows });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.matches).toEqual([{ rowId: 'A100__01', note: '보조 1500원' }]);
  });

  it('forwards a valid reference sheet to OpenAI, capped at 500 rows', async () => {
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
                text: JSON.stringify({ matches: [], unmatched_reason: null }),
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const oversizedRows = Array.from({ length: 510 }, (_, i) => [`row-${i}`]);
    const request = buildRequest({
      officeCode: 'OFF-1',
      instruction: '조건',
      rows: sampleRows,
      referenceSheet: { sheetName: 'Sheet1', rows: oversizedRows },
    });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(200);
    const [, fetchOptions] = fetchSpy.mock.calls[0];
    const sentBody = JSON.parse(fetchOptions.body);
    const userContent = JSON.parse(sentBody.input[1].content);

    expect(userContent.reference_sheet.sheet_name).toBe('Sheet1');
    expect(userContent.reference_sheet.rows).toHaveLength(500);
  });

  it('sends a null reference sheet when none is provided', async () => {
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
                text: JSON.stringify({ matches: [], unmatched_reason: null }),
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const request = buildRequest({ officeCode: 'OFF-1', instruction: '조건', rows: sampleRows });

    await onRequestPost({ request, env: TEST_ENV });

    const [, fetchOptions] = fetchSpy.mock.calls[0];
    const sentBody = JSON.parse(fetchOptions.body);
    const userContent = JSON.parse(sentBody.input[1].content);

    expect(userContent.reference_sheet).toBeNull();
  });

  it('returns 200 with normalized matches on success', async () => {
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
                    matches: [{ row_id: 'A100__01', note: '보조 1500원' }],
                    unmatched_reason: null,
                  }),
                },
              ],
            },
          ],
        }),
      }),
    );
    const request = buildRequest({
      officeCode: 'OFF-1',
      instruction: "소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘",
      rows: sampleRows,
    });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      matches: [{ rowId: 'A100__01', note: '보조 1500원' }],
      unmatchedReason: null,
    });
  });
});
