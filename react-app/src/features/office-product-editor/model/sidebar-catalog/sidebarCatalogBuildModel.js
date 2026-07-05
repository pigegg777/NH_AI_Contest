import {
  DEFAULT_CATEGORY_NAMES,
  createCatalogCard,
} from './sidebarCatalogCreateModel';

function buildRegisteredItemsByCategory(items) {
  return items.reduce((registeredItemsByCategory, item) => {
    if (
      !item?.categoryName ||
      registeredItemsByCategory.has(item.categoryName)
    ) {
      return registeredItemsByCategory;
    }

    registeredItemsByCategory.set(item.categoryName, item);
    return registeredItemsByCategory;
  }, new Map());
}

function createAddCard() {
  return {
    categoryName: '+ 추가',
    isAdd: true,
    isEmpty: false,
    selectionMode: 'custom',
    statusLabel: '준비 중',
    description: '새 카테고리를 만든 뒤 사이드바에서 선택해 업로드하세요.',
    meta: [],
  };
}

export function buildOfficeProductDataCatalogModel(
  inputItems,
  pendingCategoryNames = [],
) {
  const items = Array.isArray(inputItems) ? inputItems : [];
  const registeredItemsByCategory = buildRegisteredItemsByCategory(items);

  const defaultCards = DEFAULT_CATEGORY_NAMES.map((categoryName) =>
    createCatalogCard(categoryName, registeredItemsByCategory.get(categoryName) ?? null),
  );

  const extraCards = items
    .filter(
      (item) =>
        item?.categoryName &&
        !DEFAULT_CATEGORY_NAMES.includes(item.categoryName),
    )
    .map((item) => createCatalogCard(item.categoryName, item));

  const pendingCards = pendingCategoryNames
    .filter((categoryName) => !registeredItemsByCategory.has(categoryName))
    .map((categoryName) => ({
      ...createCatalogCard(categoryName, null),
      isPendingCustom: true,
    }));

  return {
    registeredCount: items.length,
    cards: [...defaultCards, ...extraCards, ...pendingCards, createAddCard()],
  };
}
