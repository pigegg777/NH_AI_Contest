import styles from './ProductCodeCell.module.css';

export function ProductCodeCell({ row, onAppendedRowRemove }) {
  const productCode = row.product_code || '-';

  if (row.is_ai_appended !== true) {
    return productCode;
  }

  return (
    <span className={styles.appendedCell}>
      <span>{productCode}</span>
      {onAppendedRowRemove ? (
        <button
          type="button"
          className={styles.removeButton}
          aria-label={`remove-appended-${row.row_id}`}
          title="추가한 행 제거"
          onClick={() => onAppendedRowRemove(row.row_id)}
        >
          ✕
        </button>
      ) : null}
    </span>
  );
}
