import { describe, expect, it } from 'vitest';

import { buildLocalSupabaseEnvFallback } from '../localSupabaseEnvFallback';

function buildRequest(url) {
  return new Request(url, { method: 'POST' });
}

describe('buildLocalSupabaseEnvFallback', () => {
  it('returns an empty object for a non-local request, even with body values present', () => {
    const request = buildRequest('https://example.com/api/ai-bulk-note/analyze');

    expect(
      buildLocalSupabaseEnvFallback(request, {
        supabaseUrl: 'https://example.supabase.co',
        supabasePublishableKey: 'publishable-key',
      }),
    ).toEqual({});
  });

  it('builds SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY from the body for a localhost request', () => {
    const request = buildRequest('http://localhost:8788/api/ai-bulk-note/analyze');

    expect(
      buildLocalSupabaseEnvFallback(request, {
        supabaseUrl: 'https://example.supabase.co',
        supabasePublishableKey: 'publishable-key',
      }),
    ).toEqual({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    });
  });

  it('builds the fallback for 127.0.0.1 too', () => {
    const request = buildRequest('http://127.0.0.1:8788/api/ai-bulk-note/analyze');

    expect(
      buildLocalSupabaseEnvFallback(request, {
        supabaseUrl: 'https://example.supabase.co',
        supabasePublishableKey: 'publishable-key',
      }),
    ).toEqual({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    });
  });

  it('omits keys whose body value is missing or not a string', () => {
    const request = buildRequest('http://localhost:8788/api/ai-bulk-note/analyze');

    expect(buildLocalSupabaseEnvFallback(request, {})).toEqual({});
    expect(buildLocalSupabaseEnvFallback(request, { supabaseUrl: 42 })).toEqual({});
  });
});
