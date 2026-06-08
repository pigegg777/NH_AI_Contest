import { useEffect, useState } from 'react';

import { resolveTableCategoryName } from '../../model/workbook-review/save';
import { saveOfficeProductData } from '../../services/officeProductDataService';

const SAVE_ERROR_MESSAGE = '검토 데이터를 저장하지 못했습니다.';

export function useWorkbookReviewSave({ user, result, mergedRows, selectedFileName, workbookFingerprint }) {
  const [tableNameMode, setTableNameMode] = useState('');
  const [customTableName, setCustomTableName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  const resolvedCategoryName = resolveTableCategoryName(tableNameMode, customTableName);
  const canSave = Boolean(
    user?.id &&
      user?.office_code &&
      user?.office_name &&
      result &&
      mergedRows.length > 0 &&
      resolvedCategoryName,
  );

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
    tableNameMode,
    setTableNameMode,
    customTableName,
    setCustomTableName,
    resolvedCategoryName,
    canSave,
    isSaving,
    saveErrorMessage,
    saveSuccessMessage,
    handleSave,
  };
}
