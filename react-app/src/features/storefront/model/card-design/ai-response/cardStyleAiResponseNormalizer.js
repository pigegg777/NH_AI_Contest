import { toTrimmedString } from '../../../../../common/utils/text';
import { buildCardAiTargetScopeInstruction } from '../ai-request/cardAiDesignModel';
import {
  CARD_LAYOUT_CONTENT_DENSITY_OPTIONS,
  CARD_LAYOUT_EMPHASIS_OPTIONS,
  CARD_LAYOUT_GROUPING_HINT_OPTIONS,
  CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS,
  CARD_LAYOUT_SECTION_OPTIONS,
} from '../style/cardLayoutPlanModel';
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
} from '../style/cardStyleModel';
import {
  CARD_STRUCTURAL_PRESETS,
  CARD_TITLE_MODE_OPTIONS,
} from '../style/cardCompositionModel';
import { isHexColor, normalizeHexColor } from '../../shared/pageStyleColor';
import {
  buildCardStyleAiSystemPrompt,
  selectCardStyleSkillPackIds,
} from '../../../services/card-design/cardStyleSkillPromptService';

const CARD_STRUCTURAL_PRESET_IDS = Object.keys(CARD_STRUCTURAL_PRESETS);

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
      toTrimmedString(payload?.explanation) || '\uC694\uCCAD\uD558\uC2E0 \uB0B4\uC6A9\uC744 \uCE74\uB4DC \uB514\uC790\uC778\uC5D0 \uBC18\uC601\uD588\uC2B5\uB2C8\uB2E4.',
    suggestion: toTrimmedString(payload?.suggestion) || null,
  };
}
