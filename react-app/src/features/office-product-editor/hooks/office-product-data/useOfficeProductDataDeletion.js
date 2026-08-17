import { useCallback, useState } from 'react';

import { deleteOfficeProductData } from '../../services/office-product-data/officeProductDataMutationService';

export function useOfficeProductDataDeletion({
  user,
  activeCategoryName,
  onRemoved,
  onActiveDataDeleted,
}) {
  const [isDeletingData, setIsDeletingData] = useState(false);

  const deleteCategory = useCallback(
    async (categoryName) => {
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
    },
    [user, onRemoved],
  );

  const handleResetRegisteredData = useCallback(async () => {
    if (!activeCategoryName || isDeletingData) {
      return;
    }

    if (await deleteCategory(activeCategoryName)) {
      onActiveDataDeleted();
    }
  }, [activeCategoryName, isDeletingData, deleteCategory, onActiveDataDeleted]);

  const handleCatalogCardDelete = useCallback(
    async (card) => {
      if (isDeletingData) {
        return;
      }

      if ((await deleteCategory(card.categoryName)) && card.categoryName === activeCategoryName) {
        onActiveDataDeleted();
      }
    },
    [isDeletingData, deleteCategory, activeCategoryName, onActiveDataDeleted],
  );

  return { isDeletingData, handleResetRegisteredData, handleCatalogCardDelete };
}
