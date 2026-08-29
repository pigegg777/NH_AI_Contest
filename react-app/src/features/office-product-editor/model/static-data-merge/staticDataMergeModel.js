import { fetchStaticProductLookup } from '../../services/staticProductLookupService';

export function shouldUseStaticDataMerge(tableNameMode) {
  return tableNameMode === 'fertilizer' || tableNameMode === 'pesticide';
}

/**
 * 정적 상품 조회에 실패하면 빈 lookup을 돌려준다 — 병합할 정적 데이터가
 * 없는 것과 조회가 실패한 것을 호출자가 구분할 필요가 없다.
 */
export async function loadStaticMergeLookup(mergeKind, productCodes) {
  try {
    return await fetchStaticProductLookup(mergeKind, productCodes);
  } catch {
    return {};
  }
}
