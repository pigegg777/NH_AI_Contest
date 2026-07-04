import { startTransition, useReducer } from 'react';
import { extractSalesPriceSheetData } from '../../model/excel-extranction/workbookExtractionModel';
import { readWorkbookSheet } from '../../services/workbookSheetReader';

const initialState = {
  selectedFileName: '',
  workbookFingerprint: null,
  result: null,
};

function extractionReducer(state, action) {
  switch (action.type) {
    case 'FILE_SELECTED':
      return {
        selectedFileName: action.file.name,
        workbookFingerprint: `${action.file.name}:${action.file.size}:${action.file.lastModified}`,
        result: state.result,
      };
    case 'EXTRACTION_COMPLETE':
      return { ...state, result: action.result };
    case 'EXTRACTION_FAILED':
      return { ...state, result: null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useWorkbookExtraction() {
  const [state, dispatch] = useReducer(extractionReducer, initialState);

  async function processFile(file) {
    if (!file) {
      return;
    }

    dispatch({ type: 'FILE_SELECTED', file });

    try {
      const { sheetName, sheetRows } = await readWorkbookSheet(file);
      const result = {
        sheetName,
        ...extractSalesPriceSheetData(sheetRows),
      };

      startTransition(() => {
        dispatch({ type: 'EXTRACTION_COMPLETE', result });
      });
    } catch {
      dispatch({ type: 'EXTRACTION_FAILED' });
    }
  }

  async function handleWorkbookChange(event) {
    const [file] = event.target.files ?? [];
    await processFile(file);
  }

  function resetWorkbook() {
    dispatch({ type: 'RESET' });
  }

  return {
    selectedFileName: state.selectedFileName,
    workbookFingerprint: state.workbookFingerprint,
    result: state.result,
    handleWorkbookChange,
    processFile,
    resetWorkbook,
  };
}
