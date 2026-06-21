import { toTrimmedString } from '../../../common/utils/text';
import { DEFAULT_CARD_STYLE, normalizeCardStyle } from '../model/cardStyleModel';
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
  STOREFRONT_AI_PLAN_TONE_OPTIONS,
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
  STOREFRONT_FIELD_LABELS,
  STOREFRONT_FIELD_OPTIONS,
  normalizeCardFields,
  normalizeNavConfig,
} from '../model/storefrontBuilderModel';
import {
  DEFAULT_CARD_ELEMENT_CONFIG,
  DEFAULT_MOBILE_UI_TREE,
  MOBILE_UI_BLOCK_TYPES,
  MOBILE_UI_SLOTS,
  normalizeCardElementConfig,
  normalizeMobileUiTree,
} from '../model/storefrontUiModel';
import { buildStorefrontAiSystemPrompt, selectStorefrontAiSkillPackIds } from './storefrontAiSkillService';

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const PRICE_FIELD_SET = new Set(['zero_tax_price', 'tax_price', 'exempt_tax_price', 'price_subsidy']);
const NUTRIENT_FIELD_SET = new Set(['nutrient', 'product_nutirent']);

const DESIGN_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    designBrief: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tone: { type: 'string', enum: STOREFRONT_AI_PLAN_TONE_OPTIONS },
        goal: { type: 'string' },
        audience: { type: 'string' },
        priority: { type: 'array', items: { type: 'string' } },
      },
      required: ['tone', 'goal', 'audience', 'priority'],
    },
    transformPlan: {
      type: 'object',
      additionalProperties: false,
      properties: {
        groups: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              display: { type: 'string', enum: STOREFRONT_AI_PLAN_GROUP_DISPLAY_OPTIONS },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    field: { type: 'string' },
                    label: { type: 'string' },
                  },
                  required: ['field', 'label'],
                },
              },
            },
            required: ['id', 'label', 'display', 'items'],
          },
        },
        hideIfEmpty: { type: 'array', items: { type: 'string' } },
        formatRules: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              field: { type: 'string' },
              format: { type: 'string', enum: STOREFRONT_AI_PLAN_FORMAT_OPTIONS },
            },
            required: ['field', 'format'],
          },
        },
      },
      required: ['groups', 'hideIfEmpty', 'formatRules'],
    },
    contentPlan: {
      type: 'object',
      additionalProperties: false,
      properties: {
        blocks: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: STOREFRONT_AI_PLAN_BLOCK_TYPES },
              source: { type: 'string' },
              label: { type: 'string' },
            },
            required: ['id', 'type', 'source', 'label'],
          },
        },
      },
      required: ['blocks'],
    },
    layoutPlan: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cardVariant: { type: 'string', enum: STOREFRONT_AI_PLAN_CARD_VARIANT_OPTIONS },
        density: { type: 'string', enum: STOREFRONT_AI_PLAN_DENSITY_OPTIONS },
        imagePosition: { type: 'string', enum: STOREFRONT_AI_PLAN_IMAGE_POSITION_OPTIONS },
        pricePriority: { type: 'string', enum: STOREFRONT_AI_PLAN_PRICE_PRIORITY_OPTIONS },
      },
      required: ['cardVariant', 'density', 'imagePosition', 'pricePriority'],
    },
    stylePlan: {
      type: 'object',
      additionalProperties: false,
      properties: {
        priceTextColor: { type: 'string', enum: STOREFRONT_AI_PLAN_PRICE_TEXT_COLOR_OPTIONS },
        accentColor: { type: 'string' },
        cardSpacing: { type: 'string', enum: ['tight', 'normal', 'relaxed'] },
        fieldStyles: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              field: { type: 'string' },
              colorRole: { type: 'string', enum: STOREFRONT_AI_PLAN_FIELD_COLOR_ROLE_OPTIONS },
              fontWeight: { type: 'string', enum: STOREFRONT_AI_PLAN_FIELD_FONT_WEIGHT_OPTIONS },
              fontSize: { type: 'string', enum: STOREFRONT_AI_PLAN_FIELD_FONT_SIZE_OPTIONS },
              emphasis: { type: 'string', enum: STOREFRONT_AI_PLAN_FIELD_EMPHASIS_OPTIONS },
            },
            required: ['field', 'colorRole', 'fontWeight', 'fontSize', 'emphasis'],
          },
        },
        regionStyles: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              target: { type: 'string', enum: STOREFRONT_AI_PLAN_REGION_TARGET_OPTIONS },
              property: { type: 'string', enum: STOREFRONT_AI_PLAN_REGION_PROPERTY_OPTIONS },
              value: { type: 'string' },
            },
            required: ['target', 'property', 'value'],
          },
        },
      },
      required: [
        'priceTextColor',
        'accentColor',
        'cardSpacing',
        'fieldStyles',
        'regionStyles',
      ],
    },
  },
  required: ['designBrief', 'transformPlan', 'contentPlan', 'layoutPlan', 'stylePlan'],
};

