import { toTrimmedString } from '../../../common/utils/text';

export const STOREFRONT_AI_PLAN_TONE_OPTIONS = ['friendly', 'warm', 'green', 'trust', 'white'];
export const STOREFRONT_AI_PLAN_BLOCK_TYPES = ['field', 'group'];
export const STOREFRONT_AI_PLAN_GROUP_DISPLAY_OPTIONS = ['inline-compare', 'stack'];
export const STOREFRONT_AI_PLAN_CARD_VARIANT_OPTIONS = [
  'card-grid',
  'image-left',
  'price-focus',
  'compact-list',
  'detail-first',
];
export const STOREFRONT_AI_PLAN_DENSITY_OPTIONS = ['compact', 'comfortable'];
export const STOREFRONT_AI_PLAN_IMAGE_POSITION_OPTIONS = ['top', 'left', 'hidden'];
export const STOREFRONT_AI_PLAN_PRICE_PRIORITY_OPTIONS = ['default', 'high'];
export const STOREFRONT_AI_PLAN_TITLE_TEXT_COLOR_OPTIONS = ['default', 'ink', 'charcoal', 'brand'];
export const STOREFRONT_AI_PLAN_TYPOGRAPHY_TONE_OPTIONS = ['standard', 'clean', 'soft', 'bold', 'official'];
export const STOREFRONT_AI_PLAN_PRICE_TEXT_COLOR_OPTIONS = ['default', 'brand', 'muted'];
export const STOREFRONT_AI_PLAN_FORMAT_OPTIONS = ['currency', 'text', 'link'];
export const STOREFRONT_AI_PLAN_FIELD_COLOR_ROLE_OPTIONS = [
  'default',
  'inherit',
  'brand',
  'muted',
  'blue',
  'red',
  'green',
  'amber',
  'ink',
];
export const STOREFRONT_AI_PLAN_FIELD_FONT_WEIGHT_OPTIONS = ['default', 'normal', 'medium', 'semibold', 'bold'];
export const STOREFRONT_AI_PLAN_FIELD_FONT_SIZE_OPTIONS = ['default', 'small', 'medium', 'large'];
export const STOREFRONT_AI_PLAN_FIELD_EMPHASIS_OPTIONS = ['none', 'subtle', 'strong'];
export const STOREFRONT_AI_PLAN_REGION_TARGET_OPTIONS = ['page', 'search', 'category', 'cardGrid', 'card'];
export const STOREFRONT_AI_PLAN_REGION_PROPERTIES_BY_TARGET = {
  page: ['backgroundColor', 'width', 'topSpacing', 'sectionGap', 'tone'],
  search: ['colorRole', 'size', 'placeholder', 'radius', 'border', 'icon', 'alignment'],
  category: ['layout', 'size', 'colorRole', 'radius', 'gap', 'scroll', 'rows', 'activeStyle'],
  cardGrid: ['columns', 'gap', 'backgroundColor', 'border', 'radius', 'padding', 'width'],
  card: ['backgroundColor', 'borderColor', 'shadow', 'padding', 'radius', 'imagePosition', 'titlePosition', 'fieldAlignment'],
};
export const STOREFRONT_AI_PLAN_REGION_PROPERTY_OPTIONS = [
  ...new Set(Object.values(STOREFRONT_AI_PLAN_REGION_PROPERTIES_BY_TARGET).flat()),
];

export const DEFAULT_STOREFRONT_EDIT_POLICY = {
  allowLayoutChange: true,
  allowSemanticGrouping: true,
  allowLabelRewrite: false,
  allowContentSummarization: false,
};

