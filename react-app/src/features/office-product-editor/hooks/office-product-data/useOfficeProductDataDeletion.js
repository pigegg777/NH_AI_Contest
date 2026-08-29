import { useCallback, useState } from 'react';

import { deleteOfficeProductCategory } from '../../model/office-product-data/officeProductDataWriteModel';

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
        const { designError } = await deleteOfficeProductCategory({
          officeCode: user?.office_code,
          categoryName,
        });

        if (designError) {
          window.alert(
            designError instanceof Error
              ? `데이터는 삭제했지만 저장된 디자인을 지우지 못했습니다. ${designError.message}`
              : '데이터는 삭제했지만 저장된 디자인을 지우지 못했습니다.',
          );
        }

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
