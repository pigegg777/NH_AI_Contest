# Storefront Page AI Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an office user describe overall page color/mood in one natural-language prompt plus three focused override prompts (header, category chips, search), have AI resolve that into a fully-formed `pageConfig.pageStyle` (free hex palette + contrast-corrected text colors + approved size/border tokens), preview it immediately, and persist only the compiled result — never the transient prompts.

**Architecture:** New page-level seam, fully separate from the existing per-category card `aiDesign` seam. Five new modules: a pure color-math module, a `pageStyle` schema/defaults module, a session-only `pageAiDesign` input module, an AI-interpretation service (OpenAI + heuristic fallback, mirrors `storefrontAiService.js`'s existing pattern), and a precedence/contrast-correction compiler. A new `usePageAiDesign` hook owns the session state and composes into `useStorefrontBuilder`, replacing the page-level `designDirection`/`titleTextColor`/`typographyTone` state that today is incorrectly mutated by the per-category card-AI flow. A deterministic migration module upgrades legacy stored configs with zero AI calls. The same `StorefrontView` component already serves both the builder preview and the public page, so once it consumes `pageStyle` directly, preview/public parity is automatic.

**Tech Stack:** React 19, Vite, Vitest + React Testing Library, Supabase (`office_page_config` / `office_page_category_configs`), OpenAI Responses API (strict structured outputs) — same stack as the existing card-level `storefrontAiService.js`.

## Global Constraints

- No raw CSS or raw HTML persistence — `pageStyle` stores resolved hex values and approved tokens only (PRD "Out of Scope").
- `pageAiDesign` (the 4 prompts) is session-only. It must never be written to `office_page_config`. Only the compiled `pageStyle` is persisted.
- Header title **text** stays in `navConfig.title` (existing field) — AI styling may change color/letter-spacing/font-weight only, never the string.
- Search overrides may only change `sizeToken` (`sm`/`md`/`lg`/`xl`) and `borderStrengthToken` (`soft`/`normal`/`strong`) + border/focus-border color. Never background, text color, radius, icon position (PRD "Out of Scope").
- Category chip overrides may change background/text/border/active-state colors only — never chip structure, interaction model, or placement.
- Compiler precedence, every property: area override prompt's resolved value > main-prompt-derived value > previous saved `pageStyle` value (so untouched areas survive re-applies) > white-default seed (`DEFAULT_PAGE_STYLE`).
- Every text-on-background pairing in the compiled `pageStyle` must pass WCAG AA (contrast ratio ≥ 4.5) via the compiler's contrast-correction step — this runs on every compile, not just AI output.
- AI failure (or compile failure) must never replace the last valid `pageStyle` in builder state — only set an error message.
- `pageStyle.schemaVersion` starts at `1` and is stamped by every normalizer/compiler/migration output.
- Legacy migration (`pageConfig.designDirection` / `pageConfig.theme.*`) is deterministic — zero AI calls — and lives in its own module (`services/pageStyleMigration.js`), reusable by both the lazy read-time safety net (this plan) and any future bulk ops script.
- Page-level styling stays a separate seam from category-level card `aiDesign` (`storefrontAiDesignModel.js` / `storefrontAiService.js`). The only change to that seam is removing `titleTextColor`/`typographyTone`, which were a pre-existing scope leak (Task 14) — no other card-AI behavior changes.
- Follow existing repo conventions exactly: Vitest `describe`/`it`, `vi.mock` for Supabase/fetch, `toTrimmedString` from `common/utils/text` for all string normalization, the strict-mode OpenAI JSON-schema test pattern already in `storefrontAiService.test.js`.

---

## File Structure

| File | Change |
|---|---|
| `react-app/src/features/storefront/model/pageStyleColor.js` | **New.** Pure color math: hex validation, contrast ratio, readable-text-color correction, hex mixing, tonal palette derivation. |
| `react-app/src/features/storefront/__tests__/pageStyleColor.test.js` | **New.** Tests for the above. |
| `react-app/src/features/storefront/model/pageStyleModel.js` | **New.** `pageStyle` schema, tokens, `DEFAULT_PAGE_STYLE` (white default), `normalizePageStyle`, palette-derived chip/search defaults. |
| `react-app/src/features/storefront/__tests__/pageStyleModel.test.js` | **New.** Tests for the above. |
| `react-app/src/features/storefront/model/pageAiDesignModel.js` | **New.** Session-only `pageAiDesign` shape + normalizer. |
| `react-app/src/features/storefront/__tests__/pageAiDesignModel.test.js` | **New.** Tests for the above. |
| `react-app/src/features/storefront/services/pageStyleMigration.js` | **New.** Deterministic legacy `pageConfig` → `pageStyle` mapper. |
| `react-app/src/features/storefront/__tests__/pageStyleMigration.test.js` | **New.** Tests for the above. |
| `react-app/src/features/storefront/model/storefrontBuilderModel.js` | Modify: thread `pageStyle` through `normalizePageConfig` and `buildStorefrontSavePayload` (additive only in this pass). |
| `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js` | Extend: `pageStyle` defaulting/pass-through; later (Task 14) legacy theme-token tests removed. |
| `react-app/src/features/storefront/services/storefrontConfigService.js` | Modify: read-time migration safety net in `normalizeConfig`. |
| `react-app/src/features/storefront/__tests__/storefrontConfigService.test.js` | Extend: migration-on-read test; `pageStyle` round-trip assertions. |
| `react-app/src/features/storefront/services/pageStyleAiInterpreter.js` | **New.** OpenAI request/response + heuristic fallback, turns 4 prompts into a structured intent. |
| `react-app/src/features/storefront/__tests__/pageStyleAiInterpreter.test.js` | **New.** Tests for the above. |
| `react-app/src/features/storefront/services/pageStyleCompiler.js` | **New.** Precedence merge + contrast correction + token normalization → final `pageStyle`. |
| `react-app/src/features/storefront/__tests__/pageStyleCompiler.test.js` | **New.** Tests for the above. |
| `react-app/src/features/storefront/hooks/usePageAiDesign.js` | **New.** Session state + apply/keep-last-valid-on-failure/discard-on-save. |
| `react-app/src/features/storefront/__tests__/usePageAiDesign.test.js` | **New.** Tests for the above. |
| `react-app/src/features/storefront/hooks/useStorefrontBuilder.js` | Modify: remove `designDirection`/`titleTextColor`/`typographyTone` state; compose `usePageAiDesign`. |
| `react-app/src/features/storefront/model/storefrontBuilderModel.js` | Modify (2nd pass): `buildStorefrontSavePayload` takes `pageStyle` instead of the 3 legacy fields. |
| `react-app/src/features/storefront/hooks/useStorefrontView.js` | Modify: read header/search/chip values from `pageStyle` instead of legacy theme tokens. |
| `react-app/src/features/storefront/components/StorefrontView.jsx` | Modify: new CSS vars from `pageStyle`; drop `theme-*` className/`data-design-direction`. |
| `react-app/src/features/storefront/components/StorefrontView.module.css` | Modify: new `--page-search-*`/`--page-chip-*` var fallback chains; delete dead `.theme-*` rules. |
| `react-app/src/features/storefront/components/page-design/PageStyleMainPromptField.jsx` | **New.** Main prompt textarea. |
| `react-app/src/features/storefront/components/page-design/PageStyleOverrideFields.jsx` | **New.** Header/chips/search override textareas. |
| `react-app/src/features/storefront/components/PageDesignEditor.jsx` | Rewrite: replace direction-button-grid with prompt+override UX. |
| `react-app/src/features/storefront/components/PageDesignEditor.module.css` | Modify: drop direction-grid rules, keep shared section/header rules. |
| `react-app/src/features/storefront/components/ProductCategoryStep.jsx` | Modify: pass new builder fields to `PageDesignEditor`. |
| `react-app/src/features/storefront/__tests__/PageDesignEditor.test.jsx` | **New.** Component test for the new UX. |
| `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx` | Extend: page-style apply/preview/save parity; (Task 14) strip legacy fixture fields. |
| `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx` | Extend: pageStyle rendering + preview/public parity; (Task 14) strip legacy fixture fields. |
| `react-app/src/features/storefront/model/storefrontAiDesignModel.js` | Modify (Task 14): remove `titleTextColor`/`typographyTone` from card `stylePlan`. |
| `react-app/src/features/storefront/services/storefrontAiService.js` | Modify (Task 14): remove the same fields from schema/heuristics/compiler. |
| `react-app/src/features/storefront/__tests__/storefrontAiService.test.js` | Modify (Task 14): drop assertions on the removed fields. |

---

### Task 1: Color math foundation (`pageStyleColor.js`)

**Files:**
- Create: `react-app/src/features/storefront/model/pageStyleColor.js`
- Test: `react-app/src/features/storefront/__tests__/pageStyleColor.test.js`

**Interfaces:**
- Produces: `isHexColor(value): boolean`, `normalizeHexColor(value, fallbackHex): string`, `hexToRgb(hex): {r,g,b}`, `relativeLuminance(hex): number`, `contrastRatio(hexA, hexB): number`, `pickReadableTextColor(backgroundHex, opts?): string`, `ensureReadableTextColor(candidateHex, backgroundHex, opts?): string`, `mixHexColors(hexA, hexB, weight): string`, `deriveTonalPalette(baseAccentHex): {backgroundHex, surfaceHex, accentHex, accentSoftHex}`. Used by every later task — these signatures are final.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/pageStyleColor.test.js`:

```js
import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  deriveTonalPalette,
  ensureReadableTextColor,
  hexToRgb,
  isHexColor,
  mixHexColors,
  normalizeHexColor,
  pickReadableTextColor,
  relativeLuminance,
} from '../model/pageStyleColor';

describe('isHexColor', () => {
  it('accepts 3- and 6-digit hex, rejects everything else', () => {
    expect(isHexColor('#1d4a2e')).toBe(true);
    expect(isHexColor('#fff')).toBe(true);
    expect(isHexColor('1d4a2e')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor(null)).toBe(false);
  });
});

describe('normalizeHexColor', () => {
  it('lowercases and expands 3-digit hex, falls back on invalid input', () => {
    expect(normalizeHexColor('#FFF', '#000000')).toBe('#ffffff');
    expect(normalizeHexColor('#1D4A2E', '#000000')).toBe('#1d4a2e');
    expect(normalizeHexColor('not-a-color', '#000000')).toBe('#000000');
    expect(normalizeHexColor(undefined, '#000000')).toBe('#000000');
  });
});

describe('hexToRgb', () => {
  it('converts hex to 0-255 channel values', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#1d4a2e')).toEqual({ r: 29, g: 74, b: 46 });
  });
});

describe('relativeLuminance', () => {
  it('returns 1 for white and 0 for black', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black-on-white and 1 for identical colors', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#1d4a2e', '#1d4a2e')).toBeCloseTo(1, 5);
  });
});

describe('pickReadableTextColor', () => {
  it('picks dark text on light backgrounds and light text on dark backgrounds', () => {
    expect(pickReadableTextColor('#ffffff')).toBe('#111827');
    expect(pickReadableTextColor('#0f172a')).toBe('#ffffff');
  });
});

