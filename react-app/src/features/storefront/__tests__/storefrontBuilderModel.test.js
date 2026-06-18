import { describe, expect, it } from 'vitest';

import {
  CARD_TEMPLATE_OPTIONS,
  TITLE_TEXT_COLOR_OPTIONS,
  TYPOGRAPHY_TONE_OPTIONS,
  TYPOGRAPHY_TONE_VALUES,
  normalizeCategoryConfig,
  normalizePageConfig,
  resolveTitleTextColor,
} from '../model/storefrontBuilderModel';

describe('page theme tokens', () => {
  it('defaults titleTextColor and typographyTone, and falls back on invalid values', () => {
    const config = normalizePageConfig({ theme: { titleTextColor: 'neon', typographyTone: 'screamy' } });

    expect(config.theme.titleTextColor).toBe('default');
    expect(config.theme.typographyTone).toBe('standard');
  });

  it('keeps a valid titleTextColor and typographyTone', () => {
    const config = normalizePageConfig({ theme: { titleTextColor: 'ink', typographyTone: 'bold' } });

    expect(config.theme.titleTextColor).toBe('ink');
    expect(config.theme.typographyTone).toBe('bold');
  });

  it('backward-compat: missing theme fields default without throwing', () => {
    const config = normalizePageConfig({});

    expect(config.theme.titleTextColor).toBe('default');
    expect(config.theme.typographyTone).toBe('standard');
  });

  it('resolves titleTextColor tokens to hex, with brand passing through brandColor', () => {
    expect(resolveTitleTextColor('default', '#2563eb')).toBe('#173223');
    expect(resolveTitleTextColor('ink', '#2563eb')).toBe('#0f172a');
    expect(resolveTitleTextColor('brand', '#2563eb')).toBe('#2563eb');
  });

  it('exposes a weight/letter-spacing pair for every typography tone', () => {
    TYPOGRAPHY_TONE_OPTIONS.forEach((tone) => {
      expect(TYPOGRAPHY_TONE_VALUES[tone]).toMatchObject({
        headingWeight: expect.any(Number),
        bodyWeight: expect.any(Number),
        letterSpacing: expect.any(String),
      });
    });
  });
});

describe('categoryConfig cardTemplate', () => {
  it('defaults to card-grid and rejects unapproved templates', () => {
    expect(normalizeCategoryConfig({ layoutStyle: { variant: 'image-left' } }).layoutStyle.variant).toBe('image-left');
    expect(normalizeCategoryConfig({ layoutStyle: { variant: 'totally-custom' } }).layoutStyle.variant).toBe('card-grid');
    expect(normalizeCategoryConfig({}).layoutStyle.variant).toBe('card-grid');
  });

  it('lists exactly the five approved templates', () => {
    expect(CARD_TEMPLATE_OPTIONS).toEqual(['card-grid', 'image-left', 'price-focus', 'compact-list', 'detail-first']);
  });
});
