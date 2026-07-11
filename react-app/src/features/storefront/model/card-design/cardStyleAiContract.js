import { toTrimmedString } from '../../../../common/utils/text';
import { buildCardAiTargetScopeInstruction } from './cardAiDesignModel';
import {
  CARD_LAYOUT_CONTENT_DENSITY_OPTIONS,
  CARD_LAYOUT_EMPHASIS_OPTIONS,
  CARD_LAYOUT_GROUPING_HINT_OPTIONS,
  CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS,
  CARD_LAYOUT_SECTION_OPTIONS,
} from './cardLayoutPlanModel';
import {
  CARD_CONDITION_FIELD_OPTIONS,
  CARD_CONDITION_OPERATOR_OPTIONS,
  CARD_FIELD_COLOR_ROLE_OPTIONS,
  CARD_FIELD_EMPHASIS_OPTIONS,
  CARD_FIELD_FONT_SIZE_OPTIONS,
  CARD_FIELD_FONT_WEIGHT_OPTIONS,
  CARD_IMAGE_FIT_OPTIONS,
  CARD_RADIUS_OPTIONS,
  CARD_SHADOW_OPTIONS,
  CARD_SPACING_OPTIONS,
  normalizeCardStyle,
  normalizeConditionalStyleRules,
} from './cardStyleModel';
import {
  CARD_STRUCTURAL_PRESETS,
  CARD_TITLE_MODE_OPTIONS,
} from './cardCompositionModel';
import { isHexColor, normalizeHexColor } from '../page-design/pageStyleColor';
import {
  buildCardStyleAiSystemPrompt,
  selectCardStyleSkillPackIds,
} from '../../services/card-design/cardStyleSkillPromptService';

const HEX_COLOR_SCHEMA_PATTERN = '^#[0-9a-fA-F]{6}$';
const LETTER_SPACING_SCHEMA_PATTERN = '^normal$|^-?\\d+(\\.\\d+)?(em|rem|px)$';
const EXPLANATION_SCHEMA_PATTERN = '^[\\s\\S]{1,200}$';
const SUGGESTION_SCHEMA_PATTERN = '^[\\s\\S]{1,120}$';
const HEADER_FONT_WEIGHT_TOKENS = [400, 500, 600, 700, 800, 900];
const IMAGE_SIZE_DELTA_STEP_TOKENS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
const CARD_STRUCTURAL_PRESET_IDS = Object.keys(CARD_STRUCTURAL_PRESETS);

const NULLABLE_SHELL_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundColor: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description: '카드 바깥 배경색 hex 코드.',
    },
    borderColor: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description: '카드 테두리색 hex 코드.',
    },
    shadow: {
      type: ['string', 'null'],
      enum: [...CARD_SHADOW_OPTIONS, null],
      description: '카드 그림자 강도 토큰.',
    },
    radius: {
      type: ['string', 'null'],
      enum: [...CARD_RADIUS_OPTIONS, null],
      description: '카드 모서리 둥글기 토큰.',
    },
    spacing: {
      type: ['string', 'null'],
      enum: [...CARD_SPACING_OPTIONS, null],
      description: '카드 내부 여백 토큰.',
    },
  },
  required: ['backgroundColor', 'borderColor', 'shadow', 'radius', 'spacing'],
};

const NULLABLE_HEADER_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundColor: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description: '카드 제목 영역 배경색 hex 코드.',
    },
    titleColorHex: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description:
        '카드 제목 글자색 hex 코드. backgroundColor와 대비되게 선택.',
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
  },
  required: ['backgroundColor', 'titleColorHex', 'letterSpacing', 'fontWeight'],
};

