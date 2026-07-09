import { describe, expect, it } from 'vitest';

import {
  categoryConfigNeedsCardStyleMigration,
  migrateLegacyCategoryConfigToCardStyle,
} from '../model/card-design/cardStyleMigration';

describe('categoryConfigNeedsCardStyleMigration', () => {
  it('is true for a legacy category config with the old flat style/elementConfig shape', () => {
    expect(
      categoryConfigNeedsCardStyleMigration({
        cardDesign: { style: { cardsPerRow: 2 }, elementConfig: { showImage: true } },
      }),
    ).toBe(true);
  });

  it('is false once cardStyle already exists', () => {
    expect(
      categoryConfigNeedsCardStyleMigration({
        cardDesign: { cardStyle: { cardsPerRow: 2 }, style: { cardsPerRow: 2 } },
      }),
    ).toBe(false);
  });

  it('is false for a brand-new category config with neither shape', () => {
    expect(categoryConfigNeedsCardStyleMigration({ cardDesign: { visibleFields: ['product_name'] } })).toBe(false);
  });
});

describe('migrateLegacyCategoryConfigToCardStyle', () => {
  it('maps the legacy card template to the matching structural preset', () => {
    expect(
      migrateLegacyCategoryConfigToCardStyle({
        layoutStyle: { variant: 'image-left' },
        cardDesign: { style: { cardsPerRow: 1 } },
      }).structuralPreset,
    ).toBe('image-left');
    expect(
      migrateLegacyCategoryConfigToCardStyle({ layoutStyle: { variant: 'price-focus' }, cardDesign: { style: {} } })
        .structuralPreset,
    ).toBe('header-top');
  });

  it('falls back an image-left/detail-first legacy template to header-top when the legacy cardsPerRow was 2 or 3', () => {
    expect(
      migrateLegacyCategoryConfigToCardStyle({
        layoutStyle: { variant: 'image-left' },
        cardDesign: { style: { cardsPerRow: 3 } },
      }).structuralPreset,
    ).toBe('header-top');
  });

  it('clamps a legacy 3-column card down to 2 columns', () => {
    expect(
      migrateLegacyCategoryConfigToCardStyle({ cardDesign: { style: { cardsPerRow: 3 } } }).cardsPerRow,
    ).toBe(2);
  });

  it('carries shell radius/shadow/spacing and image fit straight across (token sets match)', () => {
    const cardStyle = migrateLegacyCategoryConfigToCardStyle({
      cardDesign: { style: { cardRadius: 'xl', cardShadow: 'strong', cardSpacing: 'tight', imageFit: 'cover' } },
    });

    expect(cardStyle.shell.radius).toBe('xl');
    expect(cardStyle.shell.shadow).toBe('strong');
    expect(cardStyle.shell.spacing).toBe('tight');
    expect(cardStyle.image.fit).toBe('cover');
  });

  it('maps the legacy price text color token to the new field price color role', () => {
    expect(
      migrateLegacyCategoryConfigToCardStyle({ cardDesign: { style: { priceTextColor: 'muted' } } }).field
        .priceColorRole,
    ).toBe('muted');
    expect(
      migrateLegacyCategoryConfigToCardStyle({ cardDesign: { style: { priceTextColor: 'brand' } } }).field
        .priceColorRole,
    ).toBe('brand');
  });

  it('tightens info spacing when the legacy layout or density was compact', () => {
    expect(
      migrateLegacyCategoryConfigToCardStyle({ cardDesign: { style: { layout: 'compact' } } }).info.padding,
    ).toBe('tight');
    expect(
      migrateLegacyCategoryConfigToCardStyle({
        cardDesign: { style: {}, elementConfig: { metaDensity: 'compact' } },
      }).info.fieldGap,
    ).toBe('tight');
  });

  it('always migrates to header title mode since the legacy system had no inline mode', () => {
    expect(migrateLegacyCategoryConfigToCardStyle({ cardDesign: { style: {} } }).titleMode).toBe('header');
  });
});
