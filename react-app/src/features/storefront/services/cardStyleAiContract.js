import {
  buildCardAiTargetScopeInstruction,
  normalizeCardAiDesignInput,
} from '../model/cardAiDesignModel';
import {
  CARD_LAYOUT_CONTENT_DENSITY_OPTIONS,
  CARD_LAYOUT_EMPHASIS_OPTIONS,
  CARD_LAYOUT_GROUPING_HINT_OPTIONS,
  CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS,
  CARD_LAYOUT_SECTION_OPTIONS,
} from '../model/cardLayoutPlanModel';
import { resolveImageSizeDeltaSteps } from '../model/cardCompositionModel';
import {
  CARD_FIELD_COLOR_ROLE_OPTIONS,
  CARD_FIELD_EMPHASIS_OPTIONS,
  CARD_FIELD_FONT_SIZE_OPTIONS,
  CARD_FIELD_FONT_WEIGHT_OPTIONS,
  CARD_IMAGE_FIT_OPTIONS,
  CARD_RADIUS_OPTIONS,
  CARD_SHADOW_OPTIONS,
  CARD_SPACING_OPTIONS,
  normalizeCardStyle,
} from '../model/cardStyleModel';
import { isHexColor, mixHexColors, normalizeHexColor } from '../model/pageStyleColor';
import { buildCardStyleAiSystemPrompt, selectCardStyleSkillPackIds } from './cardStyleSkillPromptService';

const HEX_COLOR_SCHEMA_PATTERN = '^#[0-9a-fA-F]{6}$';

const NULLABLE_SHELL_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundColor: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
    borderColor: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
    shadow: { type: ['string', 'null'], enum: [...CARD_SHADOW_OPTIONS, null] },
    radius: { type: ['string', 'null'], enum: [...CARD_RADIUS_OPTIONS, null] },
    spacing: { type: ['string', 'null'], enum: [...CARD_SPACING_OPTIONS, null] },
  },
  required: ['backgroundColor', 'borderColor', 'shadow', 'radius', 'spacing'],
};

const NULLABLE_HEADER_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundColor: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
    titleColorHex: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
    letterSpacing: { type: ['string', 'null'] },
    fontWeight: { type: ['number', 'null'] },
  },
  required: ['backgroundColor', 'titleColorHex', 'letterSpacing', 'fontWeight'],
};

const NULLABLE_IMAGE_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    fit: { type: ['string', 'null'], enum: [...CARD_IMAGE_FIT_OPTIONS, null] },
    sizeDeltaSteps: { type: ['number', 'null'] },
  },
  required: ['fit', 'sizeDeltaSteps'],
};

const INFO_GROUP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    display: { type: 'string', enum: ['inline-group', 'stack-group'] },
    fields: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'label', 'display', 'fields'],
};

const NULLABLE_INFO_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundColor: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
    borderColor: { type: ['string', 'null'], pattern: HEX_COLOR_SCHEMA_PATTERN },
    padding: { type: ['string', 'null'], enum: [...CARD_SPACING_OPTIONS, null] },
    radius: { type: ['string', 'null'], enum: [...CARD_RADIUS_OPTIONS, null] },
    fieldGap: { type: ['string', 'null'], enum: [...CARD_SPACING_OPTIONS, null] },
    fieldGroupGap: { type: ['string', 'null'], enum: [...CARD_SPACING_OPTIONS, null] },
    requestedGroups: { type: ['array', 'null'], items: INFO_GROUP_SCHEMA },
    requestedFieldOrder: { type: ['array', 'null'], items: { type: 'string' } },
  },
  required: ['backgroundColor', 'borderColor', 'padding', 'radius', 'fieldGap', 'fieldGroupGap', 'requestedGroups', 'requestedFieldOrder'],
};