export const STOREFRONT_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    designPlan: DESIGN_PLAN_SCHEMA,
  },
  required: ['summary', 'designPlan'],
};

function uniqueStrings(values) {
  return (Array.isArray(values) ? values : []).filter(
    (value, index, array) => typeof value === 'string' && value && array.indexOf(value) === index,
  );
}

function parseJsonCandidate(candidate) {
  if (typeof candidate !== 'string' || toTrimmedString(candidate) === '') {
    return null;
  }

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function extractStructuredPayload(responseBody) {
  if (responseBody && typeof responseBody.output_parsed === 'object') {
    return responseBody.output_parsed;
  }

  const parsedOutputText = parseJsonCandidate(responseBody?.output_text);

  if (parsedOutputText) {
    return parsedOutputText;
  }

  if (!Array.isArray(responseBody?.output)) {
    return null;
  }

  for (const outputItem of responseBody.output) {
    if (outputItem?.parsed && typeof outputItem.parsed === 'object') {
      return outputItem.parsed;
    }

    const parsedText = parseJsonCandidate(outputItem?.text);

    if (parsedText) {
      return parsedText;
    }

    if (!Array.isArray(outputItem?.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (contentItem?.parsed && typeof contentItem.parsed === 'object') {
        return contentItem.parsed;
      }

      const parsedContent = parseJsonCandidate(contentItem?.text);

      if (parsedContent) {
        return parsedContent;
      }
    }
  }

  return null;
}

async function readOpenAiError(response) {
  try {
    const errorBody = await response.json();
    const message = toTrimmedString(errorBody?.error?.message);

    if (message) {
      return message;
    }
  } catch {
    // Ignore JSON parsing errors and try plain text next.
  }

  try {
    const text = await response.text();

    return toTrimmedString(text);
  } catch {
    return '';
  }
}

async function requestOpenAiSuggestion(requestBody, openAiApiKey) {
  const response = await fetch(OPENAI_RESPONSES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const openAiErrorMessage = await readOpenAiError(response);
    throw new Error(
      openAiErrorMessage
        ? `OpenAI API request failed: ${openAiErrorMessage}`
        : `OpenAI API request failed with status ${response.status}.`,
    );
  }

  const responseBody = await response.json();
  const structuredPayload = extractStructuredPayload(responseBody);

  if (!structuredPayload) {
    throw new Error('OpenAI returned an unreadable structured response.');
  }

  return structuredPayload;
}

function includesAny(text, tokens) {
  return (Array.isArray(tokens) ? tokens : []).some((token) => text.includes(token));
}

function normalizePromptText(prompt) {
  return toTrimmedString(prompt).toLowerCase();
}

function detectDesignDirection(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['warm', 'cozy', 'soft', '따뜻'])) {
    return 'warm';
  }

  if (includesAny(text, ['green', 'nature', 'organic', '자연', '그린'])) {
    return 'green';
  }

  if (includesAny(text, ['trust', 'official', 'clean', '신뢰', '공식'])) {
    return 'trust';
  }

  if (includesAny(text, ['white', 'minimal', '미니멀', '화이트'])) {
    return 'white';
  }

  return 'friendly';
}

function detectAccentColor(prompt, designDirection) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['blue', '파랑', '블루'])) {
    return '#2563eb';
  }

  if (includesAny(text, ['orange', '주황', '오렌지'])) {
    return '#ea580c';
  }

  if (includesAny(text, ['purple', '보라'])) {
    return '#7c3aed';
  }

  return STOREFRONT_DESIGN_ACCENT_COLORS[designDirection] || DEFAULT_CARD_STYLE.accentColor;
}

function detectLayout(prompt) {
  const text = normalizePromptText(prompt);

  return includesAny(text, ['compact', 'dense', '촘촘', '빽빽']) ? 'compact' : 'grid';
}

function detectFontSize(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['large', 'bigger', '크게', '큰'])) {
    return 'large';
  }

  if (includesAny(text, ['small', 'tight', '작게', '작은'])) {
    return 'small';
  }

  return 'medium';
}

function detectCardsPerRow(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['one column', 'single card', 'one card per row', '1열', '한 줄에 하나'])) {
    return 1;
  }

  if (includesAny(text, ['three', '3 per row', '3열'])) {
    return 3;
  }

  return 2;
}

