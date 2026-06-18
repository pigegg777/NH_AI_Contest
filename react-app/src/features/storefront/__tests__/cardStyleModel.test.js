import { describe, expect, it } from 'vitest';

import {
  normalizeCardStyle,
  resolveCardPriceTextColor,
  DEFAULT_CARD_STYLE,
} from '../model/cardStyleModel';

describe('normalizeCardStyle', () => {
  it('keeps only allowed presentation values and falls back for invalid ones', () => {
    expect(
      normalizeCardStyle({
        layout: 'compact',
        accentColor: '#2563eb',
        fontSize: 'large',
        cardsPerRow: 3,
        imageSize: 'lg',
        imageFit: 'contain',
        cardRadius: 'xl',
        cardShadow: 'strong',
        cardSpacing: 'relaxed',
      }),
    ).toEqual({
      ...DEFAULT_CARD_STYLE,
      layout: 'compact',
      accentColor: '#2563eb',
      fontSize: 'large',
      cardsPerRow: 3,
      imageSize: 'lg',
      imageFit: 'contain',
      cardRadius: 'xl',
      cardShadow: 'strong',
      cardSpacing: 'relaxed',
    });

    expect(
      normalizeCardStyle({
        imageSize: 'giant',
        imageFit: 'stretch',
        cardRadius: 'rounder',
        cardShadow: 'heavy',
        cardSpacing: 'loose',
      }),
    ).toEqual(DEFAULT_CARD_STYLE);
  });
});

describe('priceTextColor', () => {
  it('defaults to "default" and falls back on invalid tokens', () => {
    expect(normalizeCardStyle({ priceTextColor: 'neon' }).priceTextColor).toBe('default');
    expect(normalizeCardStyle({ priceTextColor: 'muted' }).priceTextColor).toBe('muted');
    expect(normalizeCardStyle().priceTextColor).toBe('default');
  });

  it('resolves tokens to hex, with brand passing through the accent color', () => {
    expect(resolveCardPriceTextColor('default', '#2563eb')).toBe('#d32f2f');
    expect(resolveCardPriceTextColor('muted', '#2563eb')).toBe('#6b7280');
    expect(resolveCardPriceTextColor('brand', '#2563eb')).toBe('#2563eb');
    expect(resolveCardPriceTextColor('brand', undefined)).toBe('#1d4a2e');
  });
});
