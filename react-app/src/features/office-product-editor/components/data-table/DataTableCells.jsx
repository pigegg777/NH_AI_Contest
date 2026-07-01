import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useInlineEditableValue } from '../../hooks/useInlineEditableValue';
import {
  formatPriceValue,
  parsePriceDraftValue,
} from '../../utils/reviewTableCellValueUtils';
import formStyles from '../shared/formControls.module.css';
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
        className={formStyles.shadowCheckbox}
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
