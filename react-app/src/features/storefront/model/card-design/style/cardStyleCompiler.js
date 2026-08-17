import {
  applyFieldGrouping,
  buildFieldSlots,
  clampImageSizePx,
  normalizeCardsPerRow,
  normalizeTitleMode,
  reorderFieldSlots,
  resolveImageSizeFromDeltaSteps,
  resolveImageSizeRange,
  resolveStructuralPresetFromLayoutPlan,
} from '../style/cardCompositionModel';
import {
  deriveLegacyCardLayoutPlan,
  normalizeCardLayoutPlan,
} from './cardLayoutPlanModel';
import { normalizeCardStyle } from '../style/cardStyleModel';
import {
  contrastRatio,
  ensureReadableTextColor,
  mixHexColors,
  pickReadableTextColor,
} from '../../shared/pageStyleColor';

const MIN_HEADER_CONTRAST_RATIO = 4.5;
const HEADER_LOW_CONTRAST_WARNING =
  '헤더 글자색과 배경색의 대비가 낮아 읽기 어려울 수 있습니다.';
const PRICE_COMPARE_FIELDS = [
  'tax_price',
  'zero_tax_price',
  'exempt_tax_price',
  'price_subsidy',
];
const DETAIL_FIRST_FIELDS = ['spec', 'nutrient', 'medium_category', 'large_category'];

function resolveHeaderContrast({ backgroundColor, titleColorHex, explicitBoth }) {
  if (explicitBoth) {
    return {
      backgroundColor,
      titleColorHex,
      warning:
        contrastRatio(titleColorHex, backgroundColor) < MIN_HEADER_CONTRAST_RATIO
          ? HEADER_LOW_CONTRAST_WARNING
          : '',
    };
  }

  let nextBackground = backgroundColor;
  let nextTitleColor = ensureReadableTextColor(titleColorHex, nextBackground);

  if (contrastRatio(nextTitleColor, nextBackground) < MIN_HEADER_CONTRAST_RATIO) {
    const nudgeToward =
      pickReadableTextColor(nextBackground) === '#111827' ? '#000000' : '#ffffff';

    nextBackground = mixHexColors(nextBackground, nudgeToward, 0.15);
    nextTitleColor = ensureReadableTextColor(titleColorHex, nextBackground);
  }

  return { backgroundColor: nextBackground, titleColorHex: nextTitleColor, warning: '' };
}

function extractFieldStylesFromBodySlots(bodySlots) {
  const styles = [];

  (Array.isArray(bodySlots) ? bodySlots : []).forEach((slot) => {
    if (slot.kind === 'field' && slot.style) {
      styles.push(slot.style);
    } else if (slot.kind === 'inline-group' || slot.kind === 'stack-group') {
      (Array.isArray(slot.items) ? slot.items : []).forEach((item) => {
        if (item.style) {
          styles.push(item.style);
        }
      });
    }
  });

  return styles;
}

function mergeFieldStyles(previousFieldStyles, nextFieldStyles) {
  const nextFields = new Set(
    (Array.isArray(nextFieldStyles) ? nextFieldStyles : []).map((style) => style.field),
  );
  const carriedOverStyles = previousFieldStyles.filter((style) => !nextFields.has(style.field));

  return [...carriedOverStyles, ...(Array.isArray(nextFieldStyles) ? nextFieldStyles : [])];
}

function composeCardBodySlots({
  visibleFields,
  fieldLabels,
  requestedGroups,
  requestedFieldOrder,
  targetedFieldStyles,
}) {
  const infoFields = (Array.isArray(visibleFields) ? visibleFields : []).filter(
    (field) => field !== 'img_url' && field !== 'product_name',
  );
  const fieldStyleMap = new Map(
    (Array.isArray(targetedFieldStyles) ? targetedFieldStyles : []).map((style) => [
      style.field,
      style,
    ]),
  );

  const baseSlots = buildFieldSlots(infoFields, fieldLabels);
  const groupedSlots = applyFieldGrouping(
    baseSlots,
    (Array.isArray(requestedGroups) ? requestedGroups : []).map((group) => ({
      id: group.id,
      label: group.label,
      display: group.display,
      items: group.fields.map((field) => ({
        field,
        label: fieldLabels?.[field] || field,
        style: fieldStyleMap.get(field),
      })),
    })),
  );
  const orderedSlots = reorderFieldSlots(groupedSlots, requestedFieldOrder);

  return orderedSlots.map((slot) => {
    if (slot.kind === 'field' && fieldStyleMap.has(slot.field)) {
      return { ...slot, style: fieldStyleMap.get(slot.field) };
    }

    if (slot.kind === 'inline-group' || slot.kind === 'stack-group') {
      return {
        ...slot,
        items: slot.items.map((item) =>
          fieldStyleMap.has(item.field)
            ? { ...item, style: fieldStyleMap.get(item.field) }
            : item,
        ),
      };
    }

    return slot;
  });
}

