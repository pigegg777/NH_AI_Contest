import { toTrimmedString } from '../../../../common/utils/text';
import { PAGE_STYLE_AI_DEFAULT_EXPLANATION_MESSAGE } from '../../config/page-design/pageStyleAiCopyConfig';
import { isHexColor, mixHexColors, normalizeHexColor } from './pageStyleColor';
import {
  PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS,
  PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS,
  PAGE_STYLE_SEARCH_SIZE_TOKENS,
} from './pageStyleModel';

const HEX_COLOR_SCHEMA_PATTERN = '^#[0-9a-fA-F]{6}$';
const LETTER_SPACING_SCHEMA_PATTERN = '^normal$|^-?\\d+(\\.\\d+)?(em|rem|px)$';
const HEADER_FONT_WEIGHT_TOKENS = [400, 500, 600, 700, 800, 900];

const NULLABLE_HEADER_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    titleColorHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description:
        '상품 페이지 제목 글자색 hex 코드(예: #173223). 배경색과 대비되어 읽기 쉬운 색을 선택하세요.',
    },
    letterSpacing: {
      type: ['string', 'null'],
      pattern: LETTER_SPACING_SCHEMA_PATTERN,
      description:
        "제목 자간 CSS 값. 'normal' 또는 '0.02em'/'-0.01em'/'1px' 형태의 숫자+단위 문자열만 허용.",
    },
    fontWeight: {
      type: ['number', 'null'],
      enum: [...HEADER_FONT_WEIGHT_TOKENS, null],
      description:
        '제목 글자 굵기. 400(보통)~900(매우 굵게) 중 100 단위 값만 선택.',
    },
    titleFontSizeToken: {
      type: ['string', 'null'],
      enum: [...PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS, null],
      description:
        '제목 글자 크기 토큰. sm(작게)/md(보통)/lg(크게)/xl(매우 크게) 중 선택.',
    },
  },
  required: [
    'titleColorHex',
    'letterSpacing',
    'fontWeight',
    'titleFontSizeToken',
  ],
};

const NULLABLE_CATEGORY_CHIPS_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description: '카테고리 칩(비활성) 배경색 hex 코드.',
    },
    textHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description:
        '카테고리 칩(비활성) 글자색 hex 코드. 배경색과 대비되게 선택.',
    },
    borderColorHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description: '카테고리 칩 테두리색 hex 코드.',
    },
    activeBackgroundHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description:
        '선택된 카테고리 칩 배경색 hex 코드. 보통 강조색(accent) 사용.',
    },
    activeTextHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description:
        '선택된 카테고리 칩 글자색 hex 코드. activeBackgroundHex와 대비되게 선택.',
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
      description: '검색창 크기 토큰. sm/md/lg/xl 중 선택.',
    },
    borderStrengthToken: {
      type: ['string', 'null'],
      enum: [...PAGE_STYLE_SEARCH_BORDER_STRENGTH_TOKENS, null],
      description:
        '검색창 테두리 굵기 토큰. soft(얇게)/normal(보통)/strong(굵게) 중 선택.',
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
      description: '페이지 전체 배경색 hex 코드. 보통 밝고 옅은 색.',
    },
    accentHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description: '브랜드 강조색 hex 코드. 버튼, 활성 상태 등에 사용.',
    },
  },
  required: ['backgroundHex', 'accentHex'],
};

const EXPLANATION_SCHEMA_PATTERN = '^[\\s\\S]{1,200}$';
const SUGGESTION_SCHEMA_PATTERN = '^[\\s\\S]{1,120}$';

export const PAGE_STYLE_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    palette: NULLABLE_PALETTE_SCHEMA,
    header: NULLABLE_HEADER_SCHEMA,
    categoryChips: NULLABLE_CATEGORY_CHIPS_SCHEMA,
    search: NULLABLE_SEARCH_SCHEMA,
    explanation: {
      type: 'string',
      pattern: EXPLANATION_SCHEMA_PATTERN,
      description:
        '이번 변경 내용을 사용자에게 설명하는 한두 문장(최대 200자).',
    },
    suggestion: {
      type: ['string', 'null'],
      pattern: SUGGESTION_SCHEMA_PATTERN,
      description:
        '다음에 시도해볼 만한 추가 제안 한 문장(최대 120자). 없으면 null.',
    },
  },
  required: [
    'palette',
    'header',
    'categoryChips',
    'search',
    'explanation',
    'suggestion',
  ],
};

export function normalizePaletteIntent(rawPalette, fallbackAccentHex) {
  const source = rawPalette ?? {};
  const accentHex = normalizeHexColor(source.accentHex, fallbackAccentHex);
  const backgroundHex = isHexColor(source.backgroundHex)
    ? normalizeHexColor(source.backgroundHex, accentHex)
    : mixHexColors(accentHex, '#ffffff', 0.94);

  return {
    backgroundHex,
    accentHex,
  };
}

function normalizePalettePatchIntent(rawPalette, fallbackAccentHex) {
  if (!rawPalette) {
    return null;
  }

  const hasRecognizedHex = ['backgroundHex', 'accentHex'].some((key) =>
    isHexColor(rawPalette[key]),
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

  if (
    PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS.includes(rawHeader.titleFontSizeToken)
  ) {
    intent.titleFontSizeToken = rawHeader.titleFontSizeToken;
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

export function normalizePageStyleAiIntent(
  payload,
  fallbackAccentHex,
  targetScope,
) {
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

export function normalizePageStyleAiExplanation(payload) {
  return {
    explanation:
      toTrimmedString(payload?.explanation) ||
      PAGE_STYLE_AI_DEFAULT_EXPLANATION_MESSAGE,
    suggestion: toTrimmedString(payload?.suggestion) || null,
  };
}