const NULLABLE_IMAGE_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    fit: {
      type: ['string', 'null'],
      enum: [...CARD_IMAGE_FIT_OPTIONS, null],
      description: '상품 이미지 채우기 방식 토큰.',
    },
    sizeDeltaSteps: {
      type: ['number', 'null'],
      enum: [...IMAGE_SIZE_DELTA_STEP_TOKENS, null],
      description:
        '이미지 크기를 현재 대비 몇 단계 키우거나 줄일지(-5~5). 음수는 축소, 양수는 확대, 0/null은 변경 없음.',
    },
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
    backgroundColor: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description: '상세정보 영역 배경색 hex 코드.',
    },
    borderColor: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description: '상세정보 영역 테두리색 hex 코드.',
    },
    padding: {
      type: ['string', 'null'],
      enum: [...CARD_SPACING_OPTIONS, null],
      description: '상세정보 영역 내부 여백 토큰.',
    },
    fieldGap: {
      type: ['string', 'null'],
      enum: [...CARD_SPACING_OPTIONS, null],
      description: '필드 간 간격 토큰.',
    },
    fieldGroupGap: {
      type: ['string', 'null'],
      enum: [...CARD_SPACING_OPTIONS, null],
      description: '필드 그룹 간 간격 토큰.',
    },
    requestedGroups: {
      type: ['array', 'null'],
      items: INFO_GROUP_SCHEMA,
      description: '필드를 묶을 그룹 목록. 그룹핑을 바꾸지 않으려면 null.',
    },
    requestedFieldOrder: {
      type: ['array', 'null'],
      items: { type: 'string' },
      description: '필드 표시 순서. 순서를 바꾸지 않으려면 null.',
    },
  },
  required: [
    'backgroundColor',
    'borderColor',
    'padding',
    'fieldGap',
    'fieldGroupGap',
    'requestedGroups',
    'requestedFieldOrder',
  ],
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
      description: '가격 필드 글자색 역할 토큰.',
    },
    targetedFieldStyles: {
      type: ['array', 'null'],
      items: FIELD_STYLE_SCHEMA,
      description: '특정 필드별 개별 스타일 지정 목록.',
    },
  },
  required: ['priceColorRole', 'targetedFieldStyles'],
};

const NULLABLE_LAYOUT_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    cardsPerRow: {
      type: ['number', 'null'],
      enum: [1, 2, null],
      description: '한 줄에 보여줄 카드 개수(1 또는 2).',
    },
    sectionOrder: {
      type: ['array', 'null'],
      items: { type: 'string', enum: CARD_LAYOUT_SECTION_OPTIONS },
      description: '카드 내 섹션(header/image/info) 표시 순서.',
    },
    imagePlacement: {
      type: ['string', 'null'],
      enum: [...CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS, null],
      description: '이미지 배치 위치 토큰.',
    },
    titleClamp: {
      type: ['number', 'null'],
      enum: [1, 2, null],
      description: '상품명 최대 표시 줄 수(1 또는 2).',
    },
    contentDensity: {
      type: ['string', 'null'],
      enum: [...CARD_LAYOUT_CONTENT_DENSITY_OPTIONS, null],
      description: '카드 정보 밀도 토큰.',
    },
    emphasis: {
      type: ['string', 'null'],
      enum: [...CARD_LAYOUT_EMPHASIS_OPTIONS, null],
      description: '카드에서 강조할 요소 토큰.',
    },
    groupingHint: {
      type: ['string', 'null'],
      enum: [...CARD_LAYOUT_GROUPING_HINT_OPTIONS, null],
      description: '필드 그룹핑 방식 힌트 토큰.',
    },
  },
  required: [
    'cardsPerRow',
    'sectionOrder',
    'imagePlacement',
    'titleClamp',
    'contentDensity',
    'emphasis',
    'groupingHint',
  ],
};

const CONDITIONAL_SHELL_STYLE_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundColor: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description: '조건에 맞는 카드만 적용할 바깥 배경색 hex 코드.',
    },
    borderColor: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description: '조건에 맞는 카드만 적용할 테두리색 hex 코드.',
    },
    shadow: {
      type: ['string', 'null'],
      enum: [...CARD_SHADOW_OPTIONS, null],
      description: '조건에 맞는 카드만 적용할 그림자 강도 토큰.',
    },
    radius: {
      type: ['string', 'null'],
      enum: [...CARD_RADIUS_OPTIONS, null],
      description: '조건에 맞는 카드만 적용할 모서리 둥글기 토큰.',
    },
  },
  required: ['backgroundColor', 'borderColor', 'shadow', 'radius'],
};

const CONDITIONAL_IMAGE_STYLE_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    fit: {
      type: ['string', 'null'],
      enum: [...CARD_IMAGE_FIT_OPTIONS, null],
      description: '조건에 맞는 카드만 적용할 이미지 채우기 방식 토큰.',
    },
  },
  required: ['fit'],
};