function buildLegacyLayoutPatch(structuralPresetRequest, cardsPerRow, titleMode, previousInfo) {
  if (!structuralPresetRequest) {
    return null;
  }

  const legacyPlan = deriveLegacyCardLayoutPlan({
    cardsPerRow,
    structuralPreset: structuralPresetRequest,
    titleMode,
    info: previousInfo,
  });

  return {
    sectionOrder: legacyPlan.sectionOrder,
    imagePlacement: legacyPlan.imagePlacement,
    titleClamp: legacyPlan.titleClamp,
    contentDensity: legacyPlan.contentDensity,
    emphasis: legacyPlan.emphasis,
    groupingHint: legacyPlan.groupingHint,
  };
}

function buildInfoDensityPatch(contentDensity, previousInfo) {
  if (contentDensity === 'compact') {
    return {
      padding: 'tight',
      fieldGap: 'tight',
      fieldGroupGap: 'tight',
    };
  }

  if (contentDensity === 'comfortable') {
    return {
      padding: previousInfo.padding === 'tight' ? 'normal' : previousInfo.padding,
      fieldGap: previousInfo.fieldGap === 'tight' ? 'normal' : previousInfo.fieldGap,
      fieldGroupGap:
        previousInfo.fieldGroupGap === 'tight' ? 'normal' : previousInfo.fieldGroupGap,
    };
  }

  return {};
}

function buildRequestedGroupsFromLayoutPlan(layoutPlan, visibleFields) {
  if (layoutPlan.groupingHint !== 'price-compare') {
    return [];
  }

  const priceFields = (Array.isArray(visibleFields) ? visibleFields : []).filter((field) =>
    PRICE_COMPARE_FIELDS.includes(field),
  );

  if (priceFields.length < 2) {
    return [];
  }

  return [
    {
      id: 'price-compare',
      label: '가격',
      display: 'inline-group',
      fields: priceFields,
    },
  ];
}

function getConditionalStyleRuleKey(rule) {
  return `${rule?.conditionField ?? ''}::${rule?.conditionOperator ?? ''}::${rule?.conditionValue ?? ''}`;
}

function mergeConditionalStyleOverrideSection(previousSection, nextSection) {
  return nextSection ?? previousSection ?? null;
}

function mergeConditionalStyleRule(previousRule, nextRule) {
  return {
    conditionField: nextRule.conditionField,
    conditionOperator: nextRule.conditionOperator,
    conditionValue: nextRule.conditionValue,
    shell: mergeConditionalStyleOverrideSection(previousRule?.shell, nextRule.shell),
    header: mergeConditionalStyleOverrideSection(previousRule?.header, nextRule.header),
    image: mergeConditionalStyleOverrideSection(previousRule?.image, nextRule.image),
    info: mergeConditionalStyleOverrideSection(previousRule?.info, nextRule.info),
    field: mergeConditionalStyleOverrideSection(previousRule?.field, nextRule.field),
  };
}

function mergeConditionalStyleRules(previousRules, nextRules) {
  const previousList = Array.isArray(previousRules) ? previousRules : [];

  if (!Array.isArray(nextRules)) {
    return previousList;
  }

  const mergedRules = [...previousList];
  const indexByKey = new Map(
    mergedRules.map((rule, index) => [getConditionalStyleRuleKey(rule), index]),
  );

  nextRules.forEach((rule) => {
    const key = getConditionalStyleRuleKey(rule);
    const existingIndex = indexByKey.get(key);

    if (existingIndex === undefined) {
      indexByKey.set(key, mergedRules.length);
      mergedRules.push(rule);
      return;
    }

    mergedRules[existingIndex] = mergeConditionalStyleRule(mergedRules[existingIndex], rule);
  });

  return mergedRules;
}

function buildRequestedFieldOrderFromLayoutPlan(layoutPlan, visibleFields) {
  const fields = Array.isArray(visibleFields) ? visibleFields : [];

  if (layoutPlan.groupingHint === 'summary-first') {
    return fields.filter((field) => PRICE_COMPARE_FIELDS.includes(field));
  }

  if (layoutPlan.groupingHint === 'detail-first') {
    return DETAIL_FIRST_FIELDS.filter((field) => fields.includes(field));
  }

  return [];
}

