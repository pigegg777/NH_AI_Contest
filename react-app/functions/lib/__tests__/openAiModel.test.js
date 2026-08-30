import { describe, expect, it } from 'vitest';

import { resolveOpenAiImageModel, resolveOpenAiModel } from '../openAiModel.js';

describe('resolveOpenAiModel', () => {
  it('prefers the route-specific key over the shared one', () => {
    const model = resolveOpenAiModel(
      { OPENAI_MODEL_BULK_NOTE: 'route-model', OPENAI_MODEL: 'shared-model' },
      'OPENAI_MODEL_BULK_NOTE',
      'default-model',
    );

    expect(model).toBe('route-model');
  });

  it('falls back to the shared key when the route has no key of its own', () => {
    const model = resolveOpenAiModel(
      { OPENAI_MODEL: 'shared-model' },
      'OPENAI_MODEL_BULK_NOTE',
      'default-model',
    );

    expect(model).toBe('shared-model');
  });

  it('falls back to the default when neither key is set', () => {
    expect(resolveOpenAiModel({}, 'OPENAI_MODEL_BULK_NOTE', 'default-model')).toBe(
      'default-model',
    );
    expect(resolveOpenAiModel(undefined, 'OPENAI_MODEL_BULK_NOTE', 'default-model')).toBe(
      'default-model',
    );
  });

  it('ignores a blank or non-string value', () => {
    const model = resolveOpenAiModel(
      { OPENAI_MODEL_BULK_NOTE: '   ', OPENAI_MODEL: 7 },
      'OPENAI_MODEL_BULK_NOTE',
      'default-model',
    );

    expect(model).toBe('default-model');
  });
});

describe('resolveOpenAiImageModel', () => {
  it('never reads the shared text-model key', () => {
    const model = resolveOpenAiImageModel(
      { OPENAI_MODEL: 'a-text-model' },
      'OPENAI_MODEL_IMAGE_GENERATE',
      'default-image-model',
    );

    expect(model).toBe('default-image-model');
  });

  it('uses its own key when set', () => {
    const model = resolveOpenAiImageModel(
      { OPENAI_MODEL_IMAGE_GENERATE: 'image-model', OPENAI_MODEL: 'a-text-model' },
      'OPENAI_MODEL_IMAGE_GENERATE',
      'default-image-model',
    );

    expect(model).toBe('image-model');
  });
});
