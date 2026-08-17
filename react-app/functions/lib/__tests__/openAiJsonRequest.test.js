import { describe, expect, it } from 'vitest';

import { extractStructuredPayload, extractWebSearchQueries } from '../openAiJsonRequest';

describe('extractStructuredPayload', () => {
  it('reads output_parsed directly when present', () => {
    expect(extractStructuredPayload({ output_parsed: { palette: { accentHex: '#1d4a2e' } } })).toEqual({
      palette: { accentHex: '#1d4a2e' },
    });
  });

  it('parses output_text as a JSON string when output_parsed is missing', () => {
    expect(extractStructuredPayload({ output_text: '{"palette":{"accentHex":"#1d4a2e"}}' })).toEqual({
      palette: { accentHex: '#1d4a2e' },
    });
  });

  it('falls back to response.output items when output_parsed/output_text are missing', () => {
    expect(
      extractStructuredPayload({
        output: [
          { type: 'reasoning', summary: [] },
          { type: 'output_text', parsed: { palette: { accentHex: '#2563eb' } } },
        ],
      }),
    ).toEqual({ palette: { accentHex: '#2563eb' } });
  });

  it('falls back to content items when the parsed payload is nested under output.content', () => {
    expect(
      extractStructuredPayload({
        output: [
          {
            type: 'message',
            content: [
              { type: 'output_text', text: '{"palette":{"accentHex":"#ea580c"}}' },
            ],
          },
        ],
      }),
    ).toEqual({ palette: { accentHex: '#ea580c' } });
  });

  it('returns null when nothing structured can be found', () => {
    expect(extractStructuredPayload({})).toBeNull();
    expect(extractStructuredPayload({ output: [{ type: 'reasoning' }] })).toBeNull();
  });
});

describe('extractWebSearchQueries', () => {
  it('collects queries from web_search_call action.queries arrays', () => {
    expect(
      extractWebSearchQueries({
        output: [
          { type: 'reasoning' },
          {
            type: 'web_search_call',
            action: { type: 'search', queries: ['사과 부사 5kg', '사과 시세'], query: '사과 부사 5kg' },
          },
        ],
      }),
    ).toEqual(['사과 부사 5kg', '사과 시세']);
  });

  it('falls back to action.query when queries is absent', () => {
    expect(
      extractWebSearchQueries({
        output: [{ type: 'web_search_call', action: { type: 'search', query: '사과 부사 5kg' } }],
      }),
    ).toEqual(['사과 부사 5kg']);
  });

  it('dedupes and trims across multiple web_search_call items', () => {
    expect(
      extractWebSearchQueries({
        output: [
          { type: 'web_search_call', action: { queries: ['사과 부사 5kg', '  '] } },
          { type: 'web_search_call', action: { queries: ['사과 부사 5kg', '사과 시세'] } },
        ],
      }),
    ).toEqual(['사과 부사 5kg', '사과 시세']);
  });

  it('returns an empty array when there is no output or no web_search_call items', () => {
    expect(extractWebSearchQueries({})).toEqual([]);
    expect(extractWebSearchQueries({ output: [{ type: 'message' }] })).toEqual([]);
  });
});
