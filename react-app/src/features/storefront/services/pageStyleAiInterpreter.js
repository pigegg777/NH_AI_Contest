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