export const DEFAULT_STOREFRONT_DESIGN_PLAN = {
  designBrief: {
    tone: 'friendly',
    goal: 'Present products clearly.',
    audience: 'Storefront visitors',
    priority: ['product_name', 'spec', 'tax_price'],
  },
  transformPlan: {
    groups: [],
    hideIfEmpty: [],
    formatRules: [],
  },
  contentPlan: {
    blocks: [
      { id: 'title', type: 'field', source: 'product_name', label: '' },
      { id: 'spec', type: 'field', source: 'spec', label: '' },
      { id: 'price', type: 'field', source: 'tax_price', label: '' },
    ],
  },
  layoutPlan: {
    cardVariant: 'card-grid',
    density: 'comfortable',
    imagePosition: 'top',
    pricePriority: 'default',
  },
  stylePlan: {
    titleTextColor: 'default',
    typographyTone: 'standard',
    priceTextColor: 'default',
    accentColor: '',
    cardSpacing: 'relaxed',
    fieldStyles: [],
    regionStyles: [],
  },
};

function uniqueStrings(values) {
  return (Array.isArray(values) ? values : []).filter(
    (value, index, array) => typeof value === 'string' && value && array.indexOf(value) === index,
  );
}

function createAllowedFieldSet(allowedScalarKeys) {
  const values = Array.isArray(allowedScalarKeys) ? allowedScalarKeys.map((key) => toTrimmedString(key)).filter(Boolean) : [];
  return new Set(values);
}

function normalizeAllowedField(field, allowedFieldSet) {
  const candidate = toTrimmedString(field);

  if (!candidate) {
    return '';
  }

  if (allowedFieldSet.size === 0) {
    return candidate;
  }

  return allowedFieldSet.has(candidate) ? candidate : '';
}

function normalizeFieldStyle(style, allowedFieldSet) {
  const field = normalizeAllowedField(style?.field, allowedFieldSet);

  if (!field) {
    return null;
  }

  return {
    field,
    colorRole: STOREFRONT_AI_PLAN_FIELD_COLOR_ROLE_OPTIONS.includes(style?.colorRole) ? style.colorRole : 'default',
    fontWeight: STOREFRONT_AI_PLAN_FIELD_FONT_WEIGHT_OPTIONS.includes(style?.fontWeight) ? style.fontWeight : 'default',
    fontSize: STOREFRONT_AI_PLAN_FIELD_FONT_SIZE_OPTIONS.includes(style?.fontSize) ? style.fontSize : 'default',
    emphasis: STOREFRONT_AI_PLAN_FIELD_EMPHASIS_OPTIONS.includes(style?.emphasis) ? style.emphasis : 'none',
  };
}

function compactFieldStyle(style) {
  const nextStyle = {};

  if (style?.colorRole && style.colorRole !== 'default') {
    nextStyle.colorRole = style.colorRole;
  }

  if (style?.fontWeight && style.fontWeight !== 'default') {
    nextStyle.fontWeight = style.fontWeight;
  }

  if (style?.fontSize && style.fontSize !== 'default') {
    nextStyle.fontSize = style.fontSize;
  }

  if (style?.emphasis && style.emphasis !== 'none') {
    nextStyle.emphasis = style.emphasis;
  }

  return Object.keys(nextStyle).length > 0 ? nextStyle : undefined;
}

function buildFieldStyleMap(fieldStyles) {
  const fieldStyleMap = new Map();

  (Array.isArray(fieldStyles) ? fieldStyles : []).forEach((fieldStyle) => {
    const compactStyle = compactFieldStyle(fieldStyle);

    if (fieldStyle?.field && compactStyle) {
      fieldStyleMap.set(fieldStyle.field, compactStyle);
    }
  });

  return fieldStyleMap;
}

function withFieldStyle(slot, fieldStyleMap) {
  const style = fieldStyleMap.get(slot.field);

  return style ? { ...slot, style } : slot;
}

function normalizeRegionStyle(regionStyle) {
  const target = STOREFRONT_AI_PLAN_REGION_TARGET_OPTIONS.includes(regionStyle?.target) ? regionStyle.target : '';
  const property = toTrimmedString(regionStyle?.property);
  const allowedProperties = STOREFRONT_AI_PLAN_REGION_PROPERTIES_BY_TARGET[target] ?? [];
  const value = toTrimmedString(regionStyle?.value);

  if (!target || !allowedProperties.includes(property) || !value) {
    return null;
  }

  return {
    target,
    property,
    value,
  };
}

