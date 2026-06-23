import { describe, expect, it } from 'vitest';

import { DEFAULT_CARD_STYLE, normalizeCardStyle, resolveFieldColorRoleValue } from '../model/cardStyleModel';

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
          radius: 'xl',
          titleColorHex: '#ffffff',
          fontSize: 'large',
          letterSpacing: '0.02em',
          fontWeight: 800,
        },
        image: { fit: 'cover', sizePx: 160 },
        info: { padding: 'tight', radius: 'md', fieldGap: 'tight', fieldGroupGap: 'tight', alignment: 'center' },
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
        radius: 'xl',
        titleColorHex: '#ffffff',
        fontSize: 'large',
        letterSpacing: '0.02em',
        fontWeight: 800,
      },
      image: { fit: 'cover', sizePx: 160 },
      info: { backgroundColor: '', borderColor: '', padding: 'tight', radius: 'md', fieldGap: 'tight', fieldGroupGap: 'tight', alignment: 'center' },
      field: { defaultColorRole: 'muted', defaultFontWeight: 'bold', defaultFontSize: 'large', priceColorRole: 'red' },
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

describe('resolveFieldColorRoleValue', () => {
  it('resolves known roles to CSS color values, with brand pointing at the page brand color var', () => {
    expect(resolveFieldColorRoleValue('inherit')).toBe('inherit');
    expect(resolveFieldColorRoleValue('brand')).toBe('var(--brand-color, var(--corp-primary))');
    expect(resolveFieldColorRoleValue('red')).toBe('#dc2626');
    expect(resolveFieldColorRoleValue('unknown')).toBe('inherit');
  });
});
