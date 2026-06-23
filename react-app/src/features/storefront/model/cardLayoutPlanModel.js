export const CARD_LAYOUT_SECTION_OPTIONS = ['header', 'image', 'info'];
export const CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS = ['top', 'left', 'right'];
export const CARD_LAYOUT_CONTENT_DENSITY_OPTIONS = ['compact', 'comfortable'];
export const CARD_LAYOUT_EMPHASIS_OPTIONS = ['title', 'image', 'info'];
export const CARD_LAYOUT_GROUPING_HINT_OPTIONS = [
  'default',
  'summary-first',
  'detail-first',
  'price-compare',
];
export const CARD_LAYOUT_TITLE_CLAMP_OPTIONS = [1, 2];
export const CARD_LAYOUT_CARDS_PER_ROW_OPTIONS = [1, 2];

export const DEFAULT_CARD_LAYOUT_PLAN = {
  cardsPerRow: 2,
  sectionOrder: ['header', 'image', 'info'],
  imagePlacement: 'top',
  titleClamp: 2,
  contentDensity: 'comfortable',
  emphasis: 'title',
  groupingHint: 'default',
};

function normalizeCardsPerRow(value, fallback = DEFAULT_CARD_LAYOUT_PLAN.cardsPerRow) {
  const numericValue = Number(value);

  return CARD_LAYOUT_CARDS_PER_ROW_OPTIONS.includes(numericValue) ? numericValue : fallback;
}

function normalizeSectionOrder(sectionOrder, fallbackOrder = DEFAULT_CARD_LAYOUT_PLAN.sectionOrder) {
  const nextOrder = (Array.isArray(sectionOrder) ? sectionOrder : [])
    .map((section) => (typeof section === 'string' ? section : ''))
    .filter(
      (section, index, list) =>
        CARD_LAYOUT_SECTION_OPTIONS.includes(section) && list.indexOf(section) === index,
    );

  if (nextOrder.length === 0) {
    return [...fallbackOrder];
  }

  if (!nextOrder.includes('info')) {
    nextOrder.push('info');
  }

  return nextOrder;
}

function normalizeTitleClamp(value, fallback = DEFAULT_CARD_LAYOUT_PLAN.titleClamp) {
  const numericValue = Number(value);

  return CARD_LAYOUT_TITLE_CLAMP_OPTIONS.includes(numericValue) ? numericValue : fallback;
}

export function normalizeCardLayoutPlan(layoutPlan, fallbackPlan = DEFAULT_CARD_LAYOUT_PLAN) {
  const source = layoutPlan ?? {};
  const fallback = fallbackPlan ?? DEFAULT_CARD_LAYOUT_PLAN;

  return {
    cardsPerRow: normalizeCardsPerRow(source.cardsPerRow, fallback.cardsPerRow),
    sectionOrder: normalizeSectionOrder(source.sectionOrder, fallback.sectionOrder),
    imagePlacement: CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS.includes(source.imagePlacement)
      ? source.imagePlacement
      : fallback.imagePlacement,
    titleClamp: normalizeTitleClamp(source.titleClamp, fallback.titleClamp),
    contentDensity: CARD_LAYOUT_CONTENT_DENSITY_OPTIONS.includes(source.contentDensity)
      ? source.contentDensity
      : fallback.contentDensity,
    emphasis: CARD_LAYOUT_EMPHASIS_OPTIONS.includes(source.emphasis)
      ? source.emphasis
      : fallback.emphasis,
    groupingHint: CARD_LAYOUT_GROUPING_HINT_OPTIONS.includes(source.groupingHint)
      ? source.groupingHint
      : fallback.groupingHint,
  };
}

export function deriveLegacyCardLayoutPlan({
  cardsPerRow = DEFAULT_CARD_LAYOUT_PLAN.cardsPerRow,
  structuralPreset = 'header-top',
  titleMode = 'header',
  info = {},
} = {}) {
  const contentDensity =
    info?.padding === 'tight' || info?.fieldGap === 'tight' ? 'compact' : 'comfortable';

  switch (structuralPreset) {
    case 'image-left':
      return normalizeCardLayoutPlan({
        cardsPerRow,
        sectionOrder: titleMode === 'inline' ? ['image', 'info'] : ['image', 'header', 'info'],
        imagePlacement: 'left',
        titleClamp: 2,
        contentDensity,
        emphasis: 'image',
        groupingHint: 'default',
      });
    case 'compact-list':
      return normalizeCardLayoutPlan({
        cardsPerRow,
        sectionOrder: titleMode === 'inline' ? ['info'] : ['header', 'info'],
        imagePlacement: 'top',
        titleClamp: 1,
        contentDensity: 'compact',
        emphasis: 'info',
        groupingHint: 'summary-first',
      });
    case 'detail-first':
      return normalizeCardLayoutPlan({
        cardsPerRow,
        sectionOrder: titleMode === 'inline' ? ['info', 'image'] : ['info', 'header', 'image'],
        imagePlacement: 'top',
        titleClamp: 2,
        contentDensity,
        emphasis: 'info',
        groupingHint: 'detail-first',
      });
    case 'header-top':
    default:
      return normalizeCardLayoutPlan({
        cardsPerRow,
        sectionOrder: titleMode === 'inline' ? ['image', 'info'] : ['header', 'image', 'info'],
        imagePlacement: 'top',
        titleClamp: 2,
        contentDensity,
        emphasis: 'title',
        groupingHint: 'default',
      });
  }
}
