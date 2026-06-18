import { useState } from 'react';

import { deleteOfficeProductData } from '../services/officeProductDataService';

export function useOfficeProductDataDeletion({
  user,
  activeCategoryName,
  onRemoved,
  onActiveDataDeleted,
}) {
  const [isDeletingData, setIsDeletingData] = useState(false);

  async function deleteCategory(categoryName) {
    setIsDeletingData(true);

    try {
      await deleteOfficeProductData({ officeCode: user?.office_code, categoryName });
      onRemoved(categoryName);
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '데이터 삭제에 실패했습니다.');
      return false;
    } finally {
      setIsDeletingData(false);
    }
  }

  async function handleResetRegisteredData() {
    if (!activeCategoryName || isDeletingData) {
      return;
    }

    if (await deleteCategory(activeCategoryName)) {
      onActiveDataDeleted();
    }
  }

  async function handleCatalogCardDelete(card) {
    if (isDeletingData) {
      return;
    }

    if ((await deleteCategory(card.categoryName)) && card.categoryName === activeCategoryName) {
      onActiveDataDeleted();
    }
  }

  return { isDeletingData, handleResetRegisteredData, handleCatalogCardDelete };
}