const FIELD_STYLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    field: { type: 'string' },
    colorRole: { type: 'string', enum: CARD_FIELD_COLOR_ROLE_OPTIONS },
    fontWeight: { type: 'string', enum: CARD_FIELD_FONT_WEIGHT_OPTIONS },
    fontSize: { type: 'string', enum: CARD_FIELD_FONT_SIZE_OPTIONS },
    emphasis: { type: 'string', enum: CARD_FIELD_EMPHASIS_OPTIONS },
  },
  required: ['field', 'colorRole', 'fontWeight', 'fontSize', 'emphasis'],
};

const NULLABLE_FIELD_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    priceColorRole: {
      type: ['string', 'null'],
      enum: [...CARD_FIELD_COLOR_ROLE_OPTIONS, null],
    },
    targetedFieldStyles: { type: ['array', 'null'], items: FIELD_STYLE_SCHEMA },
  },
  required: ['priceColorRole', 'targetedFieldStyles'],
};

const NULLABLE_LAYOUT_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    cardsPerRow: { type: ['number', 'null'], enum: [1, 2, null] },
    sectionOrder: {
      type: ['array', 'null'],
      items: { type: 'string', enum: CARD_LAYOUT_SECTION_OPTIONS },
    },
    imagePlacement: {
      type: ['string', 'null'],
      enum: [...CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS, null],
    },
    titleClamp: { type: ['number', 'null'], enum: [1, 2, null] },
    contentDensity: {
      type: ['string', 'null'],
      enum: [...CARD_LAYOUT_CONTENT_DENSITY_OPTIONS, null],
    },
    emphasis: {
      type: ['string', 'null'],
      enum: [...CARD_LAYOUT_EMPHASIS_OPTIONS, null],
    },
    groupingHint: {
      type: ['string', 'null'],
      enum: [...CARD_LAYOUT_GROUPING_HINT_OPTIONS, null],
    },
  },
  required: ['cardsPerRow', 'sectionOrder', 'imagePlacement', 'titleClamp', 'contentDensity', 'emphasis', 'groupingHint'],
};

export const CARD_STYLE_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    structuralPresetRequest: { type: ['string', 'null'] },
    titleModeRequest: { type: ['string', 'null'] },
    layout: NULLABLE_LAYOUT_SCHEMA,
    shell: NULLABLE_SHELL_SCHEMA,
    header: NULLABLE_HEADER_SCHEMA,
    image: NULLABLE_IMAGE_SCHEMA,
    info: NULLABLE_INFO_SCHEMA,
    field: NULLABLE_FIELD_SCHEMA,
  },
  required: ['structuralPresetRequest', 'titleModeRequest', 'layout', 'shell', 'header', 'image', 'info', 'field'],
};

