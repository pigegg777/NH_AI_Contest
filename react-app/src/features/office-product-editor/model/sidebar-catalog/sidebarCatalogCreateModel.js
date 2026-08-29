import { toTrimmedString } from '../../../../common/utils/text';

const DEFAULT_CATEGORY_MODE_BY_NAME = {
  비료: 'fertilizer',
  농약: 'pesticide',
};

export const DEFAULT_CATEGORY_NAMES = Object.keys(DEFAULT_CATEGORY_MODE_BY_NAME);

const DEFAULT_CATEGORY_SELECTION_MESSAGE =
  '기본 카테고리는 사이드바에서 선택하세요';
const DUPLICATE_CATEGORY_SELECTION_MESSAGE =
  '이미 있는 카테고리입니다. 사이드바에서 선택하세요';
const MISSING_UPDATE_LABEL = '업데이트 정보 없음';
const MISSING_SOURCE_FILE_LABEL = '원본 파일 정보 없음';
const EMPTY_CATEGORY_DESCRIPTION = '아직 저장된 데이터가 없습니다.';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function resolveTableNameModeFromCategoryName(categoryName) {
  return DEFAULT_CATEGORY_MODE_BY_NAME[toTrimmedString(categoryName)] ?? null;
}

export function createCatalogCard(categoryName, item) {
  const selectionMode = resolveTableNameModeFromCategoryName(categoryName);
  const updatedAtDate = new Date(item?.updatedAt);
  const updatedAtLabel =
    item?.updatedAt && !Number.isNaN(updatedAtDate.getTime())
      ? DATE_TIME_FORMATTER.format(updatedAtDate)
      : MISSING_UPDATE_LABEL;

  return {
    categoryName,
    isAdd: false,
    isEmpty: !item,
    selectionMode,
    statusLabel: item ? '등록됨' : '미등록',
    description: item ? '' : EMPTY_CATEGORY_DESCRIPTION,
    meta: item
      ? [
          `${item.rowCount}개 행`,
          item.sourceFileName || MISSING_SOURCE_FILE_LABEL,
          updatedAtLabel,
        ]
      : [],
  };
}

export function resolveActiveCategoryName(
  tableNameMode,
  effectiveCustomTableName,
) {
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

export function buildActiveCategoryFingerprint(
  categoryName,
  workbookFingerprint,
  registeredUpdatedAt,
) {
  const normalizedCategoryName = toTrimmedString(categoryName);

  if (normalizedCategoryName === '') {
    return workbookFingerprint || null;
  }

  const sourceFingerprint = workbookFingerprint
    ? `workbook:${workbookFingerprint}`
    : registeredUpdatedAt
      ? `registered:${registeredUpdatedAt}`
      : 'empty';

  return `category:${normalizedCategoryName}:${sourceFingerprint}`;
}

export function validateCustomCategoryCreation(
  categoryName,
  existingCategoryNames = [],
) {
  const normalizedCategoryName = toTrimmedString(categoryName);

  if (!normalizedCategoryName) {
    return {
      normalizedCategoryName: '',
      isValid: false,
      reason: 'empty',
      message: '',
    };
  }

  if (DEFAULT_CATEGORY_NAMES.includes(normalizedCategoryName)) {
    return {
      normalizedCategoryName,
      isValid: false,
      reason: 'default-category',
      message: DEFAULT_CATEGORY_SELECTION_MESSAGE,
    };
  }

  if (existingCategoryNames.includes(normalizedCategoryName)) {
    return {
      normalizedCategoryName,
      isValid: false,
      reason: 'duplicate',
      message: DUPLICATE_CATEGORY_SELECTION_MESSAGE,
    };
  }

  return {
    normalizedCategoryName,
    isValid: true,
    reason: 'valid',
    message: '',
  };
}
