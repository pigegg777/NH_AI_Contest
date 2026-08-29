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
} from '../../../storefront-view/model/card-style/cardCompositionModel';
import {
  deriveLegacyCardLayoutPlan,
  normalizeCardLayoutPlan,
} from '../../../storefront-view/model/card-style/cardLayoutPlanModel';
import { normalizeCardStyle } from '../../../storefront-view/model/card-style/cardStyleModel';
import {
  contrastRatio,
  ensureReadableTextColor,
  mixHexColors,
  pickReadableTextColor,
} from '../../../storefront-view/model/shared/styleColor';

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

function extractGroupsFromBodySlots(bodySlots) {
  return (Array.isArray(bodySlots) ? bodySlots : [])
    .filter((slot) => slot.kind === 'inline-group' || slot.kind === 'stack-group')
    .map((slot) => ({
      // Slot ids are prefixed at render time; strip it so a re-request that
      // reuses the original group id updates the group instead of duplicating it.
      id: String(slot.id ?? '').replace(/^group-/, ''),
      label: slot.label,
      display: slot.kind,
      fields: (Array.isArray(slot.items) ? slot.items : []).map((item) => item.field),
    }));
}

// Only worth seeding when the rendered order actually diverges from the natural
// visibleFields order. Seeding an already-natural order would pin it forever and
// push any newly shown field to the end.
function extractCustomFieldOrderFromBodySlots(bodySlots, naturalFieldOrder) {
  const renderedOrder = (Array.isArray(bodySlots) ? bodySlots : [])
    .map((slot) => (slot.kind === 'field' ? slot.field : slot.items?.[0]?.field))
    .filter(Boolean);
  const naturalLead = (Array.isArray(naturalFieldOrder) ? naturalFieldOrder : []).filter(
    (field) => renderedOrder.includes(field),
  );

  return renderedOrder.join('|') === naturalLead.join('|') ? [] : renderedOrder;
}

