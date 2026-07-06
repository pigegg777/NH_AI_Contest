import { describe, expect, it } from 'vitest';

import { extractStructuredPayload } from '../services/openai/openAiJsonRequest';

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
