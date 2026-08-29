import {
  buildActiveCategoryFingerprint,
  resolveActiveCategoryName,
} from '../../model/sidebar-catalog/sidebarCatalogCreateModel';
import { useRegisteredProductData } from '../office-product-data/useRegisteredProductData';

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
  // Also fetched while a new workbook is under review: the saved rows are what
  // the carry-over reads img_url and note out of.
  const shouldFetchRegisteredData = isViewingRegisteredData;

  const {
    data: registeredProductData,
    isLoading: isRegisteredProductDataLoading,
    errorMessage: registeredProductDataErrorMessage,
  } = useRegisteredProductData({
    user,
    categoryName: activeCategoryName,
    isEnabled: shouldFetchRegisteredData,
    refreshToken: registeredCatalogItem?.updatedAt ?? null,
  });

  const registeredRows = registeredProductData?.rows ?? EMPTY_ROWS;
  const extractedRows = result?.rows ?? registeredRows;
  const effectiveFingerprint = buildActiveCategoryFingerprint(
    activeCategoryName,
    workbookFingerprint,
    registeredCatalogItem?.updatedAt ?? null,
  );

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
    registeredRows,
    effectiveFingerprint,
    bannerStatusLabel,
    bannerStatusVariant,
  };
}
