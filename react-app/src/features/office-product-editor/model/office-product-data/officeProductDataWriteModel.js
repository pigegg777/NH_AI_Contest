import { toNullableTrimmedString, toTrimmedString } from '../../../../common/utils/text';
import { removeStorefrontCategoryConfig } from '../../../storefront-config/model/storefrontConfigOrchestrator';
import {
  deleteOfficeProductData,
  saveOfficeProductData,
} from '../../services/office-product-data/officeProductDataMutationService';

/**
 * 워크북을 저장하고 카탈로그 항목 형태로 돌려준다. 저장 응답에 행 수나
 * 갱신 시각이 없으면 보낸 값과 현재 시각으로 메운다.
 */
export async function saveOfficeProductWorkbook({
  user,
  rows,
  categoryName,
  sourceFileName,
}) {
  const savedData = await saveOfficeProductData({
    user,
    rows,
    categoryName,
    sourceFileName,
  });
  const rowCount = savedData?.row_count ?? rows.length;

  return {
    rowCount,
    catalogEntry: {
      id: savedData?.id ?? null,
      officeCode: toTrimmedString(user?.office_code),
      officeName: toTrimmedString(user?.office_name),
      categoryName,
      rowCount,
      sourceFileName: toNullableTrimmedString(sourceFileName),
      updatedAt: savedData?.updated_at ?? new Date().toISOString(),
    },
  };
}

/**
 * 카테고리 데이터를 지우면 그 카테고리로 키가 걸린 스토어프론트 디자인도
 * 같이 지운다. 디자인 삭제가 실패해도 데이터 삭제는 되돌리지 않는다 —
 * 남는 것은 고아 카테고리가 아니라 고아 디자인이므로, 알리고 넘어간다.
 */
export async function deleteOfficeProductCategory({ officeCode, categoryName }) {
  await deleteOfficeProductData({ officeCode, categoryName });

  try {
    await removeStorefrontCategoryConfig({ officeCode, categoryName });
    return { designError: null };
  } catch (designError) {
    return { designError };
  }
}