function compileRegionStyles(regionStyles) {
  const compiledStyles = {};

  (Array.isArray(regionStyles) ? regionStyles : []).forEach((regionStyle) => {
    if (!regionStyle?.target || !regionStyle?.property) {
      return;
    }

    compiledStyles[regionStyle.target] = {
      ...(compiledStyles[regionStyle.target] ?? {}),
      [regionStyle.property]: regionStyle.value,
    };
  });

  return compiledStyles;
}

function buildFallbackBlocks(priority, groups) {
  const nextBlocks = [];
  const normalizedPriority = Array.isArray(priority) ? priority : [];

  normalizedPriority.forEach((field, index) => {
    nextBlocks.push({
      id: `field-${index}`,
      type: 'field',
      source: field,
      label: '',
    });
  });

  if (nextBlocks.length === 0 && groups[0]?.id) {
    nextBlocks.push({
      id: `group-${groups[0].id}`,
      type: 'group',
      source: groups[0].id,
      label: '',
    });
  }

  return nextBlocks.length > 0 ? nextBlocks : DEFAULT_STOREFRONT_DESIGN_PLAN.contentPlan.blocks;
}

export function normalizeStorefrontEditPolicy(editPolicy) {
  const source = editPolicy ?? {};

  return {
    allowLayoutChange: source.allowLayoutChange !== false,
    allowSemanticGrouping: source.allowSemanticGrouping !== false,
    allowLabelRewrite: source.allowLabelRewrite === true,
    allowContentSummarization: source.allowContentSummarization === true,
  };
}

