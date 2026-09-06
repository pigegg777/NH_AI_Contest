export const NONGYAK_ALL_CATEGORY = '전체';

export function formatNongyakDisplayValue(value) {
  const text = String(value ?? '').trim();
  return text || '-';
}

export function buildCategoryOptions(rows) {
  const categories = [
    ...new Set(
      (Array.isArray(rows) ? rows : [])
        .map((row) => String(row?.product_category || '').trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ko'));

  return [NONGYAK_ALL_CATEGORY, ...categories];
}

export const NONGYAK_USAGE_COLUMNS = [
  { key: 'cropName', label: '작물' },
  { key: 'diseaseWeedName', label: '대상 병해충/잡초' },
  { key: 'pestiUse', label: '사용방법' },
  { key: 'dilutUnit', label: '희석배수' },
  { key: 'useSuittime', label: '사용시기' },
  { key: 'useNum', label: '사용횟수' },
];
