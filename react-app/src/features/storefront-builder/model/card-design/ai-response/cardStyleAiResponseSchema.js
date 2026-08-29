import { toTrimmedString } from '../../../../../common/utils/text';
import { buildCardAiTargetScopeInstruction } from '../ai-request/cardAiDesignModel';
import {
  CARD_LAYOUT_CONTENT_DENSITY_OPTIONS,
  CARD_LAYOUT_EMPHASIS_OPTIONS,
  CARD_LAYOUT_GROUPING_HINT_OPTIONS,
  CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS,
  CARD_LAYOUT_SECTION_OPTIONS,
} from '../../../../storefront-view/model/card-design/style/cardLayoutPlanModel';
import {
  CARD_CONDITION_FIELD_OPTIONS,
  CARD_CONDITION_OPERATOR_OPTIONS,
  CARD_FIELD_COLOR_ROLE_OPTIONS,
  CARD_FIELD_EMPHASIS_OPTIONS,
  CARD_FIELD_FONT_SIZE_OPTIONS,
  CARD_FIELD_FONT_WEIGHT_OPTIONS,
  CARD_HEADER_TITLE_SIZE_TOKENS,
  CARD_IMAGE_FIT_OPTIONS,
  CARD_RADIUS_OPTIONS,
  CARD_SHADOW_OPTIONS,
  CARD_SPACING_OPTIONS,
  normalizeCardStyle,
  normalizeConditionalStyleRules,
} from '../../../../storefront-view/model/card-design/style/cardStyleModel';
import {
  CARD_STRUCTURAL_PRESETS,
  CARD_TITLE_MODE_OPTIONS,
} from '../../../../storefront-view/model/card-design/style/cardCompositionModel';
import { isHexColor, normalizeHexColor } from '../../../../storefront-view/model/shared/pageStyleColor';
import {
  buildCardStyleAiSystemPrompt,
  selectCardStyleSkillPackIds,
} from '../../../services/card-design/cardStyleSkillPromptService';

const HEX_COLOR_SCHEMA_PATTERN = '^#[0-9a-fA-F]{6}$';
const EXPLANATION_SCHEMA_PATTERN = '^[\\s\\S]{1,200}$';
const SUGGESTION_SCHEMA_PATTERN = '^[\\s\\S]{1,120}$';
const HEADER_FONT_WEIGHT_TOKENS = [400, 500, 600, 700, 800, 900];
const IMAGE_SIZE_DELTA_STEP_TOKENS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
const CARD_STRUCTURAL_PRESET_IDS = Object.keys(CARD_STRUCTURAL_PRESETS);

const NULLABLE_SHELL_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
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
  required: ['borderColor', 'shadow', 'radius', 'spacing'],
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
    fontWeight: {
      type: ['number', 'null'],
      enum: [...HEADER_FONT_WEIGHT_TOKENS, null],
      description:
        '제목 글자 굵기. 400(보통)~900(매우 굵게) 중 100 단위 값만 선택.',
    },
    titleSizeToken: {
      type: ['string', 'null'],
      enum: [...CARD_HEADER_TITLE_SIZE_TOKENS, null],
      description:
        "제목 글자 크기 단계. 'xs'(가장 작게)~'xxl'(가장 크게) 6단계이며 'md'가 기본. 카드 본문 글자 크기에 더해지는 상대 단계입니다.",
    },
  },
  required: ['backgroundColor', 'titleColorHex', 'fontWeight', 'titleSizeToken'],
};

