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

function buildRequest(body) {
  return new Request('https://example.com/api/ai-bulk-note/analyze', {
    method: 'POST',
    headers: new Headers({
      'content-type': 'application/json',
      authorization: 'Bearer test-token',
    }),
    body: JSON.stringify(body),
  });
}

function stubOpenAiPayload(payload) {
  const fetchSpy = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: JSON.stringify(payload) }],
        },
      ],
    }),
  });

  vi.stubGlobal('fetch', fetchSpy);

  return fetchSpy;
}

const sampleRows = [
  { row_id: 'A100__01', product_name: '유기질비료', spec: '20kg', small_category: '가축분퇴비' },
];

const referenceSheet = {
  sheetName: 'Sheet1',
  rows: [
    ['상품코드', '상품명', '과세단가'],
    ['Z999', '새 상품', 12000],
  ],
};

const sampleNewRow = {
  product_code: 'Z999',
  product_name: '새 상품',
  spec: null,
  large_category: null,
  medium_category: null,
  small_category: null,
  detail_category: null,
  sale_price_type_code: null,
  sale_price_type_name: null,
  note: null,
  zero_tax_price: null,
  tax_price: 12000,
  exempt_tax_price: null,
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('POST /api/ai-bulk-note/analyze — append_rows', () => {
  it('returns the sanitized new rows when the AI chose to append', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    stubOpenAiPayload({
      action: 'append_rows',
      matches: [],
      new_rows: [sampleNewRow],
      unmatched_reason: null,
    });

    const request = buildRequest({
      officeCode: 'OFF-1',
      instruction: '참고 엑셀 상품들 추가해줘',
      rows: sampleRows,
      referenceSheet,
    });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('append_rows');
    expect(body.newRows).toEqual([sampleNewRow]);
  });

  it('drops a new row that has no product_code', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    stubOpenAiPayload({
      action: 'append_rows',
      matches: [],
      new_rows: [{ ...sampleNewRow, product_code: null }, sampleNewRow],
      unmatched_reason: null,
    });

    const request = buildRequest({
      officeCode: 'OFF-1',
      instruction: '참고 엑셀 상품들 추가해줘',
      rows: sampleRows,
      referenceSheet,
    });

    const body = await (await onRequestPost({ request, env: TEST_ENV })).json();

    expect(body.newRows).toHaveLength(1);
  });

  it('discards matches that an append_rows response smuggled in', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    stubOpenAiPayload({
      action: 'append_rows',
      matches: [{ row_id: 'A100__01', note: '몰래 수정' }],
      new_rows: [sampleNewRow],
      unmatched_reason: null,
    });

    const request = buildRequest({
      officeCode: 'OFF-1',
      instruction: '참고 엑셀 상품들 추가해줘',
      rows: sampleRows,
      referenceSheet,
    });

    const body = await (await onRequestPost({ request, env: TEST_ENV })).json();

    expect(body.matches).toEqual([]);
  });

  it('discards new rows that an edit_rows response smuggled in', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    stubOpenAiPayload({
      action: 'edit_rows',
      matches: [{ row_id: 'A100__01', note: '보조 1500원' }],
      new_rows: [sampleNewRow],
      unmatched_reason: null,
    });

    const request = buildRequest({
      officeCode: 'OFF-1',
      instruction: "비고 '보조 1500원' 작성해줘",
      rows: sampleRows,
      referenceSheet,
    });

    const body = await (await onRequestPost({ request, env: TEST_ENV })).json();

    expect(body.action).toBe('edit_rows');
    expect(body.newRows).toEqual([]);
    expect(body.matches).toEqual([{ rowId: 'A100__01', note: '보조 1500원' }]);
  });

  it('still calls OpenAI with no rows as long as a reference sheet came along', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const fetchSpy = stubOpenAiPayload({
      action: 'append_rows',
      matches: [],
      new_rows: [sampleNewRow],
      unmatched_reason: null,
    });

    const request = buildRequest({
      officeCode: 'OFF-1',
      instruction: '참고 엑셀 상품들 추가해줘',
      rows: [],
      referenceSheet,
    });

    const body = await (await onRequestPost({ request, env: TEST_ENV })).json();

    expect(fetchSpy).toHaveBeenCalled();
    expect(body.newRows).toHaveLength(1);
  });

  it('short-circuits with no rows and no reference sheet', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const request = buildRequest({
      officeCode: 'OFF-1',
      instruction: '참고 엑셀 상품들 추가해줘',
      rows: [],
    });

    const body = await (await onRequestPost({ request, env: TEST_ENV })).json();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(body).toEqual({
      action: 'none',
      matches: [],
      newRows: [],
      unmatchedReason: null,
    });
  });
});
