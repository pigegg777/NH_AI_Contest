import { describe, expect, it } from 'vitest';

import {
  RequestValidationError,
  assertHistoryWithinLimits,
  assertOfficeCodePresent,
  assertPromptWithinLimit,
  pickAllowedKeys,
  readOfficeCode,
  readValidatedJsonBody,
  toOptionalTrimmedString,
  withRequestErrorHandling,
} from '../requestValidation';

function buildRequest({ method = 'POST', contentType = 'application/json', body = '{}', contentLength } = {}) {
  const headers = new Headers({ 'content-type': contentType });

  if (contentLength !== undefined) {
    headers.set('content-length', String(contentLength));
  }

  const options = { method, headers };

  // Only include body for methods that support it
  if (method !== 'GET' && method !== 'HEAD') {
    options.body = body;
  }

  return new Request('https://example.com/api/storefront-ai/page-style', options);
}

describe('readValidatedJsonBody', () => {
  it('rejects non-POST methods with 405 without reading the body', async () => {
    await expect(readValidatedJsonBody(buildRequest({ method: 'GET' }))).rejects.toEqual(
      expect.objectContaining({ status: 405 }),
    );
  });

  it('rejects a non-JSON content type with 422', async () => {
    await expect(
      readValidatedJsonBody(buildRequest({ contentType: 'text/plain' })),
    ).rejects.toEqual(expect.objectContaining({ status: 422 }));
  });

  it('parses a small valid JSON body', async () => {
    const body = await readValidatedJsonBody(buildRequest({ body: '{"officeCode":"OFF-1"}' }));
    expect(body).toEqual({ officeCode: 'OFF-1' });
  });

  it('rejects an oversized body via content-length with 413', async () => {
    await expect(readValidatedJsonBody(buildRequest({ contentLength: 999999 }))).rejects.toEqual(
      expect.objectContaining({ status: 413 }),
    );
  });

  it('rejects invalid JSON with 422', async () => {
    await expect(readValidatedJsonBody(buildRequest({ body: 'not json' }))).rejects.toEqual(
      expect.objectContaining({ status: 422 }),
    );
  });
});

describe('assertPromptWithinLimit', () => {
  it('passes for a short prompt', () => {
    expect(() => assertPromptWithinLimit('hello')).not.toThrow();
  });

  it('rejects an empty or whitespace-only prompt with 422', () => {
    expect(() => assertPromptWithinLimit('')).toThrow(expect.objectContaining({ status: 422 }));
    expect(() => assertPromptWithinLimit('   ')).toThrow(expect.objectContaining({ status: 422 }));
  });

  it('rejects a prompt over the max length with 422', () => {
    expect(() => assertPromptWithinLimit('x'.repeat(2001))).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });

  it('rejects a non-string prompt', () => {
    expect(() => assertPromptWithinLimit(undefined)).toThrow(RequestValidationError);
  });
});

describe('assertOfficeCodePresent', () => {
  it('rejects an empty officeCode with 422', () => {
    expect(() => assertOfficeCodePresent('')).toThrow(expect.objectContaining({ status: 422 }));
  });

  it('passes for a non-empty officeCode', () => {
    expect(() => assertOfficeCodePresent('OFF-1')).not.toThrow();
  });
});

describe('readOfficeCode', () => {
  it('trims a valid officeCode and returns it', () => {
    expect(readOfficeCode({ officeCode: '  OFF-1  ' })).toBe('OFF-1');
  });

  it('rejects a missing officeCode with 422', () => {
    expect(() => readOfficeCode({})).toThrow(expect.objectContaining({ status: 422 }));
  });

  it('rejects a non-string officeCode with 422', () => {
    expect(() => readOfficeCode({ officeCode: 42 })).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });

  it('rejects a whitespace-only officeCode with 422', () => {
    expect(() => readOfficeCode({ officeCode: '   ' })).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });
});

describe('toOptionalTrimmedString', () => {
  it('trims a string value', () => {
    expect(toOptionalTrimmedString('  hi  ')).toBe('hi');
  });

  it('returns an empty string for non-string values', () => {
    expect(toOptionalTrimmedString(undefined)).toBe('');
    expect(toOptionalTrimmedString(null)).toBe('');
    expect(toOptionalTrimmedString(42)).toBe('');
  });
});

describe('withRequestErrorHandling', () => {
  it('returns the wrapped handler result unchanged on success', async () => {
    const handler = withRequestErrorHandling(async () => new Response('ok', { status: 200 }));

    const response = await handler({});

    expect(response.status).toBe(200);
  });

  it('maps a thrown RequestValidationError to its own status and message', async () => {
    const handler = withRequestErrorHandling(async () => {
      throw new RequestValidationError('officeCode is required.', 422);
    });

    const response = await handler({});
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual({ error: 'officeCode is required.' });
  });

  it('maps any other thrown error to a generic 500', async () => {
    const handler = withRequestErrorHandling(async () => {
      throw new Error('boom');
    });

    const response = await handler({});
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Unexpected server error.' });
  });

  it('passes the context object through to the wrapped handler', async () => {
    const handler = withRequestErrorHandling(async (context) => {
      expect(context).toEqual({ request: 'req', env: 'env' });
      return new Response('ok');
    });

    await handler({ request: 'req', env: 'env' });
  });
});

describe('pickAllowedKeys', () => {
  it('keeps only the listed keys and drops everything else', () => {
    expect(pickAllowedKeys({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('fills missing keys with undefined instead of throwing', () => {
    expect(pickAllowedKeys({ a: 1 }, ['a', 'b'])).toEqual({ a: 1, b: undefined });
  });
});

describe('assertHistoryWithinLimits', () => {
  it('passes when history is missing entirely', () => {
    expect(() => assertHistoryWithinLimits(undefined)).not.toThrow();
    expect(() => assertHistoryWithinLimits(null)).not.toThrow();
  });

  it('passes for a small valid history array', () => {
    expect(() =>
      assertHistoryWithinLimits([
        { role: 'user', text: '제목을 굵게 해줘' },
        { role: 'assistant', text: '제목을 더 굵게 바꿨습니다.' },
      ]),
    ).not.toThrow();
  });

  it('rejects a non-array history with 422', () => {
    expect(() => assertHistoryWithinLimits('not an array')).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });

  it('rejects more than 12 turns with 422', () => {
    const history = Array.from({ length: 13 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      text: `turn ${index}`,
    }));

    expect(() => assertHistoryWithinLimits(history)).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });

  it('rejects a turn with an invalid role with 422', () => {
    expect(() => assertHistoryWithinLimits([{ role: 'system', text: 'hi' }])).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });

  it('rejects a turn whose text is over 500 characters with 422', () => {
    expect(() =>
      assertHistoryWithinLimits([{ role: 'user', text: 'x'.repeat(501) }]),
    ).toThrow(expect.objectContaining({ status: 422 }));
  });

  it('rejects a turn whose text is not a string with 422', () => {
    expect(() => assertHistoryWithinLimits([{ role: 'user', text: 123 }])).toThrow(
      RequestValidationError,
    );
  });
});
