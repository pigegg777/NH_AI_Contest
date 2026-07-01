import { resolveActiveCategoryName } from '../model/sidebar-catalog/sidebarCatalogCreateModel';
import { useRegisteredProductData } from './useRegisteredProductData';

const EMPTY_ROWS = [];

export function useActiveCategoryData({
  user,
  tableNameMode,
  effectiveCustomTableName,
  officeProductCatalogItems,
  result,
  workbookFingerprint,
}) {
  const activeCategoryName = resolveActiveCategoryName(tableNameMode, effectiveCustomTableName);

  const registeredCatalogItem =
    officeProductCatalogItems.find((item) => item.categoryName === activeCategoryName) ?? null;

  const isViewingRegisteredData = Boolean(registeredCatalogItem);
  const shouldFetchRegisteredData = isViewingRegisteredData && !result;

  const {
    data: registeredProductData,
    isLoading: isRegisteredProductDataLoading,
    errorMessage: registeredProductDataErrorMessage,
  } = useRegisteredProductData({
    user,
    categoryName: activeCategoryName,
    isEnabled: shouldFetchRegisteredData,
  });

  const extractedRows = result?.rows ?? registeredProductData?.rows ?? EMPTY_ROWS;
  const registeredFingerprint = registeredCatalogItem
    ? `registered:${activeCategoryName}:${registeredCatalogItem.updatedAt ?? ''}`
    : null;
  const effectiveFingerprint = workbookFingerprint ?? registeredFingerprint;

  const bannerStatusLabel = result
    ? '신규 데이터 검토 중'
    : registeredCatalogItem
      ? '등록됨 · 편집 중'
      : '신규 등록';
  const bannerStatusVariant = result || registeredCatalogItem ? 'registered' : 'new';

  return {
    activeCategoryName,
    registeredCatalogItem,
    isViewingRegisteredData,
    isRegisteredProductDataLoading,
    registeredProductDataErrorMessage,
    extractedRows,
    effectiveFingerprint,
    bannerStatusLabel,
    bannerStatusVariant,
  };
}