function detectImageSize(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['hide image', 'without image', '이미지 없이', '이미지 숨'])) {
    return 'hidden';
  }

  if (includesAny(text, ['large image', 'big image', 'hero image', '큰 이미지'])) {
    return 'lg';
  }

  if (includesAny(text, ['small image', '작은 이미지'])) {
    return 'sm';
  }

  return DEFAULT_CARD_STYLE.imageSize;
}

function detectImageFit(prompt) {
  const text = normalizePromptText(prompt);

  return includesAny(text, ['contain', 'uncropped', '전체 보이게', '안 잘리게'])
    ? 'contain'
    : DEFAULT_CARD_STYLE.imageFit;
}

function detectCardRadius(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['sharp', 'square', '각진'])) {
    return 'md';
  }

  if (includesAny(text, ['rounded', 'round', '둥글게'])) {
    return 'xl';
  }

  return DEFAULT_CARD_STYLE.cardRadius;
}

function detectCardShadow(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['flat', 'shadowless', '그림자 없이'])) {
    return 'none';
  }

  if (includesAny(text, ['strong shadow', 'deep shadow', '강한 그림자'])) {
    return 'strong';
  }

  return DEFAULT_CARD_STYLE.cardShadow;
}

function detectCardSpacing(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['dense', 'tight', '촘촘'])) {
    return 'tight';
  }

  if (includesAny(text, ['airy', 'spacious', '여유', '넓게'])) {
    return 'relaxed';
  }

  return DEFAULT_CARD_STYLE.cardSpacing;
}

function detectCardTemplate(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['image left', 'image on the left', '이미지 왼쪽'])) {
    return 'image-left';
  }

  if (includesAny(text, ['price first', 'price focus', '가격 우선', '가격 강조'])) {
    return 'price-focus';
  }

  if (includesAny(text, ['compact list', 'list layout', '리스트 형'])) {
    return 'compact-list';
  }

  if (includesAny(text, ['detail first', 'details first', '상세 먼저'])) {
    return 'detail-first';
  }

  return 'card-grid';
}

function detectPriceTextColor(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['muted price', '가격 차분', '가격 약하게'])) {
    return 'muted';
  }

  if (includesAny(text, ['brand price', 'price brand', '가격 브랜드'])) {
    return 'brand';
  }

  return 'default';
}

const FIELD_STYLE_TARGET_TOKENS = {
  tax_price: ['tax_price', 'tax price', 'tax', '\uacfc\uc138', '\uacfc\uc138\uac00\uaca9'],
  zero_tax_price: ['zero_tax_price', 'zero tax', 'zero-tax', '\uc601\uc138', '\uc601\uc138\uac00\uaca9'],
  exempt_tax_price: ['exempt_tax_price', 'exempt', 'tax exempt', '\uba74\uc138', '\uba74\uc138\uac00\uaca9'],
  price_subsidy: ['price_subsidy', 'subsidy', 'support', '\ubcf4\uc870', '\ubcf4\uc870\uae08'],
  product_name: ['product_name', 'product name', 'name', '\uc0c1\ud488\uba85'],
  spec: ['spec', 'size', '\uaddc\uaca9'],
};

function detectFieldColorRole(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['blue', '\ud30c\ub780', '\ud30c\ub791', '\ube14\ub8e8'])) {
    return 'blue';
  }

  if (includesAny(text, ['red', '\ube68\uac04', '\uc801\uc0c9'])) {
    return 'red';
  }

  if (includesAny(text, ['green', '\ucd08\ub85d', '\uadf8\ub9b0'])) {
    return 'green';
  }

  if (includesAny(text, ['amber', 'yellow', 'orange', '\ub178\ub780', '\uc8fc\ud669'])) {
    return 'amber';
  }

  if (includesAny(text, ['muted', 'gray', 'grey', '\ud68c\uc0c9', '\uc5f0\ud558\uac8c'])) {
    return 'muted';
  }

  if (includesAny(text, ['brand', '\ube0c\ub79c\ub4dc'])) {
    return 'brand';
  }

  return 'default';
}

function detectFieldFontWeight(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['bold', 'bolder', 'strong', '\uad75\uac8c', '\uc9c4\ud558\uac8c', '\uac15\uc870'])) {
    return 'bold';
  }

  if (includesAny(text, ['semibold', 'medium'])) {
    return 'semibold';
  }

  if (includesAny(text, ['normal', '\ubcf4\ud1b5'])) {
    return 'normal';
  }

  return 'default';
}

function detectFieldFontSize(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['large', 'bigger', 'big', '\ud06c\uac8c', '\ud070'])) {
    return 'large';
  }

  if (includesAny(text, ['small', 'smaller', '\uc791\uac8c', '\uc791\uc740'])) {
    return 'small';
  }

  return 'default';
}

