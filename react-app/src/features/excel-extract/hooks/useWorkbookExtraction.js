import { startTransition, useState } from 'react';

import { buildWorkbookFingerprint } from '../model/annotations/annotationModel';
import { extractSalesPriceWorkbook } from '../services/salesPriceWorkbookExtractor';

const WORKBOOK_EXTRACTION_ERROR_MESSAGE = 'Workbook extraction failed.';

export function useWorkbookExtraction() {
  const [selectedFileName, setSelectedFileName] = useState('');
  const [workbookFingerprint, setWorkbookFingerprint] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);

  async function handleWorkbookChange(event) {
    const [file] = event.target.files ?? [];

    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setWorkbookFingerprint(buildWorkbookFingerprint(file));
    setIsExtracting(true);
    setErrorMessage('');

    try {
      const nextResult = await extractSalesPriceWorkbook(file);
      startTransition(() => {
        setResult(nextResult);
      });
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error ? error.message : WORKBOOK_EXTRACTION_ERROR_MESSAGE
      );
    } finally {
      setIsExtracting(false);
    }
  }

  return {
    selectedFileName,
    workbookFingerprint,
    isExtracting,
    errorMessage,
    result,
    handleWorkbookChange,
  };
}


