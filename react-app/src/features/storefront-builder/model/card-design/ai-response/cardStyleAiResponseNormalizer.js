import { toTrimmedString } from '../../../../../common/utils/text';
import { buildCardAiTargetScopeInstruction } from '../ai-request/cardAiDesignModel';
import {
  CARD_LAYOUT_CONTENT_DENSITY_OPTIONS,
  CARD_LAYOUT_EMPHASIS_OPTIONS,
  CARD_LAYOUT_GROUPING_HINT_OPTIONS,
  CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS,
  CARD_LAYOUT_SECTION_OPTIONS,
} from '../../../../storefront-view/model/card-style/cardLayoutPlanModel';
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
} from '../../../../storefront-view/model/card-style/cardStyleModel';
import {
  CARD_STRUCTURAL_PRESETS,
  CARD_TITLE_MODE_OPTIONS,
} from '../../../../storefront-view/model/card-style/cardCompositionModel';
import { isHexColor, normalizeHexColor } from '../../../../storefront-view/model/shared/styleColor';
import {
  buildCardStyleAiSystemPrompt,
  selectCardStyleSkillPackIds,
} from '../../../services/card-design/cardStyleSkillPromptService';

const CARD_STYLE_AI_DEFAULT_EXPLANATION_MESSAGE = '요청하신 내용을 카드 디자인에 반영했습니다.';
const CARD_STRUCTURAL_PRESET_IDS = Object.keys(CARD_STRUCTURAL_PRESETS);

// The scoped sections, each named by the scope id that owns it — the two are
// the same word, so a scope can never null the wrong section. shell, layout and
// conditionalStyles are deliberately absent: they pass through whatever the scope.
const CARD_SCOPED_SECTION_KEYS = ['header', 'image', 'info', 'field'];

function limitCardIntentToTargetScope(intent, targetScope) {
  if (!CARD_SCOPED_SECTION_KEYS.includes(targetScope)) {
    return intent;
  }

  const limited = { ...intent };

  for (const key of CARD_SCOPED_SECTION_KEYS) {
    if (key !== targetScope) {
      limited[key] = null;
    }
  }

  return limited;
}
function normalizeShellIntent(rawShell) {
  if (!rawShell) {
    return null;
  }

  const intent = {};

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
  if (Number.isFinite(rawHeader.fontWeight))
    intent.fontWeight = rawHeader.fontWeight;
  if (CARD_HEADER_TITLE_SIZE_TOKENS.includes(rawHeader.titleSizeToken))
    intent.titleSizeToken = rawHeader.titleSizeToken;

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
  if (CARD_FIELD_COLOR_ROLE_OPTIONS.includes(rawInfo.labelColorRole))
    intent.labelColorRole = rawInfo.labelColorRole;
  if (CARD_FIELD_FONT_SIZE_OPTIONS.includes(rawInfo.labelFontSizeToken))
    intent.labelFontSizeToken = rawInfo.labelFontSizeToken;
  if (CARD_FIELD_FONT_WEIGHT_OPTIONS.includes(rawInfo.labelFontWeight))
    intent.labelFontWeight = rawInfo.labelFontWeight;

  // An empty array is meaningful here: it clears every group. Only a missing or
  // non-array value means "leave grouping alone".
  if (Array.isArray(rawInfo.requestedGroups)) {
    const requestedGroups = rawInfo.requestedGroups
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

    // An array that arrived empty is an explicit "clear every group". An array
    // whose entries were all malformed carries no instruction, so ignore it.
    if (requestedGroups.length > 0 || rawInfo.requestedGroups.length === 0) {
      intent.requestedGroups = requestedGroups;
    }
  }

  const removeGroupIds = (
    Array.isArray(rawInfo.removeGroupIds) ? rawInfo.removeGroupIds : []
  )
    .map((id) => toTrimmedString(id))
    .filter(Boolean);

  if (removeGroupIds.length > 0) intent.removeGroupIds = removeGroupIds;

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

  // cardsPerRow is never read off an AI response. It is a user-only control, so a
  // payload carrying it is dropped rather than applied.
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

  if (CARD_FIELD_COLOR_ROLE_OPTIONS.includes(rawField.defaultColorRole))
    intent.defaultColorRole = rawField.defaultColorRole;
  if (CARD_FIELD_FONT_WEIGHT_OPTIONS.includes(rawField.defaultFontWeight))
    intent.defaultFontWeight = rawField.defaultFontWeight;
  if (CARD_FIELD_FONT_SIZE_OPTIONS.includes(rawField.defaultFontSize))
    intent.defaultFontSize = rawField.defaultFontSize;
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
      toTrimmedString(payload?.explanation) || CARD_STYLE_AI_DEFAULT_EXPLANATION_MESSAGE,
    suggestion: toTrimmedString(payload?.suggestion) || null,
  };
}
