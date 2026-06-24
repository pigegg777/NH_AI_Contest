import { toTrimmedString } from '../../../common/utils/text';
import {
  buildPageAiTargetScopeInstruction,
  normalizePageAiDesignInput,
} from '../model/pageAiDesignModel';
import {
  isHexColor,
  mixHexColors,
  normalizeHexColor,
  pickReadableTextColor,
} from '../model/pageStyleColor';
import {
  DEFAULT_PAGE_STYLE,
  PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS,
  PAGE_STYLE_SEARCH_SIZE_TOKENS,
  normalizePageStyle,
} from '../model/pageStyleModel';

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const HEX_COLOR_SCHEMA_PATTERN = '^#[0-9a-fA-F]{6}$';

const NULLABLE_HEADER_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    titleColorHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
    },
    letterSpacing: { type: ['string', 'null'] },
    fontWeight: { type: ['number', 'null'] },
  },
  required: ['titleColorHex', 'letterSpacing', 'fontWeight'],
};

const NULLABLE_CATEGORY_CHIPS_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
    },
    textHex: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
    borderColorHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
    },
    activeBackgroundHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
    },
    activeTextHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
    },
  },
  required: [
    'backgroundHex',
    'textHex',
    'borderColorHex',
    'activeBackgroundHex',
    'activeTextHex',
  ],
};

const NULLABLE_SEARCH_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    sizeToken: {
      type: ['string', 'null'],
      enum: [...PAGE_STYLE_SEARCH_SIZE_TOKENS, null],
    },
    borderStrengthToken: {
      type: ['string', 'null'],
      enum: [...PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS, null],
    },
  },
  required: ['sizeToken', 'borderStrengthToken'],
};

const NULLABLE_PALETTE_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
    },
    surfaceHex: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
    accentHex: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
    textHex: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
  },
  required: ['backgroundHex', 'surfaceHex', 'accentHex', 'textHex'],
};

export const PAGE_STYLE_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    palette: NULLABLE_PALETTE_SCHEMA,
    header: NULLABLE_HEADER_SCHEMA,
    categoryChips: NULLABLE_CATEGORY_CHIPS_SCHEMA,
    search: NULLABLE_SEARCH_SCHEMA,
    explanation: { type: 'string' },
    suggestion: { type: ['string', 'null'] },
  },
  required: ['palette', 'header', 'categoryChips', 'search', 'explanation', 'suggestion'],
};

function includesAny(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

function toLowerCasePromptText(promptText) {
  return typeof promptText === 'string' ? promptText.toLowerCase() : '';
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
    textHex: normalizeHexColor(
      source.textHex,
      pickReadableTextColor(backgroundHex),
    ),
  };
}

