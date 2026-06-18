import { toTrimmedString } from '../../../common/utils/text';
import { resolveTableNameModeFromCategoryName } from './workbookSaveModel';

export const DEFAULT_CATEGORY_NAMES = ['비료', '농약'];
export const CUSTOM_CATEGORY_CREATION_REASON = {
  empty: 'empty',
  defaultCategory: 'default-category',
  duplicate: 'duplicate',
  valid: 'valid',
};

const CATALOG_CARD_VARIANT = {
  add: 'add',
  default: 'default',
  registered: 'registered',
};

const DEFAULT_CATEGORY_SELECTION_MESSAGE = '기본 카테고리는 사이드바에서 선택하세요';
const DUPLICATE_CATEGORY_SELECTION_MESSAGE = '이미 있는 카테고리입니다. 사이드바에서 선택하세요';
const MISSING_UPDATE_LABEL = '업데이트 정보 없음';
const MISSING_SOURCE_FILE_LABEL = '원본 파일 정보 없음';
const EMPTY_CATEGORY_DESCRIPTION = '아직 저장된 데이터가 없습니다.';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatOfficeProductCatalogUpdatedAt(updatedAt) {
  if (!updatedAt) {
    return MISSING_UPDATE_LABEL;
  }

  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return MISSING_UPDATE_LABEL;
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
    description: '새 카테고리를 만든 뒤 사이드바에서 선택해 업로드하세요.',
    meta: [],
  };
}

function createCatalogCard(categoryName, item, variant) {
  const isEmpty = !item;
  const isSelectable =
    variant === CATALOG_CARD_VARIANT.default || variant === CATALOG_CARD_VARIANT.registered;
  const selectionMode = isSelectable ? resolveTableNameModeFromCategoryName(categoryName) : null;

  if (isEmpty) {
    return {
      categoryName,
      variant,
      isEmpty: true,
      isSelectable,
      selectionMode,
      statusLabel: '미등록',
      description: EMPTY_CATEGORY_DESCRIPTION,
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
      item.sourceFileName || MISSING_SOURCE_FILE_LABEL,
      formatOfficeProductCatalogUpdatedAt(item.updatedAt),
    ],
  };
}

export function resolveActiveCategoryName(tableNameMode, effectiveCustomTableName) {
  if (tableNameMode === 'fertilizer') {
    return '비료';
  }

  if (tableNameMode === 'pesticide') {
    return '농약';
  }

  if (tableNameMode === 'custom') {
    return toTrimmedString(effectiveCustomTableName);
  }

  return '';
}

export function validateCustomCategoryCreation(categoryName, existingCategoryNames = []) {
  const normalizedCategoryName = toTrimmedString(categoryName);

  if (!normalizedCategoryName) {
    return {
      normalizedCategoryName: '',
      isValid: false,
      reason: CUSTOM_CATEGORY_CREATION_REASON.empty,
      message: '',
    };
  }

  if (DEFAULT_CATEGORY_NAMES.includes(normalizedCategoryName)) {
    return {
      normalizedCategoryName,
      isValid: false,
      reason: CUSTOM_CATEGORY_CREATION_REASON.defaultCategory,
      message: DEFAULT_CATEGORY_SELECTION_MESSAGE,
    };
  }

  if (existingCategoryNames.includes(normalizedCategoryName)) {
    return {
      normalizedCategoryName,
      isValid: false,
      reason: CUSTOM_CATEGORY_CREATION_REASON.duplicate,
      message: DUPLICATE_CATEGORY_SELECTION_MESSAGE,
    };
  }

  return {
    normalizedCategoryName,
    isValid: true,
    reason: CUSTOM_CATEGORY_CREATION_REASON.valid,
    message: '',
  };
}

export function validateCustomCategoryName(categoryName, existingCategoryNames = []) {
  return validateCustomCategoryCreation(categoryName, existingCategoryNames).message || null;
}

export function buildOfficeProductDataCatalogModel(inputItems, pendingCategoryNames = []) {
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
    .filter((item) => item?.categoryName && !DEFAULT_CATEGORY_NAMES.includes(item.categoryName))
    .map((item) => createCatalogCard(item.categoryName, item, CATALOG_CARD_VARIANT.registered));

  const pendingCards = pendingCategoryNames
    .filter((categoryName) => !registeredItemsByCategory.has(categoryName))
    .map((categoryName) => createCatalogCard(categoryName, null, CATALOG_CARD_VARIANT.registered));

  return {
    registeredCount: items.length,
    cards: [...defaultCards, ...extraCards, ...pendingCards, createAddCard()],
  };
}