function includesAny(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

function toLowerCasePromptText(promptText) {
  return typeof promptText === 'string' ? promptText.toLowerCase() : '';
}

export function detectAccentHexFromPrompt(promptText) {
  const text = toLowerCasePromptText(promptText);

  if (includesAny(text, ['blue', '블루', 'trust', '신뢰'])) {
    return '#2563eb';
  }

  if (includesAny(text, ['orange', '오렌지', 'warm', '따뜻'])) {
    return '#ea580c';
  }

  if (includesAny(text, ['purple', '보라'])) {
    return '#7c3aed';
  }

  if (includesAny(text, ['green', '자연', '그린'])) {
    return '#1d4a2e';
  }

  return '';
}

export function detectShellIntentCandidate(promptText) {
  if (!promptText) {
    return null;
  }

  const candidate = {};

  if (includesAny(promptText, ['sharp', 'square', '각진'])) {
    candidate.radius = 'md';
  } else if (includesAny(promptText, ['rounded', 'round', '둥글게'])) {
    candidate.radius = 'xl';
  }

  if (includesAny(promptText, ['flat', 'shadowless', '그림자 없이'])) {
    candidate.shadow = 'none';
  } else if (includesAny(promptText, ['strong shadow', 'deep shadow', '강한 그림자'])) {
    candidate.shadow = 'strong';
  }

  if (includesAny(promptText, ['dense', 'tight', '촘촘'])) {
    candidate.spacing = 'tight';
  } else if (includesAny(promptText, ['airy', 'spacious', '여유', '넓게'])) {
    candidate.spacing = 'relaxed';
  }

  return Object.keys(candidate).length > 0 ? candidate : null;
}

export function detectHeaderIntentCandidate(promptText, accentHex = '') {
  if (!promptText) {
    return null;
  }

  const candidate = {};

  if (includesAny(promptText, ['darker', 'dark title', '진하게'])) {
    candidate.titleColorHex = '#111827';
  } else if (includesAny(promptText, ['lighter', '밝게'])) {
    candidate.titleColorHex = '#ffffff';
  }

  if (includesAny(promptText, ['bold', 'bolder', 'strong', '굵게', '강하게'])) {
    candidate.fontWeight = 800;
  } else if (includesAny(promptText, ['thin', 'light weight', '가볍게', '얇게'])) {
    candidate.fontWeight = 500;
  }

  if (includesAny(promptText, ['wide', 'spaced out', '자간 넓게'])) {
    candidate.letterSpacing = '0.04em';
  } else if (includesAny(promptText, ['tight', 'condensed', '자간 좁게'])) {
    candidate.letterSpacing = '-0.01em';
  }

  if (includesAny(promptText, ['dark header', 'header darker', '헤더를 어둡게', '헤더 배경 진하게'])) {
    candidate.backgroundColor = '#1f2937';
  } else if (accentHex) {
    candidate.backgroundColor = mixHexColors(accentHex, '#ffffff', 0.92);
  }

  return Object.keys(candidate).length > 0 ? candidate : null;
}

export function detectImageIntentCandidate(promptText) {
  if (!promptText) {
    return null;
  }

  const candidate = {};
  const sizeDeltaSteps = resolveImageSizeDeltaSteps(promptText);

  if (sizeDeltaSteps) {
    candidate.sizeDeltaSteps = sizeDeltaSteps;
  }

  if (includesAny(promptText, ['contain', 'uncropped', '전체 보이게', '안 잘리게'])) {
    candidate.fit = 'contain';
  } else if (includesAny(promptText, ['cover', 'fill', '꽉 채워'])) {
    candidate.fit = 'cover';
  }

  return Object.keys(candidate).length > 0 ? candidate : null;
}

export function detectLayoutIntentCandidate(promptText, visibleFields) {
  if (!promptText) {
    return null;
  }

  const candidate = {};

  if (includesAny(promptText, ['one line', 'single line', '한 줄', '1줄'])) {
    candidate.titleClamp = 1;
  } else if (includesAny(promptText, ['two lines', '두 줄', '2줄'])) {
    candidate.titleClamp = 2;
  }

  if (includesAny(promptText, ['image on the right', 'image right', '오른쪽'])) {
    candidate.imagePlacement = 'right';
  } else if (includesAny(promptText, ['image on the left', 'image left', '왼쪽', '옆으로'])) {
    candidate.imagePlacement = 'left';
  } else if (includesAny(promptText, ['image on top', 'image top', '위로', '상단'])) {
    candidate.imagePlacement = 'top';
  }

  if (includesAny(promptText, ['2열', '두 열', 'two columns', 'comparison', 'compare'])) {
    candidate.cardsPerRow = 2;
  } else if (includesAny(promptText, ['1열', '한 열', 'single column', 'one column', '세로로'])) {
    candidate.cardsPerRow = 1;
  }

  if (includesAny(promptText, ['compact', 'dense', 'tight', '답답', '촘촘'])) {
    candidate.contentDensity = 'compact';
  } else if (includesAny(promptText, ['comfortable', 'airy', 'spacious', '여유', '넓게'])) {
    candidate.contentDensity = 'comfortable';
  }

  if (includesAny(promptText, ['image-first', 'image first', '이미지 중심', '이미지를 강조'])) {
    candidate.emphasis = 'image';
  } else if (includesAny(promptText, ['info-first', 'details first', '정보 중심', '상세를 먼저'])) {
    candidate.emphasis = 'info';
  } else if (includesAny(promptText, ['title-first', 'title focus', '제목 중심', '상품명을 강조'])) {
    candidate.emphasis = 'title';
  }

  if (includesAny(promptText, ['price compare', '가격 비교', '비교'])) {
    candidate.groupingHint = 'price-compare';
  } else if (includesAny(promptText, ['summary first', '핵심 먼저'])) {
    candidate.groupingHint = 'summary-first';
  } else if (includesAny(promptText, ['detail first', '상세 먼저'])) {
    candidate.groupingHint = 'detail-first';
  }

  const hasImageField = Array.isArray(visibleFields) && visibleFields.includes('img_url');

  if (candidate.imagePlacement && !hasImageField) {
    delete candidate.imagePlacement;
  }

  return Object.keys(candidate).length > 0 ? candidate : null;
}

function detectPriceFirstRequest(promptText) {
  return includesAny(promptText, ['가격을 먼저', '가격 먼저', 'price first', 'show price first']);
}

export function detectInfoIntentCandidate(promptText, visibleFields) {
  if (!promptText) {
    return null;
  }

  const candidate = {};

  if (includesAny(promptText, ['dense', 'tight', '촘촘'])) {
    candidate.padding = 'tight';
    candidate.fieldGap = 'tight';
  } else if (includesAny(promptText, ['airy', 'spacious', '여유', '넓게'])) {
    candidate.padding = 'relaxed';
    candidate.fieldGap = 'relaxed';
  }

  if (includesAny(promptText, ['묶', 'inline', 'compare', '비교', '통합', '한 줄'])) {
    const priceFields = (Array.isArray(visibleFields) ? visibleFields : []).filter((field) =>
      ['tax_price', 'zero_tax_price', 'exempt_tax_price', 'price_subsidy'].includes(field),
    );

    if (priceFields.length >= 2) {
      candidate.requestedGroups = [
        { id: 'price-compare', label: '가격', display: 'inline-group', fields: priceFields },
      ];
    }
  }

  if (detectPriceFirstRequest(promptText)) {
    candidate.requestedFieldOrder = (Array.isArray(visibleFields) ? visibleFields : []).filter((field) =>
      ['tax_price', 'zero_tax_price', 'exempt_tax_price', 'price_subsidy'].includes(field),
    );
  }

  return Object.keys(candidate).length > 0 ? candidate : null;
}

const FIELD_TARGET_TOKENS = {
  tax_price: ['tax_price', 'tax price', '과세', '과세가격'],
  zero_tax_price: ['zero_tax_price', 'zero tax', '영세', '영세가격'],
  exempt_tax_price: ['exempt_tax_price', 'exempt', '면세', '면세가격'],
  price_subsidy: ['price_subsidy', 'subsidy', '보조', '보조금'],
  product_name: ['product_name', 'product name', '상품명'],
  spec: ['spec', 'size', '규격'],
};

function detectFieldColorRole(promptText) {
  if (includesAny(promptText, ['blue', '파랑', '파란', '블루'])) return 'blue';
  if (includesAny(promptText, ['red', '빨간', '적색'])) return 'red';
  if (includesAny(promptText, ['green', '초록', '그린'])) return 'green';
  if (includesAny(promptText, ['amber', 'yellow', 'orange', '노란', '주황'])) return 'amber';
  if (includesAny(promptText, ['muted', 'gray', 'grey', '회색', '연하게'])) return 'muted';
  if (includesAny(promptText, ['brand', '브랜드'])) return 'brand';
  return '';
}

export function detectFieldIntentCandidate(promptText, visibleFields, accentHex = '') {
  if (!promptText) {
    return null;
  }

  const colorRole = detectFieldColorRole(promptText);
  const emphasized = includesAny(promptText, ['bold', 'bolder', 'strong', '굵게', '강조']);
  const candidate = {};

  if (includesAny(promptText, ['muted price', '가격 차분', '가격 약하게'])) {
    candidate.priceColorRole = 'muted';
  } else if (includesAny(promptText, ['brand price', 'price brand', '가격 브랜드']) || accentHex) {
    candidate.priceColorRole = 'brand';
  }

  if (colorRole || emphasized) {
    candidate.targetedFieldStyles = (Array.isArray(visibleFields) ? visibleFields : [])
      .filter((field) => includesAny(promptText, FIELD_TARGET_TOKENS[field] ?? [field]))
      .map((field) => ({
        field,
        colorRole: colorRole || 'inherit',
        fontWeight: emphasized ? 'bold' : 'normal',
        fontSize: 'medium',
        emphasis: colorRole || emphasized ? 'strong' : 'none',
      }));
  }

  return Object.keys(candidate).length > 0 ? candidate : null;
}

function detectStructuralPresetRequest(promptText) {
  if (includesAny(promptText, ['image left', 'image on the left', '이미지 왼쪽'])) {
    return 'image-left';
  }

  if (includesAny(promptText, ['compact list', 'list layout', '리스트 형'])) {
    return 'compact-list';
  }

  if (includesAny(promptText, ['detail first', 'details first', '상세 먼저'])) {
    return 'detail-first';
  }

  if (includesAny(promptText, ['image top', 'header top', '이미지 위', '기본 레이아웃'])) {
    return 'header-top';
  }

  return null;
}

function detectTitleModeRequest(promptText) {
  if (includesAny(promptText, ['inline title', 'title inline', '제목을 본문에', '제목 인라인'])) {
    return 'inline';
  }

  if (includesAny(promptText, ['separate header', 'header title', '별도 헤더', '제목 헤더로'])) {
    return 'header';
  }

  return null;
}

function limitCardIntentToTargetScope(intent, targetScope) {
  switch (targetScope) {
    case 'header':
      return { ...intent, image: null, info: null, field: null };
    case 'image':
      return { ...intent, header: null, info: null, field: null };
    case 'info':
      return { ...intent, header: null, image: null, field: null };
    case 'field':
      return { ...intent, header: null, image: null, info: null };
    default:
      return intent;
  }
}

export function buildHeuristicCardAiIntent({ cardAiDesign, visibleFields } = {}) {
  const normalizedInput = normalizeCardAiDesignInput(cardAiDesign);
  const promptText = toLowerCasePromptText(normalizedInput.prompt);
  const accentHex = detectAccentHexFromPrompt(promptText);

  return limitCardIntentToTargetScope(
    {
      structuralPresetRequest: detectStructuralPresetRequest(promptText),
      titleModeRequest: detectTitleModeRequest(promptText),
      layout: detectLayoutIntentCandidate(promptText, visibleFields),
      shell: detectShellIntentCandidate(promptText),
      header: detectHeaderIntentCandidate(promptText, accentHex),
      image: detectImageIntentCandidate(promptText),
      info: detectInfoIntentCandidate(promptText, visibleFields),
      field: detectFieldIntentCandidate(promptText, visibleFields, accentHex),
    },
    normalizedInput.targetScope,
  );
}

export function buildCardStyleOpenAiRequestBody({
  cardAiDesign,
  visibleFields,
  productCategoryName,
  openAiModel,
  currentCardStyle,
}) {
  const activeSkillIds = selectCardStyleSkillPackIds({ productCategoryName, mode: 'preview' });
  const scopeInstruction = buildCardAiTargetScopeInstruction(cardAiDesign.targetScope);
  const scopedPrompt = scopeInstruction ? `${scopeInstruction}\n사용자 요청:\n${cardAiDesign.prompt}` : cardAiDesign.prompt;

  return {
    model: openAiModel,
    input: [
      {
        role: 'system',
        content: [
          buildCardStyleAiSystemPrompt(activeSkillIds),
          'Return only a valid JSON object that matches the schema.',
          'Treat the response as an incremental patch over currentCardStyle.',
          'Preserve earlier card edits unless the user explicitly changes them.',
          'For every nested property you do not want to change, return null.',
          'If a target scope is given, only that scope (header/image/info/field) may be non-null. All other area objects must be null.',
          'shell, structuralPresetRequest, and titleModeRequest are general and may be set regardless of the target scope.',
        ].join('\n\n'),
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            request: { ...cardAiDesign, scopeInstruction, scopedPrompt },
            visibleFields,
            currentCardStyle: normalizeCardStyle(currentCardStyle),
          },
          null,
          2,
        ),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'storefront_card_style_suggestion',
        strict: true,
        schema: CARD_STYLE_AI_SCHEMA,
      },
    },
    max_output_tokens: 900,
  };
}

