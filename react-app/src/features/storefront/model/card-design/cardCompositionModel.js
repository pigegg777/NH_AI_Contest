import {
  deriveLegacyCardLayoutPlan,
  normalizeCardLayoutPlan,
} from './cardLayoutPlanModel';

export const CARD_CARDS_PER_ROW_OPTIONS = [1, 2];

export const CARD_TITLE_MODE_OPTIONS = ['header', 'inline'];

export const CARD_STRUCTURAL_PRESETS = {
  'header-top': {
    id: 'header-top',
    shape: 'stack',
    order: ['header', 'image', 'info'],
    allowedCardsPerRow: [1, 2],
  },
  'image-left': {
    id: 'image-left',
    shape: 'side-by-side',
    sideSection: 'image',
    stackOrder: ['header', 'info'],
    allowedCardsPerRow: [1],
  },
  'compact-list': {
    id: 'compact-list',
    shape: 'stack',
    order: ['header', 'info'],
    allowedCardsPerRow: [1, 2],
  },
  'detail-first': {
    id: 'detail-first',
    shape: 'stack',
    order: ['info', 'header', 'image'],
    allowedCardsPerRow: [1],
  },
};

export const DEFAULT_STRUCTURAL_PRESET_BY_CARDS_PER_ROW = {
  1: 'image-left',
  2: 'header-top',
};

function getStructuralPreset(presetId) {
  return CARD_STRUCTURAL_PRESETS[presetId] ?? null;
}

function isStructuralPresetAllowed(presetId, cardsPerRow) {
  const preset = getStructuralPreset(presetId);

  return Boolean(preset) && preset.allowedCardsPerRow.includes(cardsPerRow);
}

export function resolveStructuralPreset(requestedPresetId, cardsPerRow) {
  if (isStructuralPresetAllowed(requestedPresetId, cardsPerRow)) {
    return requestedPresetId;
  }

  return DEFAULT_STRUCTURAL_PRESET_BY_CARDS_PER_ROW[cardsPerRow] || 'header-top';
}

export function normalizeCardsPerRow(value, fallback = 2) {
  const numericValue = Number(value);

  return CARD_CARDS_PER_ROW_OPTIONS.includes(numericValue) ? numericValue : fallback;
}

export function normalizeTitleMode(value, fallback = 'header') {
  return CARD_TITLE_MODE_OPTIONS.includes(value) ? value : fallback;
}

export function resolveSectionOrder(presetId, titleMode) {
  const preset = getStructuralPreset(presetId) ?? CARD_STRUCTURAL_PRESETS['header-top'];
  const order = preset.shape === 'side-by-side' ? preset.stackOrder : preset.order;

  if (titleMode === 'inline') {
    return order.filter((section) => section !== 'header');
  }

  return order;
}

export function resolveStructuralPresetFromLayoutPlan(layoutPlan, fallbackCardsPerRow = 2) {
  const normalizedLayoutPlan = normalizeCardLayoutPlan(layoutPlan, {
    ...deriveLegacyCardLayoutPlan({ cardsPerRow: fallbackCardsPerRow }),
    cardsPerRow: fallbackCardsPerRow,
  });

  if (!normalizedLayoutPlan.sectionOrder.includes('image')) {
    return resolveStructuralPreset('compact-list', normalizedLayoutPlan.cardsPerRow);
  }

  if (normalizedLayoutPlan.imagePlacement === 'left' || normalizedLayoutPlan.imagePlacement === 'right') {
    return resolveStructuralPreset('image-left', normalizedLayoutPlan.cardsPerRow);
  }

  if (normalizedLayoutPlan.sectionOrder[0] === 'info') {
    return resolveStructuralPreset('detail-first', normalizedLayoutPlan.cardsPerRow);
  }

  return resolveStructuralPreset('header-top', normalizedLayoutPlan.cardsPerRow);
}

