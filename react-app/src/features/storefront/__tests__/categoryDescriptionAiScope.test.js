import { describe, expect, it } from 'vitest';

import { CARD_AI_TARGET_SCOPE_OPTIONS } from '../model/card-design/ai-request/cardAiDesignModel';
import { CARD_STYLE_AI_SCHEMA } from '../model/card-design/ai-response/cardStyleAiResponseSchema';
import { normalizeOpenAiCardIntent } from '../model/card-design/ai-response/cardStyleAiResponseNormalizer';
import { compileCardStyle } from '../model/card-design/style/cardStyleCompiler';
import { DEFAULT_CARD_STYLE } from '../model/card-design/style/cardStyleModel';
import { buildShellCssVars } from '../model/card-grid-section/cardGridFieldStyleModel';

describe('category description AI scope', () => {
  it('is offered as a card-design scope, not a page-design one', () => {
    expect(
      CARD_AI_TARGET_SCOPE_OPTIONS.find((option) => option.id === 'description'),
    ).toMatchObject({ label: '분류 설명 글자' });
  });

  it('offers only style fields, never the text', () => {
    const description = CARD_STYLE_AI_SCHEMA.properties.description;

    expect(Object.keys(description.properties).sort()).toEqual([
      'colorHex',
      'fontSizeToken',
      'fontWeight',
      'letterSpacing',
    ]);
  });

  it('limits the intent to the description when that scope is chosen', () => {
    const intent = normalizeOpenAiCardIntent(
      {
        header: { titleColorHex: '#111111' },
        info: { padding: 'relaxed' },
        field: { defaultFontWeight: 700 },
        description: { colorHex: '#222222' },
      },
      'description',
    );

    expect(intent.description).toEqual({ colorHex: '#222222' });
    expect(intent.header).toBeNull();
    expect(intent.info).toBeNull();
    expect(intent.field).toBeNull();
  });

  it('leaves the description alone when another scope is chosen', () => {
    const intent = normalizeOpenAiCardIntent(
      {
        header: { titleColorHex: '#111111' },
        description: { colorHex: '#222222' },
      },
      'header',
    );

    expect(intent.header).toEqual({ titleColorHex: '#111111' });
    expect(intent.description).toBeNull();
  });

  it('drops values the schema would not have allowed', () => {
    const intent = normalizeOpenAiCardIntent(
      {
        description: {
          colorHex: 'not-a-color',
          fontSizeToken: 'gigantic',
          letterSpacing: '0.02em',
        },
      },
      'description',
    );

    expect(intent.description).toEqual({ letterSpacing: '0.02em' });
  });

  it('compiles onto the previous style without touching other sections', () => {
    const { cardStyle } = compileCardStyle({
      intent: { description: { colorHex: '#222222', fontSizeToken: 'xl' } },
      previousCardStyle: DEFAULT_CARD_STYLE,
      visibleFields: ['product_name'],
      targetScope: 'description',
    });

    expect(cardStyle.description).toEqual({
      ...DEFAULT_CARD_STYLE.description,
      colorHex: '#222222',
      fontSizeToken: 'xl',
    });
    expect(cardStyle.header).toEqual(DEFAULT_CARD_STYLE.header);
    expect(cardStyle.field).toEqual(DEFAULT_CARD_STYLE.field);
  });

  it('reaches the section as the CSS variables the stylesheet reads', () => {
    const cssVars = buildShellCssVars({
      ...DEFAULT_CARD_STYLE,
      description: {
        colorHex: '#222222',
        letterSpacing: '0.02em',
        fontWeight: 600,
        fontSizeToken: 'xl',
      },
    });

    expect(cssVars['--category-description-color']).toBe('#222222');
    expect(cssVars['--category-description-size']).toBe('0.96rem');
    expect(cssVars['--category-description-weight']).toBe(600);
    expect(cssVars['--category-description-letter-spacing']).toBe('0.02em');
  });

  it('renders nothing different by default', () => {
    const cssVars = buildShellCssVars(DEFAULT_CARD_STYLE);

    expect(cssVars['--category-description-size']).toBe('0.84rem');
    expect(cssVars['--category-description-color']).toBe('#51635a');
  });
});
