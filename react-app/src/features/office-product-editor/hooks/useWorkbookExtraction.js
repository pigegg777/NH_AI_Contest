import { startTransition, useState } from 'react';

import { extractSalesPriceSheetData } from '../model/excel-extranction/workbookExtractionModel';
import { readWorkbookSheet } from '../services/workbookSheetReader';

function buildWorkbookFingerprint(file) {
  if (
    !file ||
    typeof file.name !== 'string' ||
    typeof file.size !== 'number' ||
    typeof file.lastModified !== 'number'
  ) {
    return null;
  }

  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function useWorkbookExtraction() {
  const [selectedFileName, setSelectedFileName] = useState('');
  const [workbookFingerprint, setWorkbookFingerprint] = useState(null);
  const [result, setResult] = useState(null);

  async function processFile(file) {
    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setWorkbookFingerprint(buildWorkbookFingerprint(file));

    try {
      const { sheetName, sheetRows } = await readWorkbookSheet(file);
      const nextResult = {
        sheetName,
        ...extractSalesPriceSheetData(sheetRows),
      };

      startTransition(() => {
        setResult(nextResult);
      });
    } catch {
      setResult(null);
    }
  }

  async function handleWorkbookChange(event) {
    const [file] = event.target.files ?? [];
    await processFile(file);
  }

  function resetWorkbook() {
    setSelectedFileName('');
    setWorkbookFingerprint(null);
    setResult(null);
  }

  return {
    selectedFileName,
    workbookFingerprint,
    result,
    handleWorkbookChange,
    processFile,
    resetWorkbook,
  };
}
