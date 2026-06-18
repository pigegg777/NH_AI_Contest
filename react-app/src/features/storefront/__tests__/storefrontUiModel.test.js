import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CARD_ELEMENT_CONFIG,
  normalizeCardElementConfig,
  normalizeMobileUiTree,
  sanitizeMobileUiTree,
} from '../model/storefrontUiModel';

describe('normalizeMobileUiTree', () => {
  it('keeps only supported blocks and restores required product blocks', () => {
    expect(
      normalizeMobileUiTree([
        { id: 'hero-1', type: 'hero', slot: 'top', enabled: true, props: {} },
        { id: 'bad-block', type: 'scriptTag', slot: 'top', enabled: true, props: {} },
        { id: 'cta-1', type: 'ctaButton', slot: 'beforeProducts', enabled: true, props: { label: 'Call now' } },
      ]),
    ).toEqual([
      { id: 'hero-1', type: 'hero', slot: 'top', enabled: true, props: {} },
      { id: 'cta-1', type: 'ctaButton', slot: 'beforeProducts', enabled: true, props: { label: 'Call now' } },
      expect.objectContaining({ type: 'productSections', enabled: true }),
      expect.objectContaining({ type: 'emptyState', enabled: true }),
    ]);
  });
});

describe('sanitizeMobileUiTree', () => {
  it('strips deprecated nav block types even when the fallback default tree would reintroduce them', () => {
    const sanitized = sanitizeMobileUiTree([
      { id: 'hero-1', type: 'hero', slot: 'top', enabled: true, props: {} },
      { id: 'nav-1', type: 'productCategoryNav', slot: 'top', enabled: true, props: {} },
      { id: 'bar-1', type: 'mobileCategoryBar', slot: 'top', enabled: true, props: {} },
      { id: 'search-1', type: 'searchBox', slot: 'top', enabled: false, props: {} },
    ]);

    expect(sanitized.map((block) => block.type)).toEqual(['hero', 'searchBox', 'productSections', 'emptyState']);
    expect(sanitized.find((block) => block.type === 'searchBox').enabled).toBe(false);
  });

  it('falls back to the default tree (minus deprecated types) when given an empty tree', () => {
    expect(sanitizeMobileUiTree([]).map((block) => block.type)).toEqual([
      'hero',
      'searchBox',
      'categoryChips',
      'productSections',
      'emptyState',
    ]);
  });
});

describe('normalizeCardElementConfig', () => {
  it('falls back to bounded defaults for unsupported values', () => {
    expect(
      normalizeCardElementConfig({
        showImage: false,
        imageSize: 'huge',
        imageFit: 'stretch',
        metaDensity: 'dense',
      }),
    ).toEqual({
      ...DEFAULT_CARD_ELEMENT_CONFIG,
      showImage: false,
    });
  });
});