const CONDITIONAL_INFO_STYLE_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundColor: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description: '조건에 맞는 카드만 적용할 상세정보 영역 배경색 hex 코드.',
    },
    borderColor: {
      type: ['string', 'null'],
      pattern: HEX_COLOR_SCHEMA_PATTERN,
      description: '조건에 맞는 카드만 적용할 상세정보 영역 테두리색 hex 코드.',
    },
    padding: {
      type: ['string', 'null'],
      enum: [...CARD_SPACING_OPTIONS, null],
      description: '조건에 맞는 카드만 적용할 상세정보 영역 내부 여백 토큰.',
    },
    fieldGap: {
      type: ['string', 'null'],
      enum: [...CARD_SPACING_OPTIONS, null],
      description: '조건에 맞는 카드만 적용할 필드 간 간격 토큰.',
    },
  },
  required: ['backgroundColor', 'borderColor', 'padding', 'fieldGap'],
};

const CONDITIONAL_FIELD_STYLE_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    priceColorRole: {
      type: ['string', 'null'],
      enum: [...CARD_FIELD_COLOR_ROLE_OPTIONS, null],
      description: '조건에 맞는 카드만 적용할 가격 필드 글자색 역할 토큰.',
    },
  },
  required: ['priceColorRole'],
};

const CONDITIONAL_STYLE_RULE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    conditionField: {
      type: 'string',
      enum: CARD_CONDITION_FIELD_OPTIONS,
      description:
        '조건을 걸 상품 데이터 필드명. 가격/보조금 등 숫자형 필드는 선택 불가 — 목록에 있는 값만 사용.',
    },
    conditionOperator: {
      type: 'string',
      enum: CARD_CONDITION_OPERATOR_OPTIONS,
      description:
        "'equals'(정확히 일치)와 'contains'(문자열 포함) 중 선택. 실제 데이터 값이 요청 문구와 정확히 같은지 확신할 수 없으면(예: '종자'만 말했는데 실제 값이 '종자류'일 수도 있는 경우) 'contains'를 기본으로 사용.",
    },
    conditionValue: {
      type: 'string',
      description: '비교할 문자열 값(예: 종자).',
    },
    shell: CONDITIONAL_SHELL_STYLE_SCHEMA,
    header: NULLABLE_HEADER_SCHEMA,
    image: CONDITIONAL_IMAGE_STYLE_SCHEMA,
    info: CONDITIONAL_INFO_STYLE_SCHEMA,
    field: CONDITIONAL_FIELD_STYLE_SCHEMA,
  },
  required: [
    'conditionField',
    'conditionOperator',
    'conditionValue',
    'shell',
    'header',
    'image',
    'info',
    'field',
  ],
};

const NULLABLE_CONDITIONAL_STYLES_SCHEMA = {
  type: ['array', 'null'],
  items: CONDITIONAL_STYLE_RULE_SCHEMA,
  description:
    '특정 상품 데이터 조건에 맞는 카드에만 다르게 적용할 스타일 규칙 목록. 색상/굵기/여백 같은 스타일만 가능하고 카드 개수·필드 순서·그룹 같은 구조는 조건부로 바꿀 수 없음(전체 카드에 동일하게 유지됨). 조건부 스타일을 바꾸지 않으려면 null.',
};

export const CARD_STYLE_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    structuralPresetRequest: {
      type: ['string', 'null'],
      enum: [...CARD_STRUCTURAL_PRESET_IDS, null],
      description: '카드 전체 구조 프리셋 id. 구조를 바꾸지 않으려면 null.',
    },
    titleModeRequest: {
      type: ['string', 'null'],
      enum: [...CARD_TITLE_MODE_OPTIONS, null],
      description:
        "제목 표시 방식. 'header'(제목 영역 별도)/'inline'(이미지 위 겹침) 중 선택.",
    },
    layout: NULLABLE_LAYOUT_SCHEMA,
    shell: NULLABLE_SHELL_SCHEMA,
    header: NULLABLE_HEADER_SCHEMA,
    image: NULLABLE_IMAGE_SCHEMA,
    info: NULLABLE_INFO_SCHEMA,
    field: NULLABLE_FIELD_SCHEMA,
    conditionalStyles: NULLABLE_CONDITIONAL_STYLES_SCHEMA,
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
        '같은 카드 내 다른 영역에 대한 추가 제안 한 문장(최대 120자). 없으면 null.',
    },
  },
  required: [
    'structuralPresetRequest',
    'titleModeRequest',
    'layout',
    'shell',
    'header',
    'image',
    'info',
    'field',
    'conditionalStyles',
    'explanation',
    'suggestion',
  ],
};

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

