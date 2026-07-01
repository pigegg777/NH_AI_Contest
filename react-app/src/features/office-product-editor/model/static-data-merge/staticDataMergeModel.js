export function shouldUseStaticDataMerge(tableNameMode) {
  return tableNameMode === 'fertilizer' || tableNameMode === 'pesticide';
}
