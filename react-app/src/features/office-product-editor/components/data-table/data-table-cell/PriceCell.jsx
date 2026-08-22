import { useInlineEditableValue } from '../../../hooks/review-table/useInlineEditableValue';
import { parsePriceDraftValue, formatPriceValue } from '../../../utils/reviewTableCellValueUtils';
import styles from './PriceCell.module.css';

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
