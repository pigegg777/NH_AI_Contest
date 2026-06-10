import { resolveTableNameModeFromCategoryName } from '../save/workbookSaveModel';

const DEFAULT_CATEGORY_NAMES = ['비료', '농약'];
const CATALOG_CARD_VARIANT = {
  add: 'add',
  default: 'default',
  registered: 'registered',
};
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatOfficeProductCatalogUpdatedAt(updatedAt) {
  if (!updatedAt) {
    return '업데이트 정보 없음';
  }

  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return '업데이트 정보 없음';
  }

  return DATE_TIME_FORMATTER.format(date);
}

function buildRegisteredItemsByCategory(items) {
  return items.reduce((registeredItemsByCategory, item) => {
    if (!item?.categoryName || registeredItemsByCategory.has(item.categoryName)) {
      return registeredItemsByCategory;
    }

    registeredItemsByCategory.set(item.categoryName, item);
    return registeredItemsByCategory;
  }, new Map());
}

function createAddCard() {
  return {
    categoryName: '+ 추가',
    variant: CATALOG_CARD_VARIANT.add,
    isEmpty: false,
    isSelectable: true,
    selectionMode: 'custom',
    statusLabel: '준비 중',
    description: '추가 등록 기능은 다음 단계에서 연결됩니다.',
    meta: [],
  };
}

function createCatalogCard(categoryName, item, variant) {
  const isEmpty = !item;
  const isSelectable = variant === CATALOG_CARD_VARIANT.default;
  const selectionMode = isSelectable ? resolveTableNameModeFromCategoryName(categoryName) : null;

  if (isEmpty) {
    return {
      categoryName,
      variant,
      isEmpty: true,
      isSelectable,
      selectionMode,
      statusLabel: '미등록',
      description: '아직 저장된 데이터가 없습니다.',
      meta: [],
    };
  }

  return {
    categoryName,
    variant,
    isEmpty: false,
    isSelectable,
    selectionMode,
    statusLabel: '등록됨',
    description: '',
    meta: [
      `${item.rowCount}개 행`,
      item.sourceFileName || '원본 파일 정보 없음',
      formatOfficeProductCatalogUpdatedAt(item.updatedAt),
    ],
  };
}

export function buildOfficeProductDataCatalogModel(inputItems) {
  const items = Array.isArray(inputItems) ? inputItems : [];
  const registeredItemsByCategory = buildRegisteredItemsByCategory(items);

  const defaultCards = DEFAULT_CATEGORY_NAMES.map((categoryName) =>
    createCatalogCard(
      categoryName,
      registeredItemsByCategory.get(categoryName) ?? null,
      CATALOG_CARD_VARIANT.default,
    ),
  );

  const extraCards = items
    .filter(
      (item) => item?.categoryName && !DEFAULT_CATEGORY_NAMES.includes(item.categoryName),
    )
    .map((item) =>
      createCatalogCard(item.categoryName, item, CATALOG_CARD_VARIANT.registered),
    );

  return {
    registeredCount: items.length,
    cards: [...defaultCards, ...extraCards, createAddCard()],
  };
}
