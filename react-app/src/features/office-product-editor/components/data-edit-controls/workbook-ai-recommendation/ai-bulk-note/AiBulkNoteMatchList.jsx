import { AI_BULK_NOTE_PRICE_FIELD_KEYS } from '../../../../model/ai-bulk-note/aiBulkNoteMatchModel';
import { formatPriceValue } from '../../../../utils/reviewTableCellValueUtils';
import styles from './AiBulkNoteWriterPanel.module.css';

const PRICE_FIELD_LABELS = {
  zero_tax_price: '영세단가',
  tax_price: '과세단가',
  exempt_tax_price: '면세단가',
};

function findRowById(rows, rowId) {
  return (Array.isArray(rows) ? rows : []).find((row) => row.row_id === rowId) ?? null;
}

function AiBulkNoteFieldDiff({ label, oldValue, newValue }) {
  return (
    <p className={styles.matchNoteDiff}>
      <span className={styles.matchFieldLabel}>{label}: </span>
      {oldValue ? <span className={styles.matchOldNote}>{oldValue}</span> : null}
      {oldValue ? <span className={styles.matchArrow}> → </span> : null}
      <span className={styles.matchNewNote}>{newValue}</span>
    </p>
  );
}

export function AiBulkNoteMatchList({ matches, rows }) {
  return (
    <ul className={styles.matchList}>
      {matches.map((match) => {
        const row = findRowById(rows, match.rowId);

        return (
          <li key={match.rowId} className={styles.matchItem}>
            <div className={styles.matchHeader}>
              <strong>{row?.product_name || match.rowId}</strong>
              {row?.spec ? <span className={styles.matchSpec}>{row.spec}</span> : null}
            </div>
            {match.note !== undefined ? (
              <AiBulkNoteFieldDiff label="비고" oldValue={row?.note} newValue={match.note} />
            ) : null}
            {match.shadow !== undefined ? (
              <AiBulkNoteFieldDiff
                label="숨길 상품 표시"
                oldValue={row?.shadow === true ? '숨김' : '표시'}
                newValue={match.shadow ? '숨김' : '표시'}
              />
            ) : null}
            {AI_BULK_NOTE_PRICE_FIELD_KEYS.map((key) =>
              match[key] !== undefined ? (
                <AiBulkNoteFieldDiff
                  key={key}
                  label={PRICE_FIELD_LABELS[key]}
                  oldValue={formatPriceValue(row?.[key])}
                  newValue={formatPriceValue(match[key])}
                />
              ) : null,
            )}
          </li>
        );
      })}
    </ul>
  );
}
