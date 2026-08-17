import { describe, expect, it } from 'vitest';

import {
  collectConditionFieldValueSamples,
  DEFAULT_CARD_STYLE,
  normalizeCardStyle,
  normalizeConditionalStyleRules,
  resolveFieldColorRoleValue,
} from '../model/card-design/style/cardStyleModel';

describe('normalizeCardStyle', () => {
  it('keeps allowed values for every section and falls back to defaults otherwise', () => {
    expect(
      normalizeCardStyle({
        cardsPerRow: 1,
        structuralPreset: 'image-left',
        titleMode: 'inline',
        shell: { backgroundColor: '#fff7ed', borderColor: '#fdba74', shadow: 'strong', radius: 'xl', spacing: 'tight' },
        header: {
          backgroundColor: '#1f2937',
          borderColor: '#374151',
          padding: 'relaxed',
          titleColorHex: '#ffffff',
          letterSpacing: '0.02em',
          fontWeight: 800,
        },
        image: { fit: 'cover', sizePx: 160 },
        info: { padding: 'tight', fieldGap: 'tight', fieldGroupGap: 'tight' },
        field: { defaultColorRole: 'muted', defaultFontWeight: 'bold', defaultFontSize: 'large', priceColorRole: 'red' },
      }),
    ).toEqual({
      schemaVersion: 1,
      cardsPerRow: 1,
      structuralPreset: 'image-left',
      titleMode: 'inline',
      layoutPlan: {
        cardsPerRow: 1,
        sectionOrder: ['image', 'info'],
        imagePlacement: 'left',
        titleClamp: 2,
        contentDensity: 'compact',
        emphasis: 'image',
        groupingHint: 'default',
      },
      shell: { backgroundColor: '#fff7ed', borderColor: '#fdba74', shadow: 'strong', radius: 'xl', spacing: 'tight' },
      header: {
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        padding: 'relaxed',
        titleColorHex: '#ffffff',
        letterSpacing: '0.02em',
        fontWeight: 800,
      },
      image: { fit: 'cover', sizePx: 160 },
      info: { backgroundColor: '', borderColor: '', padding: 'tight', fieldGap: 'tight', fieldGroupGap: 'tight' },
      field: { defaultColorRole: 'muted', defaultFontWeight: 'bold', defaultFontSize: 'large', priceColorRole: 'red' },
      conditionalStyles: [],
    });
  });

  it('falls back to DEFAULT_CARD_STYLE for an empty or invalid style', () => {
    expect(normalizeCardStyle()).toEqual(DEFAULT_CARD_STYLE);
    expect(
      normalizeCardStyle({
        cardsPerRow: 99,
        shell: { shadow: 'heavy' },
        image: { fit: 'stretch' },
      }),
    ).toEqual(DEFAULT_CARD_STYLE);
  });

  it('clamps cardsPerRow to 1 or 2', () => {
    expect(normalizeCardStyle({ cardsPerRow: 3 }).cardsPerRow).toBe(2);
    expect(normalizeCardStyle({ cardsPerRow: 1 }).cardsPerRow).toBe(1);
  });

  it('falls back the structural preset to the density default when not eligible for cardsPerRow', () => {
    expect(normalizeCardStyle({ cardsPerRow: 2, structuralPreset: 'image-left' }).structuralPreset).toBe('header-top');
    expect(normalizeCardStyle({ cardsPerRow: 1, structuralPreset: 'image-left' }).structuralPreset).toBe('image-left');
  });

  it('adds and normalizes layoutPlan even for legacy structural preset inputs', () => {
    const style = normalizeCardStyle({
      cardsPerRow: 2,
      structuralPreset: 'header-top',
      layoutPlan: {
        sectionOrder: ['header', 'footer'],
        imagePlacement: 'floating',
        titleClamp: 5,
      },
    });

    expect(style.layoutPlan).toEqual({
      cardsPerRow: 2,
      sectionOrder: ['header', 'info'],
      imagePlacement: 'top',
      titleClamp: 2,
      contentDensity: 'comfortable',
      emphasis: 'title',
      groupingHint: 'default',
    });
  });

  it('keeps the header title color as given (contrast correction is the compiler\'s job, not normalize)', () => {
    const style = normalizeCardStyle({ header: { backgroundColor: '#111827', titleColorHex: '#1f2937' } });

    expect(style.header.titleColorHex).toBe('#1f2937');
  });

  it('defaults the header background independently of the shell background', () => {
    const style = normalizeCardStyle({ shell: { backgroundColor: '#0f172a' } });

    expect(style.header.backgroundColor).toBe(DEFAULT_CARD_STYLE.header.backgroundColor);
  });
});

