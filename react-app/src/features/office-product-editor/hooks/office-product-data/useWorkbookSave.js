import { useCallback, useEffect, useRef, useState } from 'react';

import { toTrimmedString } from '../../../../common/utils/text';
import { saveOfficeProductWorkbook } from '../../model/office-product-data/officeProductDataWriteModel';
import { resolveActiveCategoryName } from '../../model/sidebar-catalog/sidebarCatalogCreateModel';

const SAVE_ERROR_MESSAGE = '검토 데이터를 저장하지 못했습니다.';

export function useWorkbookSave({
  user,
  rowsToSave,
  selectedFileName,
  workbookFingerprint,
  tableNameMode,
  customTableName,
  onSaved,
  isStaticMergePending = false,
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
    user?.employee_id &&
      user?.office_code &&
      user?.office_name &&
      Array.isArray(rowsToSave) &&
      rowsToSave.length > 0 &&
      toTrimmedString(resolvedCategoryName) &&
      !isStaticMergePending,
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
      const { rowCount, catalogEntry } = await saveOfficeProductWorkbook({
        user,
        rows: rowsToSaveRef.current,
        categoryName: resolvedCategoryName,
        sourceFileName: selectedFileName,
      });

      setSaveSuccessMessage(`${resolvedCategoryName} 데이터 ${rowCount}건을 저장했습니다.`);
      onSaved?.(catalogEntry);
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
