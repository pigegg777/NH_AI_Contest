import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_STYLE,
  PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES,
  normalizePageStyle,
} from '../model/page-design/style/pageStyleModel';

describe('pageStyle.description', () => {
  it('defaults to the size the hero subtitle already renders at', () => {
    expect(DEFAULT_PAGE_STYLE.description.fontSizeToken).toBe('md');
    expect(PAGE_STYLE_DESCRIPTION_FONT_SIZE_VALUES.md).toBe('0.88rem');
  });

  it('defaults to the colour and weight the hero subtitle already uses', () => {
    expect(DEFAULT_PAGE_STYLE.description.colorHex).toBe('#51635a');
    expect(DEFAULT_PAGE_STYLE.description.fontWeight).toBe(400);
    expect(DEFAULT_PAGE_STYLE.description.letterSpacing).toBe('normal');
  });

  it('fills the section in when a saved style predates it', () => {
    const style = normalizePageStyle({ palette: { backgroundHex: '#ffffff' } });

    expect(style.description).toEqual(DEFAULT_PAGE_STYLE.description);
  });

  it('keeps values it recognises', () => {
    const style = normalizePageStyle({
      description: {
        colorHex: '#123456',
        letterSpacing: '0.02em',
        fontWeight: 700,
        fontSizeToken: 'lg',
      },
    });

    expect(style.description).toEqual({
      colorHex: '#123456',
      letterSpacing: '0.02em',
      fontWeight: 700,
      fontSizeToken: 'lg',
    });
  });

  it('falls back on values it does not recognise', () => {
    const style = normalizePageStyle({
      description: {
        colorHex: 'not-a-colour',
        letterSpacing: 42,
        fontWeight: 'bold',
        fontSizeToken: 'gigantic',
      },
    });

    expect(style.description).toEqual(DEFAULT_PAGE_STYLE.description);
  });

  it('does not force the description colour for contrast the way the header does', () => {
    // The header runs titleColorHex through ensureReadableTextColor against the
    // page background. The description is a secondary line the merchant may
    // deliberately want faint, so its colour is taken as given.
    const style = normalizePageStyle({
      palette: { backgroundHex: '#ffffff' },
      description: { colorHex: '#eeeeee' },
    });

    expect(style.description.colorHex).toBe('#eeeeee');
  });
});