describe('ensureReadableTextColor', () => {
  it('keeps a candidate color that already passes AA contrast', () => {
    expect(ensureReadableTextColor('#111827', '#ffffff')).toBe('#111827');
  });

  it('replaces a candidate that fails AA contrast with a readable alternative', () => {
    expect(ensureReadableTextColor('#f5f5f5', '#ffffff')).toBe('#111827');
    expect(contrastRatio(ensureReadableTextColor('#fefefe', '#ffffff'), '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('mixHexColors', () => {
  it('returns hexA at weight 0 and hexB at weight 1', () => {
    expect(mixHexColors('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHexColors('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('blends proportionally at weight 0.5', () => {
    expect(mixHexColors('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('deriveTonalPalette', () => {
  it('derives a light background and soft accent from a single base color', () => {
    const palette = deriveTonalPalette('#1d4a2e');

    expect(palette.accentHex).toBe('#1d4a2e');
    expect(palette.surfaceHex).toBe('#ffffff');
    expect(isHexColor(palette.backgroundHex)).toBe(true);
    expect(isHexColor(palette.accentSoftHex)).toBe(true);
    expect(contrastRatio(palette.backgroundHex, '#ffffff')).toBeLessThan(1.2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleColor.test.js`
Expected: FAIL — `Cannot find module '../model/pageStyleColor'`

- [ ] **Step 3: Write the implementation**

Create `react-app/src/features/storefront/model/pageStyleColor.js`:

```js
const HEX_3_PATTERN = /^#([0-9a-f]{3})$/i;
const HEX_6_PATTERN = /^#([0-9a-f]{6})$/i;

export function isHexColor(value) {
  return typeof value === 'string' && (HEX_3_PATTERN.test(value) || HEX_6_PATTERN.test(value));
}

function expandHex(hex) {
  const shortMatch = HEX_3_PATTERN.exec(hex);

  if (!shortMatch) {
    return hex.toLowerCase();
  }

  const [r, g, b] = shortMatch[1].split('');

  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
}

export function normalizeHexColor(value, fallbackHex) {
  return isHexColor(value) ? expandHex(value) : fallbackHex;
}

export function hexToRgb(hex) {
  const normalized = expandHex(hex);

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function channelLuminance(channel) {
  const ratio = channel / 255;

  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);

  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

export function contrastRatio(hexA, hexB) {
  const luminanceA = relativeLuminance(hexA);
  const luminanceB = relativeLuminance(hexB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);

  return (lighter + 0.05) / (darker + 0.05);
}

export function pickReadableTextColor(backgroundHex, { onLight = '#111827', onDark = '#ffffff' } = {}) {
  return contrastRatio(onLight, backgroundHex) >= contrastRatio(onDark, backgroundHex) ? onLight : onDark;
}

export function ensureReadableTextColor(candidateHex, backgroundHex, { minRatio = 4.5 } = {}) {
  const normalizedCandidate = normalizeHexColor(candidateHex, pickReadableTextColor(backgroundHex));

  return contrastRatio(normalizedCandidate, backgroundHex) >= minRatio
    ? normalizedCandidate
    : pickReadableTextColor(backgroundHex);
}

function mixChannel(channelA, channelB, weight) {
  return Math.round(channelA + (channelB - channelA) * weight);
}

function toHexChannel(value) {
  return value.toString(16).padStart(2, '0');
}

export function mixHexColors(hexA, hexB, weight) {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  const clampedWeight = Math.min(1, Math.max(0, weight));

  return `#${toHexChannel(mixChannel(rgbA.r, rgbB.r, clampedWeight))}${toHexChannel(
    mixChannel(rgbA.g, rgbB.g, clampedWeight),
  )}${toHexChannel(mixChannel(rgbA.b, rgbB.b, clampedWeight))}`;
}

export function deriveTonalPalette(baseAccentHex) {
  const accentHex = normalizeHexColor(baseAccentHex, '#1d4a2e');

  return {
    backgroundHex: mixHexColors(accentHex, '#ffffff', 0.94),
    surfaceHex: '#ffffff',
    accentHex,
    accentSoftHex: mixHexColors(accentHex, '#ffffff', 0.82),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleColor.test.js`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/model/pageStyleColor.js react-app/src/features/storefront/__tests__/pageStyleColor.test.js
git commit -m "feat: add page-style color math (contrast correction, tonal palette derivation)"
```

---

### Task 2: `pageStyle` schema and defaults (`pageStyleModel.js`)

**Files:**
- Create: `react-app/src/features/storefront/model/pageStyleModel.js`
- Test: `react-app/src/features/storefront/__tests__/pageStyleModel.test.js`

**Interfaces:**
- Consumes: `normalizeHexColor`, `ensureReadableTextColor`, `mixHexColors` from `./pageStyleColor` (Task 1).
- Produces: `PAGE_STYLE_SCHEMA_VERSION: 1`, `PAGE_STYLE_SEARCH_SIZE_TOKENS: string[]`, `PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS: string[]`, `PAGE_STYLE_SEARCH_SIZE_VALUES: Record<token, {minHeight, fontSize}>`, `PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES: Record<token, string>`, `DEFAULT_PAGE_STYLE` (full white-default object below), `normalizePageStyle(pageStyle): pageStyle`, `deriveCategoryChipsFromPalette(palette): {backgroundHex, textHex, borderColorHex, activeBackgroundHex, activeTextHex}`, `deriveSearchDefaultsFromPalette(palette): {sizeToken, borderStrengthToken, borderColorHex, focusBorderColorHex}`. These exact field names are used by every later task (compiler, migration, hooks, components) — do not rename.

Canonical shape:
```js
{
  schemaVersion: 1,
  palette: { backgroundHex, surfaceHex, accentHex, textHex },
  header: { titleColorHex, letterSpacing, fontWeight },
  search: { sizeToken, borderStrengthToken, borderColorHex, focusBorderColorHex },
  categoryChips: { backgroundHex, textHex, borderColorHex, activeBackgroundHex, activeTextHex },
}
```

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/pageStyleModel.test.js`:

```js
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../model/pageStyleColor';
import {
  DEFAULT_PAGE_STYLE,
  PAGE_STYLE_SCHEMA_VERSION,
  PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS,
  PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES,
  PAGE_STYLE_SEARCH_SIZE_TOKENS,
  PAGE_STYLE_SEARCH_SIZE_VALUES,
  deriveCategoryChipsFromPalette,
  deriveSearchDefaultsFromPalette,
  normalizePageStyle,
} from '../model/pageStyleModel';

describe('DEFAULT_PAGE_STYLE', () => {
  it('is an explicit white default, not a fallback branch', () => {
    expect(DEFAULT_PAGE_STYLE.schemaVersion).toBe(PAGE_STYLE_SCHEMA_VERSION);
    expect(DEFAULT_PAGE_STYLE.palette.backgroundHex).toBe('#ffffff');
    expect(DEFAULT_PAGE_STYLE.palette.surfaceHex).toBe('#ffffff');
  });
});

describe('token tables', () => {
  it('exposes a size/fontSize pair for every search size token', () => {
    PAGE_STYLE_SEARCH_SIZE_TOKENS.forEach((token) => {
      expect(PAGE_STYLE_SEARCH_SIZE_VALUES[token]).toMatchObject({
        minHeight: expect.any(String),
        fontSize: expect.any(String),
      });
    });
  });

  it('exposes a border width for every border strength token', () => {
    PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS.forEach((token) => {
      expect(PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES[token]).toEqual(expect.any(String));
    });
  });
});

describe('normalizePageStyle', () => {
  it('returns the white default when given nothing', () => {
    expect(normalizePageStyle(undefined)).toEqual(DEFAULT_PAGE_STYLE);
  });

  it('keeps valid hex/tokens and stamps schemaVersion', () => {
    const result = normalizePageStyle({
      palette: { backgroundHex: '#0f172a', surfaceHex: '#1e293b', accentHex: '#38bdf8', textHex: '#f8fafc' },
      header: { titleColorHex: '#f8fafc', letterSpacing: '0.02em', fontWeight: 700 },
      search: { sizeToken: 'lg', borderStrengthToken: 'strong', borderColorHex: '#38bdf8', focusBorderColorHex: '#38bdf8' },
      categoryChips: {
        backgroundHex: '#1e293b',
        textHex: '#f8fafc',
        borderColorHex: '#38bdf8',
        activeBackgroundHex: '#38bdf8',
        activeTextHex: '#0f172a',
      },
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.palette.backgroundHex).toBe('#0f172a');
    expect(result.search.sizeToken).toBe('lg');
    expect(result.search.borderStrengthToken).toBe('strong');
  });

  it('falls back per-field on invalid input without throwing', () => {
    const result = normalizePageStyle({
      palette: { backgroundHex: 'neon' },
      search: { sizeToken: 'huge', borderStrengthToken: 'extreme' },
    });

    expect(result.palette.backgroundHex).toBe('#ffffff');
    expect(result.search.sizeToken).toBe('md');
    expect(result.search.borderStrengthToken).toBe('normal');
  });

  it('contrast-corrects header title color and chip text colors against their backgrounds', () => {
    const result = normalizePageStyle({
      palette: { backgroundHex: '#ffffff' },
      header: { titleColorHex: '#fefefe' },
      categoryChips: { backgroundHex: '#fcfcfc', textHex: '#fdfdfd', activeBackgroundHex: '#1d4a2e', activeTextHex: '#222222' },
    });

    expect(contrastRatio(result.header.titleColorHex, result.palette.backgroundHex)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(result.categoryChips.textHex, result.categoryChips.backgroundHex)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(result.categoryChips.activeTextHex, result.categoryChips.activeBackgroundHex)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('deriveCategoryChipsFromPalette', () => {
  it('derives readable chip colors from the page accent', () => {
    const chips = deriveCategoryChipsFromPalette({ backgroundHex: '#ffffff', surfaceHex: '#ffffff', accentHex: '#1d4a2e', textHex: '#173223' });

    expect(contrastRatio(chips.textHex, chips.backgroundHex)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(chips.activeTextHex, chips.activeBackgroundHex)).toBeGreaterThanOrEqual(4.5);
    expect(chips.activeBackgroundHex).toBe('#1d4a2e');
  });
});

describe('deriveSearchDefaultsFromPalette', () => {
  it('derives md/normal defaults with a palette-tinted border', () => {
    const search = deriveSearchDefaultsFromPalette({ backgroundHex: '#ffffff', surfaceHex: '#ffffff', accentHex: '#1d4a2e', textHex: '#173223' });

    expect(search.sizeToken).toBe('md');
    expect(search.borderStrengthToken).toBe('normal');
    expect(search.focusBorderColorHex).toBe('#1d4a2e');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleModel.test.js`
Expected: FAIL — `Cannot find module '../model/pageStyleModel'`

- [ ] **Step 3: Write the implementation**

Create `react-app/src/features/storefront/model/pageStyleModel.js`:

```js
import { ensureReadableTextColor, mixHexColors, normalizeHexColor } from './pageStyleColor';

export const PAGE_STYLE_SCHEMA_VERSION = 1;

export const PAGE_STYLE_SEARCH_SIZE_TOKENS = ['sm', 'md', 'lg', 'xl'];
export const PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS = ['soft', 'normal', 'strong'];

export const PAGE_STYLE_SEARCH_SIZE_VALUES = {
  sm: { minHeight: '34px', fontSize: '0.82rem' },
  md: { minHeight: '40px', fontSize: '0.94rem' },
  lg: { minHeight: '46px', fontSize: '1rem' },
  xl: { minHeight: '52px', fontSize: '1.08rem' },
};

export const PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES = {
  soft: '1px',
  normal: '1.5px',
  strong: '2.5px',
};

export const DEFAULT_PAGE_STYLE = {
  schemaVersion: PAGE_STYLE_SCHEMA_VERSION,
  palette: { backgroundHex: '#ffffff', surfaceHex: '#ffffff', accentHex: '#1d4a2e', textHex: '#173223' },
  header: { titleColorHex: '#173223', letterSpacing: 'normal', fontWeight: 800 },
  search: { sizeToken: 'md', borderStrengthToken: 'normal', borderColorHex: '#d8e2dc', focusBorderColorHex: '#1d4a2e' },
  categoryChips: {
    backgroundHex: '#ffffff',
    textHex: '#5f6d5b',
    borderColorHex: '#d8e2dc',
    activeBackgroundHex: '#1d4a2e',
    activeTextHex: '#ffffff',
  },
};

function normalizePalette(palette) {
  const source = palette ?? {};

  return {
    backgroundHex: normalizeHexColor(source.backgroundHex, DEFAULT_PAGE_STYLE.palette.backgroundHex),
    surfaceHex: normalizeHexColor(source.surfaceHex, DEFAULT_PAGE_STYLE.palette.surfaceHex),
    accentHex: normalizeHexColor(source.accentHex, DEFAULT_PAGE_STYLE.palette.accentHex),
    textHex: normalizeHexColor(source.textHex, DEFAULT_PAGE_STYLE.palette.textHex),
  };
}

function normalizeHeader(header, backgroundHex) {
  const source = header ?? {};
  const candidateColor = normalizeHexColor(source.titleColorHex, DEFAULT_PAGE_STYLE.header.titleColorHex);

  return {
    titleColorHex: ensureReadableTextColor(candidateColor, backgroundHex),
    letterSpacing: typeof source.letterSpacing === 'string' && source.letterSpacing ? source.letterSpacing : DEFAULT_PAGE_STYLE.header.letterSpacing,
    fontWeight: Number.isFinite(source.fontWeight) ? source.fontWeight : DEFAULT_PAGE_STYLE.header.fontWeight,
  };
}

function normalizeSearch(search) {
  const source = search ?? {};

  return {
    sizeToken: PAGE_STYLE_SEARCH_SIZE_TOKENS.includes(source.sizeToken) ? source.sizeToken : DEFAULT_PAGE_STYLE.search.sizeToken,
    borderStrengthToken: PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS.includes(source.borderStrengthToken)
      ? source.borderStrengthToken
      : DEFAULT_PAGE_STYLE.search.borderStrengthToken,
    borderColorHex: normalizeHexColor(source.borderColorHex, DEFAULT_PAGE_STYLE.search.borderColorHex),
    focusBorderColorHex: normalizeHexColor(source.focusBorderColorHex, DEFAULT_PAGE_STYLE.search.focusBorderColorHex),
  };
}

function normalizeCategoryChips(categoryChips) {
  const source = categoryChips ?? {};
  const backgroundHex = normalizeHexColor(source.backgroundHex, DEFAULT_PAGE_STYLE.categoryChips.backgroundHex);
  const activeBackgroundHex = normalizeHexColor(source.activeBackgroundHex, DEFAULT_PAGE_STYLE.categoryChips.activeBackgroundHex);
  const candidateTextHex = normalizeHexColor(source.textHex, DEFAULT_PAGE_STYLE.categoryChips.textHex);
  const candidateActiveTextHex = normalizeHexColor(source.activeTextHex, DEFAULT_PAGE_STYLE.categoryChips.activeTextHex);

  return {
    backgroundHex,
    textHex: ensureReadableTextColor(candidateTextHex, backgroundHex),
    borderColorHex: normalizeHexColor(source.borderColorHex, DEFAULT_PAGE_STYLE.categoryChips.borderColorHex),
    activeBackgroundHex,
    activeTextHex: ensureReadableTextColor(candidateActiveTextHex, activeBackgroundHex),
  };
}

export function normalizePageStyle(pageStyle) {
  const source = pageStyle ?? {};
  const palette = normalizePalette(source.palette);

  return {
    schemaVersion: PAGE_STYLE_SCHEMA_VERSION,
    palette,
    header: normalizeHeader(source.header, palette.backgroundHex),
    search: normalizeSearch(source.search),
    categoryChips: normalizeCategoryChips(source.categoryChips),
  };
}

export function deriveCategoryChipsFromPalette(palette) {
  const backgroundHex = mixHexColors(palette.accentHex, '#ffffff', 0.88);
  const activeBackgroundHex = palette.accentHex;

  return {
    backgroundHex,
    textHex: ensureReadableTextColor(palette.textHex, backgroundHex),
    borderColorHex: mixHexColors(palette.accentHex, '#ffffff', 0.7),
    activeBackgroundHex,
    activeTextHex: ensureReadableTextColor('#ffffff', activeBackgroundHex),
  };
}

export function deriveSearchDefaultsFromPalette(palette) {
  return {
    sizeToken: 'md',
    borderStrengthToken: 'normal',
    borderColorHex: mixHexColors(palette.accentHex, '#ffffff', 0.7),
    focusBorderColorHex: palette.accentHex,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleModel.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/model/pageStyleModel.js react-app/src/features/storefront/__tests__/pageStyleModel.test.js
git commit -m "feat: add pageStyle schema, white default, and palette-derived chip/search defaults"
```

---

### Task 3: Session-only `pageAiDesign` input model

**Files:**
- Create: `react-app/src/features/storefront/model/pageAiDesignModel.js`
- Test: `react-app/src/features/storefront/__tests__/pageAiDesignModel.test.js`

**Interfaces:**
- Consumes: `toTrimmedString` from `../../../common/utils/text`.
- Produces: `DEFAULT_PAGE_AI_DESIGN: {mainPrompt, headerOverridePrompt, categoryChipsOverridePrompt, searchOverridePrompt}` (all `''`), `normalizePageAiDesignInput(pageAiDesign): same shape, trimmed`, `hasPageAiDesignMainPrompt(pageAiDesign): boolean`.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/pageAiDesignModel.test.js`:

```js
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_AI_DESIGN,
  hasPageAiDesignMainPrompt,
  normalizePageAiDesignInput,
} from '../model/pageAiDesignModel';

describe('DEFAULT_PAGE_AI_DESIGN', () => {
  it('starts with four empty prompts', () => {
    expect(DEFAULT_PAGE_AI_DESIGN).toEqual({
      mainPrompt: '',
      headerOverridePrompt: '',
      categoryChipsOverridePrompt: '',
      searchOverridePrompt: '',
    });
  });
});

describe('normalizePageAiDesignInput', () => {
  it('trims every prompt and defaults missing ones to empty strings', () => {
    const result = normalizePageAiDesignInput({
      mainPrompt: '  warm and friendly  ',
      headerOverridePrompt: ' bolder ',
    });

    expect(result).toEqual({
      mainPrompt: 'warm and friendly',
      headerOverridePrompt: 'bolder',
      categoryChipsOverridePrompt: '',
      searchOverridePrompt: '',
    });
  });

  it('handles undefined input without throwing', () => {
    expect(normalizePageAiDesignInput(undefined)).toEqual(DEFAULT_PAGE_AI_DESIGN);
  });

  it('coerces non-string prompt values to empty strings', () => {
    expect(normalizePageAiDesignInput({ mainPrompt: 42, searchOverridePrompt: null }).mainPrompt).toBe('');
    expect(normalizePageAiDesignInput({ searchOverridePrompt: null }).searchOverridePrompt).toBe('');
  });
});

describe('hasPageAiDesignMainPrompt', () => {
  it('is false for empty/whitespace-only main prompt, true otherwise', () => {
    expect(hasPageAiDesignMainPrompt(undefined)).toBe(false);
    expect(hasPageAiDesignMainPrompt({ mainPrompt: '   ' })).toBe(false);
    expect(hasPageAiDesignMainPrompt({ mainPrompt: 'warm' })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageAiDesignModel.test.js`
Expected: FAIL — `Cannot find module '../model/pageAiDesignModel'`

- [ ] **Step 3: Write the implementation**

Create `react-app/src/features/storefront/model/pageAiDesignModel.js`:

```js
import { toTrimmedString } from '../../../common/utils/text';

export const DEFAULT_PAGE_AI_DESIGN = {
  mainPrompt: '',
  headerOverridePrompt: '',
  categoryChipsOverridePrompt: '',
  searchOverridePrompt: '',
};

export function normalizePageAiDesignInput(pageAiDesign) {
  const source = pageAiDesign ?? {};

  return {
    mainPrompt: toTrimmedString(source.mainPrompt),
    headerOverridePrompt: toTrimmedString(source.headerOverridePrompt),
    categoryChipsOverridePrompt: toTrimmedString(source.categoryChipsOverridePrompt),
    searchOverridePrompt: toTrimmedString(source.searchOverridePrompt),
  };
}

export function hasPageAiDesignMainPrompt(pageAiDesign) {
  return normalizePageAiDesignInput(pageAiDesign).mainPrompt !== '';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageAiDesignModel.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/model/pageAiDesignModel.js react-app/src/features/storefront/__tests__/pageAiDesignModel.test.js
git commit -m "feat: add session-only pageAiDesign input model"
```

---

### Task 4: Deterministic legacy migration (`pageStyleMigration.js`)

**Files:**
- Create: `react-app/src/features/storefront/services/pageStyleMigration.js`
- Test: `react-app/src/features/storefront/__tests__/pageStyleMigration.test.js`

**Interfaces:**
- Consumes: `normalizeHexColor`, `ensureReadableTextColor`, `mixHexColors` from `../model/pageStyleColor`; `normalizePageStyle`, `deriveCategoryChipsFromPalette`, `deriveSearchDefaultsFromPalette` from `../model/pageStyleModel` (Tasks 1-2).
- Produces: `migrateLegacyPageConfigToPageStyle(legacyPageConfig): pageStyle`, `pageConfigNeedsPageStyleMigration(legacyPageConfig): boolean`. Both are pure — zero network calls, zero AI. `pageConfigNeedsPageStyleMigration` is consumed by Task 6.

This module intentionally owns its own copy of the legacy lookup tables (`designDirection` → accent seed, `titleTextColor`/`typographyTone` → resolved values, `searchSection.variant` → border strength). Task 14 deletes the originals from `storefrontBuilderModel.js`; this module is what's allowed to remember them, because migrating old rows is its only job.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/pageStyleMigration.test.js`:

```js
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../model/pageStyleColor';
import { migrateLegacyPageConfigToPageStyle, pageConfigNeedsPageStyleMigration } from '../services/pageStyleMigration';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleMigration.test.js`
Expected: FAIL — `Cannot find module '../services/pageStyleMigration'`

- [ ] **Step 3: Write the implementation**

Create `react-app/src/features/storefront/services/pageStyleMigration.js`:

```js
import { ensureReadableTextColor, mixHexColors, normalizeHexColor } from '../model/pageStyleColor';
import {
  deriveCategoryChipsFromPalette,
  deriveSearchDefaultsFromPalette,
  normalizePageStyle,
} from '../model/pageStyleModel';

const LEGACY_DESIGN_DIRECTION_ACCENT_SEED_HEX = {
  friendly: '#2f9e6e',
  warm: '#ea580c',
  green: '#1d4a2e',
  trust: '#2563eb',
  white: '#52525b',
};

const LEGACY_TITLE_TEXT_COLOR_VALUES = {
  default: '#173223',
  ink: '#0f172a',
  charcoal: '#27272a',
};

const LEGACY_TYPOGRAPHY_TONE_VALUES = {
  standard: { headingWeight: 800, letterSpacing: 'normal' },
  clean: { headingWeight: 700, letterSpacing: '0.01em' },
  soft: { headingWeight: 600, letterSpacing: 'normal' },
  bold: { headingWeight: 800, letterSpacing: '-0.01em' },
  official: { headingWeight: 700, letterSpacing: '0.02em' },
};

const LEGACY_SEARCH_VARIANT_BORDER_STRENGTH_TOKENS = {
  pill: 'soft',
  outlined: 'strong',
  soft: 'soft',
};

function resolveLegacyAccentSeedHex(legacyPageConfig) {
  const directionSeed = LEGACY_DESIGN_DIRECTION_ACCENT_SEED_HEX[legacyPageConfig?.designDirection] || LEGACY_DESIGN_DIRECTION_ACCENT_SEED_HEX.friendly;

  return normalizeHexColor(legacyPageConfig?.theme?.brandColor, directionSeed);
}

function resolveLegacyTitleColorHex(legacyPageConfig, accentSeedHex) {
  const legacyTitleTextColor = legacyPageConfig?.theme?.titleTextColor;

  if (legacyTitleTextColor === 'brand') {
    return accentSeedHex;
  }

  return LEGACY_TITLE_TEXT_COLOR_VALUES[legacyTitleTextColor] || LEGACY_TITLE_TEXT_COLOR_VALUES.default;
}

export function pageConfigNeedsPageStyleMigration(legacyPageConfig) {
  return Boolean(legacyPageConfig) && !legacyPageConfig.pageStyle && Boolean(legacyPageConfig.designDirection || legacyPageConfig.theme);
}

export function migrateLegacyPageConfigToPageStyle(legacyPageConfig) {
  const accentSeedHex = resolveLegacyAccentSeedHex(legacyPageConfig);
  const backgroundHex = mixHexColors(accentSeedHex, '#ffffff', 0.94);
  const palette = { backgroundHex, surfaceHex: '#ffffff', accentHex: accentSeedHex, textHex: '#173223' };
  const typographyTone =
    LEGACY_TYPOGRAPHY_TONE_VALUES[legacyPageConfig?.theme?.typographyTone] || LEGACY_TYPOGRAPHY_TONE_VALUES.standard;
  const titleColorHex = resolveLegacyTitleColorHex(legacyPageConfig, accentSeedHex);
  const searchDefaults = deriveSearchDefaultsFromPalette(palette);
  const categoryChips = deriveCategoryChipsFromPalette(palette);

  return normalizePageStyle({
    palette,
    header: {
      titleColorHex: ensureReadableTextColor(titleColorHex, backgroundHex),
      letterSpacing: typographyTone.letterSpacing,
      fontWeight: typographyTone.headingWeight,
    },
    search: {
      ...searchDefaults,
      borderStrengthToken:
        LEGACY_SEARCH_VARIANT_BORDER_STRENGTH_TOKENS[legacyPageConfig?.searchSection?.variant] || 'normal',
    },
    categoryChips,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleMigration.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/services/pageStyleMigration.js react-app/src/features/storefront/__tests__/pageStyleMigration.test.js
git commit -m "feat: add deterministic legacy pageConfig to pageStyle migration"
```

---

### Task 5: Thread `pageStyle` through `storefrontBuilderModel.js` (additive)

**Files:**
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- Test: `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js`

**Interfaces:**
- Consumes: `DEFAULT_PAGE_STYLE`, `normalizePageStyle` from `./pageStyleModel` (Task 2).
- Produces: `normalizePageConfig(pageConfig)` now also returns `pageStyle`; `buildStorefrontSavePayload({..., pageStyle})` now accepts a `pageStyle` param and writes it into the returned `pageConfig.pageStyle`, defaulting to the existing config's `pageStyle` when not passed (so previewing without re-applying AI doesn't reset to white). This task is purely additive — no existing field is removed yet.

- [ ] **Step 1: Write the failing test**

Add to `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js` (new top-level `describe`, alongside the existing ones):

```js
import { DEFAULT_PAGE_STYLE } from '../model/pageStyleModel';

describe('pageConfig.pageStyle', () => {
  it('defaults to the white DEFAULT_PAGE_STYLE when absent', () => {
    expect(normalizePageConfig({}).pageStyle).toEqual(DEFAULT_PAGE_STYLE);
  });

  it('passes through a valid pageStyle', () => {
    const customPageStyle = {
      ...DEFAULT_PAGE_STYLE,
      palette: { ...DEFAULT_PAGE_STYLE.palette, backgroundHex: '#0f172a' },
    };

    expect(normalizePageConfig({ pageStyle: customPageStyle }).pageStyle.palette.backgroundHex).toBe('#0f172a');
  });
});

describe('buildStorefrontSavePayload pageStyle', () => {
  it('writes an explicitly passed pageStyle into pageConfig', () => {
    const customPageStyle = { ...DEFAULT_PAGE_STYLE, palette: { ...DEFAULT_PAGE_STYLE.palette, accentHex: '#2563eb' } };
    const payload = buildStorefrontSavePayload({
      officeCode: 'OFF-1',
      existingConfig: null,
      hiddenProducts: [],
      selectedProductCategoryName: 'Fertilizer Upload',
      selectedMediumCategories: ['Premium'],
      representativeMediumCategory: 'Premium',
      cardStyle: {},
      cardFields: ['product_name'],
      cardElementConfig: {},
      navConfig: {},
      mobileUiTree: undefined,
      cardTemplate: 'card-grid',
      pageStyle: customPageStyle,
    });

    expect(payload.pageConfig.pageStyle.palette.accentHex).toBe('#2563eb');
  });

  it('keeps the existing saved pageStyle when none is passed', () => {
    const existingConfig = {
      pageConfig: { ...DEFAULT_PAGE_STYLE && {}, pageStyle: { ...DEFAULT_PAGE_STYLE, palette: { ...DEFAULT_PAGE_STYLE.palette, accentHex: '#7c3aed' } } },
    };
    const payload = buildStorefrontSavePayload({
      officeCode: 'OFF-1',
      existingConfig,
      hiddenProducts: [],
      selectedProductCategoryName: 'Fertilizer Upload',
      selectedMediumCategories: ['Premium'],
      representativeMediumCategory: 'Premium',
      cardStyle: {},
      cardFields: ['product_name'],
      cardElementConfig: {},
      navConfig: {},
      mobileUiTree: undefined,
      cardTemplate: 'card-grid',
    });

    expect(payload.pageConfig.pageStyle.palette.accentHex).toBe('#7c3aed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontBuilderModel.test.js`
Expected: FAIL — `pageStyle` is `undefined` on the returned `pageConfig`.

- [ ] **Step 3: Write the implementation**

In `react-app/src/features/storefront/model/storefrontBuilderModel.js`:

Add the import near the top, alongside the other model imports:

```js
import { DEFAULT_PAGE_STYLE, normalizePageStyle } from './pageStyleModel';
```

In `DEFAULT_PAGE_CONFIG`, add the new field (leave every existing field untouched):

```js
export const DEFAULT_PAGE_CONFIG = {
  schemaVersion: 1,
  designDirection: 'friendly',
  pageStyle: DEFAULT_PAGE_STYLE,
  theme: {
    brandColor: DEFAULT_CARD_STYLE.accentColor,
    backgroundTone: STOREFRONT_BACKGROUND_TONES.friendly,
    titleTextColor: 'default',
    typographyTone: 'standard',
  },
  // ...nav / searchSection / categoryChips / mobileUiTree unchanged
};
```

In `normalizePageConfig`, add `pageStyle` to the returned object (insert right after `designDirection,`):

```js
  return {
    schemaVersion: Number.isFinite(source.schemaVersion) ? source.schemaVersion : DEFAULT_PAGE_CONFIG.schemaVersion,
    designDirection,
    pageStyle: normalizePageStyle(source.pageStyle),
    theme: {
      // ...unchanged
```

In `buildStorefrontSavePayload`, add `pageStyle` to the destructured params (alongside `aiDesign`):

```js
export function buildStorefrontSavePayload({
  officeCode,
  existingConfig,
  hiddenProducts,
  selectedProductCategoryName,
  selectedMediumCategories,
  representativeMediumCategory,
  cardStyle,
  cardFields,
  cardElementConfig,
  navConfig,
  designDirection,
  titleTextColor,
  typographyTone,
  mobileUiTree,
  cardTemplate,
  aiDesign,
  pageStyle,
  allowedScalarKeys,
}) {
```

And thread it into `nextPageConfig`'s `normalizePageConfig({...})` call (add the `pageStyle` line; everything else in that call is unchanged):

```js
  const nextPageConfig = normalizePageConfig({
    ...basePageConfig,
    designDirection: nextDesignDirection,
    pageStyle: pageStyle ?? basePageConfig.pageStyle,
    theme: {
      // ...unchanged
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontBuilderModel.test.js`
Expected: PASS (all existing tests + 4 new ones)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/model/storefrontBuilderModel.js react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js
git commit -m "feat: thread pageStyle through pageConfig normalization and save payload"
```

---

### Task 6: Read-time migration safety net in `storefrontConfigService.js`

**Files:**
- Modify: `react-app/src/features/storefront/services/storefrontConfigService.js`
- Test: `react-app/src/features/storefront/__tests__/storefrontConfigService.test.js`

**Interfaces:**
- Consumes: `pageConfigNeedsPageStyleMigration`, `migrateLegacyPageConfigToPageStyle` from `./pageStyleMigration` (Task 4).
- Behavior: when a fetched office row's raw `page_config` has no `pageStyle` but does have legacy `designDirection`/`theme` fields, `fetchStorefrontConfig` backfills `pageStyle` via the deterministic migration before normalizing — no AI call, no write-back (the next save persists it naturally since `buildStorefrontSavePayload` always carries `pageStyle` through, per Task 5).

- [ ] **Step 1: Write the failing test**

Add to `react-app/src/features/storefront/__tests__/storefrontConfigService.test.js` (new `it` inside the existing `describe('storefrontConfigService.fetchStorefrontConfig', ...)` block, reusing the same mock-setup pattern as the neighboring tests):

```js
it('migrates a legacy page_config with no pageStyle into a resolved pageStyle on read', async () => {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      office_code: 'OFF-1',
      page_config: {
        schemaVersion: 1,
        designDirection: 'trust',
        theme: { brandColor: '#2563eb', backgroundTone: 'sky', titleTextColor: 'ink', typographyTone: 'bold' },
        nav: { title: 'Demo', subtitle: '', logoUrl: '' },
        searchSection: { enabled: true, placeholder: 'Search products', variant: 'outlined' },
        categoryChips: { enabled: true, sticky: true },
      },
      hidden_products: [],
      updated_at: '2026-06-15T00:00:00Z',
    },
    error: null,
  });
  const officeEq = vi.fn(() => ({ maybeSingle }));
  const officeSelect = vi.fn(() => ({ eq: officeEq }));
  const categoryOrder = vi.fn().mockResolvedValue({ data: [], error: null });
  const categoryEq = vi.fn(() => ({ order: categoryOrder }));
  const categorySelect = vi.fn(() => ({ eq: categoryEq }));

  supabase.from.mockImplementation((tableName) => {
    if (tableName === 'office_page_config') return { select: officeSelect };
    if (tableName === 'office_page_category_configs') return { select: categorySelect };
    throw new Error(`Unexpected table: ${tableName}`);
  });

  const result = await fetchStorefrontConfig({ officeCode: 'OFF-1' });

  expect(result.pageConfig.pageStyle.palette.accentHex).toBe('#2563eb');
  expect(result.pageConfig.pageStyle.search.borderStrengthToken).toBe('strong');
  expect(result.pageConfig.pageStyle.schemaVersion).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontConfigService.test.js`
Expected: FAIL — `result.pageConfig.pageStyle.palette.accentHex` is `'#1d4a2e'` (the `DEFAULT_PAGE_STYLE` fallback), not `'#2563eb'`, because nothing migrates the legacy row yet.

- [ ] **Step 3: Write the implementation**

In `react-app/src/features/storefront/services/storefrontConfigService.js`, add the import:

```js
import { migrateLegacyPageConfigToPageStyle, pageConfigNeedsPageStyleMigration } from './pageStyleMigration';
```

Change `normalizeConfig` to migrate the raw row before calling `normalizePageConfig`:

```js
function normalizeConfig(officeRow, categoryRows) {
  if (!officeRow) {
    return null;
  }

  const rawPageConfig = officeRow.page_config ?? {};
  const pageConfig = normalizePageConfig(
    pageConfigNeedsPageStyleMigration(rawPageConfig)
      ? { ...rawPageConfig, pageStyle: migrateLegacyPageConfigToPageStyle(rawPageConfig) }
      : rawPageConfig,
  );
  const normalizedCategoryConfigs = toArray(categoryRows).map((row) => normalizeCategoryConfigRow(row));

  return {
    officeCode: toTrimmedString(officeRow.office_code),
    pageConfig,
    navConfig: normalizeNavConfig({
      title: pageConfig.nav.title,
      subtitle: pageConfig.nav.subtitle,
      brandColor: pageConfig.theme.brandColor,
      searchPlaceholder: pageConfig.searchSection.placeholder,
      logoUrl: pageConfig.nav.logoUrl,
    }),
    categoryConfigs: normalizedCategoryConfigs,
    hiddenProducts: toArray(officeRow.hidden_products),
    updatedAt: officeRow.updated_at ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontConfigService.test.js`
Expected: PASS (all existing tests + 1 new one)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/services/storefrontConfigService.js react-app/src/features/storefront/__tests__/storefrontConfigService.test.js
git commit -m "feat: migrate legacy page_config rows to pageStyle on read"
```

---

### Task 7: AI interpretation seam (`pageStyleAiInterpreter.js`)

**Files:**
- Create: `react-app/src/features/storefront/services/pageStyleAiInterpreter.js`
- Test: `react-app/src/features/storefront/__tests__/pageStyleAiInterpreter.test.js`

**Interfaces:**
- Consumes: `isHexColor`, `normalizeHexColor`, `pickReadableTextColor`, `mixHexColors` from `../model/pageStyleColor`; `DEFAULT_PAGE_STYLE`, `PAGE_STYLE_SEARCH_SIZE_TOKENS`, `PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS` from `../model/pageStyleModel`; `normalizePageAiDesignInput` from `../model/pageAiDesignModel`; `toTrimmedString` from `../../../common/utils/text`.
- Produces an **intent** object consumed by the compiler (Task 8): `{ palette: {backgroundHex,surfaceHex,accentHex,textHex}, header: {...}|null, categoryChips: {...}|null, search: {sizeToken?,borderStrengthToken?}|null }`. `palette` is always present (derived from the main prompt). `header`/`categoryChips`/`search` are `null` when their override prompt is empty or yields no recognizable property — this is how "ignore unsupported override requests" (PRD Testing Decisions) is satisfied.
- Exports (all used directly by tests, so boundary enforcement is testable against adversarial raw input, not just heuristic output): `PAGE_STYLE_AI_SCHEMA`, `normalizePaletteIntent(rawPalette, fallbackAccentHex)`, `normalizeHeaderIntent(rawHeader)`, `normalizeCategoryChipsIntent(rawChips)`, `normalizeSearchIntent(rawSearch)`, `buildHeuristicPageAiIntent(pageAiDesign)`, `interpretPageAiDesign({pageAiDesign}): Promise<intent>`.
- This module never reads or writes `previousPageStyle` — precedence/merging with prior state is the compiler's job (Task 8), keeping "AI interpretation" and "style compile" as separate testable seams per the PRD.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/pageStyleAiInterpreter.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleAiInterpreter.test.js`
Expected: FAIL — `Cannot find module '../services/pageStyleAiInterpreter'`

- [ ] **Step 3: Write the implementation**

Create `react-app/src/features/storefront/services/pageStyleAiInterpreter.js`:

```js
import { toTrimmedString } from '../../../common/utils/text';
import { isHexColor, mixHexColors, normalizeHexColor, pickReadableTextColor } from '../model/pageStyleColor';
import {
  DEFAULT_PAGE_STYLE,
  PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS,
  PAGE_STYLE_SEARCH_SIZE_TOKENS,
} from '../model/pageStyleModel';
import { normalizePageAiDesignInput } from '../model/pageAiDesignModel';

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const HEX_COLOR_SCHEMA_PATTERN = '^#[0-9a-fA-F]{6}$';

const NULLABLE_HEADER_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    titleColorHex: { type: 'string', pattern: HEX_COLOR_SCHEMA_PATTERN },
    letterSpacing: { type: 'string' },
    fontWeight: { type: 'number' },
  },
  required: ['titleColorHex', 'letterSpacing', 'fontWeight'],
};

const NULLABLE_CATEGORY_CHIPS_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundHex: { type: 'string', pattern: HEX_COLOR_SCHEMA_PATTERN },
    textHex: { type: 'string', pattern: HEX_COLOR_SCHEMA_PATTERN },
    borderColorHex: { type: 'string', pattern: HEX_COLOR_SCHEMA_PATTERN },
    activeBackgroundHex: { type: 'string', pattern: HEX_COLOR_SCHEMA_PATTERN },
    activeTextHex: { type: 'string', pattern: HEX_COLOR_SCHEMA_PATTERN },
  },
  required: ['backgroundHex', 'textHex', 'borderColorHex', 'activeBackgroundHex', 'activeTextHex'],
};

const NULLABLE_SEARCH_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    sizeToken: { type: 'string', enum: PAGE_STYLE_SEARCH_SIZE_TOKENS },
    borderStrengthToken: { type: 'string', enum: PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS },
  },
  required: ['sizeToken', 'borderStrengthToken'],
};

export const PAGE_STYLE_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    palette: {
      type: 'object',
      additionalProperties: false,
      properties: {
        backgroundHex: { type: 'string', pattern: HEX_COLOR_SCHEMA_PATTERN },
        surfaceHex: { type: 'string', pattern: HEX_COLOR_SCHEMA_PATTERN },
        accentHex: { type: 'string', pattern: HEX_COLOR_SCHEMA_PATTERN },
        textHex: { type: 'string', pattern: HEX_COLOR_SCHEMA_PATTERN },
      },
      required: ['backgroundHex', 'surfaceHex', 'accentHex', 'textHex'],
    },
    header: NULLABLE_HEADER_SCHEMA,
    categoryChips: NULLABLE_CATEGORY_CHIPS_SCHEMA,
    search: NULLABLE_SEARCH_SCHEMA,
  },
  required: ['palette', 'header', 'categoryChips', 'search'],
};

function includesAny(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

export function normalizePaletteIntent(rawPalette, fallbackAccentHex) {
  const source = rawPalette ?? {};
  const accentHex = normalizeHexColor(source.accentHex, fallbackAccentHex);
  const backgroundHex = isHexColor(source.backgroundHex)
    ? normalizeHexColor(source.backgroundHex, accentHex)
    : mixHexColors(accentHex, '#ffffff', 0.94);

  return {
    backgroundHex,
    surfaceHex: normalizeHexColor(source.surfaceHex, '#ffffff'),
    accentHex,
    textHex: normalizeHexColor(source.textHex, pickReadableTextColor(backgroundHex)),
  };
}

export function normalizeHeaderIntent(rawHeader) {
  if (!rawHeader) {
    return null;
  }

  const intent = {};

  if (isHexColor(rawHeader.titleColorHex)) {
    intent.titleColorHex = normalizeHexColor(rawHeader.titleColorHex);
  }

  if (typeof rawHeader.letterSpacing === 'string' && rawHeader.letterSpacing) {
    intent.letterSpacing = rawHeader.letterSpacing;
  }

  if (Number.isFinite(rawHeader.fontWeight)) {
    intent.fontWeight = rawHeader.fontWeight;
  }

  return Object.keys(intent).length > 0 ? intent : null;
}

export function normalizeCategoryChipsIntent(rawChips) {
  if (!rawChips) {
    return null;
  }

  const intent = {};

  ['backgroundHex', 'textHex', 'borderColorHex', 'activeBackgroundHex', 'activeTextHex'].forEach((key) => {
    if (isHexColor(rawChips[key])) {
      intent[key] = normalizeHexColor(rawChips[key]);
    }
  });

  return Object.keys(intent).length > 0 ? intent : null;
}

export function normalizeSearchIntent(rawSearch) {
  if (!rawSearch) {
    return null;
  }

  const intent = {};

  if (PAGE_STYLE_SEARCH_SIZE_TOKENS.includes(rawSearch.sizeToken)) {
    intent.sizeToken = rawSearch.sizeToken;
  }

  if (PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS.includes(rawSearch.borderStrengthToken)) {
    intent.borderStrengthToken = rawSearch.borderStrengthToken;
  }

  return Object.keys(intent).length > 0 ? intent : null;
}

function detectAccentHexFromPrompt(mainPrompt) {
  const text = mainPrompt.toLowerCase();

  if (includesAny(text, ['blue', '파랑', '블루', 'trust', 'official', '신뢰', '공식'])) return '#2563eb';
  if (includesAny(text, ['orange', '주황', '오렌지', 'warm', 'cozy', '따뜻'])) return '#ea580c';
  if (includesAny(text, ['purple', '보라'])) return '#7c3aed';
  if (includesAny(text, ['green', 'nature', 'organic', '자연', '그린'])) return '#1d4a2e';

  return DEFAULT_PAGE_STYLE.palette.accentHex;
}

function detectHeaderOverrideCandidate(headerOverridePrompt) {
  if (!headerOverridePrompt) {
    return null;
  }

  const text = headerOverridePrompt.toLowerCase();
  const candidate = {};

  if (includesAny(text, ['darker', 'dark title', '진하게', '짙게'])) candidate.titleColorHex = '#111827';
  if (includesAny(text, ['lighter', '연하게', '밝게'])) candidate.titleColorHex = '#ffffff';
  if (includesAny(text, ['bold', 'bolder', 'strong', '굵게', '강하게'])) candidate.fontWeight = 800;
  if (includesAny(text, ['thin', 'light weight', '가볍게', '얇게'])) candidate.fontWeight = 500;
  if (includesAny(text, ['wide', 'spaced out', '자간 넓게', '넓게'])) candidate.letterSpacing = '0.04em';
  if (includesAny(text, ['tight', 'condensed', '자간 좁게', '좁게'])) candidate.letterSpacing = '-0.01em';

  return candidate;
}

function detectCategoryChipsOverrideCandidate(categoryChipsOverridePrompt, accentHex) {
  if (!categoryChipsOverridePrompt) {
    return null;
  }

  const text = categoryChipsOverridePrompt.toLowerCase();
  const candidate = {};

  if (includesAny(text, ['filled', 'solid', '채운'])) candidate.activeBackgroundHex = accentHex;
  if (includesAny(text, ['outline only', 'no fill', '테두리만'])) candidate.activeBackgroundHex = '#ffffff';
  if (includesAny(text, ['darker text', '진한 글자'])) candidate.textHex = '#111827';
  if (includesAny(text, ['lighter text', '연한 글자'])) candidate.textHex = '#ffffff';
  if (includesAny(text, ['strong border', '굵은 테두리'])) candidate.borderColorHex = accentHex;
  if (includesAny(text, ['soft border', '연한 테두리'])) candidate.borderColorHex = mixHexColors(accentHex, '#ffffff', 0.8);

  return candidate;
}

function detectSearchOverrideCandidate(searchOverridePrompt) {
  if (!searchOverridePrompt) {
    return null;
  }

  const text = searchOverridePrompt.toLowerCase();
  const candidate = {};

  if (includesAny(text, ['largest', 'huge', '아주 크게'])) candidate.sizeToken = 'xl';
  else if (includesAny(text, ['larger', 'bigger', '크게', '넓게'])) candidate.sizeToken = 'lg';
  else if (includesAny(text, ['smaller', 'small', '작게'])) candidate.sizeToken = 'sm';

  if (includesAny(text, ['stronger border', 'strong border', '강한 테두리', '굵은 테두리'])) candidate.borderStrengthToken = 'strong';
  else if (includesAny(text, ['soft border', 'subtle border', '부드러운 테두리', '연한 테두리'])) candidate.borderStrengthToken = 'soft';

  return candidate;
}

export function buildHeuristicPageAiIntent(pageAiDesign) {
  const normalizedInput = normalizePageAiDesignInput(pageAiDesign);
  const accentHex = detectAccentHexFromPrompt(normalizedInput.mainPrompt);
  const palette = normalizePaletteIntent({ accentHex }, accentHex);

  return {
    palette,
    header: normalizeHeaderIntent(detectHeaderOverrideCandidate(normalizedInput.headerOverridePrompt)),
    categoryChips: normalizeCategoryChipsIntent(
      detectCategoryChipsOverrideCandidate(normalizedInput.categoryChipsOverridePrompt, palette.accentHex),
    ),
    search: normalizeSearchIntent(detectSearchOverrideCandidate(normalizedInput.searchOverridePrompt)),
  };
}

function normalizePageStyleAiIntent(payload, fallbackAccentHex) {
  return {
    palette: normalizePaletteIntent(payload?.palette, fallbackAccentHex),
    header: normalizeHeaderIntent(payload?.header),
    categoryChips: normalizeCategoryChipsIntent(payload?.categoryChips),
    search: normalizeSearchIntent(payload?.search),
  };
}

async function readOpenAiError(response) {
  try {
    const errorBody = await response.json();
    const message = toTrimmedString(errorBody?.error?.message);

    if (message) {
      return message;
    }
  } catch {
    // fall through to plain text below
  }

  try {
    return toTrimmedString(await response.text());
  } catch {
    return '';
  }
}

async function requestOpenAiPageStyleSuggestion(requestBody, openAiApiKey) {
  const response = await fetch(OPENAI_RESPONSES_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiApiKey}` },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const message = await readOpenAiError(response);
    throw new Error(message ? `OpenAI API request failed: ${message}` : `OpenAI API request failed with status ${response.status}.`);
  }

  const responseBody = await response.json();
  const structuredPayload = responseBody?.output_parsed ?? JSON.parse(responseBody?.output_text ?? 'null');

  if (!structuredPayload) {
    throw new Error('OpenAI returned an unreadable page style response.');
  }

  return structuredPayload;
}

function buildPageStyleOpenAiRequestBody({ pageAiDesign, openAiModel }) {
  return {
    model: openAiModel,
    input: [
      {
        role: 'system',
        content: [
          'You style one storefront page background palette, header text, category chips, and search box.',
          'Always return a full palette derived from the main prompt.',
          'Only fill header/categoryChips/search when their matching override request is present; otherwise return null for that area.',
          'Search may only carry sizeToken and borderStrengthToken. Never invent background, radius, or icon properties.',
          'Category chips may only carry background/text/border/active-state colors. Never invent shape or placement properties.',
          'Header may only carry title color, letter spacing, and font weight. Never rewrite the title text itself.',
        ].join('\n'),
      },
      { role: 'user', content: JSON.stringify({ request: pageAiDesign }, null, 2) },
    ],
    text: {
      format: { type: 'json_schema', name: 'storefront_page_style_suggestion', strict: true, schema: PAGE_STYLE_AI_SCHEMA },
    },
    max_output_tokens: 800,
  };
}

export async function interpretPageAiDesign({ pageAiDesign } = {}) {
  const normalizedInput = normalizePageAiDesignInput(pageAiDesign);
  const openAiApiKey = toTrimmedString(import.meta.env.VITE_OPENAI_API_KEY);

  if (!openAiApiKey) {
    return buildHeuristicPageAiIntent(normalizedInput);
  }

  const openAiModel = toTrimmedString(import.meta.env.VITE_OPENAI_MODEL) || DEFAULT_OPENAI_MODEL;
  const payload = await requestOpenAiPageStyleSuggestion(
    buildPageStyleOpenAiRequestBody({ pageAiDesign: normalizedInput, openAiModel }),
    openAiApiKey,
  );

  return normalizePageStyleAiIntent(payload, DEFAULT_PAGE_STYLE.palette.accentHex);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleAiInterpreter.test.js`
Expected: PASS (15 tests)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/services/pageStyleAiInterpreter.js react-app/src/features/storefront/__tests__/pageStyleAiInterpreter.test.js
git commit -m "feat: add page AI interpretation seam with heuristic fallback and boundary enforcement"
```

---

### Task 8: Precedence + contrast-correction compiler (`pageStyleCompiler.js`)

**Files:**
- Create: `react-app/src/features/storefront/services/pageStyleCompiler.js`
- Test: `react-app/src/features/storefront/__tests__/pageStyleCompiler.test.js`

**Interfaces:**
- Consumes: `normalizePageStyle`, `deriveCategoryChipsFromPalette`, `deriveSearchDefaultsFromPalette` from `../model/pageStyleModel` (Task 2). Takes the `intent` shape produced by Task 7.
- Produces: `compilePageStyle({ intent, previousPageStyle }): pageStyle`.

**Resolved design decisions** (the "open questions" flagged at planning time, settled here so implementation doesn't re-litigate):
1. **Header & search precedence:** override intent value, else the *previous compiled* value (contrast-recorrected against the new palette), else the white-seed default. This makes untouched areas survive re-applies — there is no NL input telling the compiler to change them, so the prior approved result is the correct "last valid" value, consistent with "keep the last valid preview if AI fails" (PRD user story #19) and Global Constraint above.
2. **Category chips precedence:** override intent value, else **freshly re-derived from the current palette** (never falls back to a stale previous chip color) — this is the one area the PRD explicitly calls out: "Category chip default styling will be derived from the compiled page palette." Re-deriving every time keeps chips visually consistent with whatever palette the main prompt just produced.
3. **Search border color/focus color:** always re-derived from the current palette (not AI-settable) — only `sizeToken`/`borderStrengthToken` are override-able tokens, per PRD's explicit search property boundary.
4. **Contrast correction:** runs unconditionally as the final step (`normalizePageStyle` does this — Task 2), so even sticky/re-derived values are re-validated against whatever the new background is.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/pageStyleCompiler.test.js`:

```js
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../model/pageStyleColor';
import { DEFAULT_PAGE_STYLE } from '../model/pageStyleModel';
import { compilePageStyle } from '../services/pageStyleCompiler';

const BASE_INTENT = {
  palette: { backgroundHex: '#eef3fb', surfaceHex: '#ffffff', accentHex: '#2563eb', textHex: '#111827' },
  header: null,
  categoryChips: null,
  search: null,
};

describe('compilePageStyle resolved output', () => {
  it('always returns resolved hex values and a stamped schemaVersion, never semantic placeholders', () => {
    const result = compilePageStyle({ intent: BASE_INTENT, previousPageStyle: undefined });

    expect(result.schemaVersion).toBe(1);
    expect(result.palette.accentHex).toBe('#2563eb');
    expect(result.search.sizeToken).toBe('md');
    expect(typeof result.categoryChips.backgroundHex).toBe('string');
  });
});

describe('compilePageStyle precedence: header/search', () => {
  it('uses the override when present', () => {
    const result = compilePageStyle({
      intent: { ...BASE_INTENT, header: { fontWeight: 800 }, search: { sizeToken: 'lg' } },
      previousPageStyle: undefined,
    });

    expect(result.header.fontWeight).toBe(800);
    expect(result.search.sizeToken).toBe('lg');
  });

  it('falls back to the previous compiled value when no override is given (sticky across re-applies)', () => {
    const previousPageStyle = compilePageStyle({
      intent: { ...BASE_INTENT, header: { fontWeight: 800 }, search: { sizeToken: 'lg' } },
      previousPageStyle: undefined,
    });
    const result = compilePageStyle({ intent: BASE_INTENT, previousPageStyle });

    expect(result.header.fontWeight).toBe(800);
    expect(result.search.sizeToken).toBe('lg');
  });

  it('falls back to the white-seed default for a brand-new draft with no previous style and no override', () => {
    const result = compilePageStyle({ intent: BASE_INTENT, previousPageStyle: undefined });

    expect(result.header.fontWeight).toBe(DEFAULT_PAGE_STYLE.header.fontWeight);
    expect(result.search.sizeToken).toBe(DEFAULT_PAGE_STYLE.search.sizeToken);
  });
});

describe('compilePageStyle precedence: category chips', () => {
  it('re-derives chip colors from the new palette even when a previous custom chip style existed, if no override is given this time', () => {
    const previousPageStyle = compilePageStyle({
      intent: { ...BASE_INTENT, categoryChips: { activeBackgroundHex: '#7c3aed' } },
      previousPageStyle: undefined,
    });

    expect(previousPageStyle.categoryChips.activeBackgroundHex).toBe('#7c3aed');

    const nextIntent = { ...BASE_INTENT, palette: { ...BASE_INTENT.palette, accentHex: '#ea580c' }, categoryChips: null };
    const result = compilePageStyle({ intent: nextIntent, previousPageStyle });

    expect(result.categoryChips.activeBackgroundHex).toBe('#ea580c');
  });

  it('uses the chip override when present instead of the palette-derived default', () => {
    const result = compilePageStyle({
      intent: { ...BASE_INTENT, categoryChips: { activeBackgroundHex: '#7c3aed' } },
      previousPageStyle: undefined,
    });

    expect(result.categoryChips.activeBackgroundHex).toBe('#7c3aed');
  });
});

describe('compilePageStyle contrast correction', () => {
  it('keeps header title text readable against an extreme palette background', () => {
    const result = compilePageStyle({
      intent: { ...BASE_INTENT, palette: { backgroundHex: '#111111', surfaceHex: '#1a1a1a', accentHex: '#222222', textHex: '#111111' } },
      previousPageStyle: undefined,
    });

    expect(contrastRatio(result.header.titleColorHex, result.palette.backgroundHex)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps chip text readable against the palette-derived chip background', () => {
    const result = compilePageStyle({ intent: BASE_INTENT, previousPageStyle: undefined });

    expect(contrastRatio(result.categoryChips.textHex, result.categoryChips.backgroundHex)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(result.categoryChips.activeTextHex, result.categoryChips.activeBackgroundHex)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('compilePageStyle property boundaries', () => {
  it('never leaks extra properties beyond the canonical pageStyle shape', () => {
    const result = compilePageStyle({ intent: BASE_INTENT, previousPageStyle: undefined });

    expect(Object.keys(result).sort()).toEqual(['categoryChips', 'header', 'palette', 'schemaVersion', 'search']);
    expect(Object.keys(result.search).sort()).toEqual(['borderColorHex', 'borderStrengthToken', 'focusBorderColorHex', 'sizeToken']);
  });

  it('search border/focus color always tracks the current palette, ignoring any stray color fields on the intent', () => {
    const result = compilePageStyle({
      intent: { ...BASE_INTENT, search: { sizeToken: 'lg' } },
      previousPageStyle: undefined,
    });

    expect(result.search.borderColorHex).not.toBe(DEFAULT_PAGE_STYLE.search.borderColorHex);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleCompiler.test.js`
Expected: FAIL — `Cannot find module '../services/pageStyleCompiler'`

- [ ] **Step 3: Write the implementation**

Create `react-app/src/features/storefront/services/pageStyleCompiler.js`:

```js
import {
  deriveCategoryChipsFromPalette,
  deriveSearchDefaultsFromPalette,
  normalizePageStyle,
} from '../model/pageStyleModel';

function resolveHeader(intentHeader, previousHeader) {
  return {
    titleColorHex: intentHeader?.titleColorHex ?? previousHeader.titleColorHex,
    letterSpacing: intentHeader?.letterSpacing ?? previousHeader.letterSpacing,
    fontWeight: intentHeader?.fontWeight ?? previousHeader.fontWeight,
  };
}

function resolveSearch(intentSearch, previousSearch, palette) {
  const paletteDefaults = deriveSearchDefaultsFromPalette(palette);

  return {
    sizeToken: intentSearch?.sizeToken ?? previousSearch.sizeToken,
    borderStrengthToken: intentSearch?.borderStrengthToken ?? previousSearch.borderStrengthToken,
    borderColorHex: paletteDefaults.borderColorHex,
    focusBorderColorHex: paletteDefaults.focusBorderColorHex,
  };
}

function resolveCategoryChips(intentChips, palette) {
  const paletteDefaults = deriveCategoryChipsFromPalette(palette);

  return {
    backgroundHex: intentChips?.backgroundHex ?? paletteDefaults.backgroundHex,
    textHex: intentChips?.textHex ?? paletteDefaults.textHex,
    borderColorHex: intentChips?.borderColorHex ?? paletteDefaults.borderColorHex,
    activeBackgroundHex: intentChips?.activeBackgroundHex ?? paletteDefaults.activeBackgroundHex,
    activeTextHex: intentChips?.activeTextHex ?? paletteDefaults.activeTextHex,
  };
}

export function compilePageStyle({ intent, previousPageStyle }) {
  const previous = normalizePageStyle(previousPageStyle);
  const palette = intent.palette;

  return normalizePageStyle({
    palette,
    header: resolveHeader(intent.header, previous.header),
    search: resolveSearch(intent.search, previous.search, palette),
    categoryChips: resolveCategoryChips(intent.categoryChips, palette),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/pageStyleCompiler.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/services/pageStyleCompiler.js react-app/src/features/storefront/__tests__/pageStyleCompiler.test.js
git commit -m "feat: add pageStyle compiler with precedence rules and contrast correction"
```

---

### Task 9: Session-state hook (`usePageAiDesign.js`)

**Files:**
- Create: `react-app/src/features/storefront/hooks/usePageAiDesign.js`
- Test: `react-app/src/features/storefront/__tests__/usePageAiDesign.test.js`

**Interfaces:**
- Consumes: `DEFAULT_PAGE_AI_DESIGN`, `normalizePageAiDesignInput` from `../model/pageAiDesignModel` (Task 3); `normalizePageStyle` from `../model/pageStyleModel` (Task 2); `interpretPageAiDesign` from `../services/pageStyleAiInterpreter` (Task 7); `compilePageStyle` from `../services/pageStyleCompiler` (Task 8).
- Produces: `usePageAiDesign({ initialPageStyle }?) => { pageStyle, pageAiDesign, isApplyingPageAiDesign, pageAiErrorMessage, hydratePageStyle(nextPageStyle), setMainPrompt(value), setHeaderOverridePrompt(value), setCategoryChipsOverridePrompt(value), setSearchOverridePrompt(value), applyPageAiDesign(): Promise<void>, discardPageAiDesignSession() }`. This exact return shape is consumed by `useStorefrontBuilder.js` (Task 10) and `PageDesignEditor.jsx` (Task 12).
- `applyPageAiDesign` only calls `setPageStyle` on success — on failure it only sets `pageAiErrorMessage`, so the previous `pageStyle` is structurally guaranteed to survive (PRD: "keep the last valid preview if AI fails").

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/usePageAiDesign.test.js`:

```js
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PAGE_AI_DESIGN } from '../model/pageAiDesignModel';
import { DEFAULT_PAGE_STYLE } from '../model/pageStyleModel';
import { usePageAiDesign } from '../hooks/usePageAiDesign';
import { interpretPageAiDesign } from '../services/pageStyleAiInterpreter';
import { compilePageStyle } from '../services/pageStyleCompiler';

vi.mock('../services/pageStyleAiInterpreter', () => ({ interpretPageAiDesign: vi.fn() }));
vi.mock('../services/pageStyleCompiler', () => ({ compilePageStyle: vi.fn() }));

describe('usePageAiDesign', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts with the white default pageStyle and empty prompts', () => {
    const { result } = renderHook(() => usePageAiDesign());

    expect(result.current.pageStyle).toEqual(DEFAULT_PAGE_STYLE);
    expect(result.current.pageAiDesign).toEqual(DEFAULT_PAGE_AI_DESIGN);
  });

  it('hydratePageStyle replaces pageStyle and resets the session prompts', () => {
    const { result } = renderHook(() => usePageAiDesign());

    act(() => result.current.setMainPrompt('warm'));

    const stored = { ...DEFAULT_PAGE_STYLE, palette: { ...DEFAULT_PAGE_STYLE.palette, accentHex: '#2563eb' } };

    act(() => result.current.hydratePageStyle(stored));

    expect(result.current.pageStyle.palette.accentHex).toBe('#2563eb');
    expect(result.current.pageAiDesign.mainPrompt).toBe('');
  });

  it('rejects applying with no main prompt and leaves pageStyle untouched', async () => {
    const { result } = renderHook(() => usePageAiDesign());

    await act(async () => {
      await result.current.applyPageAiDesign();
    });

    expect(interpretPageAiDesign).not.toHaveBeenCalled();
    expect(result.current.pageAiErrorMessage).not.toBe('');
    expect(result.current.pageStyle).toEqual(DEFAULT_PAGE_STYLE);
  });

  it('applies a successful interpretation+compile and updates pageStyle', async () => {
    const compiledStyle = { ...DEFAULT_PAGE_STYLE, palette: { ...DEFAULT_PAGE_STYLE.palette, accentHex: '#ea580c' } };
    interpretPageAiDesign.mockResolvedValue({ palette: compiledStyle.palette, header: null, categoryChips: null, search: null });
    compilePageStyle.mockReturnValue(compiledStyle);

    const { result } = renderHook(() => usePageAiDesign());

    act(() => result.current.setMainPrompt('warm'));
    await act(async () => {
      await result.current.applyPageAiDesign();
    });

    expect(result.current.pageStyle).toEqual(compiledStyle);
    expect(result.current.pageAiErrorMessage).toBe('');
    expect(result.current.isApplyingPageAiDesign).toBe(false);
  });

  it('keeps the last valid pageStyle and surfaces an error when interpretation fails', async () => {
    interpretPageAiDesign.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => usePageAiDesign());

    act(() => result.current.setMainPrompt('warm'));
    await act(async () => {
      await result.current.applyPageAiDesign();
    });

    expect(result.current.pageStyle).toEqual(DEFAULT_PAGE_STYLE);
    expect(result.current.pageAiErrorMessage).toBe('network down');
  });

  it('discardPageAiDesignSession clears the prompts but keeps the compiled pageStyle', async () => {
    const compiledStyle = { ...DEFAULT_PAGE_STYLE, palette: { ...DEFAULT_PAGE_STYLE.palette, accentHex: '#7c3aed' } };
    interpretPageAiDesign.mockResolvedValue({ palette: compiledStyle.palette, header: null, categoryChips: null, search: null });
    compilePageStyle.mockReturnValue(compiledStyle);

    const { result } = renderHook(() => usePageAiDesign());

    act(() => result.current.setMainPrompt('cool purple'));
    await act(async () => {
      await result.current.applyPageAiDesign();
    });
    act(() => result.current.discardPageAiDesignSession());

    expect(result.current.pageAiDesign).toEqual(DEFAULT_PAGE_AI_DESIGN);
    expect(result.current.pageStyle).toEqual(compiledStyle);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/usePageAiDesign.test.js`
Expected: FAIL — `Cannot find module '../hooks/usePageAiDesign'`

- [ ] **Step 3: Write the implementation**

Create `react-app/src/features/storefront/hooks/usePageAiDesign.js`:

```js
import { useState } from 'react';

import { DEFAULT_PAGE_AI_DESIGN, normalizePageAiDesignInput } from '../model/pageAiDesignModel';
import { normalizePageStyle } from '../model/pageStyleModel';
import { interpretPageAiDesign } from '../services/pageStyleAiInterpreter';
import { compilePageStyle } from '../services/pageStyleCompiler';

const MISSING_MAIN_PROMPT_ERROR_MESSAGE = '페이지 분위기를 먼저 입력해 주세요.';
const APPLY_FAILED_ERROR_MESSAGE = '페이지 스타일을 적용하지 못했습니다.';

export function usePageAiDesign({ initialPageStyle } = {}) {
  const [pageStyle, setPageStyle] = useState(() => normalizePageStyle(initialPageStyle));
  const [pageAiDesign, setPageAiDesignState] = useState(DEFAULT_PAGE_AI_DESIGN);
  const [isApplyingPageAiDesign, setIsApplyingPageAiDesign] = useState(false);
  const [pageAiErrorMessage, setPageAiErrorMessage] = useState('');

  function hydratePageStyle(nextPageStyle) {
    setPageStyle(normalizePageStyle(nextPageStyle));
    setPageAiDesignState(DEFAULT_PAGE_AI_DESIGN);
    setPageAiErrorMessage('');
  }

  function setMainPrompt(value) {
    setPageAiDesignState((current) => ({ ...current, mainPrompt: value }));
  }

  function setHeaderOverridePrompt(value) {
    setPageAiDesignState((current) => ({ ...current, headerOverridePrompt: value }));
  }

  function setCategoryChipsOverridePrompt(value) {
    setPageAiDesignState((current) => ({ ...current, categoryChipsOverridePrompt: value }));
  }

  function setSearchOverridePrompt(value) {
    setPageAiDesignState((current) => ({ ...current, searchOverridePrompt: value }));
  }

  async function applyPageAiDesign() {
    const normalizedInput = normalizePageAiDesignInput(pageAiDesign);

    if (!normalizedInput.mainPrompt) {
      setPageAiErrorMessage(MISSING_MAIN_PROMPT_ERROR_MESSAGE);
      return;
    }

    setIsApplyingPageAiDesign(true);
    setPageAiErrorMessage('');

    try {
      const intent = await interpretPageAiDesign({ pageAiDesign: normalizedInput });
      const nextPageStyle = compilePageStyle({ intent, previousPageStyle: pageStyle });

      setPageStyle(nextPageStyle);
    } catch (error) {
      setPageAiErrorMessage(error instanceof Error ? error.message : APPLY_FAILED_ERROR_MESSAGE);
    } finally {
      setIsApplyingPageAiDesign(false);
    }
  }

  function discardPageAiDesignSession() {
    setPageAiDesignState(DEFAULT_PAGE_AI_DESIGN);
  }

  return {
    pageStyle,
    pageAiDesign,
    isApplyingPageAiDesign,
    pageAiErrorMessage,
    hydratePageStyle,
    setMainPrompt,
    setHeaderOverridePrompt,
    setCategoryChipsOverridePrompt,
    setSearchOverridePrompt,
    applyPageAiDesign,
    discardPageAiDesignSession,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/usePageAiDesign.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/hooks/usePageAiDesign.js react-app/src/features/storefront/__tests__/usePageAiDesign.test.js
git commit -m "feat: add usePageAiDesign session hook with keep-last-valid-on-failure"
```

---

### Task 10: Decouple page styling from card AI in `useStorefrontBuilder.js`

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js` (`buildStorefrontSavePayload` — 2nd pass)
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`

**Context — the bug this fixes:** today, `applyAiSuggestion` (the per-category card AI) calls `setDesignDirectionState(suggestion.patch.designDirection || designDirection)`, `setTitleTextColor(...)`, `setTypographyTone(...)` — meaning the per-category card-design prompt currently mutates page-wide header styling. This is the exact problem the PRD's Problem Statement calls "overload the existing builder hook with mixed responsibilities." This task removes that coupling; card AI continues to manage everything else about the category draft unchanged.

**Interfaces:**
- Consumes: `usePageAiDesign` from `./usePageAiDesign` (Task 9).
- `useStorefrontBuilder`'s returned shape drops `designDirection`/`setDesignDirection`, adds `pageStyle`, `pageAiDesign`, `isApplyingPageAiDesign`, `pageAiErrorMessage`, `setPageMainPrompt`, `setPageHeaderOverridePrompt`, `setPageCategoryChipsOverridePrompt`, `setPageSearchOverridePrompt`, `applyPageAiDesign`. Consumed by `ProductCategoryStep.jsx`/`PageDesignEditor.jsx` in Task 12.
- `buildStorefrontSavePayload` drops the `designDirection`/`titleTextColor`/`typographyTone` params (still accepts `pageStyle`, unchanged from Task 5).

- [ ] **Step 1: Write the failing test**

In `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`, update the test named `'applies AI titleTextColor/typographyTone/cardTemplate/priceTextColor, previews, saves, and undoes them'` (around line 269): rename it and change its two `pageConfig.theme` assertions (around lines 407-408) to assert the **new** expected behavior — that card-level AI no longer touches page-wide theme:

```js
  it('applies AI cardTemplate/priceTextColor, previews, saves, and undoes them — without touching page-wide theme', async () => {
    // ...unchanged setup above this point...

    await user.click(screen.getByTestId('save-storefront-draft'));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);
    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(savedPayload.categoryConfigs[0].categoryConfig.layoutStyle.variant).toBe('price-focus');
    expect(savedPayload.categoryConfigs[0].categoryConfig.cardDesign.style.priceTextColor).toBe('muted');
    expect(savedPayload.categoryConfigs[0].categoryConfig.aiDesign.renderSpec.bodySlots[1].kind).toBe('inline-group');
    expect(savedPayload.pageConfig.theme.titleTextColor).toBe('default');
    expect(savedPayload.pageConfig.theme.typographyTone).toBe('standard');

    // ...unchanged undo assertions below this point...
  }, 10000);
```

(Only the test name and the two `pageConfig.theme` assertion values change — `'ink'` → `'default'` and `'bold'` → `'standard'`. Everything else in the test body, including the `requestStorefrontAiSuggestion` mock's `patch.titleTextColor`/`typographyTone`/`designDirection` fields, stays exactly as-is: the card AI service still *returns* those fields until Task 14 trims its schema, the builder just stops *reading* them for page state.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: FAIL — `expect(savedPayload.pageConfig.theme.titleTextColor).toBe('default')` receives `'ink'` (current code still lets card AI set it).

- [ ] **Step 3: Write the implementation**

In `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`:

Add the import:

```js
import { usePageAiDesign } from './usePageAiDesign';
```

Replace the three page-theme state declarations:

```js
  const [designDirection, setDesignDirectionState] = useState(DEFAULT_PAGE_CONFIG.designDirection);
  const [titleTextColor, setTitleTextColor] = useState(DEFAULT_PAGE_CONFIG.theme.titleTextColor);
  const [typographyTone, setTypographyTone] = useState(DEFAULT_PAGE_CONFIG.theme.typographyTone);
```

with:

```js
  const pageAi = usePageAiDesign();
```

Delete the `setDesignDirection` function entirely:

```js
  function setDesignDirection(value) {
    markDirty();
    setAiDesign(null);
    setDesignDirectionState(value);
  }
```

In the load effect, replace:

```js
        setDesignDirectionState(normalizedPageConfig.designDirection);
        setTitleTextColor(normalizedPageConfig.theme.titleTextColor);
        setTypographyTone(normalizedPageConfig.theme.typographyTone);
```

with:

```js
        pageAi.hydratePageStyle(normalizedPageConfig.pageStyle);
```

In `undoAiChanges`, delete these three lines (the rest of the function is unchanged):

```js
    setDesignDirectionState(lastAiSnapshot.designDirection);
    setTitleTextColor(lastAiSnapshot.titleTextColor);
    setTypographyTone(lastAiSnapshot.typographyTone);
```

In `applyAiSuggestion`, remove `designDirection, titleTextColor, typographyTone,` from both the `currentDraft` object passed to `requestStorefrontAiSuggestion` and the `snapshot` object. Then remove these three lines from inside the `startTransition(() => { ... })` block:

```js
        setDesignDirectionState(suggestion.patch.designDirection || designDirection);
        setTitleTextColor(suggestion.patch.titleTextColor);
        setTypographyTone(suggestion.patch.typographyTone);
```

In `saveDraft`, replace `designDirection, titleTextColor, typographyTone,` in the `buildStorefrontSavePayload({...})` call with `pageStyle: pageAi.pageStyle,`, and discard the session after a successful save:

```js
  async function saveDraft() {
    setStatus('saving');
    setErrorMessage('');

    try {
      const payload = buildStorefrontSavePayload({
        officeCode,
        existingConfig,
        hiddenProducts,
        selectedProductCategoryName,
        selectedMediumCategories,
        representativeMediumCategory,
        cardStyle,
        cardFields,
        cardElementConfig,
        navConfig,
        mobileUiTree,
        cardTemplate,
        aiDesign,
        pageStyle: pageAi.pageStyle,
        allowedScalarKeys: effectiveScalarKeys,
      });

      await upsertStorefrontConfig(payload);
      setExistingConfig(payload);
      setHiddenProducts(payload.hiddenProducts);
      setStatus('saved');
      pageAi.discardPageAiDesignSession();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : SAVE_ERROR_MESSAGE);
      setStatus('save-error');
    }
  }
```

Apply the same `designDirection, titleTextColor, typographyTone,` → `pageStyle: pageAi.pageStyle,` swap in the `previewConfig`'s populated-category branch, and make the empty-category branch reflect live page-AI edits too:

```js
  const previewConfig =
    selectedProductCategoryName
      ? buildStorefrontSavePayload({
          officeCode,
          existingConfig,
          hiddenProducts,
          selectedProductCategoryName,
          selectedMediumCategories,
          representativeMediumCategory,
          cardStyle,
          cardFields,
          cardElementConfig,
          navConfig,
          mobileUiTree,
          cardTemplate,
          aiDesign,
          pageStyle: pageAi.pageStyle,
          allowedScalarKeys: effectiveScalarKeys,
        })
      : {
          officeCode,
          pageConfig: normalizePageConfig({ ...existingConfig?.pageConfig, pageStyle: pageAi.pageStyle }),
          navConfig: normalizeNavConfig(existingConfig?.navConfig),
          categoryConfigs: existingConfig?.categoryConfigs ?? [],
          hiddenProducts,
        };
```

Finally, in the hook's return object, replace `designDirection,` (and drop `setDesignDirection,`) with:

```js
    pageStyle: pageAi.pageStyle,
    pageAiDesign: pageAi.pageAiDesign,
    isApplyingPageAiDesign: pageAi.isApplyingPageAiDesign,
    pageAiErrorMessage: pageAi.pageAiErrorMessage,
    setPageMainPrompt: pageAi.setMainPrompt,
    setPageHeaderOverridePrompt: pageAi.setHeaderOverridePrompt,
    setPageCategoryChipsOverridePrompt: pageAi.setCategoryChipsOverridePrompt,
    setPageSearchOverridePrompt: pageAi.setSearchOverridePrompt,
    applyPageAiDesign: pageAi.applyPageAiDesign,
```

In `react-app/src/features/storefront/model/storefrontBuilderModel.js`, drop the now-unused params from `buildStorefrontSavePayload` and stop referencing them inside it:

```js
export function buildStorefrontSavePayload({
  officeCode,
  existingConfig,
  hiddenProducts,
  selectedProductCategoryName,
  selectedMediumCategories,
  representativeMediumCategory,
  cardStyle,
  cardFields,
  cardElementConfig,
  navConfig,
  mobileUiTree,
  cardTemplate,
  aiDesign,
  pageStyle,
  allowedScalarKeys,
}) {
  const basePageConfig = normalizePageConfig(existingConfig?.pageConfig);
  const resolvedNavConfig = normalizeNavConfig({ ...(existingConfig?.navConfig ?? {}), ...(navConfig ?? {}) });
  const nextMobileUiTree = normalizeMobileUiTree(mobileUiTree ?? basePageConfig.mobileUiTree, {
    searchEnabled: basePageConfig.searchSection.enabled,
    categoryChipsEnabled: basePageConfig.categoryChips.enabled,
  });
  const searchBlock = nextMobileUiTree.find((block) => block.type === 'searchBox');
  const categoryChipsBlock = nextMobileUiTree.find((block) => block.type === 'categoryChips');
  const nextPageConfig = normalizePageConfig({
    ...basePageConfig,
    pageStyle: pageStyle ?? basePageConfig.pageStyle,
    theme: {
      ...basePageConfig.theme,
      brandColor: resolvedNavConfig.brandColor,
    },
    nav: {
      ...basePageConfig.nav,
      title: resolvedNavConfig.title,
      subtitle: resolvedNavConfig.subtitle,
      logoUrl: resolvedNavConfig.logoUrl,
    },
    searchSection: {
      ...basePageConfig.searchSection,
      enabled: searchBlock ? searchBlock.enabled : basePageConfig.searchSection.enabled,
      placeholder: resolvedNavConfig.searchPlaceholder,
      variant: resolvedNavConfig.searchVariant,
    },
    categoryChips: {
      ...basePageConfig.categoryChips,
      enabled: categoryChipsBlock ? categoryChipsBlock.enabled : basePageConfig.categoryChips.enabled,
      variant: resolvedNavConfig.categoryChipVariant,
    },
    mobileUiTree: nextMobileUiTree,
  });
  const nextCategoryRow = buildCategoryConfigRow({
    productCategoryName: selectedProductCategoryName,
    existingConfig,
    selectedMediumCategories,
    representativeMediumCategory,
    cardFields: normalizeCardFields(cardFields, allowedScalarKeys),
    cardStyle: normalizeCardStyle(cardStyle),
    cardElementConfig: normalizeCardElementConfig(cardElementConfig),
    cardTemplate,
    aiDesign,
    allowedScalarKeys,
  });

  return {
    officeCode,
    navConfig: resolvedNavConfig,
    pageConfig: nextPageConfig,
    categoryConfigs: mergeCategoryConfigRows(existingConfig?.categoryConfigs, nextCategoryRow),
    hiddenProducts: Array.isArray(hiddenProducts) ? hiddenProducts : [],
  };
}
```

(This drops `designDirection`/`titleTextColor`/`typographyTone` from the param list and the `nextDesignDirection`/`nextMobileUiTree`'s now-pointless `designDirection:` field and the two now-pointless `theme.titleTextColor`/`theme.typographyTone` overrides — they simply pass through unchanged via `...basePageConfig.theme` until Task 14 deletes the fields outright.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx src/features/storefront/__tests__/storefrontBuilderModel.test.js`
Expected: PASS — full file green, including the renamed test.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/hooks/useStorefrontBuilder.js react-app/src/features/storefront/model/storefrontBuilderModel.js react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx
git commit -m "fix: stop per-category card AI from mutating page-wide theme; compose usePageAiDesign"
```

---

### Task 11: Render `pageStyle` in `useStorefrontView.js` / `StorefrontView.jsx`

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useStorefrontView.js`
- Modify: `react-app/src/features/storefront/components/StorefrontView.jsx`
- Modify: `react-app/src/features/storefront/components/StorefrontView.module.css`
- Test: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`

**Interfaces:**
- `useStorefrontView` now also returns `pageStyle` (the full normalized object); `brandColor`/`chipAccentColor`/`titleTextColorValue`/`typographyToneValue` keep their existing names but are now sourced from `pageStyle` instead of the legacy theme tables. `designDirection` is dropped from the return value (its only consumers — the `theme-*` className and `data-design-direction` attribute — are removed in this task).
- New CSS custom properties set on `StorefrontView`'s root: `--page-bg`, `--page-search-min-height`, `--page-search-font-size`, `--page-search-border-width`, `--page-search-border-color`, `--page-search-focus-border-color`, `--page-chip-bg`, `--page-chip-text`, `--page-chip-border`, `--page-chip-active-bg`, `--page-chip-active-text`. They're set *before* `...buildStorefrontRegionStyleVars(regionStyles)` in the style object, so a per-category card-AI region style (an unrelated, pre-existing seam) still wins if one happens to target the same visual slot — page-wide pageStyle is the default, not an override.
- The root `<div>` gets `data-testid="storefront-page"` (a stable test hook, replacing the removed `data-design-direction` attribute).
- `brandColor` drops its old `config?.navConfig?.brandColor ||` fallback and now comes from `pageStyle.palette.accentHex` alone. `navConfig.brandColor` was previously set as a side effect of the *card-level* AI heuristic (`storefrontAiService.js`'s `compileLegacyPatchFromDesignPlan` writes `navConfig.brandColor: accentColor`) — exactly the same page/card conflation bug Task 10 fixed for the header, just on a different field. After this task `navConfig.brandColor` is still computed and persisted by the card-AI seam — retiring that write is a change to the card-AI seam itself (`storefrontAiService.js`), which is out of scope for this PRD (PRD line: "Page AI design behavior should remain distinct from category-level card aiDesign"). It simply has no remaining page-rendering consumer after this task.

Because both the builder preview panel and the public page render through this same `StorefrontView` component, this task is what makes preview/public parity automatic — there's no separate public-rendering code path to keep in sync.

- [ ] **Step 1: Write the failing test**

In `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`, remove the now-unused import:

```diff
-import { TITLE_TEXT_COLOR_VALUES, TYPOGRAPHY_TONE_VALUES } from '../model/storefrontBuilderModel';
```

Update the test `'renders an image-left card template with muted price color and bold typography'` (around line 631): replace the legacy `designDirection`/`theme` fields in the mocked `pageConfig` with an explicit `pageStyle`, and replace the `[data-design-direction]` selector with the new `data-testid`:

```js
  it('renders an image-left card template with muted price color and a custom header style', async () => {
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: {
        schemaVersion: 1,
        pageStyle: {
          schemaVersion: 1,
          palette: { backgroundHex: '#eef3fb', surfaceHex: '#ffffff', accentHex: '#2563eb', textHex: '#111827' },
          header: { titleColorHex: '#0f172a', letterSpacing: '-0.01em', fontWeight: 750 },
          search: { sizeToken: 'md', borderStrengthToken: 'normal', borderColorHex: '#bcd2ef', focusBorderColorHex: '#2563eb' },
          categoryChips: {
            backgroundHex: '#ffffff',
            textHex: '#1d4ed8',
            borderColorHex: '#bcd2ef',
            activeBackgroundHex: '#2563eb',
            activeTextHex: '#ffffff',
          },
        },
        nav: { title: 'NH Demo Storefront', subtitle: 'Seasonal products', logoUrl: '' },
        searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
        categoryChips: { enabled: true, sticky: true },
      },
      navConfig: { title: 'NH Demo Storefront', subtitle: 'Seasonal products', brandColor: '#2563eb', searchPlaceholder: 'Search products', logoUrl: '' },
      categoryConfigs: [
        {
          officeCode: 'OFF-1',
          productCategoryName: 'Fertilizer Upload',
          sortOrder: 0,
          categoryConfig: {
            schemaVersion: 2,
            displayName: 'Fertilizer Upload',
            sourceCategoryName: 'Fertilizer Upload',
            selectedMediumCategories: ['Premium'],
            representativeMediumCategory: 'Premium',
            layoutStyle: { variant: 'image-left' },
            cardDesign: {
              visibleFields: ['product_name', 'tax_price'],
              style: { layout: 'grid', accentColor: '#2563eb', fontSize: 'medium', cardsPerRow: 2, priceTextColor: 'muted' },
            },
          },
          updatedAt: '2026-06-18T00:00:00Z',
        },
      ],
      hiddenProducts: [],
      updatedAt: '2026-06-18T00:00:00Z',
    });
    fetchAllOfficeProductRows.mockResolvedValue([
      { product_category_name: 'Fertilizer Upload', product_name: 'Alpha', img_url: 'https://example.com/a.png', medium_category: 'Premium', tax_price: 1000 },
    ]);

    const { container } = render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(await screen.findByText('Alpha')).toBeInTheDocument();

    const sectionEl = container.querySelector('section[id]');
    expect(sectionEl.dataset.cardTemplate).toBe('image-left');
    expect(sectionEl.style.getPropertyValue('--price-text-color')).toBe(CARD_STYLE_PRICE_TEXT_COLOR_VALUES.muted);

    const cardEl = screen.getByRole('article');
    expect(cardEl.className).toMatch(/cardImageLeft/);

    const pageEl = screen.getByTestId('storefront-page');
    expect(pageEl.style.getPropertyValue('--title-text-color')).toBe('#0f172a');
    expect(pageEl.style.getPropertyValue('--typography-heading-weight')).toBe('750');
    expect(pageEl.style.getPropertyValue('--page-chip-active-bg')).toBe('#2563eb');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`
Expected: FAIL — `screen.getByTestId('storefront-page')` throws (no such test id yet), and the rendered `--title-text-color` is still `'#173223'` (the legacy resolution path ignores `pageConfig.pageStyle`).

- [ ] **Step 3: Write the implementation**

In `react-app/src/features/storefront/hooks/useStorefrontView.js`, change the import line:

```diff
-import { normalizePageConfig, STOREFRONT_DESIGN_ACCENT_COLORS, TYPOGRAPHY_TONE_VALUES, resolveTitleTextColor } from '../model/storefrontBuilderModel';
+import { normalizePageConfig } from '../model/storefrontBuilderModel';
```

Replace the theme-derivation block:

```diff
-  const designDirection = resolvedPageConfig.designDirection;
-  const brandColor = config?.navConfig?.brandColor || resolvedPageConfig.theme.brandColor || '#1d4a2e';
-  const chipAccentColor = STOREFRONT_DESIGN_ACCENT_COLORS[designDirection] || brandColor;
-  const titleTextColorValue = resolveTitleTextColor(resolvedPageConfig.theme.titleTextColor, brandColor);
-  const typographyToneValue = TYPOGRAPHY_TONE_VALUES[resolvedPageConfig.theme.typographyTone] || TYPOGRAPHY_TONE_VALUES.standard;
+  const pageStyle = resolvedPageConfig.pageStyle;
+  const brandColor = pageStyle.palette.accentHex;
+  const chipAccentColor = pageStyle.palette.accentHex;
+  const titleTextColorValue = pageStyle.header.titleColorHex;
+  const typographyToneValue = {
+    headingWeight: pageStyle.header.fontWeight,
+    bodyWeight: Math.max(pageStyle.header.fontWeight - 200, 400),
+    letterSpacing: pageStyle.header.letterSpacing,
+  };
```

In the returned object, drop `designDirection,` and add `pageStyle,` (place it next to `brandColor,`):

```diff
-    designDirection,
     brandColor,
+    pageStyle,
     chipAccentColor,
```

In `react-app/src/features/storefront/components/StorefrontView.jsx`, add the import:

```js
import { PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES, PAGE_STYLE_SEARCH_SIZE_VALUES } from '../model/pageStyleModel';
```

Replace the root element:

```diff
   return (
     <div
-      className={`${styles.page} ${styles[`theme-${view.designDirection}`] || ''}`}
-      data-design-direction={view.designDirection}
+      className={styles.page}
+      data-testid="storefront-page"
       style={{
         '--brand-color': view.brandColor,
         '--chip-accent': view.chipAccentColor,
         '--title-text-color': view.titleTextColorValue,
         '--typography-heading-weight': view.typographyToneValue.headingWeight,
         '--typography-body-weight': view.typographyToneValue.bodyWeight,
         '--typography-letter-spacing': view.typographyToneValue.letterSpacing,
+        '--page-bg': view.pageStyle.palette.backgroundHex,
+        '--page-search-min-height': PAGE_STYLE_SEARCH_SIZE_VALUES[view.pageStyle.search.sizeToken].minHeight,
+        '--page-search-font-size': PAGE_STYLE_SEARCH_SIZE_VALUES[view.pageStyle.search.sizeToken].fontSize,
+        '--page-search-border-width': PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES[view.pageStyle.search.borderStrengthToken],
+        '--page-search-border-color': view.pageStyle.search.borderColorHex,
+        '--page-search-focus-border-color': view.pageStyle.search.focusBorderColorHex,
+        '--page-chip-bg': view.pageStyle.categoryChips.backgroundHex,
+        '--page-chip-text': view.pageStyle.categoryChips.textHex,
+        '--page-chip-border': view.pageStyle.categoryChips.borderColorHex,
+        '--page-chip-active-bg': view.pageStyle.categoryChips.activeBackgroundHex,
+        '--page-chip-active-text': view.pageStyle.categoryChips.activeTextHex,
         ...buildStorefrontRegionStyleVars(regionStyles),
       }}
     >
```

In `react-app/src/features/storefront/components/StorefrontView.module.css`:

Delete the now-dead theme classes entirely:

```diff
-.theme-friendly {
-  background: var(--page-bg, #f0f5f0);
-}
-
-.theme-warm {
-  background: var(--page-bg, #fbf1e6);
-}
-
-.theme-green {
-  background: var(--page-bg, #eef5ea);
-}
-
-.theme-trust {
-  background: var(--page-bg, #eef3fb);
-}
-
-.theme-white {
-  background: var(--page-bg, #ffffff);
-}
-
```

Update `.searchBox` (split the border shorthand so width/color can fall back independently):

```diff
 .searchBox {
   display: flex;
   align-items: center;
   gap: 10px;
-  min-height: var(--search-min-height, 40px);
+  min-height: var(--search-min-height, var(--page-search-min-height, 40px));
   padding: 7px 12px;
-  border: 1px solid var(--search-border-color, rgba(29, 74, 46, 0.18));
+  border-width: var(--page-search-border-width, 1px);
+  border-style: solid;
+  border-color: var(--search-border-color, var(--page-search-border-color, rgba(29, 74, 46, 0.18)));
   border-radius: var(--search-radius, var(--corp-radius));
   background: #ffffff;
```

Update `.searchBox:focus-within` and `.searchInput`:

```diff
 .searchBox:focus-within {
-  border-color: var(--search-accent, var(--brand-color, var(--corp-primary)));
+  border-color: var(--search-accent, var(--page-search-focus-border-color, var(--brand-color, var(--corp-primary))));
   box-shadow: var(--corp-focus-ring);
 }
```

```diff
 .searchInput {
   flex: 1;
   min-width: 0;
   width: 100%;
   border: 0;
   outline: none;
   background: transparent;
   color: var(--search-accent, #173223);
-  font-size: var(--search-font-size, 0.94rem);
+  font-size: var(--search-font-size, var(--page-search-font-size, 0.94rem));
 }
```

Update `.categoryChip` and `.categoryChipActive`:

```diff
 .categoryChip {
   position: relative;
   flex: 0 0 auto;
   min-height: var(--category-chip-height, 32px);
   padding: 0 14px;
-  border: 1px solid rgba(29, 74, 46, 0.16);
+  border-width: 1px;
+  border-style: solid;
+  border-color: var(--page-chip-border, rgba(29, 74, 46, 0.16));
   border-radius: var(--category-chip-radius, 999px);
-  background: #ffffff;
-  color: #5f6d5b;
+  background: var(--page-chip-bg, #ffffff);
+  color: var(--page-chip-text, #5f6d5b);
   font-size: var(--category-chip-font-size, 0.8rem);
   font-weight: 600;
```

```diff
 .categoryChipActive {
-  color: #173223;
+  background: var(--page-chip-active-bg, transparent);
+  color: var(--page-chip-active-text, #173223);
   font-weight: 700;
 }
```

Update the three variant-specific active selectors to source their color from the new page vars first:

```diff
 .categoryWrapSoft .categoryChipActive {
-  background: color-mix(in srgb, var(--category-chip-accent, var(--chip-accent, var(--corp-primary))) 14%, #ffffff);
-  border-color: color-mix(in srgb, var(--category-chip-accent, var(--chip-accent, var(--corp-primary))) 40%, #dfe9dc);
-  box-shadow: 0 4px 12px color-mix(in srgb, var(--category-chip-accent, var(--chip-accent, var(--corp-primary))) 22%, transparent);
+  background: color-mix(in srgb, var(--category-chip-accent, var(--page-chip-active-bg, var(--chip-accent, var(--corp-primary)))) 14%, #ffffff);
+  border-color: color-mix(in srgb, var(--category-chip-accent, var(--page-chip-active-bg, var(--chip-accent, var(--corp-primary)))) 40%, #dfe9dc);
+  box-shadow: 0 4px 12px color-mix(in srgb, var(--category-chip-accent, var(--page-chip-active-bg, var(--chip-accent, var(--corp-primary)))) 22%, transparent);
 }
```

```diff
 .categoryWrapOutline .categoryChipActive {
-  border-color: var(--category-chip-accent, var(--chip-accent, var(--corp-primary)));
-  box-shadow: 0 0 0 1px color-mix(in srgb, var(--category-chip-accent, var(--chip-accent, var(--corp-primary))) 24%, transparent);
+  border-color: var(--category-chip-accent, var(--page-chip-active-bg, var(--chip-accent, var(--corp-primary))));
+  box-shadow: 0 0 0 1px color-mix(in srgb, var(--category-chip-accent, var(--page-chip-active-bg, var(--chip-accent, var(--corp-primary)))) 24%, transparent);
 }
```

```diff
 .categoryWrapFilled .categoryChipActive {
-  background: var(--category-chip-accent, var(--chip-accent, var(--corp-primary)));
-  color: #ffffff;
-  box-shadow: 0 10px 20px color-mix(in srgb, var(--category-chip-accent, var(--chip-accent, var(--corp-primary))) 30%, transparent);
+  background: var(--category-chip-accent, var(--page-chip-active-bg, var(--chip-accent, var(--corp-primary))));
+  color: var(--page-chip-active-text, #ffffff);
+  box-shadow: 0 10px 20px color-mix(in srgb, var(--category-chip-accent, var(--page-chip-active-bg, var(--chip-accent, var(--corp-primary)))) 30%, transparent);
 }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/PublicStorefrontPage.test.jsx src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS — both files green (the builder page test still renders `StorefrontView` for its preview panel, so it exercises the same code path).

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/hooks/useStorefrontView.js react-app/src/features/storefront/components/StorefrontView.jsx react-app/src/features/storefront/components/StorefrontView.module.css react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
git commit -m "feat: render pageStyle directly in StorefrontView, drop legacy theme-direction class"
```

---

### Task 12: Rebuild the page-design UI — one main prompt + three override fields

**Files:**
- Create: `react-app/src/features/storefront/components/page-design/PageStyleMainPromptField.jsx`
- Create: `react-app/src/features/storefront/components/page-design/PageStyleOverrideFields.jsx`
- Modify: `react-app/src/features/storefront/components/PageDesignEditor.jsx` (rewrite)
- Modify: `react-app/src/features/storefront/components/PageDesignEditor.module.css`
- Modify: `react-app/src/features/storefront/components/ProductCategoryStep.jsx`
- Test: `react-app/src/features/storefront/__tests__/PageDesignEditor.test.jsx` (new)

**Interfaces:**
- `PageDesignEditor` now takes `{ pageAiDesign, onChangeMainPrompt, onChangeHeaderOverridePrompt, onChangeCategoryChipsOverridePrompt, onChangeSearchOverridePrompt, onApply, isApplying, errorMessage, representativeCategoryLabel }` — replacing the old `{ designDirection, onSelectDesignDirection, representativeCategoryLabel }`. `pageAiDesign` is the shape from Task 3.
- Reuses the existing shared `StorefrontBuilderPage.module.css` input/button classes (the same ones `AiStudioStep.jsx` already uses) instead of inventing new CSS — keeps this file small per the "split files so none get too long" requirement.
- `data-testid="apply-page-ai-design"` on the apply button and `data-testid="page-design-editor"` on the root (unchanged from before) are the stable hooks Task 13's end-to-end test uses.

- [ ] **Step 1: Write the failing test**

Create `react-app/src/features/storefront/__tests__/PageDesignEditor.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_PAGE_AI_DESIGN } from '../model/pageAiDesignModel';
import PageDesignEditor from '../components/PageDesignEditor';

describe('PageDesignEditor', () => {
  it('renders the main prompt and three override fields, and calls onApply', async () => {
    const onChangeMainPrompt = vi.fn();
    const onApply = vi.fn();
    const user = userEvent.setup();

    render(
      <PageDesignEditor
        pageAiDesign={DEFAULT_PAGE_AI_DESIGN}
        onChangeMainPrompt={onChangeMainPrompt}
        onChangeHeaderOverridePrompt={vi.fn()}
        onChangeCategoryChipsOverridePrompt={vi.fn()}
        onChangeSearchOverridePrompt={vi.fn()}
        onApply={onApply}
        isApplying={false}
        errorMessage=""
        representativeCategoryLabel="Fertilizer Upload"
      />,
    );

    expect(screen.getByLabelText('전체 페이지 분위기')).toBeInTheDocument();
    expect(screen.getByLabelText('헤더 제목 스타일 (선택)')).toBeInTheDocument();
    expect(screen.getByLabelText('카테고리 칩 스타일 (선택)')).toBeInTheDocument();
    expect(screen.getByLabelText('검색창 스타일 (선택)')).toBeInTheDocument();

    await user.type(screen.getByLabelText('전체 페이지 분위기'), 'b');
    expect(onChangeMainPrompt).toHaveBeenCalledWith('b');

    await user.click(screen.getByTestId('apply-page-ai-design'));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('disables the apply button while applying and shows the error message', () => {
    render(
      <PageDesignEditor
        pageAiDesign={DEFAULT_PAGE_AI_DESIGN}
        onChangeMainPrompt={vi.fn()}
        onChangeHeaderOverridePrompt={vi.fn()}
        onChangeCategoryChipsOverridePrompt={vi.fn()}
        onChangeSearchOverridePrompt={vi.fn()}
        onApply={vi.fn()}
        isApplying
        errorMessage="페이지 스타일을 적용하지 못했습니다."
        representativeCategoryLabel=""
      />,
    );

    expect(screen.getByTestId('apply-page-ai-design')).toBeDisabled();
    expect(screen.getByText('페이지 스타일을 적용하지 못했습니다.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/PageDesignEditor.test.jsx`
Expected: FAIL — `screen.getByLabelText('전체 페이지 분위기')` not found (current `PageDesignEditor` only renders the direction button grid).

- [ ] **Step 3: Write the implementation**

Create `react-app/src/features/storefront/components/page-design/PageStyleMainPromptField.jsx`:

```jsx
import styles from '../../pages/StorefrontBuilderPage.module.css';

export default function PageStyleMainPromptField({ value, onChange }) {
  return (
    <label className={styles.inputLabel}>
      <span>전체 페이지 분위기</span>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="예시: 신뢰감 있는 차가운 블루 톤으로, 깔끔하고 정돈된 느낌으로 해줘."
      />
    </label>
  );
}
```

Create `react-app/src/features/storefront/components/page-design/PageStyleOverrideFields.jsx`:

```jsx
import styles from '../../pages/StorefrontBuilderPage.module.css';

export default function PageStyleOverrideFields({
  headerOverridePrompt,
  categoryChipsOverridePrompt,
  searchOverridePrompt,
  onChangeHeaderOverridePrompt,
  onChangeCategoryChipsOverridePrompt,
  onChangeSearchOverridePrompt,
}) {
  return (
    <div className={styles.sectionStack}>
      <label className={styles.inputLabel}>
        <span>헤더 제목 스타일 (선택)</span>
        <textarea
          className={styles.textarea}
          value={headerOverridePrompt}
          onChange={(event) => onChangeHeaderOverridePrompt(event.target.value)}
          placeholder="예시: 제목을 더 진하고 굵게 보여줘."
        />
      </label>
      <label className={styles.inputLabel}>
        <span>카테고리 칩 스타일 (선택)</span>
        <textarea
          className={styles.textarea}
          value={categoryChipsOverridePrompt}
          onChange={(event) => onChangeCategoryChipsOverridePrompt(event.target.value)}
          placeholder="예시: 선택된 칩은 꽉 채운 느낌으로 보여줘."
        />
      </label>
      <label className={styles.inputLabel}>
        <span>검색창 스타일 (선택)</span>
        <textarea
          className={styles.textarea}
          value={searchOverridePrompt}
          onChange={(event) => onChangeSearchOverridePrompt(event.target.value)}
          placeholder="예시: 검색창을 조금 더 크게, 테두리는 진하게 해줘."
        />
      </label>
    </div>
  );
}
```

Rewrite `react-app/src/features/storefront/components/PageDesignEditor.jsx`:

```jsx
import panelStyles from '../../office-product-editor/components/shared/panel.module.css';
import builderStyles from '../pages/StorefrontBuilderPage.module.css';
import PageStyleMainPromptField from './page-design/PageStyleMainPromptField';
import PageStyleOverrideFields from './page-design/PageStyleOverrideFields';
import styles from './PageDesignEditor.module.css';

export default function PageDesignEditor({
  pageAiDesign,
  onChangeMainPrompt,
  onChangeHeaderOverridePrompt,
  onChangeCategoryChipsOverridePrompt,
  onChangeSearchOverridePrompt,
  onApply,
  isApplying,
  errorMessage,
  representativeCategoryLabel,
}) {
  return (
    <div className={styles.editor} data-testid="page-design-editor">
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>페이지 디자인 설정</p>
            <h3 className={styles.title}>AI로 페이지 분위기 만들기</h3>
          </div>
          <p className={styles.helper}>
            한 문장으로 전체 분위기를 설명하고, 필요하면 영역별로 세부 스타일을 추가로 요청할 수 있습니다.
          </p>
          {representativeCategoryLabel ? (
            <p className={styles.selectionNote}>
              현재 기준 카테고리: <strong>{representativeCategoryLabel}</strong>
            </p>
          ) : null}
        </div>

        <PageStyleMainPromptField value={pageAiDesign.mainPrompt} onChange={onChangeMainPrompt} />

        <PageStyleOverrideFields
          headerOverridePrompt={pageAiDesign.headerOverridePrompt}
          categoryChipsOverridePrompt={pageAiDesign.categoryChipsOverridePrompt}
          searchOverridePrompt={pageAiDesign.searchOverridePrompt}
          onChangeHeaderOverridePrompt={onChangeHeaderOverridePrompt}
          onChangeCategoryChipsOverridePrompt={onChangeCategoryChipsOverridePrompt}
          onChangeSearchOverridePrompt={onChangeSearchOverridePrompt}
        />

        <div className={builderStyles.actions}>
          <button
            type="button"
            className={builderStyles.primaryButton}
            data-testid="apply-page-ai-design"
            onClick={onApply}
            disabled={isApplying}
          >
            {isApplying ? '적용 중...' : '페이지 스타일 적용'}
          </button>
        </div>

        {errorMessage ? <div className={panelStyles.errorBox}>{errorMessage}</div> : null}
      </section>
    </div>
  );
}
```

In `react-app/src/features/storefront/components/PageDesignEditor.module.css`, delete the now-unused direction-grid rules (everything from `.directionGrid` to the end of the file) — keep `.editor`, `.section`, `.sectionHeader`, `.eyebrow`, `.title`, `.helper`, `.selectionNote` as-is.

In `react-app/src/features/storefront/components/ProductCategoryStep.jsx`, update the `<PageDesignEditor>` usage:

```diff
-          <PageDesignEditor
-            designDirection={builder.designDirection}
-            onSelectDesignDirection={builder.setDesignDirection}
-            representativeCategoryLabel={builder.selectedProductCategoryName}
-          />
+          <PageDesignEditor
+            pageAiDesign={builder.pageAiDesign}
+            onChangeMainPrompt={builder.setPageMainPrompt}
+            onChangeHeaderOverridePrompt={builder.setPageHeaderOverridePrompt}
+            onChangeCategoryChipsOverridePrompt={builder.setPageCategoryChipsOverridePrompt}
+            onChangeSearchOverridePrompt={builder.setPageSearchOverridePrompt}
+            onApply={builder.applyPageAiDesign}
+            isApplying={builder.isApplyingPageAiDesign}
+            errorMessage={builder.pageAiErrorMessage}
+            representativeCategoryLabel={builder.selectedProductCategoryName}
+          />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/PageDesignEditor.test.jsx src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS — both files green (the `'toggle-page-design-settings'` assertion in `StorefrontBuilderPage.test.jsx` only checks that `page-design-editor` renders, which still holds).

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/components/page-design react-app/src/features/storefront/components/PageDesignEditor.jsx react-app/src/features/storefront/components/PageDesignEditor.module.css react-app/src/features/storefront/components/ProductCategoryStep.jsx react-app/src/features/storefront/__tests__/PageDesignEditor.test.jsx
git commit -m "feat: rebuild page design UI as one main prompt plus three focused overrides"
```

---

### Task 13: End-to-end builder flow + preview/public parity

**Files:**
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx` (extend)
- Test: `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx` (extend)

No source changes — this task only adds coverage for the seams Tasks 1-12 already built, exercised end-to-end through the real (unmocked) `pageStyleAiInterpreter`/`pageStyleCompiler` (no `VITE_OPENAI_API_KEY` is set in the test environment, so the heuristic fallback runs deterministically — the same pattern the existing suite already relies on for card AI). This directly covers the PRD Testing Decisions: "applying a page AI prompt," "previewing the compiled page style immediately," "keeping the last valid preview on AI failure," "surfacing an error," "saving compiled pageStyle only," and "parity between preview and public render outcomes."

- [ ] **Step 1: Write the failing tests**

Add to `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`:

```js
  it('applies a page-level AI prompt, previews immediately, and saves only the compiled pageStyle (discarding the prompt session)', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('toggle-page-design-settings'));

    const previewPageEl = screen.getByTestId('storefront-page');

    await user.type(screen.getByLabelText('전체 페이지 분위기'), 'cool trustworthy blue');
    await user.click(screen.getByTestId('apply-page-ai-design'));

    await waitFor(() => {
      expect(previewPageEl.style.getPropertyValue('--brand-color')).toBe('#2563eb');
    });

    await user.click(screen.getByTestId('select-product-category-Fertilizer Upload'));
    await user.click(screen.getByTestId('builder-go-next'));
    await user.click(screen.getByTestId('save-storefront-draft'));

    await waitFor(() => expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1));

    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(savedPayload.pageConfig.pageStyle.palette.accentHex).toBe('#2563eb');
    expect(savedPayload.pageConfig.pageAiDesign).toBeUndefined();
    expect(JSON.stringify(savedPayload)).not.toContain('cool trustworthy blue');
  }, 10000);

  it('keeps the last valid pageStyle and shows an error when no main prompt has been entered', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(await screen.findByTestId('start-storefront-builder'));
    await user.click(screen.getByTestId('toggle-page-design-settings'));

    const previewPageEl = screen.getByTestId('storefront-page');
    const brandColorBeforeApply = previewPageEl.style.getPropertyValue('--brand-color');

    await user.click(screen.getByTestId('apply-page-ai-design'));

    expect(await screen.findByText('페이지 분위기를 먼저 입력해 주세요.')).toBeInTheDocument();
    expect(previewPageEl.style.getPropertyValue('--brand-color')).toBe(brandColorBeforeApply);
  });
```

Add to `react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx` (a new top-level `it`, reusing the existing fixture-building patterns already in this file):

```js
  it('renders the same pageStyle-derived CSS variables on the public page as the builder preview does for an identical saved config', async () => {
    const savedConfig = {
      officeCode: 'OFF-1',
      pageConfig: {
        schemaVersion: 1,
        pageStyle: {
          schemaVersion: 1,
          palette: { backgroundHex: '#fdf2e9', surfaceHex: '#ffffff', accentHex: '#ea580c', textHex: '#1f2937' },
          header: { titleColorHex: '#1f2937', letterSpacing: 'normal', fontWeight: 800 },
          search: { sizeToken: 'lg', borderStrengthToken: 'strong', borderColorHex: '#f3c9a4', focusBorderColorHex: '#ea580c' },
          categoryChips: {
            backgroundHex: '#fde8d4',
            textHex: '#1f2937',
            borderColorHex: '#f3c9a4',
            activeBackgroundHex: '#ea580c',
            activeTextHex: '#ffffff',
          },
        },
        nav: { title: 'Warm Demo Storefront', subtitle: '', logoUrl: '' },
        searchSection: { enabled: true, placeholder: 'Search products', variant: 'pill' },
        categoryChips: { enabled: true, sticky: true },
      },
      navConfig: { title: 'Warm Demo Storefront', subtitle: '', brandColor: '#ea580c', searchPlaceholder: 'Search products', logoUrl: '' },
      categoryConfigs: [],
      hiddenProducts: [],
      updatedAt: '2026-06-21T00:00:00Z',
    };

    fetchStorefrontConfig.mockResolvedValue(savedConfig);
    fetchAllOfficeProductRows.mockResolvedValue([{ product_name: 'Alpha', product_category_name: 'Fertilizer Upload' }]);

    render(<PublicStorefrontPage officeCode="OFF-1" />);

    const pageEl = await screen.findByTestId('storefront-page');

    expect(pageEl.style.getPropertyValue('--brand-color')).toBe('#ea580c');
    expect(pageEl.style.getPropertyValue('--page-bg')).toBe('#fdf2e9');
    expect(pageEl.style.getPropertyValue('--page-search-border-width')).toBe('2.5px');
    expect(pageEl.style.getPropertyValue('--page-chip-active-bg')).toBe('#ea580c');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`
Expected: the two new `StorefrontBuilderPage.test.jsx` tests fail before Tasks 9-12 land (no `apply-page-ai-design`/`storefront-page` test ids, no `usePageAiDesign`); by the time this task is actually executed (after Task 12), they should already pass, so this step confirms there's no missing wiring rather than driving new implementation.

- [ ] **Step 3: (No implementation step — verifies prior tasks)**

If any assertion fails here, it indicates a gap in Tasks 9-12 (most likely a prop name mismatch between `useStorefrontBuilder`'s return shape and `PageDesignEditor`'s props, or a CSS var name typo). Fix at the source identified by the failing assertion, not by changing the test.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx src/features/storefront/__tests__/PublicStorefrontPage.test.jsx`
Expected: PASS — all tests in both files green.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx react-app/src/features/storefront/__tests__/PublicStorefrontPage.test.jsx
git commit -m "test: cover end-to-end page AI apply/preview/save and builder/public render parity"
```

---

### Task 14: Delete the superseded legacy fields and the card-AI scope leak

**Files:**
- Modify: `react-app/src/features/storefront/model/storefrontBuilderModel.js`
- Modify: `react-app/src/features/storefront/model/storefrontAiDesignModel.js`
- Modify: `react-app/src/features/storefront/services/storefrontAiService.js`
- Test: `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js`
- Test: `react-app/src/features/storefront/__tests__/storefrontConfigService.test.js`
- Test: `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
- Test: `react-app/src/features/storefront/__tests__/storefrontAiService.test.js`

**What's deleted and why:**
- `pageConfig.designDirection`, `theme.backgroundTone`, `theme.titleTextColor`, `theme.typographyTone`, and their constants (`STOREFRONT_DESIGN_DIRECTIONS`, `STOREFRONT_BACKGROUND_TONES`, `STOREFRONT_DESIGN_ACCENT_COLORS`, `TITLE_TEXT_COLOR_OPTIONS`/`VALUES`, `resolveTitleTextColor`, `TYPOGRAPHY_TONE_OPTIONS`/`VALUES`) from `storefrontBuilderModel.js` — fully superseded by `pageConfig.pageStyle` since Task 11, and nothing reads or writes them after Task 10/11. `theme.brandColor` is **kept** — it's still the persisted round-trip field for `navConfig.brandColor` (`storefrontConfigService.js`'s `normalizeConfig`/`buildPageConfigPayload`), an unrelated concern this PRD doesn't touch.
- `stylePlan.titleTextColor`/`typographyTone` from the **card-level** AI schema (`storefrontAiDesignModel.js`, `storefrontAiService.js`) — this was the actual scope leak described in Task 10's context: page header styling fields living inside the per-category card design plan. Now that page styling has its own seam (Tasks 7-9), these fields have zero consumers (Task 10 already stopped `useStorefrontBuilder` from reading them) and are deleted from the schema, the heuristic detectors, the OpenAI request body, and the legacy-patch compiler. `pageConfig.theme.brandColor`'s migration table in `pageStyleMigration.js` (Task 4) already has its own independent copy of every value these deletions touch, so legacy-row migration is unaffected.
- `STOREFRONT_DESIGN_DIRECTIONS`' one remaining real use — validating the card design brief's `tone` value — is replaced with the equivalent, already-imported `STOREFRONT_AI_PLAN_TONE_OPTIONS` (same 5 ids, no labels/descriptions needed for validation).

- [ ] **Step 1: Update the model files**

In `react-app/src/features/storefront/model/storefrontBuilderModel.js`:

```diff
-export const DEFAULT_NAV_CONFIG = {
-  title: '',
-  subtitle: '',
-  brandColor: DEFAULT_CARD_STYLE.accentColor,
-  searchPlaceholder: '상품 검색',
-  logoUrl: '',
-  searchVariant: 'pill',
-  categoryChipVariant: 'soft',
-};
-
-export const STOREFRONT_DESIGN_DIRECTIONS = [
-  { id: 'friendly', label: '친근함', description: '처음 방문한 고객도 편하게 둘러볼 수 있는 깔끔한 분위기.' },
-  { id: 'warm', label: '따뜻함', description: '이야기가 느껴지는 부드럽고 정감 있는 분위기.' },
-  { id: 'green', label: '그린', description: '농산물·비료 등 상품 중심의 자연스러운 분위기.' },
-  { id: 'trust', label: '신뢰', description: '관공서 페이지에 어울리는 정돈되고 신뢰감 있는 분위기.' },
-  { id: 'white', label: '화이트', description: '강조 색 없이 깔끔한 기본 화이트 테마.' },
-];
-
-export const STOREFRONT_BACKGROUND_TONES = {
-  friendly: 'mint',
-  warm: 'apricot',
-  green: 'forest',
-  trust: 'sky',
-  white: 'paper',
-};
-
-export const STOREFRONT_DESIGN_ACCENT_COLORS = {
-  friendly: '#2f9e6e',
-  warm: '#ea580c',
-  green: '#1d4a2e',
-  trust: '#2563eb',
-  white: '#52525b',
-};
-
-export const TITLE_TEXT_COLOR_OPTIONS = ['default', 'ink', 'charcoal', 'brand'];
-
-export const TITLE_TEXT_COLOR_VALUES = {
-  default: '#173223',
-  ink: '#0f172a',
-  charcoal: '#27272a',
-};
-
-export function resolveTitleTextColor(titleTextColor, brandColor) {
-  if (titleTextColor === 'brand') {
-    return brandColor || TITLE_TEXT_COLOR_VALUES.default;
-  }
-
-  return TITLE_TEXT_COLOR_VALUES[titleTextColor] || TITLE_TEXT_COLOR_VALUES.default;
-}
-
-export const TYPOGRAPHY_TONE_OPTIONS = ['standard', 'clean', 'soft', 'bold', 'official'];
-
-export const TYPOGRAPHY_TONE_VALUES = {
-  standard: { headingWeight: 800, bodyWeight: 600, letterSpacing: 'normal' },
-  clean: { headingWeight: 700, bodyWeight: 500, letterSpacing: '0.01em' },
-  soft: { headingWeight: 600, bodyWeight: 500, letterSpacing: 'normal' },
-  bold: { headingWeight: 800, bodyWeight: 700, letterSpacing: '-0.01em' },
-  official: { headingWeight: 700, bodyWeight: 600, letterSpacing: '0.02em' },
-};
+export const DEFAULT_NAV_CONFIG = {
+  title: '',
+  subtitle: '',
+  brandColor: DEFAULT_CARD_STYLE.accentColor,
+  searchPlaceholder: '상품 검색',
+  logoUrl: '',
+  searchVariant: 'pill',
+  categoryChipVariant: 'soft',
+};
```

```diff
 export const DEFAULT_PAGE_CONFIG = {
   schemaVersion: 1,
-  designDirection: 'friendly',
   pageStyle: DEFAULT_PAGE_STYLE,
   theme: {
     brandColor: DEFAULT_CARD_STYLE.accentColor,
-    backgroundTone: STOREFRONT_BACKGROUND_TONES.friendly,
-    titleTextColor: 'default',
-    typographyTone: 'standard',
   },
   nav: {
     title: '',
     subtitle: '',
     logoUrl: '',
   },
   // ...searchSection / categoryChips / mobileUiTree unchanged
};
```

```diff
-function normalizeDesignDirection(designDirection) {
-  const candidate = toTrimmedString(designDirection);
-
-  return STOREFRONT_DESIGN_DIRECTIONS.some((option) => option.id === candidate)
-    ? candidate
-    : DEFAULT_PAGE_CONFIG.designDirection;
-}
-
 function normalizeMediumCategory(value) {
```

In `normalizePageConfig`, drop `designDirection` and shrink `theme`:

```diff
 export function normalizePageConfig(pageConfig) {
   const source = pageConfig ?? {};
-  const designDirection = normalizeDesignDirection(source.designDirection);
   const sourceTheme = source.theme ?? {};
   const sourceNav = source.nav ?? {};
   const sourceSearchSection = source.searchSection ?? {};
   const sourceCategoryChips = source.categoryChips ?? {};
   const isSearchEnabled = sourceSearchSection.enabled ?? true;
   const areCategoryChipsEnabled = sourceCategoryChips.enabled ?? true;

   return {
     schemaVersion: Number.isFinite(source.schemaVersion) ? source.schemaVersion : DEFAULT_PAGE_CONFIG.schemaVersion,
-    designDirection,
     pageStyle: normalizePageStyle(source.pageStyle),
     theme: {
       brandColor: toTrimmedString(sourceTheme.brandColor) || DEFAULT_PAGE_CONFIG.theme.brandColor,
-      backgroundTone:
-        toTrimmedString(sourceTheme.backgroundTone) || STOREFRONT_BACKGROUND_TONES[designDirection],
-      titleTextColor: TITLE_TEXT_COLOR_OPTIONS.includes(sourceTheme.titleTextColor)
-        ? sourceTheme.titleTextColor
-        : DEFAULT_PAGE_CONFIG.theme.titleTextColor,
-      typographyTone: TYPOGRAPHY_TONE_OPTIONS.includes(sourceTheme.typographyTone)
-        ? sourceTheme.typographyTone
-        : DEFAULT_PAGE_CONFIG.theme.typographyTone,
     },
     nav: {
       // ...unchanged
```

In `react-app/src/features/storefront/model/storefrontAiDesignModel.js`:

```diff
-export const STOREFRONT_AI_PLAN_TITLE_TEXT_COLOR_OPTIONS = ['default', 'ink', 'charcoal', 'brand'];
-export const STOREFRONT_AI_PLAN_TYPOGRAPHY_TONE_OPTIONS = ['standard', 'clean', 'soft', 'bold', 'official'];
 export const STOREFRONT_AI_PLAN_PRICE_TEXT_COLOR_OPTIONS = ['default', 'brand', 'muted'];
```

```diff
   stylePlan: {
-    titleTextColor: 'default',
-    typographyTone: 'standard',
     priceTextColor: 'default',
     accentColor: '',
     cardSpacing: 'relaxed',
     fieldStyles: [],
     regionStyles: [],
   },
```

```diff
     stylePlan: {
-      titleTextColor: STOREFRONT_AI_PLAN_TITLE_TEXT_COLOR_OPTIONS.includes(sourceStylePlan.titleTextColor)
-        ? sourceStylePlan.titleTextColor
-        : DEFAULT_STOREFRONT_DESIGN_PLAN.stylePlan.titleTextColor,
-      typographyTone: STOREFRONT_AI_PLAN_TYPOGRAPHY_TONE_OPTIONS.includes(sourceStylePlan.typographyTone)
-        ? sourceStylePlan.typographyTone
-        : DEFAULT_STOREFRONT_DESIGN_PLAN.stylePlan.typographyTone,
       priceTextColor: STOREFRONT_AI_PLAN_PRICE_TEXT_COLOR_OPTIONS.includes(sourceStylePlan.priceTextColor)
         ? sourceStylePlan.priceTextColor
         : DEFAULT_STOREFRONT_DESIGN_PLAN.stylePlan.priceTextColor,
```

In `react-app/src/features/storefront/services/storefrontAiService.js`:

Trim the imports:

```diff
 import {
   DEFAULT_STOREFRONT_EDIT_POLICY,
   STOREFRONT_AI_PLAN_BLOCK_TYPES,
   STOREFRONT_AI_PLAN_CARD_VARIANT_OPTIONS,
   STOREFRONT_AI_PLAN_DENSITY_OPTIONS,
   STOREFRONT_AI_PLAN_FIELD_COLOR_ROLE_OPTIONS,
   STOREFRONT_AI_PLAN_FIELD_EMPHASIS_OPTIONS,
   STOREFRONT_AI_PLAN_FIELD_FONT_SIZE_OPTIONS,
   STOREFRONT_AI_PLAN_FIELD_FONT_WEIGHT_OPTIONS,
   STOREFRONT_AI_PLAN_FORMAT_OPTIONS,
   STOREFRONT_AI_PLAN_GROUP_DISPLAY_OPTIONS,
   STOREFRONT_AI_PLAN_IMAGE_POSITION_OPTIONS,
   STOREFRONT_AI_PLAN_PRICE_PRIORITY_OPTIONS,
   STOREFRONT_AI_PLAN_PRICE_TEXT_COLOR_OPTIONS,
   STOREFRONT_AI_PLAN_REGION_PROPERTIES_BY_TARGET,
   STOREFRONT_AI_PLAN_REGION_PROPERTY_OPTIONS,
   STOREFRONT_AI_PLAN_REGION_TARGET_OPTIONS,
-  STOREFRONT_AI_PLAN_TITLE_TEXT_COLOR_OPTIONS,
   STOREFRONT_AI_PLAN_TONE_OPTIONS,
-  STOREFRONT_AI_PLAN_TYPOGRAPHY_TONE_OPTIONS,
   collectStorefrontDesignPlanFieldKeys,
   compileStorefrontRenderSpec,
   normalizeStorefrontDesignPlan,
   normalizeStorefrontEditPolicy,
 } from '../model/storefrontAiDesignModel';
 import {
   CARD_TEMPLATE_OPTIONS,
   DEFAULT_CARD_FIELDS,
   DEFAULT_NAV_CONFIG,
   STOREFRONT_DESIGN_ACCENT_COLORS,
-  STOREFRONT_DESIGN_DIRECTIONS,
   STOREFRONT_FIELD_LABELS,
   STOREFRONT_FIELD_OPTIONS,
-  TITLE_TEXT_COLOR_OPTIONS,
-  TYPOGRAPHY_TONE_OPTIONS,
   normalizeCardFields,
   normalizeNavConfig,
 } from '../model/storefrontBuilderModel';
```

Trim `DESIGN_PLAN_SCHEMA.properties.stylePlan`:

```diff
     stylePlan: {
       type: 'object',
       additionalProperties: false,
       properties: {
-        titleTextColor: { type: 'string', enum: STOREFRONT_AI_PLAN_TITLE_TEXT_COLOR_OPTIONS },
-        typographyTone: { type: 'string', enum: STOREFRONT_AI_PLAN_TYPOGRAPHY_TONE_OPTIONS },
         priceTextColor: { type: 'string', enum: STOREFRONT_AI_PLAN_PRICE_TEXT_COLOR_OPTIONS },
         accentColor: { type: 'string' },
         cardSpacing: { type: 'string', enum: ['tight', 'normal', 'relaxed'] },
         // ...fieldStyles / regionStyles unchanged
       },
       required: [
-        'titleTextColor',
-        'typographyTone',
         'priceTextColor',
         'accentColor',
         'cardSpacing',
         'fieldStyles',
         'regionStyles',
       ],
     },
```

Delete `detectTitleTextColor` and `detectTypographyTone` entirely (the two functions immediately before `detectCardTemplate`):

```diff
-function detectTitleTextColor(prompt) {
-  const text = normalizePromptText(prompt);
-
-  if (includesAny(text, ['darker', 'dark title', '진하게', '짙게'])) {
-    return 'ink';
-  }
-
-  if (includesAny(text, ['official', 'formal', '공식'])) {
-    return 'charcoal';
-  }
-
-  if (includesAny(text, ['brand color', '브랜드 색'])) {
-    return 'brand';
-  }
-
-  return 'default';
-}
-
-function detectTypographyTone(prompt) {
-  const text = normalizePromptText(prompt);
-
-  if (includesAny(text, ['bold', 'bolder', '강하게', '볼드', '진하게'])) {
-    return 'bold';
-  }
-
-  if (includesAny(text, ['official', 'formal', '공식'])) {
-    return 'official';
-  }
-
-  if (includesAny(text, ['soft', '부드럽'])) {
-    return 'soft';
-  }
-
-  if (includesAny(text, ['clean', '깔끔'])) {
-    return 'clean';
-  }
-
-  return 'standard';
-}
-
 function detectCardTemplate(prompt) {
```

In `normalizeLegacyPatch`, drop the two theme fields and swap the `designDirection` validation source:

```diff
   return {
-    designDirection: STOREFRONT_DESIGN_DIRECTIONS.some((option) => option.id === source.designDirection)
+    designDirection: STOREFRONT_AI_PLAN_TONE_OPTIONS.includes(source.designDirection)
       ? source.designDirection
       : currentDraft?.designDirection || 'friendly',
-    titleTextColor: TITLE_TEXT_COLOR_OPTIONS.includes(source.titleTextColor)
-      ? source.titleTextColor
-      : currentDraft?.titleTextColor || 'default',
-    typographyTone: TYPOGRAPHY_TONE_OPTIONS.includes(source.typographyTone)
-      ? source.typographyTone
-      : currentDraft?.typographyTone || 'standard',
     selectedMediumCategories: normalizedSelectedMediumCategories,
```

In `buildDesignPlanFromLegacyPatch`'s `stylePlan`:

```diff
       stylePlan: {
-        titleTextColor: patch.titleTextColor,
-        typographyTone: patch.typographyTone,
         priceTextColor: patch.cardStyle.priceTextColor,
         accentColor: patch.cardStyle.accentColor,
         cardSpacing: patch.cardStyle.cardSpacing,
         fieldStyles: detectFieldStyles(prompt, visibleFields),
         regionStyles: detectRegionStyles(prompt),
       },
```

In `buildAiChangeSummary`, drop the title/typography summary line:

```diff
-  if (compiledPatch.titleTextColor !== 'default' || compiledPatch.typographyTone !== 'standard') {
-    changes.push('Adjust title tone and typography.');
-  }
-
   if (compiledPatch.cardStyle.priceTextColor !== 'default' || compiledPatch.cardTemplate === 'price-focus') {
     changes.push('Increase price readability.');
   }
```

In `compileLegacyPatchFromDesignPlan`'s `compiledPatch`:

```diff
   const compiledPatch = {
     designDirection: designPlan.designBrief.tone,
-    titleTextColor: designPlan.stylePlan.titleTextColor,
-    typographyTone: designPlan.stylePlan.typographyTone,
     selectedMediumCategories,
```

In `buildHeuristicSuggestion`'s call to `normalizeLegacyPatch`:

```diff
     {
       designDirection,
-      titleTextColor: detectTitleTextColor(prompt),
-      typographyTone: detectTypographyTone(prompt),
       selectedMediumCategories,
```

In `buildOpenAiRequestBody`:

```diff
             editPolicy: normalizeStorefrontEditPolicy(editPolicy),
-            designDirectionOptions: STOREFRONT_DESIGN_DIRECTIONS.map((option) => option.id),
+            designDirectionOptions: STOREFRONT_AI_PLAN_TONE_OPTIONS,
             allowedFields: STOREFRONT_FIELD_OPTIONS,
             fieldLabels: STOREFRONT_FIELD_LABELS,
             allowedCardVariants: STOREFRONT_AI_PLAN_CARD_VARIANT_OPTIONS,
             allowedDensities: STOREFRONT_AI_PLAN_DENSITY_OPTIONS,
             allowedImagePositions: STOREFRONT_AI_PLAN_IMAGE_POSITION_OPTIONS,
             allowedPricePriorities: STOREFRONT_AI_PLAN_PRICE_PRIORITY_OPTIONS,
-            allowedTitleTextColors: STOREFRONT_AI_PLAN_TITLE_TEXT_COLOR_OPTIONS,
-            allowedTypographyTones: STOREFRONT_AI_PLAN_TYPOGRAPHY_TONE_OPTIONS,
             allowedPriceTextColors: STOREFRONT_AI_PLAN_PRICE_TEXT_COLOR_OPTIONS,
```

- [ ] **Step 2: Update the tests to match**

In `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js`, drop the unused imports and delete the whole `describe('page theme tokens', ...)` block (it tested exactly what was just deleted):

```diff
 import {
   buildCategoryConfigRow,
   buildStorefrontSavePayload,
   CARD_TEMPLATE_OPTIONS,
   resolveCategoryDraft,
-  TITLE_TEXT_COLOR_OPTIONS,
-  TYPOGRAPHY_TONE_OPTIONS,
-  TYPOGRAPHY_TONE_VALUES,
   normalizeCategoryConfig,
   normalizePageConfig,
-  resolveTitleTextColor,
 } from '../model/storefrontBuilderModel';
-
-describe('page theme tokens', () => {
-  it('defaults titleTextColor and typographyTone, and falls back on invalid values', () => {
-    const config = normalizePageConfig({ theme: { titleTextColor: 'neon', typographyTone: 'screamy' } });
-
-    expect(config.theme.titleTextColor).toBe('default');
-    expect(config.theme.typographyTone).toBe('standard');
-  });
-
-  it('keeps a valid titleTextColor and typographyTone', () => {
-    const config = normalizePageConfig({ theme: { titleTextColor: 'ink', typographyTone: 'bold' } });
-
-    expect(config.theme.titleTextColor).toBe('ink');
-    expect(config.theme.typographyTone).toBe('bold');
-  });
-
-  it('backward-compat: missing theme fields default without throwing', () => {
-    const config = normalizePageConfig({});
-
-    expect(config.theme.titleTextColor).toBe('default');
-    expect(config.theme.typographyTone).toBe('standard');
-  });
-
-  it('resolves titleTextColor tokens to hex, with brand passing through brandColor', () => {
-    expect(resolveTitleTextColor('default', '#2563eb')).toBe('#173223');
-    expect(resolveTitleTextColor('ink', '#2563eb')).toBe('#0f172a');
-    expect(resolveTitleTextColor('brand', '#2563eb')).toBe('#2563eb');
-  });
-
-  it('exposes a weight/letter-spacing pair for every typography tone', () => {
-    TYPOGRAPHY_TONE_OPTIONS.forEach((tone) => {
-      expect(TYPOGRAPHY_TONE_VALUES[tone]).toMatchObject({
-        headingWeight: expect.any(Number),
-        bodyWeight: expect.any(Number),
-        letterSpacing: expect.any(String),
-      });
-    });
-  });
-});
```

In `react-app/src/features/storefront/__tests__/storefrontConfigService.test.js`, update the big normalize test's expectation (around the `theme:`/`designDirection` lines identified earlier):

```diff
       pageConfig: {
         schemaVersion: 1,
-        designDirection: 'green',
-        theme: { brandColor: '#1d4a2e', backgroundTone: 'forest', titleTextColor: 'default', typographyTone: 'standard' },
+        theme: { brandColor: '#1d4a2e' },
         nav: { title: 'Demo', subtitle: 'Subtitle', logoUrl: 'https://example.com/logo.png' },
```

(Also remove `designDirection: 'green',` from this test's mocked `data.page_config` *input* a few lines above this expectation, since the field is now meaningless — leaving it would still pass, since it's just an ignored extra input property, but removing it keeps the fixture honest.)

In `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`, the two assertions Task 10 changed to `'default'`/`'standard'` must now be deleted outright (the properties no longer exist on `pageConfig.theme` at all):

```diff
     expect(savedPayload.categoryConfigs[0].categoryConfig.aiDesign.renderSpec.bodySlots[1].kind).toBe('inline-group');
-    expect(savedPayload.pageConfig.theme.titleTextColor).toBe('default');
-    expect(savedPayload.pageConfig.theme.typographyTone).toBe('standard');
```

In `react-app/src/features/storefront/__tests__/storefrontAiService.test.js`:

```diff
           stylePlan: {
-            titleTextColor: 'ink',
-            typographyTone: 'bold',
             priceTextColor: 'muted',
             accentColor: '#2563eb',
             cardSpacing: 'tight',
           },
```

```diff
       patch: {
         designDirection: 'warm',
-        titleTextColor: 'ink',
-        typographyTone: 'bold',
         selectedMediumCategories: ['Premium'],
```

```diff
         patch: {
           designDirection: 'warm',
-          titleTextColor: 'ink',
-          typographyTone: 'clean',
           selectedMediumCategories: ['Premium'],
```

```diff
           stylePlan: {
-            titleTextColor: 'default',
-            typographyTone: 'standard',
             priceTextColor: 'default',
             accentColor: '#2563eb',
             cardSpacing: 'relaxed',
```

```diff
-    expect(result.patch.titleTextColor).toBe('ink');
     expect(result.patch.cardFields).toEqual(['product_name', 'tax_price', 'zero_tax_price']);
```

```diff
-    expect(result.patch.typographyTone).toBe('bold');
     expect(result.patch.cardTemplate).toBe('price-focus');
     expect(result.designPlan.layoutPlan.cardVariant).toBe('price-focus');
-    expect(result.designPlan.stylePlan.typographyTone).toBe('bold');
   });
 });
```

- [ ] **Step 3: Run the full storefront suite**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: PASS — every file in `src/features/storefront/__tests__/` green, with zero remaining references to the deleted fields anywhere in `src/features/storefront`.

- [ ] **Step 4: Grep for stragglers**

Run: `cd react-app && grep -rn "designDirection\|titleTextColor\|typographyTone\|STOREFRONT_DESIGN_DIRECTIONS\|STOREFRONT_BACKGROUND_TONES\|resolveTitleTextColor" src/features/storefront --include="*.js" --include="*.jsx" | grep -v node_modules`
Expected: no output (or only unrelated matches outside `src/features/storefront`, which would indicate this grep needs narrowing, not that real stragglers exist). If anything remains, fix it before committing.

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront
git commit -m "refactor: delete superseded page-theme fields and the card-AI title/typography scope leak"
```

---

## Open design questions — resolved, not deferred

The PRD asked these to be settled during implementation rather than guessed at planning time. Resolutions, with rationale, so no task re-litigates them:

1. **Contrast-correction algorithm:** WCAG 2.x relative-luminance contrast ratio (`pageStyleColor.js`, Task 1), threshold 4.5 (AA for normal text). Applied to every text/background pairing in `normalizePageStyle` unconditionally (Task 2), so it's structurally impossible to compile or migrate an unreadable pair.
2. **Hex palette generation strategy:** keyword-matched base accent color → `deriveTonalPalette` (light-tinted background, white surface, the accent itself, a softened accent) for the no-API-key heuristic path (Task 1/7); free-form AI-proposed hex for the OpenAI path, always run back through the same `normalizePaletteIntent`/contrast-correction pipeline (Task 7/8) so both paths produce equally safe output.
3. **Override precedence enforcement:** per-property fallback chains — override intent → previous compiled value (header/search) or fresh palette derivation (category chips, per PRD's explicit instruction) → white-default seed. Settled in Task 8 with rationale for why chips behave differently from header/search.
4. **Bulk migration of existing rows:** this repo has no service-role-keyed ops-script convention (checked — only browser-side publishable-key Supabase access exists). Rather than inventing one, Task 6 wires the same pure `migrateLegacyPageConfigToPageStyle` function as a **read-time safety net**: any legacy row is upgraded transparently the next time it's fetched, and persisted back automatically the next time it's saved (`buildStorefrontSavePayload` always threads `pageStyle` through). If a true one-shot bulk rewrite across all rows turns out to be operationally necessary later, the same exported function is reusable from a script — but building that script now would mean inventing credential-handling conventions this repo doesn't have, for a need the lazy path already covers.

## PRD "Out of Scope" verification

- No raw CSS/HTML persistence — `pageStyle` is hex + enum tokens only (Task 2 schema).
- No search radius/background/icon-position control — `pageStyleAiInterpreter.js`'s search intent shape structurally has no such fields (Task 7).
- No header text rewrite — header text stays in `navConfig.title`; `pageStyle.header` only ever carries color/letterSpacing/fontWeight (Task 2/7).
- `pageAiDesign` never persisted — `buildStorefrontSavePayload` (Task 5/10) never accepts or writes it; Task 13's end-to-end test asserts the saved payload has no `pageAiDesign` key and doesn't contain the raw prompt text.
- No AI in migration — `pageStyleMigration.js` (Task 4) is pure deterministic lookup tables, zero network calls, verified by its own test file.
- No long-term legacy rendering branch — Task 11 makes rendering read `pageConfig.pageStyle` exclusively; Task 14 deletes the legacy fields outright rather than leaving a dead-but-present branch.
- Card-level render-spec composition untouched — Tasks 1-13 never modify `compileStorefrontRenderSpec`, `CardGridSection.jsx`, or any card layout/variant logic; Task 14's only card-seam edit is deleting the two fields that didn't belong there.

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-06-21-storefront-page-ai-style.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
