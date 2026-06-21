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
  it('normalizes a design plan into renderSpec and legacy preview patch', () => {
    const result = normalizeStorefrontAiSuggestion(
      {
        summary: 'updated',
        designPlan: {
          designBrief: {
            tone: 'warm',
            goal: 'Compare prices quickly.',
            audience: 'Customers',
            priority: ['product_name', 'tax_price', 'zero_tax_price'],
          },
          transformPlan: {
            groups: [
              {
                id: 'price-row',
                label: '가격',
                display: 'inline-compare',
                items: [
                  { field: 'tax_price', label: '과세' },
                  { field: 'zero_tax_price', label: '영세' },
                ],
              },
            ],
            hideIfEmpty: [],
            formatRules: [
              { field: 'tax_price', format: 'currency' },
              { field: 'zero_tax_price', format: 'currency' },
            ],
          },
          contentPlan: {
            blocks: [
              { id: 'title', type: 'field', source: 'product_name', label: '' },
              { id: 'price-row', type: 'group', source: 'price-row', label: '가격' },
            ],
          },
          layoutPlan: {
            cardVariant: 'price-focus',
            density: 'compact',
            imagePosition: 'hidden',
            pricePriority: 'high',
          },
          stylePlan: {
            priceTextColor: 'muted',
            accentColor: '#2563eb',
            cardSpacing: 'tight',
          },
        },
      },
      ['Premium', 'Starter'],
      ['product_name', 'tax_price', 'zero_tax_price'],
      {
        currentDraft: {
          selectedMediumCategories: ['Premium', 'Fake'],
          representativeMediumCategory: 'Fake',
          cardStyle: { fontSize: 'large', cardsPerRow: 1, imageFit: 'contain', cardRadius: 'xl', cardShadow: 'strong' },
          navConfig: {
            title: 'Premium Fertilizer Guide',
            subtitle: 'Fast answers',
            brandColor: '#1d4a2e',
            searchPlaceholder: 'Search fertilizer',
            logoUrl: '',
            searchVariant: 'outlined',
            categoryChipVariant: 'filled',
          },
          mobileUiTree: [],
          cardElementConfig: {},
        },
        activeSkillIds: ['layout', 'transform'],
      },
    );

    expect(result).toMatchObject({
      summary: 'updated',
      activeSkillIds: ['layout', 'transform'],
      designPlan: {
        designBrief: {
          tone: 'warm',
        },
        layoutPlan: {
          cardVariant: 'price-focus',
        },
      },
      renderSpec: {
        version: 1,
        bodySlots: [
          { id: 'title', kind: 'field', field: 'product_name', label: '' },
          {
            id: 'price-row',
            kind: 'inline-group',
            label: '가격',
            items: [
              { field: 'tax_price', label: '과세' },
              { field: 'zero_tax_price', label: '영세' },
            ],
          },
        ],
      },
      patch: {
        designDirection: 'warm',
        selectedMediumCategories: ['Premium'],
        representativeMediumCategory: 'Premium',
        cardFields: ['product_name', 'tax_price', 'zero_tax_price'],
        cardTemplate: 'price-focus',
        navConfig: {
          title: 'Premium Fertilizer Guide',
          searchVariant: 'outlined',
          categoryChipVariant: 'filled',
        },
        cardStyle: {
          layout: 'compact',
          accentColor: '#2563eb',
          fontSize: 'large',
          cardsPerRow: 1,
          imageSize: 'hidden',
          imageFit: 'contain',
          cardRadius: 'xl',
          cardShadow: 'strong',
          cardSpacing: 'tight',
          priceTextColor: 'muted',
        },
        cardElementConfig: {
          showImage: false,
          showProductName: true,
          showPrice: true,
          metaDensity: 'compact',
        },
      },
    });
  });

  it('falls back to legacy patch input when designPlan is absent', () => {
    const result = normalizeStorefrontAiSuggestion(
      {
        summary: 'updated',
        patch: {
          designDirection: 'warm',
          selectedMediumCategories: ['Premium'],
          representativeMediumCategory: 'Premium',
          cardFields: ['product_name', 'tax_price'],
          cardTemplate: 'image-left',
          cardStyle: { priceTextColor: 'brand' },
          navConfig: {},
          mobileUiTree: [],
          cardElementConfig: {},
        },
      },
      ['Premium'],
      ['product_name', 'tax_price'],
      {
        currentDraft: {
          cardStyle: {},
          navConfig: {},
          mobileUiTree: [],
          cardElementConfig: {},
        },
      },
    );

    expect(result.patch.cardTemplate).toBe('image-left');
    expect(result.patch.cardStyle.priceTextColor).toBe('brand');
    expect(result.designPlan.layoutPlan.cardVariant).toBe('image-left');
    expect(result.renderSpec.version).toBe(1);
  });

  it('keeps card fields independently styleable in renderSpec', () => {
    const result = normalizeStorefrontAiSuggestion(
      {
        summary: 'updated',
        designPlan: {
          designBrief: {
            tone: 'friendly',
            goal: 'Highlight only the subsidy field.',
            audience: 'Customers',
            priority: ['product_name', 'tax_price', 'price_subsidy'],
          },
          transformPlan: {
            groups: [],
            hideIfEmpty: [],
            formatRules: [
              { field: 'tax_price', format: 'currency' },
              { field: 'price_subsidy', format: 'currency' },
            ],
          },
          contentPlan: {
            blocks: [
              { id: 'name', type: 'field', source: 'product_name', label: '' },
              { id: 'tax-price', type: 'field', source: 'tax_price', label: '' },
              { id: 'subsidy', type: 'field', source: 'price_subsidy', label: '' },
            ],
          },
          layoutPlan: {
            cardVariant: 'card-grid',
            density: 'comfortable',
            imagePosition: 'top',
            pricePriority: 'default',
          },
          stylePlan: {
            priceTextColor: 'default',
            accentColor: '#2563eb',
            cardSpacing: 'relaxed',
            fieldStyles: [
              {
                field: 'price_subsidy',
                colorRole: 'blue',
                fontWeight: 'bold',
                fontSize: 'large',
                emphasis: 'strong',
              },
            ],
          },
        },
      },
      ['Premium'],
      ['product_name', 'tax_price', 'price_subsidy'],
    );

    const taxPriceSlot = result.renderSpec.bodySlots.find((slot) => slot.field === 'tax_price');
    const subsidySlot = result.renderSpec.bodySlots.find((slot) => slot.field === 'price_subsidy');

    expect(taxPriceSlot.style).toBeUndefined();
    expect(subsidySlot).toMatchObject({
      field: 'price_subsidy',
      style: {
        colorRole: 'blue',
        fontWeight: 'bold',
        fontSize: 'large',
        emphasis: 'strong',
      },
    });
  });
});

