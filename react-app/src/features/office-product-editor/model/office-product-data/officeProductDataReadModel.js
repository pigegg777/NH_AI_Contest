import { toTrimmedString } from '../../../../common/utils/text';
import {
  fetchOfficeProductData,
  fetchOfficeProductDataCatalog,
} from '../../services/office-product-data/officeProductDataReadService';

/**
 * 등록 데이터를 조회하려면 영업점 코드가 있어야 하고, 카테고리별 조회는
 * 카테고리명까지 있어야 한다. 호출자가 매번 trim 하지 않도록 여기서 정리한다.
 */
export function resolveOfficeProductDataQuery({ user, categoryName } = {}) {
  const officeCode = toTrimmedString(user?.office_code);
  const normalizedCategoryName = toTrimmedString(categoryName);

  return {
    officeCode,
    categoryName: normalizedCategoryName,
    hasOffice: Boolean(officeCode),
    hasCategory: Boolean(officeCode && normalizedCategoryName),
  };
}

/** 카탈로그는 항상 배열이다 — 저장된 것이 없으면 빈 배열. */
export async function loadOfficeProductCatalog(officeCode) {
  const catalog = await fetchOfficeProductDataCatalog({ officeCode });
  return Array.isArray(catalog) ? catalog : [];
}

export async function loadRegisteredProductData({ officeCode, categoryName }) {
  return fetchOfficeProductData({ officeCode, categoryName });
}