function detectFieldStyles(prompt, visibleFields) {
  const text = normalizePromptText(prompt);
  const colorRole = detectFieldColorRole(prompt);
  const fontWeight = detectFieldFontWeight(prompt);
  const fontSize = detectFieldFontSize(prompt);

  if (colorRole === 'default' && fontWeight === 'default' && fontSize === 'default') {
    return [];
  }

  return uniqueStrings(Array.isArray(visibleFields) ? visibleFields : [])
    .filter((field) => includesAny(text, FIELD_STYLE_TARGET_TOKENS[field] ?? [field]))
    .map((field) => ({
      field,
      colorRole,
      fontWeight,
      fontSize,
      emphasis: colorRole !== 'default' || fontWeight === 'bold' ? 'strong' : 'none',
    }));
}

function detectRegionStyles(prompt) {
  const text = normalizePromptText(prompt);
  const regionStyles = [];

  if (includesAny(text, ['one card per row', 'single card per row', '1 card per row', '1 column', '\ud55c \uc904\uc5d0 1\uac1c'])) {
    regionStyles.push({ target: 'cardGrid', property: 'columns', value: '1' });
  }

  if (includesAny(text, ['horizontal scroll', 'scrollable chips', 'single-row chips', '\uac00\ub85c \uc2a4\ud06c\ub864'])) {
    regionStyles.push({ target: 'category', property: 'layout', value: 'single-row-scroll' });
  }

  if (includesAny(text, ['large search', 'bigger search', '\uac80\uc0c9\ucc3d \ud06c\uac8c'])) {
    regionStyles.push({ target: 'search', property: 'size', value: 'large' });
  }

  return regionStyles;
}

function detectSearchVariant(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['outlined search', 'outline search', 'search outline', '검색창 테두리'])) {
    return 'outlined';
  }

  if (includesAny(text, ['soft search', '검색창 부드럽'])) {
    return 'soft';
  }

  return DEFAULT_NAV_CONFIG.searchVariant;
}

function detectCategoryChipVariant(prompt) {
  const text = normalizePromptText(prompt);

  if (includesAny(text, ['filled chip', 'filled tabs', '채운 칩'])) {
    return 'filled';
  }

  if (includesAny(text, ['outline chip', 'outlined chip', 'chip outline', '칩 테두리'])) {
    return 'outline';
  }

  return DEFAULT_NAV_CONFIG.categoryChipVariant;
}

function detectFields(prompt, allowedScalarKeys) {
  const text = normalizePromptText(prompt);
  const fields = ['product_name'];

  if (includesAny(text, ['spec', '규격'])) {
    fields.push('spec');
  }

  if (includesAny(text, ['nutrient', '성분'])) {
    fields.push('nutrient');
  }

  if (includesAny(text, ['price', '가격', '과세'])) {
    fields.push('tax_price');
  }

  if (includesAny(text, ['zero tax', '영세'])) {
    fields.push('zero_tax_price');
  }

  if (includesAny(text, ['exempt', '면세'])) {
    fields.push('exempt_tax_price');
  }

  if (includesAny(text, ['subsidy', '보조'])) {
    fields.push('price_subsidy');
  }

  if (includesAny(text, ['link', 'url', '링크'])) {
    fields.push('product_url');
  }

  return normalizeCardFields(fields.length > 1 ? fields : DEFAULT_CARD_FIELDS, allowedScalarKeys);
}

function normalizeSelectedMediumCategories(selectedMediumCategories, mediumCategoryOptions) {
  const options = Array.isArray(mediumCategoryOptions) ? mediumCategoryOptions : [];
  const candidateValues = Array.isArray(selectedMediumCategories) ? selectedMediumCategories : [];
  const normalized = candidateValues.filter(
    (value, index) => options.includes(value) && candidateValues.indexOf(value) === index,
  );

  return normalized.length > 0 ? normalized : options;
}

function normalizeUiChangeSummary(uiChangeSummary) {
  return (Array.isArray(uiChangeSummary) ? uiChangeSummary : [])
    .map((item) => toTrimmedString(item))
    .filter(Boolean);
}