describe('normalizeConditionalStyleRules', () => {
  it('keeps a valid rule with only recognized cosmetic overrides', () => {
    const rules = normalizeConditionalStyleRules([
      {
        conditionField: 'medium_category',
        conditionOperator: 'equals',
        conditionValue: '종자',
        shell: { backgroundColor: '#e6f7d9', spacing: 'relaxed' },
        header: null,
        image: null,
        info: null,
        field: { priceColorRole: 'green' },
      },
    ]);

    expect(rules).toEqual([
      {
        conditionField: 'medium_category',
        conditionOperator: 'equals',
        conditionValue: '종자',
        shell: { backgroundColor: '#e6f7d9', borderColor: '', shadow: '', radius: '' },
        header: null,
        image: null,
        info: null,
        field: { priceColorRole: 'green' },
      },
    ]);
  });

  it('drops rules with no condition field/value or no recognized style override', () => {
    expect(
      normalizeConditionalStyleRules([
        { conditionField: '', conditionValue: '종자', shell: { backgroundColor: '#e6f7d9' } },
        { conditionField: 'medium_category', conditionValue: '', shell: { backgroundColor: '#e6f7d9' } },
        { conditionField: 'medium_category', conditionValue: '종자' },
      ]),
    ).toEqual([]);
  });

  it('defaults an invalid conditionOperator to contains (more forgiving than exact match) and ignores unrecognized keys like layout', () => {
    const rules = normalizeConditionalStyleRules([
      {
        conditionField: 'manufacturer_list',
        conditionOperator: 'greaterThan',
        conditionValue: 'ACME',
        layout: { cardsPerRow: 1 },
        shell: { radius: 'xl' },
      },
    ]);

    expect(rules[0].conditionOperator).toBe('contains');
    expect(rules[0].layout).toBeUndefined();
    expect(rules[0].shell).toEqual({ backgroundColor: '', borderColor: '', shadow: '', radius: 'xl' });
  });

  it('drops a rule whose conditionField is not in the allowed (non-numeric) list, like a price field', () => {
    expect(
      normalizeConditionalStyleRules([
        { conditionField: 'tax_price', conditionValue: '10000', shell: { backgroundColor: '#e6f7d9' } },
      ]),
    ).toEqual([]);
  });
});

describe('collectConditionFieldValueSamples', () => {
  it('collects distinct non-empty values per grounding field, skipping free-text fields', () => {
    const rows = [
      { product_name: '꿀나라수박/200립', large_category: '시설원예자재', medium_category: '종자종묘', detail_category: '채소류' },
      { product_name: '농협꿀참외/100립', large_category: '시설원예자재', medium_category: '종자종묘', detail_category: '채소류' },
      { product_name: '고추지주대', large_category: '시설원예자재', medium_category: '농자재', detail_category: '기타' },
    ];

    const samples = collectConditionFieldValueSamples(rows);

    expect(samples.large_category).toEqual(['시설원예자재']);
    expect(samples.medium_category).toEqual(['종자종묘', '농자재']);
    expect(samples.detail_category).toEqual(['채소류', '기타']);
    expect(samples.product_name).toBeUndefined();
  });

  it('caps sample count per field and omits fields with no values, and is safe for missing/non-array rows', () => {
    const manyRows = Array.from({ length: 30 }, (_, index) => ({ medium_category: `카테고리-${index}` }));

    expect(collectConditionFieldValueSamples(manyRows).medium_category).toHaveLength(15);
    expect(collectConditionFieldValueSamples([{ product_name: 'x' }]).medium_category).toBeUndefined();
    expect(collectConditionFieldValueSamples(undefined)).toEqual({});
    expect(collectConditionFieldValueSamples(null)).toEqual({});
  });
});

describe('resolveFieldColorRoleValue', () => {
  it('resolves known roles to CSS color values, with brand pointing at the page brand color var', () => {
    expect(resolveFieldColorRoleValue('inherit')).toBe('inherit');
    expect(resolveFieldColorRoleValue('brand')).toBe('var(--brand-color, var(--corp-primary))');
    expect(resolveFieldColorRoleValue('red')).toBe('#dc2626');
    expect(resolveFieldColorRoleValue('unknown')).toBe('inherit');
  });
});
