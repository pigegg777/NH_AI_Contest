import { useCallback, useEffect, useRef, useState } from 'react';

import { toNullableTrimmedString, toTrimmedString } from '../../../../common/utils/text';
import { resolveActiveCategoryName } from '../../model/sidebar-catalog/sidebarCatalogCreateModel';
import { saveOfficeProductData } from '../../services/office-product-data/officeProductDataMutationService';

const SAVE_ERROR_MESSAGE = '검토 데이터를 저장하지 못했습니다.';

export function useWorkbookSave({
  user,
  rowsToSave,
  selectedFileName,
  workbookFingerprint,
  tableNameMode,
  customTableName,
  onSaved,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const rowsToSaveRef = useRef(rowsToSave);

  useEffect(() => {
    rowsToSaveRef.current = rowsToSave;
  }, [rowsToSave]);

  const resolvedCategoryName = resolveActiveCategoryName(
    tableNameMode,
    customTableName,
  );
  const canSave = Boolean(
    user?.id &&
      user?.office_code &&
      user?.office_name &&
      Array.isArray(rowsToSave) &&
      rowsToSave.length > 0 &&
      toTrimmedString(resolvedCategoryName),
  );

  useEffect(() => {
    setSaveErrorMessage('');
    setSaveSuccessMessage('');
    setIsSaving(false);
  }, [workbookFingerprint]);

  const handleSave = useCallback(async () => {
    if (!canSave || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage('');
    setSaveSuccessMessage('');

    try {
      const currentRowsToSave = rowsToSaveRef.current;
      const savedData = await saveOfficeProductData({
        user,
        rows: currentRowsToSave,
        categoryName: resolvedCategoryName,
        sourceFileName: selectedFileName,
      });
      const savedRowCount = savedData?.row_count ?? currentRowsToSave.length;
      setSaveSuccessMessage(`${resolvedCategoryName} 데이터 ${savedRowCount}건을 저장했습니다.`);
      onSaved?.({
        id: savedData?.id ?? null,
        officeCode: toTrimmedString(user?.office_code),
        officeName: toTrimmedString(user?.office_name),
        categoryName: resolvedCategoryName,
        rowCount: savedRowCount,
        sourceFileName: toNullableTrimmedString(selectedFileName),
        updatedAt: savedData?.updated_at ?? new Date().toISOString(),
      });
    } catch (error) {
      setSaveErrorMessage(error instanceof Error ? error.message : SAVE_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }, [canSave, isSaving, user, resolvedCategoryName, selectedFileName, onSaved]);

  return {
    resolvedCategoryName,
    canSave,
    isSaving,
    saveErrorMessage,
    saveSuccessMessage,
    handleSave,
  };
}