function normalizeLegacyPatch(patch, mediumCategoryOptions, allowedScalarKeys, currentDraft) {
  const source = patch ?? {};
  const normalizedSelectedMediumCategories = normalizeSelectedMediumCategories(
    source.selectedMediumCategories ?? currentDraft?.selectedMediumCategories,
    mediumCategoryOptions,
  );
  const requestedRepresentativeMediumCategory = toTrimmedString(
    source.representativeMediumCategory ?? currentDraft?.representativeMediumCategory,
  );
  const representativeMediumCategory = normalizedSelectedMediumCategories.includes(requestedRepresentativeMediumCategory)
    ? requestedRepresentativeMediumCategory
    : normalizedSelectedMediumCategories[0] || mediumCategoryOptions[0] || '';

  return {
    designDirection: STOREFRONT_AI_PLAN_TONE_OPTIONS.includes(source.designDirection)
      ? source.designDirection
      : currentDraft?.designDirection || 'friendly',
    selectedMediumCategories: normalizedSelectedMediumCategories,
    representativeMediumCategory,
    cardFields: normalizeCardFields(source.cardFields ?? currentDraft?.cardFields, allowedScalarKeys),
    cardTemplate: CARD_TEMPLATE_OPTIONS.includes(source.cardTemplate)
      ? source.cardTemplate
      : currentDraft?.cardTemplate || 'card-grid',
    cardStyle: normalizeCardStyle({
      ...(currentDraft?.cardStyle ?? {}),
      ...(source.cardStyle ?? {}),
    }),
    navConfig: normalizeNavConfig({
      ...(currentDraft?.navConfig ?? {}),
      ...(source.navConfig ?? {}),
    }),
    mobileUiTree: normalizeMobileUiTree(source.mobileUiTree ?? currentDraft?.mobileUiTree ?? DEFAULT_MOBILE_UI_TREE),
    cardElementConfig: normalizeCardElementConfig({
      ...(currentDraft?.cardElementConfig ?? DEFAULT_CARD_ELEMENT_CONFIG),
      ...(source.cardElementConfig ?? {}),
    }),
    uiChangeSummary: normalizeUiChangeSummary(source.uiChangeSummary),
  };
}

function wantsInlineGrouping(prompt) {
  const text = normalizePromptText(prompt);

  return includesAny(text, ['1줄', '한 줄', '한줄', 'inline', 'compare', '비교', '통합', '묶']);
}

function buildSemanticGroups({ prompt, visibleFields, editPolicy }) {
  const normalizedPolicy = normalizeStorefrontEditPolicy(editPolicy);

  if (!normalizedPolicy.allowSemanticGrouping) {
    return [];
  }

  const priceFields = visibleFields.filter((field) => PRICE_FIELD_SET.has(field));

  if (priceFields.length >= 2 && wantsInlineGrouping(prompt)) {
    return [
      {
        id: 'price-compare',
        label: '가격',
        display: 'inline-compare',
        items: priceFields.map((field) => ({
          field,
          label: STOREFRONT_FIELD_LABELS[field] || field,
        })),
      },
    ];
  }

  return [];
}

function buildContentBlocks(visibleFields, groups) {
  const groupedFieldIds = new Set(groups.flatMap((group) => group.items.map((item) => item.field)));
  const blocks = [];
  let hasInsertedPriceGroup = false;

  visibleFields.forEach((field, index) => {
    const owningGroup = groups.find((group) => group.items.some((item) => item.field === field));

    if (owningGroup) {
      if (!hasInsertedPriceGroup) {
        blocks.push({
          id: owningGroup.id,
          type: 'group',
          source: owningGroup.id,
          label: owningGroup.label,
        });
        hasInsertedPriceGroup = true;
      }

      return;
    }

    if (groupedFieldIds.has(field)) {
      return;
    }

    blocks.push({
      id: `${field}-${index}`,
      type: 'field',
      source: field,
      label: '',
    });
  });

  return blocks;
}

function buildDesignPlanFromLegacyPatch({ patch, prompt, allowedScalarKeys, editPolicy }) {
  const visibleFields = normalizeCardFields(patch.cardFields, allowedScalarKeys);
  const groups = buildSemanticGroups({ prompt, visibleFields, editPolicy });
  const density = patch.cardStyle.layout === 'compact' ? 'compact' : 'comfortable';
  const imagePosition = patch.cardStyle.imageSize === 'hidden' ? 'hidden' : patch.cardTemplate === 'image-left' ? 'left' : 'top';

  return normalizeStorefrontDesignPlan(
    {
      designBrief: {
        tone: patch.designDirection,
        goal: `Present ${toTrimmedString(prompt) || 'products'} clearly.`,
        audience: 'Storefront visitors',
        priority: visibleFields,
      },
      transformPlan: {
        groups,
        hideIfEmpty: [],
        formatRules: visibleFields
          .filter((field) => PRICE_FIELD_SET.has(field))
          .map((field) => ({ field, format: 'currency' })),
      },
      contentPlan: {
        blocks: buildContentBlocks(visibleFields, groups),
      },
      layoutPlan: {
        cardVariant: patch.cardTemplate,
        density,
        imagePosition,
        pricePriority: patch.cardTemplate === 'price-focus' ? 'high' : 'default',
      },
      stylePlan: {
        priceTextColor: patch.cardStyle.priceTextColor,
        accentColor: patch.cardStyle.accentColor,
        cardSpacing: patch.cardStyle.cardSpacing,
        fieldStyles: detectFieldStyles(prompt, visibleFields),
        regionStyles: detectRegionStyles(prompt),
      },
    },
    allowedScalarKeys,
  );
}

