import { describe, expect, it } from 'vitest';

import { DEFAULT_CARD_STYLE, normalizeCardStyle } from '../model/cardStyleModel';

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
