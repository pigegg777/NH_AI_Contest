import styles from './HeaderSection.module.css';

export function EditingDataName({
  activeCategoryName,
  bannerStatusLabel,
  bannerStatusVariant,
}) {
  return (
    <div className={styles.left}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>
          {activeCategoryName ||
            '새 테이블을 등록하거나 왼쪽에서 데이터를 선택해 주세요'}
        </h1>
        {activeCategoryName && (
          <span
            className={[
              styles.status,
              bannerStatusVariant === 'registered'
                ? styles.statusRegistered
                : styles.statusNew,
            ].join(' ')}
          >
            {bannerStatusLabel}
          </span>
        )}
      </div>
    </div>
  );
}