function normalizeShellIntent(rawShell) {
  if (!rawShell) {
    return null;
  }

  const intent = {};

  if (isHexColor(rawShell.backgroundColor)) intent.backgroundColor = normalizeHexColor(rawShell.backgroundColor);
  if (isHexColor(rawShell.borderColor)) intent.borderColor = normalizeHexColor(rawShell.borderColor);
  if (CARD_SHADOW_OPTIONS.includes(rawShell.shadow)) intent.shadow = rawShell.shadow;
  if (CARD_RADIUS_OPTIONS.includes(rawShell.radius)) intent.radius = rawShell.radius;
  if (CARD_SPACING_OPTIONS.includes(rawShell.spacing)) intent.spacing = rawShell.spacing;

  return Object.keys(intent).length > 0 ? intent : null;
}

function normalizeHeaderIntent(rawHeader) {
  if (!rawHeader) {
    return null;
  }

  const intent = {};

  if (isHexColor(rawHeader.backgroundColor)) intent.backgroundColor = normalizeHexColor(rawHeader.backgroundColor);
  if (isHexColor(rawHeader.titleColorHex)) intent.titleColorHex = normalizeHexColor(rawHeader.titleColorHex);
  if (typeof rawHeader.letterSpacing === 'string' && rawHeader.letterSpacing) intent.letterSpacing = rawHeader.letterSpacing;
  if (Number.isFinite(rawHeader.fontWeight)) intent.fontWeight = rawHeader.fontWeight;

  return Object.keys(intent).length > 0 ? intent : null;
}

