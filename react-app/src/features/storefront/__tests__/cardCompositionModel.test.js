import { describe, expect, it } from 'vitest';

import {
  applyFieldGrouping,
  buildFieldSlots,
  clampImageSizePx,
  normalizeCardsPerRow,
  normalizeTitleMode,
  reorderFieldSlots,
  resolveImageSizeDeltaSteps,
  resolveImageSizeFromDeltaSteps,
  resolveImageSizeRange,
  resolveSectionOrderFromLayoutPlan,
  resolveSectionOrder,
  resolveStructuralPreset,
  resolveStructuralPresetFromLayoutPlan,
} from '../model/cardCompositionModel';

describe('normalizeCardsPerRow', () => {
  it('only allows 1 or 2, falling back otherwise', () => {
    expect(normalizeCardsPerRow(1)).toBe(1);
    expect(normalizeCardsPerRow(2)).toBe(2);
    expect(normalizeCardsPerRow(3)).toBe(2);
    expect(normalizeCardsPerRow('not-a-number')).toBe(2);
  });
});

describe('normalizeTitleMode', () => {
  it('only allows header or inline', () => {
    expect(normalizeTitleMode('inline')).toBe('inline');
    expect(normalizeTitleMode('floating')).toBe('header');
  });
});

describe('resolveStructuralPreset', () => {
  it('keeps a requested preset when allowed for the cards-per-row density', () => {
    expect(resolveStructuralPreset('image-left', 1)).toBe('image-left');
    expect(resolveStructuralPreset('compact-list', 2)).toBe('compact-list');
  });

  it('falls back to the density default when the preset is not eligible', () => {
    expect(resolveStructuralPreset('image-left', 2)).toBe('header-top');
    expect(resolveStructuralPreset('detail-first', 2)).toBe('header-top');
    expect(resolveStructuralPreset('unknown-preset', 1)).toBe('image-left');
  });
});

describe('resolveSectionOrder', () => {
  it('returns the stack order for header title mode', () => {
    expect(resolveSectionOrder('header-top', 'header')).toEqual(['header', 'image', 'info']);
    expect(resolveSectionOrder('image-left', 'header')).toEqual(['header', 'info']);
  });

  it('drops the header section in inline title mode', () => {
    expect(resolveSectionOrder('header-top', 'inline')).toEqual(['image', 'info']);
    expect(resolveSectionOrder('compact-list', 'inline')).toEqual(['info']);
  });
});

describe('resolveStructuralPresetFromLayoutPlan', () => {
  it('maps side-image layouts back to the side-by-side preset family', () => {
    expect(
      resolveStructuralPresetFromLayoutPlan({
        cardsPerRow: 1,
        sectionOrder: ['image', 'header', 'info'],
        imagePlacement: 'right',
      }),
    ).toBe('image-left');
  });
});

describe('resolveSectionOrderFromLayoutPlan', () => {
  it('uses the layoutPlan order and still removes header when title mode is inline', () => {
    expect(
      resolveSectionOrderFromLayoutPlan(
        {
          sectionOrder: ['info', 'header', 'image'],
        },
        'inline',
      ),
    ).toEqual(['info', 'image']);
  });
});

describe('resolveImageSizeRange', () => {
  it('caps the max size more tightly for two-column cards', () => {
    const oneColumn = resolveImageSizeRange('image-left', 1);
    const twoColumn = resolveImageSizeRange('header-top', 2);

    expect(oneColumn.max).toBeGreaterThan(twoColumn.max);
  });
});

describe('clampImageSizePx', () => {
  it('clamps within the range and falls back to default for non-numeric input', () => {
    const range = { min: 80, max: 200, default: 120, step: 16 };

    expect(clampImageSizePx(50, range)).toBe(80);
    expect(clampImageSizePx(500, range)).toBe(200);
    expect(clampImageSizePx('nope', range)).toBe(120);
  });
});

describe('resolveImageSizeDeltaSteps', () => {
  it('detects larger/smaller requests in Korean and English', () => {
    expect(resolveImageSizeDeltaSteps('이미지를 조금 크게 해줘')).toBe(1);
    expect(resolveImageSizeDeltaSteps('make the image larger')).toBe(1);
    expect(resolveImageSizeDeltaSteps('이미지를 많이 줄여줘')).toBe(-2);
    expect(resolveImageSizeDeltaSteps('no image change requested')).toBe(0);
  });
});

describe('resolveImageSizeFromDeltaSteps', () => {
  it('moves by step size and clamps', () => {
    const range = { min: 80, max: 200, default: 120, step: 16 };

    expect(resolveImageSizeFromDeltaSteps(120, 1, range)).toBe(136);
    expect(resolveImageSizeFromDeltaSteps(120, -1, range)).toBe(104);
    expect(resolveImageSizeFromDeltaSteps(190, 2, range)).toBe(200);
  });
});

describe('buildFieldSlots', () => {
  it('builds field slots in order with labels', () => {
    expect(buildFieldSlots(['spec', 'tax_price'], { spec: '규격' })).toEqual([
      { id: 'field-0-spec', kind: 'field', field: 'spec', label: '규격' },
      { id: 'field-1-tax_price', kind: 'field', field: 'tax_price', label: 'tax_price' },
    ]);
  });
});

describe('applyFieldGrouping', () => {
  it('collapses grouped fields into one group slot at the first member position', () => {
    const slots = buildFieldSlots(['spec', 'tax_price', 'zero_tax_price'], {});
    const groups = [
      { id: 'price', label: '가격', display: 'inline-group', items: [{ field: 'tax_price', label: '과세가격' }, { field: 'zero_tax_price', label: '영세가격' }] },
    ];

    expect(applyFieldGrouping(slots, groups)).toEqual([
      slots[0],
      {
        id: 'group-price',
        kind: 'inline-group',
        label: '가격',
        items: [
          { id: 'group-price-item-0', field: 'tax_price', label: '과세가격' },
          { id: 'group-price-item-1', field: 'zero_tax_price', label: '영세가격' },
        ],
      },
    ]);
  });

  it('returns the slots unchanged when there are no groups', () => {
    const slots = buildFieldSlots(['spec'], {});

    expect(applyFieldGrouping(slots, [])).toBe(slots);
  });
});

describe('reorderFieldSlots', () => {
  it('moves requested fields to the front in the requested order', () => {
    const slots = buildFieldSlots(['spec', 'tax_price', 'product_name'], {});

    expect(reorderFieldSlots(slots, ['tax_price', 'product_name']).map((slot) => slot.field)).toEqual([
      'tax_price',
      'product_name',
      'spec',
    ]);
  });

  it('returns the slots unchanged when no order is requested', () => {
    const slots = buildFieldSlots(['spec'], {});

    expect(reorderFieldSlots(slots, [])).toBe(slots);
  });
});
