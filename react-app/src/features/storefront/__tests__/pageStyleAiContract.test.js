import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  normalizeCategoryChipsIntent,
  normalizeHeaderIntent,
  normalizePaletteIntent,
  normalizePageStyleAiExplanation,
  normalizePageStyleAiIntent,
  normalizeProductCategoryChipsIntent,
  normalizeSearchIntent,
} from '../model/page-design/ai-response/pageStyleAiResponseNormalizer';
import { PAGE_STYLE_AI_SCHEMA } from '../model/page-design/ai-response/pageStyleAiResponseSchema';

function collectStrictModeViolations(schema, path = []) {
  if (!schema || typeof schema !== 'object') return [];

  let violations = [];

  if (schema.type === 'object') {
    const propertyNames = Object.keys(schema.properties ?? {});

    if (schema.additionalProperties !== false) {
      violations.push(
        `${path.join('.') || '<root>'}: additionalProperties must be false`,
      );
    }

    const required = Array.isArray(schema.required) ? schema.required : [];
    const missingRequired = propertyNames.filter(
      (name) => !required.includes(name),
    );

    if (missingRequired.length > 0) {
      violations.push(
        `${path.join('.') || '<root>'}: required must list every property (missing ${missingRequired.join(', ')})`,
      );
    }

    for (const name of propertyNames) {
      violations = violations.concat(
        collectStrictModeViolations(schema.properties[name], [...path, name]),
      );
    }
  }

  return violations;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('PAGE_STYLE_AI_SCHEMA', () => {
  it('satisfies OpenAI strict structured-output rules at every nesting level', () => {
    expect(collectStrictModeViolations(PAGE_STYLE_AI_SCHEMA)).toEqual([]);
  });

  it('allows nested properties to be null so OpenAI can send incremental patches', () => {
    expect(PAGE_STYLE_AI_SCHEMA.properties.palette.type).toContain('null');
    expect(
      PAGE_STYLE_AI_SCHEMA.properties.header.properties.titleColorHex.type,
    ).toContain('null');
    expect(
      PAGE_STYLE_AI_SCHEMA.properties.search.properties.sizeToken.type,
    ).toContain('null');
  });

  it('lets the AI set search backgroundHex and borderColorHex independently of palette, with no focus property at all', () => {
    expect(PAGE_STYLE_AI_SCHEMA.properties.search.properties.backgroundHex.type).toContain('null');
    expect(PAGE_STYLE_AI_SCHEMA.properties.search.properties.backgroundHex.pattern).toBe('^#[0-9a-fA-F]{6}$');
    expect(PAGE_STYLE_AI_SCHEMA.properties.search.properties.borderColorHex.type).toContain('null');
    expect(PAGE_STYLE_AI_SCHEMA.properties.search.properties.focusBorderColorHex).toBeUndefined();
  });

  it('lets the AI set chip activeBorderHex, borderStrengthToken, and fontWeight for both chip scopes', () => {
    ['categoryChips', 'productCategoryChips'].forEach((scope) => {
      expect(PAGE_STYLE_AI_SCHEMA.properties[scope].properties.activeBorderHex.type).toContain('null');
      expect(PAGE_STYLE_AI_SCHEMA.properties[scope].properties.borderStrengthToken.type).toContain('null');
      expect(PAGE_STYLE_AI_SCHEMA.properties[scope].properties.borderStrengthToken.enum).toContain('none');
      expect(PAGE_STYLE_AI_SCHEMA.properties[scope].properties.fontWeight.type).toContain('null');
    });
  });

  it('lets the AI switch a chip scope between chip and tab, and offers no hover properties at all', () => {
    ['categoryChips', 'productCategoryChips'].forEach((scope) => {
      expect(PAGE_STYLE_AI_SCHEMA.properties[scope].properties.styleMode.type).toContain('null');
      expect(PAGE_STYLE_AI_SCHEMA.properties[scope].properties.styleMode.enum).toEqual(
        expect.arrayContaining(['chip', 'tab', null]),
      );
      expect(PAGE_STYLE_AI_SCHEMA.properties[scope].properties.variant).toBeUndefined();
      expect(PAGE_STYLE_AI_SCHEMA.properties[scope].properties.borderSides).toBeUndefined();
      expect(
        Object.keys(PAGE_STYLE_AI_SCHEMA.properties[scope].properties).filter((key) =>
          key.startsWith('hover'),
        ),
      ).toEqual([]);
    });
  });

  it('requires explanation as a plain string and suggestion as a nullable string', () => {
    expect(PAGE_STYLE_AI_SCHEMA.properties.explanation.type).toBe('string');
    expect(PAGE_STYLE_AI_SCHEMA.properties.suggestion.type).toContain('null');
    expect(PAGE_STYLE_AI_SCHEMA.required).toContain('explanation');
    expect(PAGE_STYLE_AI_SCHEMA.required).toContain('suggestion');
  });
});

describe('normalizePaletteIntent', () => {
  it('derives a light background from a bare accent hex', () => {
    const palette = normalizePaletteIntent({ accentHex: '#2563eb' }, '#1d4a2e');

    expect(palette.accentHex).toBe('#2563eb');
    expect(palette.backgroundHex).not.toBe('#2563eb');
  });

  it('falls back to the provided fallback accent when accentHex is missing or invalid', () => {
    expect(normalizePaletteIntent({}, '#7c3aed').accentHex).toBe('#7c3aed');
    expect(
      normalizePaletteIntent({ accentHex: 'neon' }, '#7c3aed').accentHex,
    ).toBe('#7c3aed');
  });
});

describe('normalizeHeaderIntent', () => {
  it('returns null for empty input', () => {
    expect(normalizeHeaderIntent(null)).toBeNull();
    expect(normalizeHeaderIntent({})).toBeNull();
  });

  it('keeps only recognized header properties and drops everything else', () => {
    expect(
      normalizeHeaderIntent({
        titleColorHex: '#111827',
        fontWeight: 700,
        headerText: 'hacked title',
        backgroundHex: '#000000',
      }),
    ).toEqual({ titleColorHex: '#111827', fontWeight: 700 });
  });

  it('drops an invalid hex but keeps other valid fields', () => {
    expect(
      normalizeHeaderIntent({
        titleColorHex: 'not-a-color',
        letterSpacing: '0.02em',
      }),
    ).toEqual({ letterSpacing: '0.02em' });
  });
});

describe('normalizeCategoryChipsIntent', () => {
  it('returns null for empty input', () => {
    expect(normalizeCategoryChipsIntent(null)).toBeNull();
  });

  it('drops unapproved properties and invalid tokens', () => {
    expect(
      normalizeCategoryChipsIntent({
        backgroundHex: '#ffffff',
        activeBackgroundHex: '#1d4a2e',
        chipShape: 'pill',
        placement: 'top',
      }),
    ).toEqual({
      backgroundHex: '#ffffff',
      activeBackgroundHex: '#1d4a2e',
    });
  });

  it('keeps shape tokens and drops hover colors the AI is no longer allowed to send', () => {
    expect(
      normalizeCategoryChipsIntent({
        hoverBackgroundHex: '#f4f7f5',
        hoverTextHex: '#355a30',
        hoverBorderHex: '#a9c2af',
        styleMode: 'tab',
        sizeToken: 'lg',
        radiusToken: 'square',
        gapToken: 'tight',
      }),
    ).toEqual({
      styleMode: 'tab',
      sizeToken: 'lg',
      radiusToken: 'square',
      gapToken: 'tight',
    });
  });

  it('rejects tokens outside the approved enums', () => {
    expect(
      normalizeCategoryChipsIntent({
        styleMode: 'glossy',
        sizeToken: 'huge',
        radiusToken: 'circle',
        gapToken: 'huge',
      }),
    ).toBeNull();
  });

  it('keeps activeBorderHex, borderStrengthToken, and fontWeight, dropping invalid values', () => {
    expect(
      normalizeCategoryChipsIntent({
        activeBorderHex: '#334155',
        borderStrengthToken: 'bold',
        fontWeight: 800,
      }),
    ).toEqual({
      activeBorderHex: '#334155',
      borderStrengthToken: 'bold',
      fontWeight: 800,
    });

    expect(
      normalizeCategoryChipsIntent({
        activeBorderHex: 'not-a-color',
        borderStrengthToken: 'extreme',
        fontWeight: 'huge',
      }),
    ).toBeNull();
  });

  it('keeps a valid styleMode token and rejects an unapproved one', () => {
    expect(normalizeCategoryChipsIntent({ styleMode: 'tab' })).toEqual({ styleMode: 'tab' });
    expect(normalizeCategoryChipsIntent({ styleMode: 'underline' })).toBeNull();
  });
});

describe('normalizeProductCategoryChipsIntent', () => {
  it('returns null for empty input', () => {
    expect(normalizeProductCategoryChipsIntent(null)).toBeNull();
  });

  it('drops unapproved properties and invalid tokens', () => {
    expect(
      normalizeProductCategoryChipsIntent({
        backgroundHex: '#ffffff',
        activeBackgroundHex: '#1d4a2e',
        chipShape: 'pill',
        placement: 'top',
      }),
    ).toEqual({
      backgroundHex: '#ffffff',
      activeBackgroundHex: '#1d4a2e',
    });
  });

  it('accepts matching values for both scopes, supporting explicit "make them the same" requests', () => {
    const sharedIntent = {
      backgroundHex: '#f4f7f5',
      styleMode: 'chip',
      sizeToken: 'sm',
      radiusToken: 'rounded',
      gapToken: 'relaxed',
    };

    expect(normalizeCategoryChipsIntent(sharedIntent)).toEqual(sharedIntent);
    expect(normalizeProductCategoryChipsIntent(sharedIntent)).toEqual(sharedIntent);
  });
});

describe('normalizeSearchIntent', () => {
  it('returns null for empty input', () => {
    expect(normalizeSearchIntent(null)).toBeNull();
  });

  it('keeps sizeToken, borderStrengthToken, and the approved hex colors, dropping everything else', () => {
    expect(
      normalizeSearchIntent({
        sizeToken: 'lg',
        radius: 'pill',
        backgroundHex: '#000000',
        borderColorHex: '#111111',
        iconPosition: 'right',
      }),
    ).toEqual({
      sizeToken: 'lg',
      backgroundHex: '#000000',
      borderColorHex: '#111111',
    });
  });

  it('drops an invalid search hex but keeps other valid fields', () => {
    expect(
      normalizeSearchIntent({
        sizeToken: 'lg',
        backgroundHex: 'not-a-color',
      }),
    ).toEqual({ sizeToken: 'lg' });
  });

  it('rejects unapproved tokens', () => {
    expect(
      normalizeSearchIntent({
        sizeToken: 'huge',
        borderStrengthToken: 'extreme',
      }),
    ).toBeNull();
  });
});

describe('normalizePageStyleAiIntent', () => {
  it('limits the normalized payload to the selected target scope', () => {
    expect(
      normalizePageStyleAiIntent(
        {
          palette: { accentHex: '#2563eb' },
          header: { fontWeight: 800 },
          categoryChips: { textHex: '#111827' },
          productCategoryChips: { textHex: '#334155' },
          search: { sizeToken: 'lg', borderStrengthToken: 'strong' },
        },
        '#1d4a2e',
        'search',
      ),
    ).toEqual({
      palette: null,
      header: null,
      categoryChips: null,
      productCategoryChips: null,
      search: { sizeToken: 'lg', borderStrengthToken: 'strong' },
    });
  });

  it('limits the normalized payload to productCategoryChips when that scope is selected', () => {
    expect(
      normalizePageStyleAiIntent(
        {
          palette: { accentHex: '#2563eb' },
          header: { fontWeight: 800 },
          categoryChips: { textHex: '#111827' },
          productCategoryChips: { textHex: '#334155' },
          search: { sizeToken: 'lg', borderStrengthToken: 'strong' },
        },
        '#1d4a2e',
        'productCategoryChips',
      ),
    ).toEqual({
      palette: null,
      header: null,
      categoryChips: null,
      productCategoryChips: { textHex: '#334155' },
      search: null,
    });
  });
});

describe('normalizePageStyleAiExplanation', () => {
  it('trims explanation and nulls out a blank suggestion', () => {
    expect(
      normalizePageStyleAiExplanation({
        explanation: '  배경을 밝게 바꿨습니다.  ',
        suggestion: '  ',
      }),
    ).toEqual({ explanation: '배경을 밝게 바꿨습니다.', suggestion: null });
  });

  it('falls back to a default explanation when the payload omits it', () => {
    expect(normalizePageStyleAiExplanation({})).toEqual({
      explanation: '요청하신 내용을 페이지 스타일에 반영했습니다.',
      suggestion: null,
    });
  });
});
