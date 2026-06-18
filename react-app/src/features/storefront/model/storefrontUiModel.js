import { toTrimmedString } from '../../../common/utils/text';

export const MOBILE_UI_BLOCK_TYPES = [
  'hero',
  'productCategoryNav',
  'mobileCategoryBar',
  'searchBox',
  'categoryChips',
  'noticeBanner',
  'highlightBox',
  'ctaButton',
  'divider',
  'productSections',
  'emptyState',
];

export const MOBILE_UI_SLOTS = [
  'top',
  'afterSearch',
  'beforeChips',
  'afterChips',
  'beforeProducts',
  'sectionHeaderBelow',
  'bottom',
];

export const MOBILE_UI_SINGLETON_TYPES = [
  'hero',
  'productCategoryNav',
  'mobileCategoryBar',
  'searchBox',
  'categoryChips',
  'productSections',
  'emptyState',
];

export const MOBILE_UI_HELPER_TYPES = ['noticeBanner', 'highlightBox', 'ctaButton', 'divider'];

const REMOVED_MOBILE_UI_BLOCK_TYPES = new Set(['productCategoryNav', 'mobileCategoryBar']);

export const DEFAULT_CARD_ELEMENT_CONFIG = {
  showImage: true,
  showProductName: true,
  showSpec: true,
  showNutrient: true,
  showPrice: true,
  showBadge: true,
  imageSize: 'md',
  imageFit: 'contain',
  metaDensity: 'comfortable',
};

const DEFAULT_BLOCK_PROPS = {
  hero: {},
  productCategoryNav: {},
  mobileCategoryBar: {},
  searchBox: {},
  categoryChips: {},
  noticeBanner: { title: '', text: '' },
  highlightBox: { title: '', text: '' },
  ctaButton: { label: '', href: '' },
  divider: { label: '' },
  productSections: {},
  emptyState: {},
};

const REQUIRED_BLOCK_TYPES = ['productSections', 'emptyState'];

function cloneProps(type) {
  return { ...(DEFAULT_BLOCK_PROPS[type] ?? {}) };
}

function normalizeBlockProps(type, props) {
  const source = props ?? {};

  if (type === 'noticeBanner' || type === 'highlightBox') {
    return {
      title: toTrimmedString(source.title),
      text: toTrimmedString(source.text),
    };
  }

  if (type === 'ctaButton') {
    const label = toTrimmedString(source.label);
    const href = toTrimmedString(source.href);

    return {
      ...(label ? { label } : {}),
      ...(href ? { href } : {}),
    };
  }

  if (type === 'divider') {
    const label = toTrimmedString(source.label);

    return label ? { label } : {};
  }

  return cloneProps(type);
}

function normalizeMobileUiBlock(block, index) {
  if (!block || typeof block !== 'object' || Array.isArray(block)) {
    return null;
  }

  const type = toTrimmedString(block.type);

  if (!MOBILE_UI_BLOCK_TYPES.includes(type)) {
    return null;
  }

  const slot = MOBILE_UI_SLOTS.includes(block.slot) ? block.slot : getDefaultBlock(type).slot;

  return {
    id: toTrimmedString(block.id) || `${type}-${index}`,
    type,
    slot,
    enabled: block.enabled !== false,
    props: normalizeBlockProps(type, block.props),
  };
}

export function getDefaultBlock(type) {
  switch (type) {
    case 'hero':
      return { id: 'hero', type, slot: 'top', enabled: true, props: {} };
    case 'productCategoryNav':
      return { id: 'product-category-nav', type, slot: 'top', enabled: true, props: {} };
    case 'mobileCategoryBar':
      return { id: 'mobile-category-bar', type, slot: 'top', enabled: true, props: {} };
    case 'searchBox':
      return { id: 'search-box', type, slot: 'top', enabled: true, props: {} };
    case 'categoryChips':
      return { id: 'category-chips', type, slot: 'afterSearch', enabled: true, props: {} };
    case 'noticeBanner':
      return { id: 'notice-banner', type, slot: 'beforeProducts', enabled: true, props: cloneProps(type) };
    case 'highlightBox':
      return { id: 'highlight-box', type, slot: 'beforeProducts', enabled: true, props: cloneProps(type) };
    case 'ctaButton':
      return { id: 'cta-button', type, slot: 'beforeProducts', enabled: true, props: cloneProps(type) };
    case 'divider':
      return { id: 'divider', type, slot: 'beforeProducts', enabled: true, props: cloneProps(type) };
    case 'emptyState':
      return { id: 'empty-state', type, slot: 'bottom', enabled: true, props: {} };
    case 'productSections':
    default:
      return { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} };
  }
}

