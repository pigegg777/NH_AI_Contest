import { startTransition, useCallback, useReducer } from 'react';
import { readSalesPriceWorkbook } from '../../model/excel-extraction/workbookExtractionModel';

const initialState = {
  selectedFileName: '',
  workbookFingerprint: null,
  result: null,
};

function sanitizeInitialExtractionState(initialDraft) {
  if (!initialDraft || typeof initialDraft !== 'object') {
    return initialState;
  }

  return {
    selectedFileName:
      typeof initialDraft.selectedFileName === 'string'
        ? initialDraft.selectedFileName
        : '',
    workbookFingerprint:
      typeof initialDraft.workbookFingerprint === 'string' && initialDraft.workbookFingerprint
        ? initialDraft.workbookFingerprint
        : null,
    result:
      initialDraft.result && typeof initialDraft.result === 'object'
        ? initialDraft.result
        : null,
  };
}

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

export function useWorkbookExtraction(initialDraft = null) {
  const [state, dispatch] = useReducer(
    extractionReducer,
    initialDraft,
    sanitizeInitialExtractionState,
  );

  const processFile = useCallback(async (file) => {
    if (!file) {
      return;
    }

    dispatch({ type: 'FILE_SELECTED', file });

    try {
      const result = await readSalesPriceWorkbook(file);

      startTransition(() => {
        dispatch({ type: 'EXTRACTION_COMPLETE', result });
      });
    } catch {
      dispatch({ type: 'EXTRACTION_FAILED' });
    }
  }, []);

  const handleWorkbookChange = useCallback(
    async (event) => {
      const [file] = event.target.files ?? [];
      await processFile(file);
    },
    [processFile],
  );

  const resetWorkbook = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    selectedFileName: state.selectedFileName,
    workbookFingerprint: state.workbookFingerprint,
    result: state.result,
    handleWorkbookChange,
    processFile,
    resetWorkbook,
  };
}
