import { describe, expect, it } from 'vitest';

import { STOREFRONT_AI_SCHEMA, normalizeStorefrontAiSuggestion } from '../services/storefrontAiService';

function collectStrictModeViolations(schema, path = []) {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  let violations = [];

  if (schema.type === 'object') {
    const propertyNames = Object.keys(schema.properties ?? {});

    if (schema.additionalProperties !== false) {
      violations.push(`${path.join('.') || '<root>'}: additionalProperties must be false`);
    }

    const required = Array.isArray(schema.required) ? schema.required : [];
    const missingRequired = propertyNames.filter((name) => !required.includes(name));

    if (missingRequired.length > 0) {
      violations.push(`${path.join('.') || '<root>'}: required must list every property (missing ${missingRequired.join(', ')})`);
    }

    for (const name of propertyNames) {
      violations = violations.concat(collectStrictModeViolations(schema.properties[name], [...path, name]));
    }
  }

  if (schema.type === 'array' && schema.items) {
    violations = violations.concat(collectStrictModeViolations(schema.items, [...path, '[]']));
  }

  return violations;
}

describe('STOREFRONT_AI_SCHEMA', () => {
  it('satisfies OpenAI strict structured-output rules at every nesting level', () => {
    expect(collectStrictModeViolations(STOREFRONT_AI_SCHEMA)).toEqual([]);
  });
});

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
            mobileUiTree: [
              { id: 'search-box', type: 'searchBox', slot: 'top', enabled: false, props: {} },
              {
                id: 'promo',
                type: 'noticeBanner',
                slot: 'beforeProducts',
                enabled: true,
                props: { title: 'Promo', text: 'Today only' },
              },
              { id: 'hack', type: 'iframe', slot: 'top', enabled: true, props: {} },
            ],
            cardElementConfig: {
              showImage: false,
              showPrice: true,
              imageSize: 'lg',
              imageFit: 'contain',
              metaDensity: 'comfortable',
            },
            uiChangeSummary: ['Hide search box', 'Add notice banner above product list'],
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
        mobileUiTree: [
          { id: 'search-box', type: 'searchBox', slot: 'top', enabled: false, props: {} },
          {
            id: 'promo',
            type: 'noticeBanner',
            slot: 'beforeProducts',
            enabled: true,
            props: { title: 'Promo', text: 'Today only' },
          },
          { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
          { id: 'empty-state', type: 'emptyState', slot: 'bottom', enabled: true, props: {} },
        ],
        cardElementConfig: {
          showImage: false,
          showProductName: true,
          showSpec: true,
          showNutrient: true,
          showPrice: true,
          showBadge: true,
          imageSize: 'lg',
          imageFit: 'contain',
          metaDensity: 'comfortable',
        },
        uiChangeSummary: ['Hide search box', 'Add notice banner above product list'],
      },
    });
  });
});
