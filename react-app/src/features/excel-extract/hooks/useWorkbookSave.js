import { useEffect, useState } from 'react';

import {
  canSaveWorkbookData,
  resolveSaveCategoryName,
} from '../model/save/workbookSaveModel';
import { saveOfficeProductData } from '../services/officeProductDataService';

const SAVE_ERROR_MESSAGE = '검토 데이터를 저장하지 못했습니다.';

export function useWorkbookSave({
  user,
  result,
  mergedRows,
  selectedFileName,
  workbookFingerprint,
  tableNameMode,
  customTableName,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  const resolvedCategoryName = resolveSaveCategoryName(tableNameMode, customTableName);
  const canSave = canSaveWorkbookData({
    user,
    result,
    rows: mergedRows,
    categoryName: resolvedCategoryName,
  });

  useEffect(() => {
    setSaveErrorMessage('');
    setSaveSuccessMessage('');
    setIsSaving(false);
  }, [workbookFingerprint]);

  async function handleSave() {
    if (!canSave || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage('');
    setSaveSuccessMessage('');

    try {
      const savedData = await saveOfficeProductData({
        user,
        rows: mergedRows,
        categoryName: resolvedCategoryName,
        sourceFileName: selectedFileName,
      });
      const savedRowCount = savedData?.row_count ?? mergedRows.length;
      setSaveSuccessMessage(`${resolvedCategoryName} 데이터 ${savedRowCount}건을 저장했습니다.`);
    } catch (error) {
      setSaveErrorMessage(error instanceof Error ? error.message : SAVE_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  return {
    resolvedCategoryName,
    canSave,
    isSaving,
    saveErrorMessage,
    saveSuccessMessage,
    handleSave,
  };
}
