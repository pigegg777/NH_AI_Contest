import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PAGE_STYLE } from '../model/pageStyleModel';
import {
  buildHeuristicPageAiIntent,
  buildPageStyleOpenAiRequestBody,
  normalizeCategoryChipsIntent,
  normalizeHeaderIntent,
  normalizePaletteIntent,
  normalizePageStyleAiIntent,
  normalizeSearchIntent,
  PAGE_STYLE_AI_SCHEMA,
} from '../services/pageStyleAiContract';

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
  vi.unstubAllEnvs();
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

describe('buildHeuristicPageAiIntent', () => {
  it('derives a palette when the prompt explicitly addresses color direction', () => {
    const intent = buildHeuristicPageAiIntent({
      prompt: 'make it feel blue and trustworthy',
    });

    expect(intent.palette.accentHex).toBe('#2563eb');
    expect(intent.header).toBeNull();
    expect(intent.categoryChips).toBeNull();
    expect(intent.search).toBeNull();
  });

  it('does not force a palette rewrite for an unrelated search-only prompt', () => {
    const intent = buildHeuristicPageAiIntent({
      prompt: 'make the search box larger with a stronger border',
    });

    expect(intent.palette).toBeNull();
    expect(intent.search).toEqual({
      sizeToken: 'lg',
      borderStrengthToken: 'strong',
    });
  });

  it('detects a header adjustment from a single page-style prompt', () => {
    const intent = buildHeuristicPageAiIntent({
      prompt: 'warm and friendly, make the title bolder and darker',
    });

    expect(intent.header).toEqual({
      titleColorHex: '#111827',
      fontWeight: 800,
    });
  });

  it('allows one page-style prompt to affect multiple areas', () => {
    const intent = buildHeuristicPageAiIntent({
      prompt:
        'warm and friendly, make the title bolder and the search box larger with a stronger border',
    });

    expect(intent.header).toEqual({ fontWeight: 800 });
    expect(intent.search).toEqual({
      sizeToken: 'lg',
      borderStrengthToken: 'strong',
    });
  });

  it('drops non-selected area adjustments when a targetScope is chosen', () => {
    const intent = buildHeuristicPageAiIntent({
      prompt:
        'warm and friendly, make the title bolder and the search box larger with a stronger border',
      targetScope: 'search',
    });

    expect(intent.palette).toBeNull();
    expect(intent.header).toBeNull();
    expect(intent.categoryChips).toBeNull();
    expect(intent.search).toEqual({
      sizeToken: 'lg',
      borderStrengthToken: 'strong',
    });
  });
});