// Groups accumulate by id, mirroring how conditionalStyles already merge, so
// "가격 묶어줘" then "업체랑 분류 묶어줘" leaves both groups standing. An explicit
// empty requestedGroups array clears every group; removeGroupIds drops one.
function mergeInfoGroups(previousGroups, nextGroups, removeGroupIds) {
  if (Array.isArray(nextGroups) && nextGroups.length === 0) {
    return [];
  }

  const removedIds = new Set(
    (Array.isArray(removeGroupIds) ? removeGroupIds : []).map((id) => String(id)),
  );
  const incomingGroups = Array.isArray(nextGroups) ? nextGroups : [];
  const incomingIds = new Set(incomingGroups.map((group) => group.id));
  // A newer request wins the field: strip it from whichever older group held it,
  // otherwise normalizeRequestedGroups would award it to the stale group.
  const incomingFields = new Set(incomingGroups.flatMap((group) => group.fields));

  const carriedOverGroups = previousGroups
    .filter((group) => !removedIds.has(group.id) && !incomingIds.has(group.id))
    .map((group) => ({
      ...group,
      fields: group.fields.filter((field) => !incomingFields.has(field)),
    }))
    .filter((group) => group.fields.length > 0);

  return [...carriedOverGroups, ...incomingGroups.filter((group) => !removedIds.has(group.id))];
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

  const infoFieldSet = new Set(infoFields);
  const baseSlots = buildFieldSlots(infoFields, fieldLabels);
  const groupedSlots = applyFieldGrouping(
    baseSlots,
    (Array.isArray(requestedGroups) ? requestedGroups : [])
      .map((group) => ({
        id: group.id,
        label: group.label,
        display: group.display,
        // Groups persist across requests, so a member the merchant later hid
        // must drop out of the group rather than render as an empty cell.
        items: group.fields
          .filter((field) => infoFieldSet.has(field))
          .map((field) => ({
            field,
            label: fieldLabels?.[field] || field,
            style: fieldStyleMap.get(field),
          })),
      }))
      .filter((group) => group.items.length > 0),
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

function buildLegacyLayoutPatch(structuralPresetRequest, cardsPerRow, titleMode) {
  if (!structuralPresetRequest) {
    return null;
  }

  const legacyPlan = deriveLegacyCardLayoutPlan({
    cardsPerRow,
    structuralPreset: structuralPresetRequest,
    titleMode,
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
  // cardsPerRow comes from the builder UI only, never from the AI intent.
  const resolvedCardsPerRow = normalizeCardsPerRow(cardsPerRow, previous.cardsPerRow);
  const titleMode = normalizeTitleMode(
    intent?.titleModeRequest || previous.titleMode,
    previous.titleMode,
  );
  const legacyLayoutPatch = buildLegacyLayoutPatch(
    intent?.structuralPresetRequest,
    resolvedCardsPerRow,
    titleMode,
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
    }),
  );
  const structuralPreset = resolveStructuralPresetFromLayoutPlan(
    layoutPlan,
    resolvedCardsPerRow,
  );

  const shell = {
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
    fontWeight: intent?.header?.fontWeight ?? previous.header.fontWeight,
    titleSizeToken: intent?.header?.titleSizeToken ?? previous.header.titleSizeToken,
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

  // Designs saved before grouping became persistent only carry their groups on
  // the rendered slots, so seed from there when the style has none yet.
  const previousGroups =
    previous.info.requestedGroups.length > 0
      ? previous.info.requestedGroups
      : extractGroupsFromBodySlots(previousBodySlots);
  const previousFieldOrder =
    previous.info.requestedFieldOrder.length > 0
      ? previous.info.requestedFieldOrder
      : extractCustomFieldOrderFromBodySlots(previousBodySlots, visibleFields);
  // An empty layout-derived list means "the layout asks for nothing", which is
  // not the same as an explicit empty requestedGroups ("clear every group").
  const layoutRequestedGroups = buildRequestedGroupsFromLayoutPlan(layoutPlan, visibleFields);
  const layoutRequestedFieldOrder = buildRequestedFieldOrderFromLayoutPlan(
    layoutPlan,
    visibleFields,
  );

  const info = {
    backgroundColor: intent?.info?.backgroundColor ?? previous.info.backgroundColor,
    labelColorRole: intent?.info?.labelColorRole ?? previous.info.labelColorRole,
    labelFontSizeToken:
      intent?.info?.labelFontSizeToken ?? previous.info.labelFontSizeToken,
    labelFontWeight: intent?.info?.labelFontWeight ?? previous.info.labelFontWeight,
    requestedGroups: mergeInfoGroups(
      previousGroups,
      intent?.info?.requestedGroups ??
        (layoutRequestedGroups.length > 0 ? layoutRequestedGroups : null),
      intent?.info?.removeGroupIds,
    ),
    // An order list is whole by nature, so an explicit request or a layout hint
    // replaces it outright instead of merging.
    requestedFieldOrder:
      intent?.info?.requestedFieldOrder ??
      (layoutRequestedFieldOrder.length > 0 ? layoutRequestedFieldOrder : previousFieldOrder),
  };

  const field = {
    ...previous.field,
    defaultColorRole: intent?.field?.defaultColorRole ?? previous.field.defaultColorRole,
    defaultFontWeight: intent?.field?.defaultFontWeight ?? previous.field.defaultFontWeight,
    defaultFontSize: intent?.field?.defaultFontSize ?? previous.field.defaultFontSize,
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
    // Read back off the normalized style so the rendered slots and the saved
    // state can never drift apart.
    requestedGroups: cardStyle.info.requestedGroups,
    requestedFieldOrder: cardStyle.info.requestedFieldOrder,
    targetedFieldStyles: mergedFieldStyles,
  });

  return {
    cardStyle,
    bodySlots,
    warning: headerContrast.warning,
  };
}
