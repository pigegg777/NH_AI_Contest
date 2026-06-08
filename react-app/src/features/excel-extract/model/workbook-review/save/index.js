import { toTrimmedString } from '../../../../../common/utils/text';

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

export function resolveTableCategoryName(tableNameMode, customTableName) {
  if (tableNameMode === 'custom') {
    return toTrimmedString(customTableName);
  }

  return TABLE_NAME_LABELS[tableNameMode] ?? '';
}
