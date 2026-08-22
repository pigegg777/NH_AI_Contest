import styles from './AiImageApplyPanel.module.css';

export function AiImageStorageBrowser({
  storageImages,
  isLoadingStorageImages,
  storageListError,
  onSelect,
  onDelete,
}) {
  function handleDeleteClick(image) {
    if (
      !window.confirm('이 이미지를 삭제할까요? 저장소에서도 함께 삭제됩니다.')
    ) {
      return;
    }

    onDelete(image);
  }

  return (
    <div className={styles.storageBrowser}>
      {isLoadingStorageImages ? (
        <p className={styles.status}>불러오는 중...</p>
      ) : null}
      {!isLoadingStorageImages && storageListError ? (
        <p className={styles.status}>{storageListError}</p>
      ) : null}
      {!isLoadingStorageImages &&
      !storageListError &&
      storageImages.length === 0 ? (
        <p className={styles.status}>저장된 이미지가 없습니다.</p>
      ) : null}
      {!isLoadingStorageImages && storageImages.length > 0 ? (
        <ul className={styles.storageGrid}>
          {storageImages.map((image) => (
            <li key={image.path} className={styles.storageGridItem}>
              <button
                type="button"
                className={styles.storageImageButton}
                aria-label={`storage-image-${image.path}`}
                onClick={() => onSelect(image)}
              >
                <img
                  className={styles.storageImageThumb}
                  src={image.url}
                  alt=""
                />
              </button>
              <button
                type="button"
                className={styles.storageImageDeleteButton}
                aria-label={`storage-image-delete-${image.path}`}
                onClick={() => handleDeleteClick(image)}
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
