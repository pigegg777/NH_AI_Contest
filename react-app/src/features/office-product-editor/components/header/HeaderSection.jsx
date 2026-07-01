import { EditingDataName } from './EditingDataName';
import { SaveControlPanel } from './SaveControlPanel';
import styles from './HeaderSection.module.css';

export function HeaderSection({
  activeCategoryName,
  bannerStatusLabel,
  bannerStatusVariant,
  isViewingRegisteredData,
  saveProps,
}) {
  return (
    <div className={styles.banner}>
      <EditingDataName
        activeCategoryName={activeCategoryName}
        bannerStatusLabel={bannerStatusLabel}
        bannerStatusVariant={bannerStatusVariant}
      />
      {isViewingRegisteredData && (
        <div className={styles.actions}>
          <SaveControlPanel {...saveProps} />
        </div>
      )}
    </div>
  );
}