export function buildDefaultMobileUiTree({ searchEnabled = true, categoryChipsEnabled = true } = {}) {
  return [
    getDefaultBlock('hero'),
    getDefaultBlock('productCategoryNav'),
    getDefaultBlock('mobileCategoryBar'),
    { ...getDefaultBlock('searchBox'), enabled: searchEnabled },
    { ...getDefaultBlock('categoryChips'), enabled: categoryChipsEnabled },
    getDefaultBlock('productSections'),
    getDefaultBlock('emptyState'),
  ];
}

export const DEFAULT_MOBILE_UI_TREE = buildDefaultMobileUiTree();

export function normalizeMobileUiTree(
  mobileUiTree,
  { searchEnabled = true, categoryChipsEnabled = true } = {},
) {
  const fallbackTree = buildDefaultMobileUiTree({ searchEnabled, categoryChipsEnabled });

  if (!Array.isArray(mobileUiTree) || mobileUiTree.length === 0) {
    return fallbackTree;
  }

  const nextBlocks = [];
  const seenSingletons = new Set();

  mobileUiTree.forEach((block, index) => {
    const normalized = normalizeMobileUiBlock(block, index);

    if (!normalized) {
      return;
    }

    if (MOBILE_UI_SINGLETON_TYPES.includes(normalized.type)) {
      if (seenSingletons.has(normalized.type)) {
        return;
      }

      seenSingletons.add(normalized.type);
    }

    nextBlocks.push(normalized);
  });

  REQUIRED_BLOCK_TYPES.forEach((type) => {
    if (!nextBlocks.some((block) => block.type === type)) {
      nextBlocks.push(getDefaultBlock(type));
    }
  });

  return nextBlocks;
}

export function normalizeCardElementConfig(config) {
  const source = config ?? {};

  return {
    showImage: source.showImage !== false,
    showProductName: source.showProductName !== false,
    showSpec: source.showSpec !== false,
    showNutrient: source.showNutrient !== false,
    showPrice: source.showPrice !== false,
    showBadge: source.showBadge !== false,
    imageSize: ['hidden', 'sm', 'md', 'lg'].includes(source.imageSize)
      ? source.imageSize
      : DEFAULT_CARD_ELEMENT_CONFIG.imageSize,
    imageFit: ['cover', 'contain'].includes(source.imageFit)
      ? source.imageFit
      : DEFAULT_CARD_ELEMENT_CONFIG.imageFit,
    metaDensity: ['compact', 'comfortable'].includes(source.metaDensity)
      ? source.metaDensity
      : DEFAULT_CARD_ELEMENT_CONFIG.metaDensity,
  };
}

export function deriveCardElementConfig(fields, style, elementConfig) {
  const visibleFields = Array.isArray(fields) ? fields : [];
  const sourceStyle = style ?? {};
  const fallback = {
    showImage: sourceStyle.imageSize !== 'hidden',
    showProductName: true,
    showSpec: visibleFields.includes('spec'),
    showNutrient: visibleFields.includes('nutrient'),
    showPrice: ['zero_tax_price', 'tax_price', 'exempt_tax_price'].some((f) => visibleFields.includes(f)),
    showBadge: true,
    imageSize: sourceStyle.imageSize,
    imageFit: sourceStyle.imageFit,
    metaDensity: sourceStyle.layout === 'compact' || sourceStyle.cardSpacing === 'tight' ? 'compact' : 'comfortable',
  };

  return normalizeCardElementConfig({ ...fallback, ...(elementConfig ?? {}) });
}

export function findMobileUiBlock(mobileUiTree, type) {
  return (Array.isArray(mobileUiTree) ? mobileUiTree : []).find((block) => block?.type === type) ?? null;
}

function removeDeprecatedMobileUiBlocks(mobileUiTree) {
  return (Array.isArray(mobileUiTree) ? mobileUiTree : []).filter(
    (block) => !REMOVED_MOBILE_UI_BLOCK_TYPES.has(block?.type),
  );
}

export function sanitizeMobileUiTree(mobileUiTree) {
  const sanitizedTree = removeDeprecatedMobileUiBlocks(mobileUiTree);
  const searchBlock = findMobileUiBlock(sanitizedTree, 'searchBox');
  const categoryChipsBlock = findMobileUiBlock(sanitizedTree, 'categoryChips');

  return removeDeprecatedMobileUiBlocks(
    normalizeMobileUiTree(sanitizedTree, {
      searchEnabled: searchBlock ? searchBlock.enabled !== false : true,
      categoryChipsEnabled: categoryChipsBlock ? categoryChipsBlock.enabled !== false : true,
    }),
  );
}
