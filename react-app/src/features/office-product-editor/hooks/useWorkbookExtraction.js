import { startTransition, useState } from 'react';

import { extractSalesPriceSheetData } from '../model/excel-extranction/workbookExtractionModel';
import { readWorkbookSheet } from '../services/workbookSheetReader';
import { buildWorkbookFingerprint } from '../services/workbookReviewAnnotationStorage';

const WORKBOOK_EXTRACTION_ERROR_MESSAGE = '엑셀 추출에 실패했습니다.';

export function useWorkbookExtraction() {
  const [selectedFileName, setSelectedFileName] = useState('');
  const [workbookFingerprint, setWorkbookFingerprint] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);

  async function processFile(file) {
    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setWorkbookFingerprint(buildWorkbookFingerprint(file));
    setIsExtracting(true);
    setErrorMessage('');

    try {
      const { sheetName, sheetRows } = await readWorkbookSheet(file);
      const nextResult = {
        sheetName,
        ...extractSalesPriceSheetData(sheetRows),
      };

      startTransition(() => {
        setResult(nextResult);
      });
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error ? error.message : WORKBOOK_EXTRACTION_ERROR_MESSAGE,
      );
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleWorkbookChange(event) {
    const [file] = event.target.files ?? [];
    await processFile(file);
  }

  function resetWorkbook() {
    setSelectedFileName('');
    setWorkbookFingerprint(null);
    setIsExtracting(false);
    setErrorMessage('');
    setResult(null);
  }

  return {
    selectedFileName,
    workbookFingerprint,
    isExtracting,
    errorMessage,
    result,
    handleWorkbookChange,
    processFile,
    resetWorkbook,
  };
}
