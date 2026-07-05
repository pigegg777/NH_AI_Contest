import { useUploadCtx } from '../contexts/editorContexts';
import { DataEditorSection } from './DataEditorSection';
import { NewTableNameCard } from './data-upload/NewTableNameCard';
import styles from './DataUploadSection.module.css';

export function DataUploadSection() {
  const { canUploadFile, tableNameCardProps } = useUploadCtx();

  return (
    <div className={styles.uploadWorkspace}>
      <NewTableNameCard {...tableNameCardProps} />

      {canUploadFile ? (
        <div className={styles.uploadMain}>
          <DataEditorSection />
        </div>
      ) : null}
    </div>
  );
}