function normalizeImageIntent(rawImage) {
  if (!rawImage) {
    return null;
  }

  const intent = {};

  if (CARD_IMAGE_FIT_OPTIONS.includes(rawImage.fit)) intent.fit = rawImage.fit;
  if (Number.isFinite(rawImage.sizeDeltaSteps)) intent.sizeDeltaSteps = rawImage.sizeDeltaSteps;

  return Object.keys(intent).length > 0 ? intent : null;
}

function normalizeInfoIntent(rawInfo) {
  if (!rawInfo) {
    return null;
  }

  const intent = {};

  if (isHexColor(rawInfo.backgroundColor)) intent.backgroundColor = normalizeHexColor(rawInfo.backgroundColor);
  if (isHexColor(rawInfo.borderColor)) intent.borderColor = normalizeHexColor(rawInfo.borderColor);
  if (CARD_SPACING_OPTIONS.includes(rawInfo.padding)) intent.padding = rawInfo.padding;
  if (CARD_RADIUS_OPTIONS.includes(rawInfo.radius)) intent.radius = rawInfo.radius;
  if (CARD_SPACING_OPTIONS.includes(rawInfo.fieldGap)) intent.fieldGap = rawInfo.fieldGap;
  if (CARD_SPACING_OPTIONS.includes(rawInfo.fieldGroupGap)) intent.fieldGroupGap = rawInfo.fieldGroupGap;

  const requestedGroups = (Array.isArray(rawInfo.requestedGroups) ? rawInfo.requestedGroups : [])
    .map((group) => ({
      id: toTrimmedString(group?.id),
      label: toTrimmedString(group?.label),
      display: group?.display === 'stack-group' ? 'stack-group' : 'inline-group',
      fields: (Array.isArray(group?.fields) ? group.fields : [])
        .map((field) => toTrimmedString(field))
        .filter(Boolean),
    }))
    .filter((group) => group.id && group.fields.length > 0);

  if (requestedGroups.length > 0) intent.requestedGroups = requestedGroups;

  const requestedFieldOrder = (Array.isArray(rawInfo.requestedFieldOrder) ? rawInfo.requestedFieldOrder : [])
    .map((field) => toTrimmedString(field))
    .filter(Boolean);

  if (requestedFieldOrder.length > 0) intent.requestedFieldOrder = requestedFieldOrder;

  return Object.keys(intent).length > 0 ? intent : null;
}

