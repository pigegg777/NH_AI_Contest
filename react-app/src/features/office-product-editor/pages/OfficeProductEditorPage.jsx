import { useState } from 'react';

import { OfficeProductEditorProvider } from '../contexts/OfficeProductEditorProvider';
import { useEditorMeta, useExtractionCtx } from '../contexts/editorContexts';
import { DataUploadSection } from '../components/DataUploadSection';
import { DataEditorSection } from '../components/DataEditorSection';
import { DataTableSection } from '../components/DataTableSection';
import { EditorSidebar } from '../components/sidebar/EditorSidebar';
import { HeaderSection } from '../components/header/HeaderSection';
import uploadPanelStyles from '../components/DataUploadSection.module.css';
import styles from './OfficeProductEditorPage.module.css';

function EmptySelectionState() {
  return (
    <div className={uploadPanelStyles.emptySelectionState}>
      <p className={uploadPanelStyles.emptySelectionTitle}>
        새 테이블을 등록해주세요
      </p>
      <p className={uploadPanelStyles.emptySelectionHint}>
        등록 데이터를 선택하거나 추가하세요
      </p>
    </div>
  );
}

function EditorWorkspace() {
  const { tableNameMode, isViewingRegisteredData } = useEditorMeta();
  const { result } = useExtractionCtx();

  if (tableNameMode === '') {
    return <EmptySelectionState />;
  }

  if (isViewingRegisteredData) {
    return (
      <>
        <DataEditorSection />
        <DataTableSection />
      </>
    );
  }

  return (
    <>
      <DataUploadSection />
      {result ? <DataTableSection /> : null}
    </>
  );
}

function EditorLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div
      className={`${styles.layout} ${isSidebarCollapsed ? styles.layoutCollapsed : ''}`.trim()}
    >
      <EditorSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((c) => !c)}
      />
      <div className={styles.content}>
        <EditorWorkspace />
      </div>
    </div>
  );
}

export default function OfficeProductEditorPage({ user }) {
  return (
    <OfficeProductEditorProvider user={user}>
      <main className={styles.page}>
        <HeaderSection />
        <EditorLayout />
      </main>
    </OfficeProductEditorProvider>
  );
}
