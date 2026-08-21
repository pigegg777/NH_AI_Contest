import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useInlineEditableValue } from '../../hooks/review-table/useInlineEditableValue';
import { requestAiImageList } from '../../services/ai-image-apply/aiImageApplyClient';
import {
  formatPriceValue,
  parsePriceDraftValue,
} from '../../utils/reviewTableCellValueUtils';
import styles from './DataTableCells.module.css';

export function SelectionHeaderCheckbox({ checked, indeterminate, onChange }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className={styles.selectionHeaderLabel}>
      <span className={styles.selectionHeaderText}>숨길 상품 표시</span>
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        className={styles.shadowCheckbox}
        onChange={onChange}
      />
    </label>
  );
}

export function NoteCell({ row, onNoteChange }) {
  const { isEditing, draftValue, setDraftValue, open, commit, handleKeyDown } = useInlineEditableValue(
    row.note,
    { onCommit: (draft) => onNoteChange(row.row_id, draft) },
  );

  if (isEditing) {
    return (
      <input
        aria-label={`note-input-${row.row_id}`}
        autoFocus
        className={styles.noteInput}
        type="text"
        value={draftValue}
        onBlur={commit}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <button type="button" aria-label={`note-cell-${row.row_id}`} className={styles.noteButton} onClick={open}>
      {row.note || '-'}
    </button>
  );
}

export function PriceCell({ row, columnKey, onPriceChange }) {
  const { isEditing, draftValue, setDraftValue, open, commit, handleKeyDown } = useInlineEditableValue(
    row[columnKey],
    {
      onCommit: (value) => onPriceChange(row.row_id, columnKey, value),
      parseDraft: parsePriceDraftValue,
    },
  );

  if (isEditing) {
    return (
      <input
        aria-label={`price-input-${columnKey}-${row.row_id}`}
        autoFocus
        className={`${styles.noteInput} ${styles.priceInput}`}
        type="number"
        value={draftValue}
        onBlur={commit}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`price-cell-${columnKey}-${row.row_id}`}
      className={styles.noteButton}
      onClick={open}
    >
      {formatPriceValue(row[columnKey])}
    </button>
  );
}

export function LinkCell({ href, ariaLabel }) {
  if (!href) {
    return <span>-</span>;
  }

  return (
    <a href={href} aria-label={ariaLabel} className={styles.tableLink} target="_blank" rel="noreferrer">
      링크
    </a>
  );
}

function ImageStoragePickerButton({ rowId, officeCode, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleOpen() {
    setIsOpen(true);
    setIsLoading(true);
    setError('');

    try {
      const { images: fetchedImages } = await requestAiImageList({ officeCode });
      setImages(fetchedImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 목록을 불러오지 못했습니다.');
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setIsOpen(false);
  }

  function handleSelect(image) {
    onSelect(rowId, image.url);
    setIsOpen(false);
  }

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

export function UsageCell({ usage, productName, rowId }) {
  const [isOpen, setIsOpen] = useState(false);
  const entries = Array.isArray(usage) ? usage : [];

  if (entries.length === 0) {
    return <span>-</span>;
  }

  return (
    <>
      <button
        type="button"
        aria-label={`usage-cell-${rowId}`}
        className={styles.tableLinkButton}
        onClick={() => setIsOpen(true)}
      >
        보기 ({entries.length})
      </button>

      {isOpen
        ? createPortal(
            <div
              className={styles.usageOverlay}
              role="presentation"
              onClick={() => setIsOpen(false)}
            >
              <div
                className={styles.usagePopover}
                role="dialog"
                aria-label={`usage-popover-${rowId}`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.usagePopoverHeader}>
                  <strong>{productName || '사용법'}</strong>
                  <button
                    type="button"
                    aria-label={`usage-close-${rowId}`}
                    className={styles.usageCloseButton}
                    onClick={() => setIsOpen(false)}
                  >
                    닫기
                  </button>
                </div>

                <div className={styles.usageTableWrap}>
                  <table className={styles.usageTable}>
                    <thead>
                      <tr>
                        <th>작물</th>
                        <th>적용 병해충</th>
                        <th>사용방법</th>
                        <th>희석배수</th>
                        <th>사용시기</th>
                        <th>사용횟수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, index) => (
                        <tr key={index}>
                          <td>{entry?.cropName || '-'}</td>
                          <td>{entry?.diseaseWeedName || '-'}</td>
                          <td>{entry?.pestiUse || '-'}</td>
                          <td>{entry?.dilutUnit || '-'}</td>
                          <td>{entry?.useSuittime || '-'}</td>
                          <td>{entry?.useNum || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
