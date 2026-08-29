import {
  fetchAllOfficeProductRows,
  fetchPublicOfficeIdentity,
} from '../../services/office-product-data/publicOfficeProductService';

/**
 * 공개 페이지가 필요한 것을 한 번에 읽는다. 영업점 정보는 아직 없을 수 있고
 * (마이그레이션 전이거나 등록 전) 그때는 빈 문자열로 채운다 — 공개 페이지는
 * "없음"과 "빈 값"을 같게 다룬다.
 */
export async function loadPublicOfficeProducts(officeCode) {
  const [productRows, officeIdentity] = await Promise.all([
    fetchAllOfficeProductRows({ officeCode }),
    fetchPublicOfficeIdentity({ officeCode }),
  ]);

  return {
    productRows,
    officeName: officeIdentity?.officeName ?? '',
    nhName: officeIdentity?.nhName ?? '',
    productUpdatedAt: officeIdentity?.productUpdatedAt ?? '',
  };
}