function normalizeLayoutIntent(rawLayout) {
  if (!rawLayout) {
    return null;
  }

  const intent = {};

  if ([1, 2].includes(Number(rawLayout.cardsPerRow))) intent.cardsPerRow = Number(rawLayout.cardsPerRow);

  const sectionOrder = (Array.isArray(rawLayout.sectionOrder) ? rawLayout.sectionOrder : [])
    .map((section) => toTrimmedString(section))
    .filter(
      (section, index, list) =>
        CARD_LAYOUT_SECTION_OPTIONS.includes(section) && list.indexOf(section) === index,
    );

  if (sectionOrder.length > 0) intent.sectionOrder = sectionOrder;
  if (CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS.includes(rawLayout.imagePlacement)) intent.imagePlacement = rawLayout.imagePlacement;
  if ([1, 2].includes(Number(rawLayout.titleClamp))) intent.titleClamp = Number(rawLayout.titleClamp);
  if (CARD_LAYOUT_CONTENT_DENSITY_OPTIONS.includes(rawLayout.contentDensity)) intent.contentDensity = rawLayout.contentDensity;
  if (CARD_LAYOUT_EMPHASIS_OPTIONS.includes(rawLayout.emphasis)) intent.emphasis = rawLayout.emphasis;
  if (CARD_LAYOUT_GROUPING_HINT_OPTIONS.includes(rawLayout.groupingHint)) intent.groupingHint = rawLayout.groupingHint;

  return Object.keys(intent).length > 0 ? intent : null;
}