function normalizePalettePatchIntent(rawPalette, fallbackAccentHex) {
  if (!rawPalette) {
    return null;
  }

  const hasRecognizedHex = ['backgroundHex', 'surfaceHex', 'accentHex', 'textHex'].some(
    (key) => isHexColor(rawPalette[key]),
  );

  return hasRecognizedHex
    ? normalizePaletteIntent(rawPalette, fallbackAccentHex)
    : null;
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

  [
    'backgroundHex',
    'textHex',
    'borderColorHex',
    'activeBackgroundHex',
    'activeTextHex',
  ].forEach((key) => {
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

  if (
    PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS.includes(
      rawSearch.borderStrengthToken,
    )
  ) {
    intent.borderStrengthToken = rawSearch.borderStrengthToken;
  }

  return Object.keys(intent).length > 0 ? intent : null;
}

function detectAccentHexFromPrompt(
  promptText,
  fallbackAccentHex = DEFAULT_PAGE_STYLE.palette.accentHex,
) {
  const text = toLowerCasePromptText(promptText);

  if (
    includesAny(text, [
      'blue',
      'trust',
      'trustworthy',
      'official',
      '블루',
      '파랑',
      '신뢰',
      '공식',
    ])
  ) {
    return '#2563eb';
  }

  if (
    includesAny(text, [
      'orange',
      'warm',
      'cozy',
      'friendly',
      '오렌지',
      '따뜻',
      '포근',
      '친근',
    ])
  ) {
    return '#ea580c';
  }

  if (includesAny(text, ['purple', '보라'])) {
    return '#7c3aed';
  }

  if (
    includesAny(text, ['green', 'nature', 'organic', '그린', '녹색', '자연', '유기농'])
  ) {
    return '#1d4a2e';
  }

  return fallbackAccentHex;
}

function detectHeaderIntentCandidate(promptText) {
  if (!promptText) {
    return null;
  }

  const candidate = {};

  if (includesAny(promptText, ['darker', 'dark title', '어둡게', '진하게'])) {
    candidate.titleColorHex = '#111827';
  }

  if (includesAny(promptText, ['lighter', '밝게'])) {
    candidate.titleColorHex = '#ffffff';
  }

  if (includesAny(promptText, ['bold', 'bolder', 'strong', '굵게', '강하게'])) {
    candidate.fontWeight = 800;
  }

  if (includesAny(promptText, ['thin', 'light weight', '가볍게', '얇게'])) {
    candidate.fontWeight = 500;
  }

  if (includesAny(promptText, ['wide', 'spaced out', '자간 넓게'])) {
    candidate.letterSpacing = '0.04em';
  }

  if (includesAny(promptText, ['tight', 'condensed', '자간 좁게'])) {
    candidate.letterSpacing = '-0.01em';
  }

  return Object.keys(candidate).length > 0 ? candidate : null;
}

function detectCategoryChipsIntentCandidate(promptText, accentHex) {
  if (!promptText) {
    return null;
  }

  const candidate = {};

  if (includesAny(promptText, ['filled', 'solid', '채우기'])) {
    candidate.activeBackgroundHex = accentHex;
  }

  if (includesAny(promptText, ['outline only', 'no fill', '테두리만'])) {
    candidate.activeBackgroundHex = '#ffffff';
  }

  if (includesAny(promptText, ['darker text', '진한 글자'])) {
    candidate.textHex = '#111827';
  }

  if (includesAny(promptText, ['lighter text', '밝은 글자'])) {
    candidate.textHex = '#ffffff';
  }

  if (includesAny(promptText, ['strong border', '강한 테두리', '진한 테두리'])) {
    candidate.borderColorHex = accentHex;
  }

  if (includesAny(promptText, ['soft border', '부드러운 테두리', '연한 테두리'])) {
    candidate.borderColorHex = mixHexColors(accentHex, '#ffffff', 0.8);
  }

  return Object.keys(candidate).length > 0 ? candidate : null;
}

function detectPaletteIntentCandidate(
  promptText,
  fallbackAccentHex,
  forcePaletteScope = false,
) {
  if (!promptText) {
    return null;
  }

  const shouldAdjustPalette =
    forcePaletteScope ||
    includesAny(promptText, [
      'palette',
      'color',
      'colour',
      'theme',
      'tone',
      'accent',
      'background',
      'surface',
      'overall',
      'mood',
      'warm',
      'friendly',
      'cozy',
      'trustworthy',
      'official',
      'nature',
      'organic',
      'blue',
      'orange',
      'purple',
      'green',
      '색감',
      '색상',
      '분위기',
      '배경',
      '포인트',
      '테마',
    ]);

  if (!shouldAdjustPalette) {
    return null;
  }

  const accentHex = detectAccentHexFromPrompt(promptText, fallbackAccentHex);
  return normalizePaletteIntent({ accentHex }, accentHex);
}

function detectSearchIntentCandidate(promptText) {
  if (!promptText) {
    return null;
  }

  const candidate = {};

  if (includesAny(promptText, ['largest', 'huge', '아주 크게'])) {
    candidate.sizeToken = 'xl';
  } else if (includesAny(promptText, ['larger', 'bigger', '크게'])) {
    candidate.sizeToken = 'lg';
  } else if (includesAny(promptText, ['smaller', 'small', '작게'])) {
    candidate.sizeToken = 'sm';
  }

  if (
    includesAny(promptText, [
      'stronger border',
      'strong border',
      '강한 테두리',
      '진한 테두리',
    ])
  ) {
    candidate.borderStrengthToken = 'strong';
  } else if (
    includesAny(promptText, [
      'soft border',
      'subtle border',
      '부드러운 테두리',
      '연한 테두리',
    ])
  ) {
    candidate.borderStrengthToken = 'soft';
  }

  return Object.keys(candidate).length > 0 ? candidate : null;
}

function limitIntentToTargetScope(intent, targetScope) {
  switch (targetScope) {
    case 'palette':
      return {
        palette: intent.palette,
        header: null,
        categoryChips: null,
        search: null,
      };
    case 'header':
      return {
        palette: null,
        header: intent.header,
        categoryChips: null,
        search: null,
      };
    case 'categoryChips':
      return {
        palette: null,
        header: null,
        categoryChips: intent.categoryChips,
        search: null,
      };
    case 'search':
      return {
        palette: null,
        header: null,
        categoryChips: null,
        search: intent.search,
      };
    default:
      return intent;
  }
}

export function buildHeuristicPageAiIntent(
  pageAiDesign,
  currentPageStyle = DEFAULT_PAGE_STYLE,
) {
  const normalizedInput = normalizePageAiDesignInput(pageAiDesign);
  const currentStyle = normalizePageStyle(currentPageStyle);
  const promptText = toLowerCasePromptText(normalizedInput.prompt);
  const palette = detectPaletteIntentCandidate(
    promptText,
    currentStyle.palette.accentHex,
    normalizedInput.targetScope === 'palette',
  );
  const accentHex = palette?.accentHex ?? currentStyle.palette.accentHex;

  return limitIntentToTargetScope(
    {
      palette,
      header: normalizeHeaderIntent(detectHeaderIntentCandidate(promptText)),
      categoryChips: normalizeCategoryChipsIntent(
        detectCategoryChipsIntentCandidate(promptText, accentHex),
      ),
      search: normalizeSearchIntent(detectSearchIntentCandidate(promptText)),
    },
    normalizedInput.targetScope,
  );
}

export function normalizePageStyleAiIntent(payload, fallbackAccentHex, targetScope) {
  return limitIntentToTargetScope(
    {
      palette: normalizePalettePatchIntent(payload?.palette, fallbackAccentHex),
      header: normalizeHeaderIntent(payload?.header),
      categoryChips: normalizeCategoryChipsIntent(payload?.categoryChips),
      search: normalizeSearchIntent(payload?.search),
    },
    targetScope,
  );
}

export function buildPageStyleOpenAiRequestBody({
  pageAiDesign,
  openAiModel,
  currentPageStyle,
  history = [],
}) {
  const scopeInstruction = buildPageAiTargetScopeInstruction(
    pageAiDesign.targetScope,
  );
  const scopedPrompt = scopeInstruction
    ? `${scopeInstruction}\n사용자 요청:\n${pageAiDesign.prompt}`
    : pageAiDesign.prompt;
  const historyMessages = (Array.isArray(history) ? history : [])
    .map((turn) => ({
      role: turn?.role === 'assistant' ? 'assistant' : 'user',
      content: toTrimmedString(turn?.text),
    }))
    .filter((turn) => turn.content);

  return {
    model: openAiModel,
    input: [
      {
        role: 'system',
        content: [
          'You style one storefront page background palette, header text, category chips, and search box.',
          'Treat the response as an incremental patch over currentPageStyle.',
          'Preserve earlier page-style edits unless the user explicitly changes them.',
          'For every property you do not want to change, return null.',
          'If targetScope is present, only that scope may change. All non-target area objects must be null.',
          'When targetScope is not palette, palette must be null and may not be used as a backdoor to restyle other sections.',
          'Search may only carry sizeToken and borderStrengthToken. Never invent background, radius, or icon properties.',
          'Category chips may only carry background/text/border/active-state colors. Never invent shape or placement properties.',
          'Header may only carry title color, letter spacing, and font weight. Never rewrite the title text itself.',
          'Always set "explanation" to 1-2 short Korean sentences describing what you changed, written for a non-technical store owner.',
          'If a clear complementary tweak exists for another scope of this same page (palette/header/categoryChips/search), set "suggestion" to one short Korean sentence describing it. Otherwise set "suggestion" to null.',
        ].join('\n'),
      },
      ...historyMessages,
      {
        role: 'user',
        content: JSON.stringify(
          {
            request: {
              ...pageAiDesign,
              scopeInstruction,
              scopedPrompt,
            },
            currentPageStyle: normalizePageStyle(currentPageStyle),
          },
          null,
          2,
        ),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'storefront_page_style_suggestion',
        strict: true,
        schema: PAGE_STYLE_AI_SCHEMA,
      },
    },
    max_output_tokens: 800,
  };
}

const PAGE_INTENT_EXPLANATION_SECTION_LABELS = {
  palette: '전체 색감',
  header: '헤더 텍스트',
  categoryChips: '카테고리 칩',
  search: '검색창',
};

export function buildHeuristicPageAiExplanation(intent) {
  const changedLabels = Object.entries(PAGE_INTENT_EXPLANATION_SECTION_LABELS)
    .filter(([key]) => Boolean(intent?.[key]))
    .map(([, label]) => label);

  if (changedLabels.length === 0) {
    return '요청하신 내용에서 적용할 수 있는 변경 사항을 찾지 못했습니다.';
  }

  return `${changedLabels.join(', ')}을 요청하신 대로 변경했습니다.`;
}

export function normalizePageStyleAiExplanation(payload) {
  return {
    explanation: toTrimmedString(payload?.explanation) || '요청하신 내용을 페이지 스타일에 반영했습니다.',
    suggestion: toTrimmedString(payload?.suggestion) || null,
  };
}