function buildAiChangeSummary({ designPlan, fallbackPatch, compiledPatch }) {
  const summary = normalizeUiChangeSummary(fallbackPatch?.uiChangeSummary);

  if (summary.length > 0) {
    return summary;
  }

  const changes = [];

  if (compiledPatch.cardTemplate !== 'card-grid') {
    changes.push(`Switch card layout to ${compiledPatch.cardTemplate}.`);
  }

  if (designPlan.transformPlan.groups.length > 0) {
    changes.push(`Group ${designPlan.transformPlan.groups[0].label} fields on one row.`);
  }

  if (compiledPatch.cardStyle.priceTextColor !== 'default' || compiledPatch.cardTemplate === 'price-focus') {
    changes.push('Increase price readability.');
  }

  return changes.length > 0 ? changes : ['Refresh storefront presentation.'];
}

function compileLegacyPatchFromDesignPlan({
  designPlan,
  fallbackPatch,
  mediumCategoryOptions,
  currentDraft,
  allowedScalarKeys,
}) {
  const visibleFields = normalizeCardFields(
    collectStorefrontDesignPlanFieldKeys(designPlan),
    allowedScalarKeys,
  );
  const accentColor =
    toTrimmedString(designPlan.stylePlan.accentColor) ||
    fallbackPatch.cardStyle.accentColor ||
    currentDraft?.cardStyle?.accentColor ||
    STOREFRONT_DESIGN_ACCENT_COLORS[designPlan.designBrief.tone] ||
    DEFAULT_CARD_STYLE.accentColor;
  const baseCardStyle = normalizeCardStyle({
    ...(currentDraft?.cardStyle ?? {}),
    ...(fallbackPatch.cardStyle ?? {}),
    accentColor,
    layout: designPlan.layoutPlan.density === 'compact' ? 'compact' : 'grid',
    imageSize:
      designPlan.layoutPlan.imagePosition === 'hidden'
        ? 'hidden'
        : fallbackPatch.cardStyle.imageSize,
    cardSpacing: designPlan.stylePlan.cardSpacing,
    priceTextColor: designPlan.stylePlan.priceTextColor,
  });
  const selectedMediumCategories = normalizeSelectedMediumCategories(
    fallbackPatch.selectedMediumCategories ?? currentDraft?.selectedMediumCategories,
    mediumCategoryOptions,
  );
  const representativeMediumCategory =
    selectedMediumCategories.includes(fallbackPatch.representativeMediumCategory)
      ? fallbackPatch.representativeMediumCategory
      : selectedMediumCategories[0] || mediumCategoryOptions[0] || '';
  const nextCardElementConfig = normalizeCardElementConfig({
    ...(currentDraft?.cardElementConfig ?? DEFAULT_CARD_ELEMENT_CONFIG),
    ...(fallbackPatch.cardElementConfig ?? {}),
    showImage: designPlan.layoutPlan.imagePosition !== 'hidden',
    showProductName: visibleFields.includes('product_name'),
    showSpec: visibleFields.includes('spec'),
    showNutrient: visibleFields.some((field) => NUTRIENT_FIELD_SET.has(field)),
    showPrice: visibleFields.some((field) => PRICE_FIELD_SET.has(field)),
    imageSize: baseCardStyle.imageSize,
    imageFit: baseCardStyle.imageFit,
    metaDensity: designPlan.layoutPlan.density === 'compact' ? 'compact' : 'comfortable',
  });
  const navConfig = normalizeNavConfig({
    ...(currentDraft?.navConfig ?? {}),
    ...(fallbackPatch.navConfig ?? {}),
    brandColor: accentColor,
  });
  const compiledPatch = {
    designDirection: designPlan.designBrief.tone,
    selectedMediumCategories,
    representativeMediumCategory,
    cardFields: visibleFields,
    cardTemplate: designPlan.layoutPlan.cardVariant,
    cardStyle: baseCardStyle,
    navConfig,
    mobileUiTree: normalizeMobileUiTree(
      fallbackPatch.mobileUiTree ?? currentDraft?.mobileUiTree ?? DEFAULT_MOBILE_UI_TREE,
    ),
    cardElementConfig: nextCardElementConfig,
    uiChangeSummary: [],
  };

  compiledPatch.uiChangeSummary = buildAiChangeSummary({
    designPlan,
    fallbackPatch,
    compiledPatch,
  });

  return compiledPatch;
}

