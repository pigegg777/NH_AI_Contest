import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestOpenAiImage } from '../openAiImageRequest';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('requestOpenAiImage', () => {
  it('posts to the OpenAI images endpoint and returns a data URI built from the base64 payload', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: 'ZmFrZS1wbmc=' }] }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await requestOpenAiImage('a bag of fertilizer, studio photo style', 'sk-test');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer sk-test',
        }),
      }),
    );
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.prompt).toBe('a bag of fertilizer, studio photo style');
    expect(result).toEqual({ imageDataUri: 'data:image/png;base64,ZmFrZS1wbmc=' });
  });

  it('throws with the OpenAI error message when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'invalid prompt' } }),
      }),
    );

    await expect(requestOpenAiImage('bad prompt', 'sk-test')).rejects.toThrow(
      'OpenAI Image API request failed: invalid prompt',
    );
  });

  it('throws a generic message when the response has no data payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }),
    );

    await expect(requestOpenAiImage('prompt', 'sk-test')).rejects.toThrow(
      'OpenAI returned no image data.',
    );
  });
});
