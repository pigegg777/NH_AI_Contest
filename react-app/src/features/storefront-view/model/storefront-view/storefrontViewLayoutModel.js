import { getDefaultBlock } from '../storefront-config/storefrontUiModel';

const TOP_SLOT_BLOCK_ORDER = {
  hero: 0,
  searchBox: 1,
  productCategoryNav: 2,
  mobileCategoryBar: 3,
};

export const HEADER_SLOT_ORDER = ['top', 'afterSearch', 'beforeChips', 'afterChips'];
export const BODY_SLOT_ORDER = ['beforeProducts', 'bottom'];

export function buildRenderableMobileUiTree(mobileUiTree, shouldInferProductCategoryNav) {
  if (!shouldInferProductCategoryNav) {
    return mobileUiTree;
  }

  const hasProductCategoryNav = mobileUiTree.some(
    (block) => block?.type === 'productCategoryNav' && block.enabled !== false,
  );

  if (hasProductCategoryNav) {
    return mobileUiTree;
  }

  const inferredProductCategoryNav = {
    ...getDefaultBlock('productCategoryNav'),
    id: 'inferred-product-category-nav',
  };
  const nextTree = [];
  let inserted = false;

  mobileUiTree.forEach((block) => {
    nextTree.push(block);

    if (!inserted && block?.type === 'hero') {
      nextTree.push(inferredProductCategoryNav);
      inserted = true;
    }
  });

  if (!inserted) {
    const firstTopBlockIndex = nextTree.findIndex((block) => block?.slot === 'top');

    if (firstTopBlockIndex === -1) {
      nextTree.unshift(inferredProductCategoryNav);
    } else {
      nextTree.splice(firstTopBlockIndex, 0, inferredProductCategoryNav);
    }
  }

  return nextTree;
}

export function resolveSlotBlocks(renderableMobileUiTree, slot) {
  const blocks = renderableMobileUiTree.filter(
    (block) =>
      block.slot === slot &&
      block.type !== 'productSections' &&
      block.type !== 'emptyState',
  );

  if (slot === 'top') {
    blocks.sort((left, right) => {
      const leftOrder = TOP_SLOT_BLOCK_ORDER[left.type] ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = TOP_SLOT_BLOCK_ORDER[right.type] ?? Number.MAX_SAFE_INTEGER;

      return leftOrder - rightOrder;
    });
  }

  return blocks;
}