export function resolveSectionOrderFromLayoutPlan(layoutPlan, titleMode) {
  const normalizedLayoutPlan = normalizeCardLayoutPlan(layoutPlan);
  const order =
    titleMode === 'inline'
      ? normalizedLayoutPlan.sectionOrder.filter((section) => section !== 'header')
      : normalizedLayoutPlan.sectionOrder;

  return order.length > 0 ? order : resolveSectionOrder('header-top', titleMode);
}

const IMAGE_SIZE_RANGES_BY_PRESET_FAMILY = {
  'side-by-side': { dimension: 'width', min: 96, max: 220, step: 16, default: 140 },
  stack: { dimension: 'height', min: 80, max: 200, step: 16, default: 120 },
};

const IMAGE_SIZE_MAX_PX_BY_CARDS_PER_ROW = { 1: 220, 2: 160 };

export function resolveImageSizeRange(presetId, cardsPerRow) {
  const preset = getStructuralPreset(presetId) ?? CARD_STRUCTURAL_PRESETS['header-top'];
  const familyRange = IMAGE_SIZE_RANGES_BY_PRESET_FAMILY[preset.shape] ?? IMAGE_SIZE_RANGES_BY_PRESET_FAMILY.stack;
  const cappedMax = Math.min(familyRange.max, IMAGE_SIZE_MAX_PX_BY_CARDS_PER_ROW[cardsPerRow] ?? familyRange.max);

  return { ...familyRange, max: Math.max(familyRange.min, cappedMax) };
}

export function clampImageSizePx(value, range) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return range.default;
  }

  return Math.min(range.max, Math.max(range.min, numericValue));
}

export function resolveImageSizeFromDeltaSteps(previousPx, deltaSteps, range) {
  if (!deltaSteps) {
    return clampImageSizePx(previousPx, range);
  }

  return clampImageSizePx(Number(previousPx || range.default) + deltaSteps * range.step, range);
}

export function buildFieldSlots(orderedFields, fieldLabels) {
  return (Array.isArray(orderedFields) ? orderedFields : []).map((field, index) => ({
    id: `field-${index}-${field}`,
    kind: 'field',
    field,
    label: fieldLabels?.[field] || field,
  }));
}

export function applyFieldGrouping(slots, groups) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return slots;
  }

  const groupedFieldSet = new Set(groups.flatMap((group) => group.items.map((item) => item.field)));
  const insertedGroupIds = new Set();
  const nextSlots = [];

  slots.forEach((slot) => {
    if (slot.kind !== 'field' || !groupedFieldSet.has(slot.field)) {
      nextSlots.push(slot);
      return;
    }

    const owningGroup = groups.find((group) => group.items.some((item) => item.field === slot.field));

    if (!owningGroup || insertedGroupIds.has(owningGroup.id)) {
      return;
    }

    insertedGroupIds.add(owningGroup.id);
    nextSlots.push({
      id: `group-${owningGroup.id}`,
      kind: owningGroup.display === 'stack-group' ? 'stack-group' : 'inline-group',
      label: owningGroup.label,
      items: owningGroup.items.map((item, itemIndex) => ({
        id: `group-${owningGroup.id}-item-${itemIndex}`,
        field: item.field,
        label: item.label,
      })),
    });
  });

  return nextSlots;
}

function firstFieldOf(slot) {
  return slot.kind === 'field' ? slot.field : slot.items?.[0]?.field;
}

export function reorderFieldSlots(slots, requestedFieldOrder) {
  if (!Array.isArray(requestedFieldOrder) || requestedFieldOrder.length === 0) {
    return slots;
  }

  const priorityIndex = new Map(requestedFieldOrder.map((field, index) => [field, index]));

  return [...slots].sort((a, b) => {
    const aIndex = priorityIndex.has(firstFieldOf(a)) ? priorityIndex.get(firstFieldOf(a)) : Number.MAX_SAFE_INTEGER;
    const bIndex = priorityIndex.has(firstFieldOf(b)) ? priorityIndex.get(firstFieldOf(b)) : Number.MAX_SAFE_INTEGER;

    return aIndex - bIndex;
  });
}