export function compileCardStyle({
  intent,
  previousCardStyle,
  previousBodySlots,
  cardsPerRow,
  visibleFields,
  fieldLabels,
}) {
  const previous = normalizeCardStyle(previousCardStyle);
  const resolvedCardsPerRow = normalizeCardsPerRow(
    intent?.layout?.cardsPerRow ?? cardsPerRow,
    previous.cardsPerRow,
  );
  const titleMode = normalizeTitleMode(
    intent?.titleModeRequest || previous.titleMode,
    previous.titleMode,
  );
  const legacyLayoutPatch = buildLegacyLayoutPatch(
    intent?.structuralPresetRequest,
    resolvedCardsPerRow,
    titleMode,
    previous.info,
  );
  const layoutPlan = normalizeCardLayoutPlan(
    {
      ...previous.layoutPlan,
      ...(legacyLayoutPatch ?? {}),
      ...(intent?.layout ?? {}),
      cardsPerRow: resolvedCardsPerRow,
    },
    deriveLegacyCardLayoutPlan({
      cardsPerRow: resolvedCardsPerRow,
      structuralPreset: previous.structuralPreset,
      titleMode,
      info: previous.info,
    }),
  );
  const structuralPreset = resolveStructuralPresetFromLayoutPlan(
    layoutPlan,
    resolvedCardsPerRow,
  );

  const shell = {
    backgroundColor: intent?.shell?.backgroundColor ?? previous.shell.backgroundColor,
    borderColor: intent?.shell?.borderColor ?? previous.shell.borderColor,
    shadow: intent?.shell?.shadow ?? previous.shell.shadow,
    radius: intent?.shell?.radius ?? previous.shell.radius,
    spacing: intent?.shell?.spacing ?? previous.shell.spacing,
  };

  const requestedHeaderBackground =
    intent?.header?.backgroundColor ?? previous.header.backgroundColor;
  const requestedHeaderTitleColor =
    intent?.header?.titleColorHex ?? previous.header.titleColorHex;
  const headerContrast = resolveHeaderContrast({
    backgroundColor: requestedHeaderBackground,
    titleColorHex: requestedHeaderTitleColor,
    explicitBoth: Boolean(
      intent?.header?.backgroundColor && intent?.header?.titleColorHex,
    ),
  });

  const header = {
    ...previous.header,
    letterSpacing: intent?.header?.letterSpacing ?? previous.header.letterSpacing,
    fontWeight: intent?.header?.fontWeight ?? previous.header.fontWeight,
    backgroundColor: headerContrast.backgroundColor,
    titleColorHex: headerContrast.titleColorHex,
  };

  const imageRange =
    layoutPlan.imagePlacement === 'left' || layoutPlan.imagePlacement === 'right'
      ? resolveImageSizeRange('image-left', resolvedCardsPerRow)
      : resolveImageSizeRange(structuralPreset, resolvedCardsPerRow);
  const image = {
    fit: intent?.image?.fit || previous.image.fit,
    sizePx: intent?.image?.sizeDeltaSteps
      ? resolveImageSizeFromDeltaSteps(
          previous.image.sizePx,
          intent.image.sizeDeltaSteps,
          imageRange,
        )
      : clampImageSizePx(previous.image.sizePx, imageRange),
  };

  const shouldApplyDensityPatch = Boolean(
    intent?.layout?.contentDensity || legacyLayoutPatch?.contentDensity,
  );
  const densityPatch = shouldApplyDensityPatch
    ? buildInfoDensityPatch(layoutPlan.contentDensity, previous.info)
    : {};
  const info = {
    backgroundColor: intent?.info?.backgroundColor ?? previous.info.backgroundColor,
    borderColor: intent?.info?.borderColor ?? previous.info.borderColor,
    padding: intent?.info?.padding ?? densityPatch.padding ?? previous.info.padding,
    radius: intent?.info?.radius ?? previous.info.radius,
    fieldGap: intent?.info?.fieldGap ?? densityPatch.fieldGap ?? previous.info.fieldGap,
    fieldGroupGap:
      intent?.info?.fieldGroupGap ??
      densityPatch.fieldGroupGap ??
      previous.info.fieldGroupGap,
    alignment: previous.info.alignment,
  };

  const field = {
    ...previous.field,
    ...(intent?.field?.priceColorRole
      ? { priceColorRole: intent.field.priceColorRole }
      : {}),
  };

  const conditionalStyles = mergeConditionalStyleRules(
    previous.conditionalStyles,
    intent?.conditionalStyles,
  );

  const cardStyle = normalizeCardStyle({
    cardsPerRow: resolvedCardsPerRow,
    structuralPreset,
    titleMode,
    layoutPlan,
    shell,
    header,
    image,
    info,
    field,
    conditionalStyles,
  });

  const previousFieldStyles = extractFieldStylesFromBodySlots(previousBodySlots);
  const mergedFieldStyles = mergeFieldStyles(previousFieldStyles, intent?.field?.targetedFieldStyles);

  const bodySlots = composeCardBodySlots({
    visibleFields,
    fieldLabels,
    requestedGroups:
      intent?.info?.requestedGroups ??
      buildRequestedGroupsFromLayoutPlan(layoutPlan, visibleFields),
    requestedFieldOrder:
      intent?.info?.requestedFieldOrder ??
      buildRequestedFieldOrderFromLayoutPlan(layoutPlan, visibleFields),
    targetedFieldStyles: mergedFieldStyles,
  });

  return {
    cardStyle,
    bodySlots,
    warning: headerContrast.warning,
  };
}