export function buildCardStyleOpenAiRequestBody({
  cardAiDesign,
  visibleFields,
  productCategoryName,
  conditionFieldValueSamples,
  openAiModel,
  currentCardStyle,
  history = [],
}) {
  const activeSkillIds = selectCardStyleSkillPackIds({
    productCategoryName,
    mode: 'preview',
  });
  const scopeInstruction = buildCardAiTargetScopeInstruction(
    cardAiDesign.targetScope,
  );
  const scopedPrompt = scopeInstruction
    ? `${scopeInstruction}\n사용자 요청:\n${cardAiDesign.prompt}`
    : cardAiDesign.prompt;
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
          buildCardStyleAiSystemPrompt(activeSkillIds),
          'Return only a valid JSON object that matches the schema.',
          'Treat the response as an incremental patch over currentCardStyle.',
          'Preserve earlier card edits unless the user explicitly changes them.',
          'For every nested property you do not want to change, return null.',
          'If a target scope is given, only that scope (header/image/info/field) may be non-null. All other area objects must be null.',
          'shell, structuralPresetRequest, titleModeRequest, and conditionalStyles are general and may be set regardless of the target scope.',
          'Use "conditionalStyles" only when the user asks for a style that should apply only to products matching a data condition (e.g. "소분류가 종자인 것은 배경 연두색으로 해줘"). Each rule needs conditionField (an actual product data field), conditionOperator (equals/contains), conditionValue, and only the cosmetic style overrides (shell/header/image/info/field) that were requested — leave everything else null. Never put cardsPerRow, field order, or grouping changes inside a conditionalStyles rule; those stay uniform across the whole section.',
          'This product catalog has FOUR separate category tiers, each a distinct field: large_category = 대분류, medium_category = 중분류, small_category = 소분류, detail_category = 세부분류/세부 분류. When the user names one of these Korean terms, use the exact matching field key — do not guess or substitute a different tier.',
          'The user message JSON includes "conditionFieldValueSamples": real distinct values actually present in this office\'s current product data, grouped by field. Before choosing conditionField/conditionValue for a conditionalStyles rule, check this object first: find which field\'s sample values actually contain or match what the user described, and use that field with a conditionValue drawn from (or closely matching) the real samples. Do not guess a field based on its name alone if the samples disagree — e.g. detail_category\'s samples being crop types like 채소류 means it is the wrong field for a product-type request like 종자, even if "detail" sounds like it could be "소분류".',
          'If, after checking conditionFieldValueSamples, you are NOT confident which field/value the user means — e.g. the word appears in more than one field\'s samples, or it does not clearly match any sample and you would be guessing — do NOT apply a conditionalStyles rule on that guess. Instead set conditionalStyles to null (or omit that rule, keep any other unrelated changes), and use "explanation" to ask the user a short Korean confirmation question naming the specific candidate field(s)/value(s) you found (e.g. "\'종자\'가 중분류(종자종묘)를 말씀하시는 걸까요, 아니면 다른 분류인가요? 확인해주시면 바로 적용할게요."). Only apply the rule once the user confirms in a later message.',
          'Always re-derive conditionField and conditionValue from the user\'s CURRENT message. Do not reuse a conditionField from a previous turn just because the conversation is continuing — if the user restates or corrects the category tier, treat it as the source of truth even if it contradicts an earlier conditionalStyles rule.',
          'Always set "explanation" to 1-2 short Korean sentences describing what you changed, written for a non-technical store owner.',
          'If a clear complementary tweak exists for another section of this same card (header/image/info/field), set "suggestion" to one short Korean sentence describing it. Otherwise set "suggestion" to null. Never suggest changes outside this card.',
        ].join('\n\n'),
      },
      ...historyMessages,
      {
        role: 'user',
        content: JSON.stringify(
          {
            request: { ...cardAiDesign, scopeInstruction, scopedPrompt },
            visibleFields,
            conditionFieldValueSamples: conditionFieldValueSamples ?? {},
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

  if (isHexColor(rawShell.backgroundColor))
    intent.backgroundColor = normalizeHexColor(rawShell.backgroundColor);
  if (isHexColor(rawShell.borderColor))
    intent.borderColor = normalizeHexColor(rawShell.borderColor);
  if (CARD_SHADOW_OPTIONS.includes(rawShell.shadow))
    intent.shadow = rawShell.shadow;
  if (CARD_RADIUS_OPTIONS.includes(rawShell.radius))
    intent.radius = rawShell.radius;
  if (CARD_SPACING_OPTIONS.includes(rawShell.spacing))
    intent.spacing = rawShell.spacing;

  return Object.keys(intent).length > 0 ? intent : null;
}

function normalizeHeaderIntent(rawHeader) {
  if (!rawHeader) {
    return null;
  }

  const intent = {};

  if (isHexColor(rawHeader.backgroundColor))
    intent.backgroundColor = normalizeHexColor(rawHeader.backgroundColor);
  if (isHexColor(rawHeader.titleColorHex))
    intent.titleColorHex = normalizeHexColor(rawHeader.titleColorHex);
  if (typeof rawHeader.letterSpacing === 'string' && rawHeader.letterSpacing)
    intent.letterSpacing = rawHeader.letterSpacing;
  if (Number.isFinite(rawHeader.fontWeight))
    intent.fontWeight = rawHeader.fontWeight;

  return Object.keys(intent).length > 0 ? intent : null;
}

function normalizeImageIntent(rawImage) {
  if (!rawImage) {
    return null;
  }

  const intent = {};

  if (CARD_IMAGE_FIT_OPTIONS.includes(rawImage.fit)) intent.fit = rawImage.fit;
  if (Number.isFinite(rawImage.sizeDeltaSteps))
    intent.sizeDeltaSteps = rawImage.sizeDeltaSteps;

  return Object.keys(intent).length > 0 ? intent : null;
}

function normalizeInfoIntent(rawInfo) {
  if (!rawInfo) {
    return null;
  }

  const intent = {};

  if (isHexColor(rawInfo.backgroundColor))
    intent.backgroundColor = normalizeHexColor(rawInfo.backgroundColor);
  if (isHexColor(rawInfo.borderColor))
    intent.borderColor = normalizeHexColor(rawInfo.borderColor);
  if (CARD_SPACING_OPTIONS.includes(rawInfo.padding))
    intent.padding = rawInfo.padding;
  if (CARD_SPACING_OPTIONS.includes(rawInfo.fieldGap))
    intent.fieldGap = rawInfo.fieldGap;
  if (CARD_SPACING_OPTIONS.includes(rawInfo.fieldGroupGap))
    intent.fieldGroupGap = rawInfo.fieldGroupGap;

  const requestedGroups = (
    Array.isArray(rawInfo.requestedGroups) ? rawInfo.requestedGroups : []
  )
    .map((group) => ({
      id: toTrimmedString(group?.id),
      label: toTrimmedString(group?.label),
      display:
        group?.display === 'stack-group' ? 'stack-group' : 'inline-group',
      fields: (Array.isArray(group?.fields) ? group.fields : [])
        .map((field) => toTrimmedString(field))
        .filter(Boolean),
    }))
    .filter((group) => group.id && group.fields.length > 0);

  if (requestedGroups.length > 0) intent.requestedGroups = requestedGroups;

  const requestedFieldOrder = (
    Array.isArray(rawInfo.requestedFieldOrder)
      ? rawInfo.requestedFieldOrder
      : []
  )
    .map((field) => toTrimmedString(field))
    .filter(Boolean);

  if (requestedFieldOrder.length > 0)
    intent.requestedFieldOrder = requestedFieldOrder;

  return Object.keys(intent).length > 0 ? intent : null;
}

function normalizeLayoutIntent(rawLayout) {
  if (!rawLayout) {
    return null;
  }

  const intent = {};

  if ([1, 2].includes(Number(rawLayout.cardsPerRow)))
    intent.cardsPerRow = Number(rawLayout.cardsPerRow);

  const sectionOrder = (
    Array.isArray(rawLayout.sectionOrder) ? rawLayout.sectionOrder : []
  )
    .map((section) => toTrimmedString(section))
    .filter(
      (section, index, list) =>
        CARD_LAYOUT_SECTION_OPTIONS.includes(section) &&
        list.indexOf(section) === index,
    );

  if (sectionOrder.length > 0) intent.sectionOrder = sectionOrder;
  if (CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS.includes(rawLayout.imagePlacement))
    intent.imagePlacement = rawLayout.imagePlacement;
  if ([1, 2].includes(Number(rawLayout.titleClamp)))
    intent.titleClamp = Number(rawLayout.titleClamp);
  if (CARD_LAYOUT_CONTENT_DENSITY_OPTIONS.includes(rawLayout.contentDensity))
    intent.contentDensity = rawLayout.contentDensity;
  if (CARD_LAYOUT_EMPHASIS_OPTIONS.includes(rawLayout.emphasis))
    intent.emphasis = rawLayout.emphasis;
  if (CARD_LAYOUT_GROUPING_HINT_OPTIONS.includes(rawLayout.groupingHint))
    intent.groupingHint = rawLayout.groupingHint;

  return Object.keys(intent).length > 0 ? intent : null;
}

function normalizeFieldIntent(rawField) {
  if (!rawField) {
    return null;
  }

  const intent = {};

  if (CARD_FIELD_COLOR_ROLE_OPTIONS.includes(rawField.priceColorRole))
    intent.priceColorRole = rawField.priceColorRole;

  if (
    Array.isArray(rawField.targetedFieldStyles) &&
    rawField.targetedFieldStyles.length > 0
  ) {
    intent.targetedFieldStyles = rawField.targetedFieldStyles
      .filter((style) => toTrimmedString(style?.field))
      .map((style) => ({
        field: toTrimmedString(style.field),
        colorRole: CARD_FIELD_COLOR_ROLE_OPTIONS.includes(style.colorRole)
          ? style.colorRole
          : 'inherit',
        fontWeight: CARD_FIELD_FONT_WEIGHT_OPTIONS.includes(style.fontWeight)
          ? style.fontWeight
          : 'normal',
        fontSize: CARD_FIELD_FONT_SIZE_OPTIONS.includes(style.fontSize)
          ? style.fontSize
          : 'medium',
        emphasis: CARD_FIELD_EMPHASIS_OPTIONS.includes(style.emphasis)
          ? style.emphasis
          : 'none',
      }));
  }

  return Object.keys(intent).length > 0 ? intent : null;
}

function normalizeConditionalStylesIntent(rawRules) {
  if (!Array.isArray(rawRules) || rawRules.length === 0) {
    return null;
  }

  const rules = normalizeConditionalStyleRules(rawRules);

  return rules.length > 0 ? rules : null;
}

export function normalizeOpenAiCardIntent(payload, targetScope) {
  return limitCardIntentToTargetScope(
    {
      structuralPresetRequest: CARD_STRUCTURAL_PRESET_IDS.includes(
        payload?.structuralPresetRequest,
      )
        ? payload.structuralPresetRequest
        : null,
      titleModeRequest: CARD_TITLE_MODE_OPTIONS.includes(
        payload?.titleModeRequest,
      )
        ? payload.titleModeRequest
        : null,
      layout: normalizeLayoutIntent(payload?.layout),
      shell: normalizeShellIntent(payload?.shell),
      header: normalizeHeaderIntent(payload?.header),
      image: normalizeImageIntent(payload?.image),
      info: normalizeInfoIntent(payload?.info),
      field: normalizeFieldIntent(payload?.field),
      conditionalStyles: normalizeConditionalStylesIntent(
        payload?.conditionalStyles,
      ),
    },
    targetScope,
  );
}

export function normalizeOpenAiCardExplanation(payload) {
  return {
    explanation:
      toTrimmedString(payload?.explanation) ||
      '요청하신 내용을 카드 디자인에 반영했습니다.',
    suggestion: toTrimmedString(payload?.suggestion) || null,
  };
}
