import { useEditorMeta, useSaveCtx } from '../../contexts/editorContexts';
import { EditingDataName } from './EditingDataName';
import { SaveControlPanel } from './SaveControlPanel';
import styles from './HeaderSection.module.css';

export function HeaderSection() {
  const {
    activeCategoryName,
    bannerStatusLabel,
    bannerStatusVariant,
  } = useEditorMeta();
  const save = useSaveCtx();

  return (
    <div className={styles.banner}>
      <EditingDataName
        activeCategoryName={activeCategoryName}
        bannerStatusLabel={bannerStatusLabel}
        bannerStatusVariant={bannerStatusVariant}
      />
      {save?.handleSave && (
        <div className={styles.actions}>
          <SaveControlPanel {...save} />
        </div>
      )}
    </div>
  );
}
