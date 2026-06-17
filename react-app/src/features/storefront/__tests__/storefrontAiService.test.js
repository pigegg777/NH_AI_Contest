import { describe, expect, it } from 'vitest';

import { normalizeStorefrontAiSuggestion } from '../services/storefrontAiService';

describe('normalizeStorefrontAiSuggestion', () => {
  it('drops unknown medium categories and normalizes richer presentation fields', () => {
    expect(
      normalizeStorefrontAiSuggestion(
        {
          summary: 'updated',
          patch: {
            designDirection: 'warm',
            selectedMediumCategories: ['Premium', 'Fake'],
            representativeMediumCategory: 'Fake',
            cardFields: ['product_name', 'tax_price'],
            cardStyle: {
              layout: 'compact',
              accentColor: '#2563eb',
              fontSize: 'large',
              cardsPerRow: 1,
              imageSize: 'lg',
              imageFit: 'contain',
              cardRadius: 'xl',
              cardShadow: 'strong',
              cardSpacing: 'relaxed',
            },
            navConfig: {
              title: 'Premium Fertilizer Guide',
              subtitle: 'Fast answers',
              brandColor: '#2563eb',
              searchPlaceholder: 'Search fertilizer',
              logoUrl: '',
              searchVariant: 'outlined',
              categoryChipVariant: 'filled',
            },
          },
        },
        ['Premium', 'Starter'],
      ),
    ).toEqual({
      summary: 'updated',
      patch: {
        designDirection: 'warm',
        selectedMediumCategories: ['Premium'],
        representativeMediumCategory: 'Premium',
        cardFields: ['product_name', 'tax_price'],
        cardStyle: {
          layout: 'compact',
          accentColor: '#2563eb',
          fontSize: 'large',
          cardsPerRow: 1,
          imageSize: 'lg',
          imageFit: 'contain',
          cardRadius: 'xl',
          cardShadow: 'strong',
          cardSpacing: 'relaxed',
        },
        navConfig: {
          title: 'Premium Fertilizer Guide',
          subtitle: 'Fast answers',
          brandColor: '#2563eb',
          searchPlaceholder: 'Search fertilizer',
          logoUrl: '',
          searchVariant: 'outlined',
          categoryChipVariant: 'filled',
        },
      },
    });
  });
});