export function buildHeuristicSuggestion({
  prompt,
  mediumCategoryOptions,
  currentDraft,
  allowedScalarKeys,
  editPolicy = DEFAULT_STOREFRONT_EDIT_POLICY,
  activeSkillIds = [],
}) {
  const designDirection = detectDesignDirection(prompt);
  const accentColor = detectAccentColor(prompt, designDirection);
  const selectedMediumCategories = normalizeSelectedMediumCategories(
    currentDraft?.selectedMediumCategories,
    mediumCategoryOptions,
  );
  const representativeMediumCategory = selectedMediumCategories[0] || mediumCategoryOptions[0] || '';
  const primaryLabel = currentDraft?.productCategoryName || representativeMediumCategory || 'Products';
  const fallbackPatch = normalizeLegacyPatch(
    {
      designDirection,
      selectedMediumCategories,
      representativeMediumCategory,
      cardFields: detectFields(prompt, allowedScalarKeys),
      cardTemplate: detectCardTemplate(prompt),
      cardStyle: {
        layout: detectLayout(prompt),
        accentColor,
        fontSize: detectFontSize(prompt),
        cardsPerRow: detectCardsPerRow(prompt),
        imageSize: detectImageSize(prompt),
        imageFit: detectImageFit(prompt),
        cardRadius: detectCardRadius(prompt),
        cardShadow: detectCardShadow(prompt),
        cardSpacing: detectCardSpacing(prompt),
        priceTextColor: detectPriceTextColor(prompt),
      },
      navConfig: {
        title: `${primaryLabel} Guide`,
        subtitle: 'AI-generated draft for the storefront',
        brandColor: accentColor,
        searchPlaceholder: `Search ${String(primaryLabel).toLowerCase()}`,
        logoUrl: currentDraft?.navConfig?.logoUrl ?? '',
        searchVariant: detectSearchVariant(prompt),
        categoryChipVariant: detectCategoryChipVariant(prompt),
      },
      mobileUiTree: normalizeMobileUiTree(currentDraft?.mobileUiTree ?? DEFAULT_MOBILE_UI_TREE),
      cardElementConfig: normalizeCardElementConfig(
        currentDraft?.cardElementConfig ?? {
          showImage: detectImageSize(prompt) !== 'hidden',
          showProductName: true,
          showSpec: true,
          showNutrient: true,
          showPrice: true,
          showBadge: true,
          imageSize: detectImageSize(prompt),
          imageFit: detectImageFit(prompt),
          metaDensity: detectLayout(prompt) === 'compact' ? 'compact' : 'comfortable',
        },
      ),
    },
    mediumCategoryOptions,
    allowedScalarKeys,
    currentDraft,
  );
  const designPlan = buildDesignPlanFromLegacyPatch({
    patch: fallbackPatch,
    prompt,
    allowedScalarKeys,
    editPolicy,
  });
  const patch = compileLegacyPatchFromDesignPlan({
    designPlan,
    fallbackPatch,
    mediumCategoryOptions,
    currentDraft,
    allowedScalarKeys,
  });

  return {
    summary: `${primaryLabel} draft updated for a ${designDirection} web page.`,
    activeSkillIds: uniqueStrings(activeSkillIds),
    designPlan,
    renderSpec: compileStorefrontRenderSpec(designPlan),
    patch,
  };
}

