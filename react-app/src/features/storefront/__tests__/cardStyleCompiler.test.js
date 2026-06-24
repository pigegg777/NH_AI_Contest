import { describe, expect, it } from 'vitest';

import { DEFAULT_CARD_STYLE } from '../model/cardStyleModel';
import { compileCardStyle } from '../services/cardStyleCompiler';

const FIELD_LABELS = { tax_price: '과세가격', zero_tax_price: '영세가격', spec: '규격' };

describe('compileCardStyle merges intent onto the previous style', () => {
  it('applies a header background from the intent', () => {
    const result = compileCardStyle({
      intent: { header: { backgroundColor: '#eef2ff' } },
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: 2,
      visibleFields: ['product_name'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.cardStyle.header.backgroundColor).toBe('#eef2ff');
  });

  it('applies a field price color role from the intent', () => {
    const result = compileCardStyle({
      intent: { field: { priceColorRole: 'muted' } },
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: 2,
      visibleFields: ['product_name'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.cardStyle.field.priceColorRole).toBe('muted');
  });

  it('keeps untouched sections unchanged from the previous style', () => {
    const previousCardStyle = { ...DEFAULT_CARD_STYLE, info: { ...DEFAULT_CARD_STYLE.info, padding: 'tight' } };
    const result = compileCardStyle({
      intent: { header: { fontWeight: 800 } },
      previousCardStyle,
      cardsPerRow: 2,
      visibleFields: ['product_name'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.cardStyle.info.padding).toBe('tight');
  });

  it('leaves every section unchanged when an area was nulled out by scope gating', () => {
    const previousCardStyle = { ...DEFAULT_CARD_STYLE, header: { ...DEFAULT_CARD_STYLE.header, fontWeight: 800 } };
    const result = compileCardStyle({
      intent: { header: null, image: null, info: null, field: null },
      previousCardStyle,
      cardsPerRow: 2,
      visibleFields: ['product_name'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.cardStyle.header.fontWeight).toBe(800);
  });
});

describe('compileCardStyle structural preset and title mode', () => {
  it('falls back the requested preset to the density default when not eligible', () => {
    const result = compileCardStyle({
      intent: { structuralPresetRequest: 'image-left' },
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: 2,
      visibleFields: ['product_name'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.cardStyle.structuralPreset).toBe('header-top');
  });

  it('accepts an eligible requested preset', () => {
    const result = compileCardStyle({
      intent: { structuralPresetRequest: 'image-left' },
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: 1,
      visibleFields: ['product_name'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.cardStyle.structuralPreset).toBe('image-left');
  });

  it('applies a requested title mode change', () => {
    const result = compileCardStyle({
      intent: { titleModeRequest: 'inline' },
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: 2,
      visibleFields: ['product_name'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.cardStyle.titleMode).toBe('inline');
  });

  it('promotes the layout intent into layoutPlan and lets it drive the structural family', () => {
    const result = compileCardStyle({
      intent: {
        layout: {
          cardsPerRow: 1,
          sectionOrder: ['image', 'header', 'info'],
          imagePlacement: 'right',
          titleClamp: 1,
          contentDensity: 'compact',
          emphasis: 'image',
          groupingHint: 'default',
        },
      },
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: 2,
      visibleFields: ['product_name', 'img_url'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.cardStyle.cardsPerRow).toBe(1);
    expect(result.cardStyle.layoutPlan.imagePlacement).toBe('right');
    expect(result.cardStyle.layoutPlan.titleClamp).toBe(1);
    expect(result.cardStyle.structuralPreset).toBe('image-left');
  });
});

describe('compileCardStyle header contrast correction', () => {
  it('auto-corrects an unreadable title color against the resolved background', () => {
    const result = compileCardStyle({
      intent: { header: { backgroundColor: '#111827' } },
      previousCardStyle: { ...DEFAULT_CARD_STYLE, header: { ...DEFAULT_CARD_STYLE.header, titleColorHex: '#1f2937' } },
      cardsPerRow: 2,
      visibleFields: ['product_name'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.cardStyle.header.titleColorHex).toBe('#ffffff');
    expect(result.warning).toBe('');
  });

  it('keeps both explicitly-requested colors and surfaces a warning when they clash', () => {
    const result = compileCardStyle({
      intent: { header: { backgroundColor: '#808080', titleColorHex: '#7a7a7a' } },
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: 2,
      visibleFields: ['product_name'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.cardStyle.header.backgroundColor).toBe('#808080');
    expect(result.cardStyle.header.titleColorHex).toBe('#7a7a7a');
    expect(result.warning).not.toBe('');
  });
});

describe('compileCardStyle image size', () => {
  it('clamps the image size to the structural preset + cardsPerRow range', () => {
    const result = compileCardStyle({
      intent: { image: { sizeDeltaSteps: 2 } },
      previousCardStyle: { ...DEFAULT_CARD_STYLE, image: { fit: 'contain', sizePx: 150 } },
      cardsPerRow: 2,
      visibleFields: ['product_name'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.cardStyle.image.sizePx).toBeLessThanOrEqual(160);
  });
});

describe('compileCardStyle body composition', () => {
  it('builds field slots from visible fields, excluding product_name and img_url', () => {
    const result = compileCardStyle({
      intent: {},
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: 2,
      visibleFields: ['product_name', 'img_url', 'spec', 'tax_price'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.bodySlots.map((slot) => slot.field)).toEqual(['spec', 'tax_price']);
  });

  it('groups requested fields and reorders by the requested priority', () => {
    const result = compileCardStyle({
      intent: {
        info: {
          requestedGroups: [{ id: 'price-compare', label: '가격', display: 'inline-group', fields: ['tax_price', 'zero_tax_price'] }],
          requestedFieldOrder: ['tax_price'],
        },
      },
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: 2,
      visibleFields: ['product_name', 'spec', 'tax_price', 'zero_tax_price'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.bodySlots[0]).toEqual({
      id: 'group-price-compare',
      kind: 'inline-group',
      label: '가격',
      items: [
        { id: 'group-price-compare-item-0', field: 'tax_price', label: '과세가격' },
        { id: 'group-price-compare-item-1', field: 'zero_tax_price', label: '영세가격' },
      ],
    });
  });

  it('applies a targeted field style onto its matching slot', () => {
    const result = compileCardStyle({
      intent: {
        field: {
          targetedFieldStyles: [{ field: 'tax_price', colorRole: 'red', fontWeight: 'bold', fontSize: 'medium', emphasis: 'strong' }],
        },
      },
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: 2,
      visibleFields: ['product_name', 'spec', 'tax_price'],
      fieldLabels: FIELD_LABELS,
    });

    const taxPriceSlot = result.bodySlots.find((slot) => slot.field === 'tax_price');

    expect(taxPriceSlot.style).toEqual({ field: 'tax_price', colorRole: 'red', fontWeight: 'bold', fontSize: 'medium', emphasis: 'strong' });
  });

  it('derives a price comparison group from the layout grouping hint', () => {
    const result = compileCardStyle({
      intent: {
        layout: {
          cardsPerRow: 2,
          sectionOrder: ['header', 'image', 'info'],
          imagePlacement: 'top',
          titleClamp: 2,
          contentDensity: 'comfortable',
          emphasis: 'title',
          groupingHint: 'price-compare',
        },
      },
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: 2,
      visibleFields: ['product_name', 'spec', 'tax_price', 'zero_tax_price'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.bodySlots[0]).toEqual({
      id: 'field-0-spec',
      kind: 'field',
      field: 'spec',
      label: '규격',
    });
    expect(result.bodySlots[1]).toEqual({
      id: 'group-price-compare',
      kind: 'inline-group',
      label: '가격',
      items: [
        { id: 'group-price-compare-item-0', field: 'tax_price', label: '과세가격' },
        { id: 'group-price-compare-item-1', field: 'zero_tax_price', label: '영세가격' },
      ],
    });
  });

  it('keeps a previously-applied field style when a later prompt does not address field styling', () => {
    const fieldStyleIntent = {
      field: {
        priceColorRole: null,
        targetedFieldStyles: [
          { field: 'tax_price', colorRole: 'red', fontWeight: 'bold', fontSize: 'medium', emphasis: 'strong' },
        ],
      },
    };

    const first = compileCardStyle({
      intent: fieldStyleIntent,
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: DEFAULT_CARD_STYLE.cardsPerRow,
      visibleFields: ['product_name', 'spec', 'tax_price'],
      fieldLabels: FIELD_LABELS,
    });

    const unrelatedIntent = {
      image: { sizeDeltaSteps: 1 },
      field: { priceColorRole: null, targetedFieldStyles: null },
    };

    const second = compileCardStyle({
      intent: unrelatedIntent,
      previousCardStyle: first.cardStyle,
      previousBodySlots: first.bodySlots,
      cardsPerRow: first.cardStyle.cardsPerRow,
      visibleFields: ['product_name', 'spec', 'tax_price'],
      fieldLabels: FIELD_LABELS,
    });

    const taxPriceSlot = second.bodySlots.find((slot) => slot.field === 'tax_price');
    expect(taxPriceSlot.style).toEqual({
      field: 'tax_price',
      colorRole: 'red',
      fontWeight: 'bold',
      fontSize: 'medium',
      emphasis: 'strong',
    });
  });

  it('lets a later prompt override a specific field style without needing previousBodySlots to repeat it', () => {
    const first = compileCardStyle({
      intent: {
        field: {
          priceColorRole: null,
          targetedFieldStyles: [
            { field: 'tax_price', colorRole: 'red', fontWeight: 'bold', fontSize: 'medium', emphasis: 'strong' },
          ],
        },
      },
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: DEFAULT_CARD_STYLE.cardsPerRow,
      visibleFields: ['product_name', 'spec', 'tax_price'],
      fieldLabels: FIELD_LABELS,
    });

    const second = compileCardStyle({
      intent: {
        field: {
          priceColorRole: null,
          targetedFieldStyles: [
            { field: 'tax_price', colorRole: 'blue', fontWeight: 'normal', fontSize: 'medium', emphasis: 'none' },
          ],
        },
      },
      previousCardStyle: first.cardStyle,
      previousBodySlots: first.bodySlots,
      cardsPerRow: first.cardStyle.cardsPerRow,
      visibleFields: ['product_name', 'spec', 'tax_price'],
      fieldLabels: FIELD_LABELS,
    });

    const taxPriceSlot = second.bodySlots.find((slot) => slot.field === 'tax_price');
    expect(taxPriceSlot.style.colorRole).toBe('blue');
  });
});
