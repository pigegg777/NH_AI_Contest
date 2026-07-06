import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  normalizeCategoryChipsIntent,
  normalizeHeaderIntent,
  normalizePaletteIntent,
  normalizePageStyleAiExplanation,
  normalizePageStyleAiIntent,
  normalizeSearchIntent,
  PAGE_STYLE_AI_SCHEMA,
} from '../model/page-design/pageStyleAiResponseModel';

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

  it('requires explanation as a plain string and suggestion as a nullable string', () => {
    expect(PAGE_STYLE_AI_SCHEMA.properties.explanation).toEqual({ type: 'string' });
    expect(PAGE_STYLE_AI_SCHEMA.properties.suggestion.type).toContain('null');
    expect(PAGE_STYLE_AI_SCHEMA.required).toContain('explanation');
    expect(PAGE_STYLE_AI_SCHEMA.required).toContain('suggestion');
  });
});

describe('normalizePaletteIntent', () => {
  it('derives a light background and readable text color from a bare accent hex', () => {
    const palette = normalizePaletteIntent({ accentHex: '#2563eb' }, '#1d4a2e');

    expect(palette.accentHex).toBe('#2563eb');
    expect(palette.backgroundHex).not.toBe('#2563eb');
    expect(palette.textHex).toMatch(/^#[0-9a-f]{6}$/);
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

  it('keeps only the five approved chip properties', () => {
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
});

describe('normalizeSearchIntent', () => {
  it('returns null for empty input', () => {
    expect(normalizeSearchIntent(null)).toBeNull();
  });

  it('keeps only sizeToken and borderStrengthToken', () => {
    expect(
      normalizeSearchIntent({
        sizeToken: 'lg',
        radius: 'pill',
        backgroundHex: '#000000',
        iconPosition: 'right',
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
          search: { sizeToken: 'lg', borderStrengthToken: 'strong' },
        },
        '#1d4a2e',
        'search',
      ),
    ).toEqual({
      palette: null,
      header: null,
      categoryChips: null,
      search: { sizeToken: 'lg', borderStrengthToken: 'strong' },
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