function buildOpenAiRequestBody({
  prompt,
  mediumCategoryOptions,
  fieldCatalog,
  currentDraft,
  editPolicy,
  activeSkillIds,
  openAiModel,
}) {
  return {
    model: openAiModel,
    input: [
      {
        role: 'system',
        content: [
          buildStorefrontAiSystemPrompt(activeSkillIds),
          'Return only a valid JSON object that matches the schema.',
          'Use designPlan to describe the page, especially content grouping and card emphasis.',
          'Never invent product fields or medium categories outside the provided options.',
        ].join('\n\n'),
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            request: prompt,
            currentDraft,
            mediumCategoryOptions,
            fieldCatalog: (Array.isArray(fieldCatalog) ? fieldCatalog : []).map((field) => ({
              key: field.key,
              label: field.label,
              exampleValue: field.exampleValue,
              isSelectable: field.isSelectable,
            })),
            editPolicy: normalizeStorefrontEditPolicy(editPolicy),
            designDirectionOptions: STOREFRONT_AI_PLAN_TONE_OPTIONS,
            allowedFields: STOREFRONT_FIELD_OPTIONS,
            fieldLabels: STOREFRONT_FIELD_LABELS,
            allowedCardVariants: STOREFRONT_AI_PLAN_CARD_VARIANT_OPTIONS,
            allowedDensities: STOREFRONT_AI_PLAN_DENSITY_OPTIONS,
            allowedImagePositions: STOREFRONT_AI_PLAN_IMAGE_POSITION_OPTIONS,
            allowedPricePriorities: STOREFRONT_AI_PLAN_PRICE_PRIORITY_OPTIONS,
            allowedPriceTextColors: STOREFRONT_AI_PLAN_PRICE_TEXT_COLOR_OPTIONS,
            allowedFieldStyleOptions: {
              colorRoles: STOREFRONT_AI_PLAN_FIELD_COLOR_ROLE_OPTIONS,
              fontWeights: STOREFRONT_AI_PLAN_FIELD_FONT_WEIGHT_OPTIONS,
              fontSizes: STOREFRONT_AI_PLAN_FIELD_FONT_SIZE_OPTIONS,
              emphasis: STOREFRONT_AI_PLAN_FIELD_EMPHASIS_OPTIONS,
            },
            allowedRegionStyleTargets: STOREFRONT_AI_PLAN_REGION_TARGET_OPTIONS,
            allowedRegionStylePropertiesByTarget: STOREFRONT_AI_PLAN_REGION_PROPERTIES_BY_TARGET,
          },
          null,
          2,
        ),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'storefront_ai_suggestion',
        strict: true,
        schema: STOREFRONT_AI_SCHEMA,
      },
    },
    max_output_tokens: 2000,
  };
}

export function normalizeStorefrontAiSuggestion(
  payload,
  mediumCategoryOptions,
  allowedScalarKeys,
  options = {},
) {
  const currentDraft = options.currentDraft ?? {};
  const fallbackPrompt = toTrimmedString(options.prompt);
  const normalizedFallbackPatch = normalizeLegacyPatch(
    payload?.patch,
    mediumCategoryOptions,
    allowedScalarKeys,
    currentDraft,
  );
  const designPlan =
    payload?.designPlan
      ? normalizeStorefrontDesignPlan(payload.designPlan, allowedScalarKeys)
      : buildDesignPlanFromLegacyPatch({
          patch: normalizedFallbackPatch,
          prompt: fallbackPrompt,
          allowedScalarKeys,
          editPolicy: options.editPolicy ?? DEFAULT_STOREFRONT_EDIT_POLICY,
        });
  const patch = compileLegacyPatchFromDesignPlan({
    designPlan,
    fallbackPatch: normalizedFallbackPatch,
    mediumCategoryOptions,
    currentDraft,
    allowedScalarKeys,
  });

  return {
    summary: toTrimmedString(payload?.summary) || 'AI draft applied.',
    activeSkillIds: uniqueStrings((Array.isArray(options.activeSkillIds) ? options.activeSkillIds : []).map(toTrimmedString)),
    designPlan,
    renderSpec: compileStorefrontRenderSpec(designPlan),
    patch,
  };
}

export async function requestStorefrontAiSuggestion({
  prompt,
  mediumCategoryOptions,
  fieldCatalog,
  currentDraft,
  allowedScalarKeys,
  editPolicy = DEFAULT_STOREFRONT_EDIT_POLICY,
}) {
  const normalizedPrompt = toTrimmedString(prompt);

  if (!normalizedPrompt) {
    throw new Error('Enter an AI request first.');
  }

  const activeSkillIds = selectStorefrontAiSkillPackIds({
    productCategoryName: currentDraft?.productCategoryName,
    editPolicy,
    mode: 'preview',
  });
  const openAiApiKey = toTrimmedString(import.meta.env.VITE_OPENAI_API_KEY);

  if (!openAiApiKey) {
    return buildHeuristicSuggestion({
      prompt: normalizedPrompt,
      mediumCategoryOptions,
      currentDraft,
      allowedScalarKeys,
      editPolicy,
      activeSkillIds,
    });
  }

  const openAiModel = toTrimmedString(import.meta.env.VITE_OPENAI_MODEL) || DEFAULT_OPENAI_MODEL;
  const payload = await requestOpenAiSuggestion(
    buildOpenAiRequestBody({
      prompt: normalizedPrompt,
      mediumCategoryOptions,
      fieldCatalog,
      currentDraft,
      editPolicy,
      activeSkillIds,
      openAiModel,
    }),
    openAiApiKey,
  );

  return normalizeStorefrontAiSuggestion(payload, mediumCategoryOptions, allowedScalarKeys, {
    currentDraft,
    prompt: normalizedPrompt,
    editPolicy,
    activeSkillIds,
  });
}
