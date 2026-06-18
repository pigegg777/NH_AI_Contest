import styles from './WorkbookReviewBanner.module.css';

export function WorkbookReviewBanner({ categoryName, statusLabel, statusVariant }) {
  if (!categoryName) {
    return (
      <div className={styles.dataNameBanner}>
        <span className={styles.dataNameLabel}>현재 작업</span>
        <h1 className={styles.dataNameTitle}>왼쪽에서 데이터를 선택하세요</h1>
      </div>
    );
  }

  return (
    <div className={styles.dataNameBanner}>
      <span className={styles.dataNameLabel}>현재 등록/편집 데이터</span>
      <h1 className={styles.dataNameTitle}>{categoryName}</h1>
      <span
        className={[
          styles.dataNameStatus,
          statusVariant === 'registered'
            ? styles.dataNameStatusRegistered
            : styles.dataNameStatusNew,
        ].join(' ')}
      >
        {statusLabel}
      </span>
    </div>
  );
}
