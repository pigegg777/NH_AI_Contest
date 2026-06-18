import { describe, expect, it } from 'vitest';

import {
  STOREFRONT_AI_SCHEMA,
  buildHeuristicSuggestion,
  normalizeStorefrontAiSuggestion,
} from '../services/storefrontAiService';

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
        titleTextColor: 'default',
        typographyTone: 'standard',
        selectedMediumCategories: ['Premium'],
        representativeMediumCategory: 'Premium',
        cardFields: ['product_name', 'tax_price'],
        cardTemplate: 'card-grid',
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
          priceTextColor: 'default',
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

describe('normalizeStorefrontAiSuggestion new tokens', () => {
  it('normalizes titleTextColor, typographyTone, cardTemplate, and cardStyle.priceTextColor', () => {
    const result = normalizeStorefrontAiSuggestion(
      {
        summary: 'updated',
        patch: {
          designDirection: 'warm',
          selectedMediumCategories: ['Premium'],
          representativeMediumCategory: 'Premium',
          cardFields: ['product_name'],
          cardStyle: { priceTextColor: 'muted' },
          navConfig: {},
          mobileUiTree: [],
          cardElementConfig: {},
          uiChangeSummary: [],
          titleTextColor: 'ink',
          typographyTone: 'bold',
          cardTemplate: 'price-focus',
        },
      },
      ['Premium'],
    );

    expect(result.patch.titleTextColor).toBe('ink');
    expect(result.patch.typographyTone).toBe('bold');
    expect(result.patch.cardTemplate).toBe('price-focus');
    expect(result.patch.cardStyle.priceTextColor).toBe('muted');
  });

  it('falls back to defaults for unapproved values', () => {
    const result = normalizeStorefrontAiSuggestion(
      {
        summary: 'updated',
        patch: {
          titleTextColor: 'neon-pink',
          typographyTone: 'screamy',
          cardTemplate: 'free-form-html',
          cardStyle: {},
          selectedMediumCategories: [],
          cardFields: [],
          navConfig: {},
          mobileUiTree: [],
          cardElementConfig: {},
          uiChangeSummary: [],
        },
      },
      ['Premium'],
    );

    expect(result.patch.titleTextColor).toBe('default');
    expect(result.patch.typographyTone).toBe('standard');
    expect(result.patch.cardTemplate).toBe('card-grid');
  });
});

describe('STOREFRONT_AI_SCHEMA new fields', () => {
  it('declares titleTextColor, typographyTone, and cardTemplate as required enums on patch', () => {
    expect(STOREFRONT_AI_SCHEMA.properties.patch.properties.titleTextColor.enum).toContain('ink');
    expect(STOREFRONT_AI_SCHEMA.properties.patch.properties.typographyTone.enum).toContain('bold');
    expect(STOREFRONT_AI_SCHEMA.properties.patch.properties.cardTemplate.enum).toContain('price-focus');
    expect(STOREFRONT_AI_SCHEMA.properties.patch.required).toEqual(
      expect.arrayContaining(['titleTextColor', 'typographyTone', 'cardTemplate']),
    );
    expect(STOREFRONT_AI_SCHEMA.properties.patch.properties.cardStyle.properties.priceTextColor.enum).toContain('brand');
  });
});

describe('buildHeuristicSuggestion new tokens', () => {
  it('detects darker title text, a cleaner font, and an image-left template from the prompt', () => {
    const result = buildHeuristicSuggestion({
      prompt: 'make the title darker, use a cleaner font, and put the image on the left',
      mediumCategoryOptions: ['Premium'],
      currentDraft: {},
      allowedScalarKeys: undefined,
    });

    expect(result.patch.titleTextColor).toBe('ink');
    expect(result.patch.typographyTone).toBe('clean');
    expect(result.patch.cardTemplate).toBe('image-left');
  });

  it('detects bold/official typography and a price-focus template', () => {
    const result = buildHeuristicSuggestion({
      prompt: 'make it bolder and more official-looking, focus on price first',
      mediumCategoryOptions: ['Premium'],
      currentDraft: {},
      allowedScalarKeys: undefined,
    });

    expect(result.patch.typographyTone).toBe('bold');
    expect(result.patch.cardTemplate).toBe('price-focus');
  });

  it('defaults to standard/card-grid/default when nothing matches', () => {
    const result = buildHeuristicSuggestion({
      prompt: 'just refresh the page',
      mediumCategoryOptions: ['Premium'],
      currentDraft: {},
      allowedScalarKeys: undefined,
    });

    expect(result.patch.titleTextColor).toBe('default');
    expect(result.patch.typographyTone).toBe('standard');
    expect(result.patch.cardTemplate).toBe('card-grid');
    expect(result.patch.cardStyle.priceTextColor).toBe('default');
  });
});