// Conditional rules stay on the narrower legacy header shape: their overrides are
// applied as inline CSS vars per card, which only covers colour and weight.
const CONDITIONAL_HEADER_STYLE_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    backgroundColor: NULLABLE_HEADER_SCHEMA.properties.backgroundColor,
    titleColorHex: NULLABLE_HEADER_SCHEMA.properties.titleColorHex,
    fontWeight: NULLABLE_HEADER_SCHEMA.properties.fontWeight,
  },
  required: ['backgroundColor', 'titleColorHex', 'fontWeight'],
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
    requestedGroups: {
      type: ['array', 'null'],
      items: INFO_GROUP_SCHEMA,
      description:
        '추가하거나 수정할 그룹만 담는 목록. 기존 그룹은 그대로 유지되고 같은 id면 덮어씁니다. 그룹핑을 바꾸지 않으려면 null, 모든 그룹을 해제하려면 빈 배열.',
    },
    removeGroupIds: {
      type: ['array', 'null'],
      items: { type: 'string' },
      description: '해제할 그룹 id 목록. 특정 묶음 하나만 풀 때 사용. 그 외에는 null.',
    },
    requestedFieldOrder: {
      type: ['array', 'null'],
      items: { type: 'string' },
      description: '필드 표시 순서. 순서를 바꾸지 않으려면 null.',
    },
    labelColorRole: {
      type: ['string', 'null'],
      enum: [...CARD_FIELD_COLOR_ROLE_OPTIONS, null],
      description: '항목 이름(라벨) 글자색 역할 토큰. 값이 아니라 라벨에만 적용.',
    },
    labelFontSizeToken: {
      type: ['string', 'null'],
      enum: [...CARD_FIELD_FONT_SIZE_OPTIONS, null],
      description:
        "항목 이름(라벨) 글자 크기 단계. 'xs'(가장 작게)~'xxl'(가장 크게) 6단계이며 'md'가 기본.",
    },
    labelFontWeight: {
      type: ['number', 'null'],
      enum: [...CARD_FIELD_FONT_WEIGHT_OPTIONS, null],
      description:
        '항목 이름(라벨) 글자 굵기. 400(보통)~900(매우 굵게) 중 100 단위 값. 기본 600.',
    },
  },
  required: [
    'backgroundColor',
    'labelColorRole',
    'labelFontSizeToken',
    'labelFontWeight',
    'requestedGroups',
    'removeGroupIds',
    'requestedFieldOrder',
  ],
};

const FIELD_STYLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    field: { type: 'string' },
    colorRole: { type: 'string', enum: CARD_FIELD_COLOR_ROLE_OPTIONS },
    fontWeight: { type: 'number', enum: CARD_FIELD_FONT_WEIGHT_OPTIONS },
    fontSize: { type: 'string', enum: CARD_FIELD_FONT_SIZE_OPTIONS },
    emphasis: { type: 'string', enum: CARD_FIELD_EMPHASIS_OPTIONS },
  },
  required: ['field', 'colorRole', 'fontWeight', 'fontSize', 'emphasis'],
};

const NULLABLE_FIELD_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    defaultColorRole: {
      type: ['string', 'null'],
      enum: [...CARD_FIELD_COLOR_ROLE_OPTIONS, null],
      description: '모든 항목 값의 기본 글자색 역할 토큰.',
    },
    defaultFontWeight: {
      type: ['number', 'null'],
      enum: [...CARD_FIELD_FONT_WEIGHT_OPTIONS, null],
      description:
        '모든 항목 값의 기본 글자 굵기. 400(보통)~900(매우 굵게) 중 100 단위 값.',
    },
    defaultFontSize: {
      type: ['string', 'null'],
      enum: [...CARD_FIELD_FONT_SIZE_OPTIONS, null],
      description:
        "카드 기준 글자 크기 단계. 'xs'~'xxl' 6단계이며 'md'가 기본. 제목 크기도 이 값을 기준으로 계산됩니다.",
    },
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
  required: [
    'defaultColorRole',
    'defaultFontWeight',
    'defaultFontSize',
    'priceColorRole',
    'targetedFieldStyles',
  ],
};

const NULLABLE_LAYOUT_SCHEMA = {
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    // cardsPerRow is deliberately absent: it is a user-only control, set through the
    // builder UI. Offering it here let the AI override the merchant's choice.
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
  required: ['sectionOrder', 'imagePlacement', 'contentDensity', 'emphasis', 'groupingHint'],
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
  },
  required: ['backgroundColor'],
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
    header: CONDITIONAL_HEADER_STYLE_SCHEMA,
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


