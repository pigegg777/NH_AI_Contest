import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../model/page-design/pageStyleColor';
import { migrateLegacyPageConfigToPageStyle, pageConfigNeedsPageStyleMigration } from '../model/page-design/pageStyleMigration';

describe('pageConfigNeedsPageStyleMigration', () => {
  it('is false for an empty config or one that already has pageStyle', () => {
    expect(pageConfigNeedsPageStyleMigration(null)).toBe(false);
    expect(pageConfigNeedsPageStyleMigration({})).toBe(false);
    expect(pageConfigNeedsPageStyleMigration({ pageStyle: {} })).toBe(false);
  });

  it('is true for a legacy config with designDirection/theme but no pageStyle', () => {
    expect(
      pageConfigNeedsPageStyleMigration({ designDirection: 'green', theme: { brandColor: '#1d4a2e' } }),
    ).toBe(true);
  });
});

describe('migrateLegacyPageConfigToPageStyle', () => {
  it('seeds the palette from the legacy brand color and produces a light background', () => {
    const pageStyle = migrateLegacyPageConfigToPageStyle({
      designDirection: 'trust',
      theme: { brandColor: '#2563eb', titleTextColor: 'default', typographyTone: 'standard' },
      searchSection: { variant: 'pill' },
    });

    expect(pageStyle.schemaVersion).toBe(1);
    expect(pageStyle.palette.accentHex).toBe('#2563eb');
    expect(contrastRatio(pageStyle.palette.backgroundHex, '#ffffff')).toBeLessThan(1.2);
  });

  it('maps legacy titleTextColor "brand" to the legacy accent and keeps it readable', () => {
    const pageStyle = migrateLegacyPageConfigToPageStyle({
      designDirection: 'green',
      theme: { brandColor: '#1d4a2e', titleTextColor: 'brand', typographyTone: 'bold' },
    });

    expect(contrastRatio(pageStyle.header.titleColorHex, pageStyle.palette.backgroundHex)).toBeGreaterThanOrEqual(4.5);
    expect(pageStyle.header.fontWeight).toBe(800);
    expect(pageStyle.header.letterSpacing).toBe('-0.01em');
  });

  it('maps legacy titleTextColor "ink"/"charcoal" to their fixed legacy hex values', () => {
    const inkStyle = migrateLegacyPageConfigToPageStyle({ theme: { titleTextColor: 'ink' } });
    const charcoalStyle = migrateLegacyPageConfigToPageStyle({ theme: { titleTextColor: 'charcoal' } });

    expect(inkStyle.header.titleColorHex).toBe('#0f172a');
    expect(charcoalStyle.header.titleColorHex).toBe('#27272a');
  });

  it('maps legacy search variant to a border-strength token', () => {
    expect(migrateLegacyPageConfigToPageStyle({ searchSection: { variant: 'outlined' } }).search.borderStrengthToken).toBe(
      'strong',
    );
    expect(migrateLegacyPageConfigToPageStyle({ searchSection: { variant: 'soft' } }).search.borderStrengthToken).toBe(
      'soft',
    );
    expect(migrateLegacyPageConfigToPageStyle({}).search.borderStrengthToken).toBe('normal');
  });

  it('derives category chip colors from the migrated palette', () => {
    const pageStyle = migrateLegacyPageConfigToPageStyle({ designDirection: 'warm', theme: { brandColor: '#ea580c' } });

    expect(pageStyle.categoryChips.activeBackgroundHex).toBe('#ea580c');
    expect(contrastRatio(pageStyle.categoryChips.textHex, pageStyle.categoryChips.backgroundHex)).toBeGreaterThanOrEqual(4.5);
  });

  it('falls back to the friendly accent seed when no designDirection or brandColor is present', () => {
    expect(migrateLegacyPageConfigToPageStyle({}).palette.accentHex).toBe('#2f9e6e');
    expect(migrateLegacyPageConfigToPageStyle(undefined).palette.accentHex).toBe('#2f9e6e');
  });
});
