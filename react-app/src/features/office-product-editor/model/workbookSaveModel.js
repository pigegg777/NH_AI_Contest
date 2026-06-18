import { toTrimmedString } from '../../../common/utils/text';

export const TABLE_NAME_OPTIONS = [
  { value: '', label: '선택하세요' },
  { value: 'fertilizer', label: '비료' },
  { value: 'pesticide', label: '농약' },
  { value: 'custom', label: '기타' },
];

const TABLE_NAME_LABELS = {
  fertilizer: '비료',
  pesticide: '농약',
};

const TABLE_NAME_MODE_BY_LABEL = {
  비료: 'fertilizer',
  농약: 'pesticide',
};

export function resolveSaveCategoryName(tableNameMode, customTableName) {
  if (tableNameMode === 'custom') {
    return toTrimmedString(customTableName);
  }

  return TABLE_NAME_LABELS[tableNameMode] ?? '';
}

export function resolveTableNameModeFromCategoryName(categoryName) {
  return TABLE_NAME_MODE_BY_LABEL[toTrimmedString(categoryName)] ?? null;
}

export function shouldUseStaticDataMerge(tableNameMode) {
  return tableNameMode === 'fertilizer' || tableNameMode === 'pesticide';
}

export function canSaveWorkbookData({ user, rows, categoryName }) {
  return Boolean(
    user?.id &&
      user?.office_code &&
      user?.office_name &&
      Array.isArray(rows) &&
      rows.length > 0 &&
      toTrimmedString(categoryName),
  );
}
