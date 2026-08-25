import { describe, expect, it } from 'vitest';

import { PAGE_AI_TARGET_SCOPE_OPTIONS } from '../model/page-design/ai-request/pageAiDesignModel';
import { PAGE_STYLE_AI_SCHEMA } from '../model/page-design/ai-response/pageStyleAiResponseSchema';
import { normalizePageStyleAiIntent } from '../model/page-design/ai-response/pageStyleAiResponseNormalizer';
import { compilePageStyle } from '../model/page-design/style/pageStyleCompiler';
import { DEFAULT_PAGE_STYLE } from '../model/page-design/style/pageStyleModel';

describe('page description AI scope', () => {
  it('is the sixth chip', () => {
    expect(PAGE_AI_TARGET_SCOPE_OPTIONS).toHaveLength(6);
    expect(
      PAGE_AI_TARGET_SCOPE_OPTIONS.some((option) => option.id === 'pageDescription'),
    ).toBe(true);
  });

  it('offers only style fields, never the text', () => {
    const description = PAGE_STYLE_AI_SCHEMA.properties.description;

    expect(Object.keys(description.properties).sort()).toEqual([
      'colorHex',
      'fontSizeToken',
      'fontWeight',
      'letterSpacing',
    ]);
  });

  it('limits the intent to the description when that scope is chosen', () => {
    const intent = normalizePageStyleAiIntent(
      {
        palette: { accentHex: '#123456' },
        header: { titleColorHex: '#111111' },
        description: { colorHex: '#222222' },
        search: { sizeToken: 'lg' },
      },
      '#1d4a2e',
      'pageDescription',
    );

    expect(intent.description).toEqual({ colorHex: '#222222' });
    expect(intent.palette).toBeNull();
    expect(intent.header).toBeNull();
    expect(intent.search).toBeNull();
  });

  it('applies the description and leaves every other section alone', () => {
    const style = compilePageStyle({
      intent: { description: { colorHex: '#222222', fontSizeToken: 'lg' } },
      previousPageStyle: DEFAULT_PAGE_STYLE,
      targetScope: 'pageDescription',
    });

    expect(style.description.colorHex).toBe('#222222');
    expect(style.description.fontSizeToken).toBe('lg');
    expect(style.header).toEqual(DEFAULT_PAGE_STYLE.header);
    expect(style.palette).toEqual(DEFAULT_PAGE_STYLE.palette);
  });

  it('leaves the description alone when another scope is chosen', () => {
    const style = compilePageStyle({
      intent: { description: { colorHex: '#222222' } },
      previousPageStyle: DEFAULT_PAGE_STYLE,
      targetScope: 'header',
    });

    expect(style.description).toEqual(DEFAULT_PAGE_STYLE.description);
  });
});