export function normalizeStorefrontDesignPlan(plan, allowedScalarKeys) {
  const source = plan ?? {};
  const allowedFieldSet = createAllowedFieldSet(allowedScalarKeys);
  const sourceDesignBrief = source.designBrief ?? {};
  const sourceTransformPlan = source.transformPlan ?? {};
  const sourceContentPlan = source.contentPlan ?? {};
  const sourceLayoutPlan = source.layoutPlan ?? {};
  const sourceStylePlan = source.stylePlan ?? {};

  const normalizedPriority = uniqueStrings(
    (Array.isArray(sourceDesignBrief.priority) ? sourceDesignBrief.priority : [])
      .map((field) => normalizeAllowedField(field, allowedFieldSet))
      .filter(Boolean),
  );

  const normalizedGroups = (Array.isArray(sourceTransformPlan.groups) ? sourceTransformPlan.groups : [])
    .map((group, groupIndex) => {
      const normalizedItems = uniqueStrings(
        (Array.isArray(group?.items) ? group.items : [])
          .map((item) => normalizeAllowedField(item?.field, allowedFieldSet))
          .filter(Boolean),
      ).map((field, itemIndex) => {
        const sourceItem = (Array.isArray(group?.items) ? group.items : []).find((item) => toTrimmedString(item?.field) === field);

        return {
          id: `${toTrimmedString(group?.id) || `group-${groupIndex}`}-item-${itemIndex}`,
          field,
          label: toTrimmedString(sourceItem?.label),
        };
      });

      if (normalizedItems.length < 2) {
        return null;
      }

      const display = STOREFRONT_AI_PLAN_GROUP_DISPLAY_OPTIONS.includes(group?.display)
        ? group.display
        : DEFAULT_STOREFRONT_DESIGN_PLAN.transformPlan.groups[0]?.display || 'inline-compare';

      return {
        id: toTrimmedString(group?.id) || `group-${groupIndex}`,
        label: toTrimmedString(group?.label) || '정보',
        display,
        items: normalizedItems,
      };
    })
    .filter(Boolean);

  const normalizedGroupIds = new Set(normalizedGroups.map((group) => group.id));

  const normalizedBlocks = (Array.isArray(sourceContentPlan.blocks) ? sourceContentPlan.blocks : [])
    .map((block, index) => {
      const type = STOREFRONT_AI_PLAN_BLOCK_TYPES.includes(block?.type) ? block.type : 'field';

      if (type === 'group') {
        const sourceId = toTrimmedString(block?.source);

        if (!normalizedGroupIds.has(sourceId)) {
          return null;
        }

        return {
          id: toTrimmedString(block?.id) || `group-block-${index}`,
          type,
          source: sourceId,
          label: toTrimmedString(block?.label),
        };
      }

      const normalizedField = normalizeAllowedField(block?.source, allowedFieldSet);

      if (!normalizedField) {
        return null;
      }

      return {
        id: toTrimmedString(block?.id) || `field-block-${index}`,
        type: 'field',
        source: normalizedField,
        label: toTrimmedString(block?.label),
      };
    })
    .filter(Boolean);

  const nextPriority =
    normalizedPriority.length > 0
      ? normalizedPriority
      : uniqueStrings(
          normalizedBlocks
            .filter((block) => block.type === 'field')
            .map((block) => block.source),
        ).slice(0, 4);

  return {
    designBrief: {
      tone: STOREFRONT_AI_PLAN_TONE_OPTIONS.includes(sourceDesignBrief.tone)
        ? sourceDesignBrief.tone
        : DEFAULT_STOREFRONT_DESIGN_PLAN.designBrief.tone,
      goal: toTrimmedString(sourceDesignBrief.goal) || DEFAULT_STOREFRONT_DESIGN_PLAN.designBrief.goal,
      audience: toTrimmedString(sourceDesignBrief.audience) || DEFAULT_STOREFRONT_DESIGN_PLAN.designBrief.audience,
      priority: nextPriority.length > 0 ? nextPriority : DEFAULT_STOREFRONT_DESIGN_PLAN.designBrief.priority,
    },
    transformPlan: {
      groups: normalizedGroups,
      hideIfEmpty: uniqueStrings(
        (Array.isArray(sourceTransformPlan.hideIfEmpty) ? sourceTransformPlan.hideIfEmpty : [])
          .map((field) => normalizeAllowedField(field, allowedFieldSet))
          .filter(Boolean),
      ),
      formatRules: (Array.isArray(sourceTransformPlan.formatRules) ? sourceTransformPlan.formatRules : [])
        .map((rule) => {
          const field = normalizeAllowedField(rule?.field, allowedFieldSet);
          const format = STOREFRONT_AI_PLAN_FORMAT_OPTIONS.includes(rule?.format) ? rule.format : 'text';

          return field ? { field, format } : null;
        })
        .filter(Boolean),
    },
    contentPlan: {
      blocks: normalizedBlocks.length > 0 ? normalizedBlocks : buildFallbackBlocks(nextPriority, normalizedGroups),
    },
    layoutPlan: {
      cardVariant: STOREFRONT_AI_PLAN_CARD_VARIANT_OPTIONS.includes(sourceLayoutPlan.cardVariant)
        ? sourceLayoutPlan.cardVariant
        : DEFAULT_STOREFRONT_DESIGN_PLAN.layoutPlan.cardVariant,
      density: STOREFRONT_AI_PLAN_DENSITY_OPTIONS.includes(sourceLayoutPlan.density)
        ? sourceLayoutPlan.density
        : DEFAULT_STOREFRONT_DESIGN_PLAN.layoutPlan.density,
      imagePosition: STOREFRONT_AI_PLAN_IMAGE_POSITION_OPTIONS.includes(sourceLayoutPlan.imagePosition)
        ? sourceLayoutPlan.imagePosition
        : DEFAULT_STOREFRONT_DESIGN_PLAN.layoutPlan.imagePosition,
      pricePriority: STOREFRONT_AI_PLAN_PRICE_PRIORITY_OPTIONS.includes(sourceLayoutPlan.pricePriority)
        ? sourceLayoutPlan.pricePriority
        : DEFAULT_STOREFRONT_DESIGN_PLAN.layoutPlan.pricePriority,
    },
    stylePlan: {
      titleTextColor: STOREFRONT_AI_PLAN_TITLE_TEXT_COLOR_OPTIONS.includes(sourceStylePlan.titleTextColor)
        ? sourceStylePlan.titleTextColor
        : DEFAULT_STOREFRONT_DESIGN_PLAN.stylePlan.titleTextColor,
      typographyTone: STOREFRONT_AI_PLAN_TYPOGRAPHY_TONE_OPTIONS.includes(sourceStylePlan.typographyTone)
        ? sourceStylePlan.typographyTone
        : DEFAULT_STOREFRONT_DESIGN_PLAN.stylePlan.typographyTone,
      priceTextColor: STOREFRONT_AI_PLAN_PRICE_TEXT_COLOR_OPTIONS.includes(sourceStylePlan.priceTextColor)
        ? sourceStylePlan.priceTextColor
        : DEFAULT_STOREFRONT_DESIGN_PLAN.stylePlan.priceTextColor,
      accentColor: toTrimmedString(sourceStylePlan.accentColor),
      cardSpacing: ['tight', 'normal', 'relaxed'].includes(sourceStylePlan.cardSpacing)
        ? sourceStylePlan.cardSpacing
        : DEFAULT_STOREFRONT_DESIGN_PLAN.stylePlan.cardSpacing,
      fieldStyles: (Array.isArray(sourceStylePlan.fieldStyles) ? sourceStylePlan.fieldStyles : [])
        .map((fieldStyle) => normalizeFieldStyle(fieldStyle, allowedFieldSet))
        .filter(Boolean),
      regionStyles: (Array.isArray(sourceStylePlan.regionStyles) ? sourceStylePlan.regionStyles : [])
        .map(normalizeRegionStyle)
        .filter(Boolean),
    },
  };
}