function normalizeFieldIntent(rawField) {
  if (!rawField) {
    return null;
  }

  const intent = {};

  if (CARD_FIELD_COLOR_ROLE_OPTIONS.includes(rawField.priceColorRole)) intent.priceColorRole = rawField.priceColorRole;

  if (Array.isArray(rawField.targetedFieldStyles) && rawField.targetedFieldStyles.length > 0) {
    intent.targetedFieldStyles = rawField.targetedFieldStyles
      .filter((style) => toTrimmedString(style?.field))
      .map((style) => ({
        field: toTrimmedString(style.field),
        colorRole: CARD_FIELD_COLOR_ROLE_OPTIONS.includes(style.colorRole) ? style.colorRole : 'inherit',
        fontWeight: CARD_FIELD_FONT_WEIGHT_OPTIONS.includes(style.fontWeight) ? style.fontWeight : 'normal',
        fontSize: CARD_FIELD_FONT_SIZE_OPTIONS.includes(style.fontSize) ? style.fontSize : 'medium',
        emphasis: CARD_FIELD_EMPHASIS_OPTIONS.includes(style.emphasis) ? style.emphasis : 'none',
      }));
  }

  return Object.keys(intent).length > 0 ? intent : null;
}

export function normalizeOpenAiCardIntent(payload, targetScope) {
  return limitCardIntentToTargetScope(
    {
      structuralPresetRequest: toTrimmedString(payload?.structuralPresetRequest) || null,
      titleModeRequest: toTrimmedString(payload?.titleModeRequest) || null,
      layout: normalizeLayoutIntent(payload?.layout),
      shell: normalizeShellIntent(payload?.shell),
      header: normalizeHeaderIntent(payload?.header),
      image: normalizeImageIntent(payload?.image),
      info: normalizeInfoIntent(payload?.info),
      field: normalizeFieldIntent(payload?.field),
    },
    targetScope,
  );
}
