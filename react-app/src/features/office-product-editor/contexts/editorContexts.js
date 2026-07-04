import { createContext, useContext } from 'react';

export const EditorMetaCtx = createContext(null);
export const ExtractionCtx = createContext(null);
export const ActiveCategoryCtx = createContext(null);
export const CatalogCtx = createContext(null);
export const UploadCtx = createContext(null);
export const TableCtx = createContext(null);
export const AiCtx = createContext(null);
export const SaveCtx = createContext(null);

export const useEditorMeta = () => useContext(EditorMetaCtx);
export const useExtractionCtx = () => useContext(ExtractionCtx);
export const useActiveCategoryCtx = () => useContext(ActiveCategoryCtx);
export const useCatalogCtx = () => useContext(CatalogCtx);
export const useUploadCtx = () => useContext(UploadCtx);
export const useTableCtx = () => useContext(TableCtx);
export const useAiCtx = () => useContext(AiCtx);
export const useSaveCtx = () => useContext(SaveCtx);
