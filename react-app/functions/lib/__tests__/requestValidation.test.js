import { describe, expect, it } from 'vitest';

import {
  RequestValidationError,
  assertOfficeCodePresent,
  assertPostJsonRequest,
  assertPromptWithinLimit,
  pickAllowedKeys,
  readJsonBody,
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

describe('assertPostJsonRequest', () => {
  it('passes for a POST request with a JSON content type', () => {
    expect(() => assertPostJsonRequest(buildRequest())).not.toThrow();
  });

  it('rejects non-POST methods with 405', () => {
    expect(() => assertPostJsonRequest(buildRequest({ method: 'GET' }))).toThrow(
      expect.objectContaining({ status: 405 }),
    );
  });

  it('rejects a non-JSON content type with 422', () => {
    expect(() => assertPostJsonRequest(buildRequest({ contentType: 'text/plain' }))).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });
});

describe('readJsonBody', () => {
  it('parses a small valid JSON body', async () => {
    const body = await readJsonBody(buildRequest({ body: '{"officeCode":"OFF-1"}' }));
    expect(body).toEqual({ officeCode: 'OFF-1' });
  });

  it('rejects an oversized body via content-length with 413', async () => {
    await expect(readJsonBody(buildRequest({ contentLength: 999999 }))).rejects.toEqual(
      expect.objectContaining({ status: 413 }),
    );
  });

  it('rejects invalid JSON with 422', async () => {
    await expect(readJsonBody(buildRequest({ body: 'not json' }))).rejects.toEqual(
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

describe('pickAllowedKeys', () => {
  it('keeps only the listed keys and drops everything else', () => {
    expect(pickAllowedKeys({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('fills missing keys with undefined instead of throwing', () => {
    expect(pickAllowedKeys({ a: 1 }, ['a', 'b'])).toEqual({ a: 1, b: undefined });
  });
});
