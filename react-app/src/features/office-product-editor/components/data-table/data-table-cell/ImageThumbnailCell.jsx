import { createPortal } from 'react-dom';

import { useImageStoragePicker } from '../../../hooks/ai-image-apply/useImageStoragePicker';
import styles from './ImageThumbnailCell.module.css';

function ImageStoragePickerButton({ rowId, officeCode, onSelect }) {
  const { isOpen, images, isLoading, error, handleOpen, handleClose, handleSelect } =
    useImageStoragePicker({ rowId, officeCode, onSelect });

  return (
    <>
      <button
        type="button"
        aria-label={`img-picker-${rowId}`}
        className={styles.imagePickerButton}
        onClick={handleOpen}
      >
        🗂️
      </button>

      {isOpen
        ? createPortal(
            <div className={styles.usageOverlay} role="presentation" onClick={handleClose}>
              <div
                className={styles.imagePickerPopover}
                role="dialog"
                aria-label={`img-picker-popover-${rowId}`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.usagePopoverHeader}>
                  <strong>이미지 선택</strong>
                  <button
                    type="button"
                    aria-label={`img-picker-close-${rowId}`}
                    className={styles.usageCloseButton}
                    onClick={handleClose}
                  >
                    닫기
                  </button>
                </div>

                <div className={styles.imagePickerBody}>
                  {isLoading ? <p className={styles.imagePickerStatus}>불러오는 중...</p> : null}
                  {!isLoading && error ? <p className={styles.imagePickerStatus}>{error}</p> : null}
                  {!isLoading && !error && images.length === 0 ? (
                    <p className={styles.imagePickerStatus}>저장된 이미지가 없습니다.</p>
                  ) : null}
                  {!isLoading && images.length > 0 ? (
                    <ul className={styles.imagePickerGrid}>
                      {images.map((image) => (
                        <li key={image.path}>
                          <button
                            type="button"
                            aria-label={`img-picker-option-${rowId}-${image.path}`}
                            className={styles.imagePickerOption}
                            onClick={() => handleSelect(image)}
                          >
                            <img className={styles.imagePickerThumb} src={image.url} alt="" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function ImageThumbnailCell({ src, ariaLabel, rowId, officeCode, onImgUrlChange, isLocked }) {
  const canEdit = Boolean(onImgUrlChange) && !isLocked;

  return (
    <span className={styles.imageThumbnailWrap}>
      <span className={styles.imageThumbnailInner}>
        {src ? (
          <a
            href={src}
            aria-label={ariaLabel}
            className={styles.imageThumbnailLink}
            target="_blank"
            rel="noreferrer"
          >
            <img className={styles.imageThumbnail} src={src} alt="" loading="lazy" />
          </a>
        ) : (
          <span>-</span>
        )}
        {canEdit && src ? (
          <button
            type="button"
            aria-label={`img-delete-${rowId}`}
            className={styles.imageThumbnailDeleteButton}
            onClick={() => onImgUrlChange(rowId, '')}
          >
            ✕
          </button>
        ) : null}
      </span>
      {canEdit ? (
        <ImageStoragePickerButton rowId={rowId} officeCode={officeCode} onSelect={onImgUrlChange} />
      ) : null}
    </span>
  );
}
