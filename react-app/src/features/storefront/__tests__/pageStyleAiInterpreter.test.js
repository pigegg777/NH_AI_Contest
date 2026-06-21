import { describe, expect, it } from 'vitest';

import {
  PAGE_STYLE_AI_SCHEMA,
  buildHeuristicPageAiIntent,
  normalizeCategoryChipsIntent,
  normalizeHeaderIntent,
  normalizePaletteIntent,
  normalizeSearchIntent,
} from '../services/pageStyleAiInterpreter';

function collectStrictModeViolations(schema, path = []) {
  if (!schema || typeof schema !== 'object') return [];

  let violations = [];

  if (schema.type === 'object') {
    const propertyNames = Object.keys(schema.properties ?? {});

    if (schema.additionalProperties !== false) {
      violations.push(`${path.join('.') || '<root>'}: additionalProperties must be false`);
    }

    const required = Array.isArray(schema.required) ? schema.required : [];
    const missingRequired = propertyNames.filter((name) => !required.includes(name));

    if (missingRequired.length > 0) {
      violations.push(`${path.join('.') || '<root>'}: required must list every property (missing ${missingRequired.join(', ')})`);
    }

    for (const name of propertyNames) {
      violations = violations.concat(collectStrictModeViolations(schema.properties[name], [...path, name]));
    }
  }

  return violations;
}

describe('PAGE_STYLE_AI_SCHEMA', () => {
  it('satisfies OpenAI strict structured-output rules at every nesting level', () => {
    expect(collectStrictModeViolations(PAGE_STYLE_AI_SCHEMA)).toEqual([]);
  });
});

describe('normalizePaletteIntent', () => {
  it('derives a light background and readable text color from a bare accent hex', () => {
    const palette = normalizePaletteIntent({ accentHex: '#2563eb' }, '#1d4a2e');

    expect(palette.accentHex).toBe('#2563eb');
    expect(palette.backgroundHex).not.toBe('#2563eb');
    expect(palette.textHex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('falls back to the provided fallback accent when accentHex is missing/invalid', () => {
    expect(normalizePaletteIntent({}, '#7c3aed').accentHex).toBe('#7c3aed');
    expect(normalizePaletteIntent({ accentHex: 'neon' }, '#7c3aed').accentHex).toBe('#7c3aed');
  });
});

describe('normalizeHeaderIntent', () => {
  it('returns null for empty input', () => {
    expect(normalizeHeaderIntent(null)).toBeNull();
    expect(normalizeHeaderIntent({})).toBeNull();
  });

  it('keeps only recognized header properties and drops everything else (boundary enforcement)', () => {
    expect(
      normalizeHeaderIntent({ titleColorHex: '#111827', fontWeight: 700, headerText: 'hacked title', backgroundHex: '#000000' }),
    ).toEqual({ titleColorHex: '#111827', fontWeight: 700 });
  });

  it('drops an invalid hex but keeps other valid fields', () => {
    expect(normalizeHeaderIntent({ titleColorHex: 'not-a-color', letterSpacing: '0.02em' })).toEqual({ letterSpacing: '0.02em' });
  });
});

describe('normalizeCategoryChipsIntent', () => {
  it('returns null for empty input', () => {
    expect(normalizeCategoryChipsIntent(null)).toBeNull();
  });

  it('keeps only the five approved chip properties (boundary enforcement)', () => {
    expect(
      normalizeCategoryChipsIntent({
        backgroundHex: '#ffffff',
        activeBackgroundHex: '#1d4a2e',
        chipShape: 'pill',
        placement: 'top',
      }),
    ).toEqual({ backgroundHex: '#ffffff', activeBackgroundHex: '#1d4a2e' });
  });
});

describe('normalizeSearchIntent', () => {
  it('returns null for empty input', () => {
    expect(normalizeSearchIntent(null)).toBeNull();
  });

  it('keeps only sizeToken/borderStrengthToken and rejects out-of-scope properties (boundary enforcement)', () => {
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
    expect(normalizeSearchIntent({ sizeToken: 'huge', borderStrengthToken: 'extreme' })).toBeNull();
  });
});

describe('buildHeuristicPageAiIntent', () => {
  it('always derives a palette from the main prompt, even with no overrides', () => {
    const intent = buildHeuristicPageAiIntent({ mainPrompt: 'make it feel blue and trustworthy' });

    expect(intent.palette.accentHex).toBe('#2563eb');
    expect(intent.header).toBeNull();
    expect(intent.categoryChips).toBeNull();
    expect(intent.search).toBeNull();
  });

  it('falls back to the default accent when the main prompt has no recognizable color', () => {
    expect(buildHeuristicPageAiIntent({ mainPrompt: 'something nice' }).palette.accentHex).toBe('#1d4a2e');
  });

  it('detects a header override (bolder, darker title)', () => {
    const intent = buildHeuristicPageAiIntent({
      mainPrompt: 'warm and friendly',
      headerOverridePrompt: 'make the title bolder and darker',
    });

    expect(intent.header).toEqual({ titleColorHex: '#111827', fontWeight: 800 });
  });

  it('detects a search override (larger, stronger border)', () => {
    const intent = buildHeuristicPageAiIntent({
      mainPrompt: 'warm and friendly',
      searchOverridePrompt: 'make the search box larger with a stronger border',
    });

    expect(intent.search).toEqual({ sizeToken: 'lg', borderStrengthToken: 'strong' });
  });

  it('ignores an override prompt with no recognizable property (returns null, not a no-op object)', () => {
    expect(buildHeuristicPageAiIntent({ mainPrompt: 'warm', headerOverridePrompt: 'just vibes' }).header).toBeNull();
  });
});