describe('buildHeuristicSuggestion', () => {
  it('detects an inline price group when the prompt asks for one-line comparison', () => {
    const result = buildHeuristicSuggestion({
      prompt: '과세가격이랑 영세가격을 한 줄로 비교하고 제목은 더 진하게 보여줘',
      mediumCategoryOptions: ['Premium'],
      currentDraft: {
        cardStyle: {},
        navConfig: {},
        mobileUiTree: [],
        cardElementConfig: {},
      },
      allowedScalarKeys: ['product_name', 'tax_price', 'zero_tax_price'],
    });

    expect(result.patch.cardFields).toEqual(['product_name', 'tax_price', 'zero_tax_price']);
    expect(result.designPlan.transformPlan.groups).toHaveLength(1);
    expect(result.designPlan.transformPlan.groups[0]).toMatchObject({
      id: 'price-compare',
      display: 'inline-compare',
    });
    expect(result.renderSpec.bodySlots[1]).toMatchObject({
      kind: 'inline-group',
      label: '가격',
    });
  });

  it('keeps existing style tokens while producing a richer design plan', () => {
    const result = buildHeuristicSuggestion({
      prompt: 'make it bolder and more official-looking, focus on price first',
      mediumCategoryOptions: ['Premium'],
      currentDraft: {
        cardStyle: {},
        navConfig: {},
        mobileUiTree: [],
        cardElementConfig: {},
      },
      allowedScalarKeys: undefined,
    });

    expect(result.patch.cardTemplate).toBe('price-focus');
    expect(result.designPlan.layoutPlan.cardVariant).toBe('price-focus');
  });
});
