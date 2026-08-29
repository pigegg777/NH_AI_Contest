import { useCallback, useState } from 'react';

import { deleteOfficeProductData } from '../../services/office-product-data/officeProductDataMutationService';
import { removeCategoryDetailConfig } from '../../../storefront-config/services/storefrontConfigService';

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

        // The storefront design is keyed by category name, so it has to go with the
        // data. A failure here leaves an orphan design, not an orphan category: the
        // deletion itself already stuck, so report it and let the removal stand.
        try {
          await removeCategoryDetailConfig({
            officeCode: user?.office_code,
            categoryName,
          });
        } catch (designError) {
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
