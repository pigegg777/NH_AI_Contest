import { useMemo } from 'react';

import { useOfficeProductEditorState } from '../hooks/useOfficeProductEditorState';
import {
  ActiveCategoryCtx,
  AiCtx,
  CatalogCtx,
  EditorMetaCtx,
  ExtractionCtx,
  SaveCtx,
  TableCtx,
  UploadCtx,
} from './editorContexts';

export function OfficeProductEditorProvider({ user, children }) {
  const {
    tableNameMode,
    showsCustomTableNameInput,
    activeCategoryName,
    bannerStatusLabel,
    bannerStatusVariant,
    isViewingRegisteredData,
    activeCategory,
    catalog,
    extraction,
    upload,
    table,
    ai,
    save,
  } = useOfficeProductEditorState(user);

  const metaValue = useMemo(
    () => ({
      tableNameMode,
      showsCustomTableNameInput,
      activeCategoryName,
      bannerStatusLabel,
      bannerStatusVariant,
      isViewingRegisteredData,
    }),
    [
      tableNameMode,
      showsCustomTableNameInput,
      activeCategoryName,
      bannerStatusLabel,
      bannerStatusVariant,
      isViewingRegisteredData,
    ]
  );

  return (
    <EditorMetaCtx.Provider value={metaValue}>
      <CatalogCtx.Provider value={catalog}>
        <ActiveCategoryCtx.Provider value={activeCategory}>
          <ExtractionCtx.Provider value={extraction}>
            <UploadCtx.Provider value={upload}>
              <TableCtx.Provider value={table}>
                <AiCtx.Provider value={ai}>
                  <SaveCtx.Provider value={save}>{children}</SaveCtx.Provider>
                </AiCtx.Provider>
              </TableCtx.Provider>
            </UploadCtx.Provider>
          </ExtractionCtx.Provider>
        </ActiveCategoryCtx.Provider>
      </CatalogCtx.Provider>
    </EditorMetaCtx.Provider>
  );
}
