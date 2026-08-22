import styles from './AiImageApplyPanel.module.css';

function findRowById(rows, rowId) {
  return (
    (Array.isArray(rows) ? rows : []).find((row) => row.row_id === rowId) ??
    null
  );
}

export function AiImageApplyMatchList({ matchedRowIds, rows }) {
  return (
    <ul className={styles.matchList}>
      {matchedRowIds.map((rowId) => {
        const row = findRowById(rows, rowId);

        return (
          <li key={rowId} className={styles.matchItem}>
            {row?.product_name || rowId}
          </li>
        );
      })}
    </ul>
  );
}