export function collectStorefrontDesignPlanFieldKeys(designPlan) {
  const normalizedPlan = normalizeStorefrontDesignPlan(designPlan);
  const groupMap = new Map(normalizedPlan.transformPlan.groups.map((group) => [group.id, group]));
  const fieldKeys = [];

  normalizedPlan.contentPlan.blocks.forEach((block) => {
    if (block.type === 'field') {
      fieldKeys.push(block.source);
      return;
    }

    const group = groupMap.get(block.source);

    if (!group) {
      return;
    }

    group.items.forEach((item) => fieldKeys.push(item.field));
  });

  return uniqueStrings(fieldKeys);
}

export function compileStorefrontRenderSpec(designPlan) {
  const normalizedPlan = normalizeStorefrontDesignPlan(designPlan);
  const groupMap = new Map(normalizedPlan.transformPlan.groups.map((group) => [group.id, group]));
  const fieldStyleMap = buildFieldStyleMap(normalizedPlan.stylePlan.fieldStyles);

  return {
    version: 1,
    regionStyles: compileRegionStyles(normalizedPlan.stylePlan.regionStyles),
    bodySlots: normalizedPlan.contentPlan.blocks
      .map((block) => {
        if (block.type === 'field') {
          return withFieldStyle({
            id: block.id,
            kind: 'field',
            field: block.source,
            label: block.label,
          }, fieldStyleMap);
        }

        const group = groupMap.get(block.source);

        if (!group) {
          return null;
        }

        return {
          id: block.id,
          kind: group.display === 'stack' ? 'stack-group' : 'inline-group',
          label: block.label || group.label,
          items: group.items.map((item) =>
            withFieldStyle(
              {
                id: item.id,
                field: item.field,
                label: item.label,
              },
              fieldStyleMap,
            ),
          ),
        };
      })
      .filter(Boolean),
  };
}

export function normalizeStorefrontAiDesign(aiDesign, allowedScalarKeys) {
  const source = aiDesign ?? {};
  const hasStructuredDesign =
    source.designPlan ||
    source.renderSpec ||
    toTrimmedString(source.prompt) ||
    (Array.isArray(source.activeSkillIds) && source.activeSkillIds.length > 0);

  if (!hasStructuredDesign) {
    return null;
  }

  const normalizedDesignPlan = normalizeStorefrontDesignPlan(source.designPlan, allowedScalarKeys);
  const renderSpec = source.renderSpec?.version === 1 ? source.renderSpec : compileStorefrontRenderSpec(normalizedDesignPlan);

  return {
    prompt: toTrimmedString(source.prompt),
    activeSkillIds: uniqueStrings((Array.isArray(source.activeSkillIds) ? source.activeSkillIds : []).map(toTrimmedString)),
    designPlan: normalizedDesignPlan,
    renderSpec,
  };
}
