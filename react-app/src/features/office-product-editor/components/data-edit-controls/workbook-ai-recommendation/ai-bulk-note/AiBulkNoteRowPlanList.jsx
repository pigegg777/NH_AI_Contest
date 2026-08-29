import {
  AI_BULK_ROW_ANNOTATION_FIELDS,
  splitAiBulkRowUpdate,
} from '../../../../model/ai-bulk-note/aiBulkNoteRowPlanModel';
import { AI_BULK_ROW_PATCHABLE_FIELDS } from '../../../../model/ai-bulk-row-draft/aiBulkRowDraftModel';
import { formatPriceValue } from '../../../../utils/reviewTableCellValueUtils';
import styles from './AiBulkNoteWriterPanel.module.css';

const FIELD_LABELS = {
  product_name: '상품명',
  spec: '규격',
  large_category: '대분류',
  medium_category: '중분류',
  small_category: '소분류',
  detail_category: '세분류',
  sale_price_type_code: '단가유형코드',
  sale_price_type_name: '단가유형',
  note: '비고',
  zero_tax_price: '영세단가',
  tax_price: '과세단가',
  exempt_tax_price: '면세단가',
};

const PRICE_FIELDS = new Set([
  'zero_tax_price',
  'tax_price',
  'exempt_tax_price',
]);

// Stable display order regardless of which fields the sheet happened to fill.
const UPDATE_FIELD_ORDER = [
  ...AI_BULK_ROW_PATCHABLE_FIELDS,
  ...AI_BULK_ROW_ANNOTATION_FIELDS,
];

function formatFieldValue(field, value) {
  if (value == null || value === '') {
    return '';
  }

  return PRICE_FIELDS.has(field) ? formatPriceValue(value) : String(value);
}

function buildUpdateFields(newRow) {
  const { annotationPatch, rowPatch } = splitAiBulkRowUpdate(newRow);
  const patch = { ...rowPatch, ...annotationPatch };

  return UPDATE_FIELD_ORDER.filter((field) => field in patch).map((field) => ({
    field,
    value: patch[field],
  }));
}

function AiBulkNoteStaticBadge({ hasStaticData }) {
  return hasStaticData === false ? (
    <span className={styles.planWarningBadge}>정적 데이터 없음</span>
  ) : null;
}

function AiBulkNoteAppendedEntry({ entry }) {
  const { row } = entry;

  return (
    <li className={styles.matchItem}>
      <div className={styles.matchHeader}>
        <strong>{row.product_name || entry.productCode}</strong>
        {row.spec ? <span className={styles.matchSpec}>{row.spec}</span> : null}
        <span className={styles.planCode}>{entry.productCode}</span>
        <AiBulkNoteStaticBadge hasStaticData={entry.hasStaticData} />
      </div>
      <p className={styles.matchNoteDiff}>
        {buildUpdateFields(entry.newRow).map(({ field, value }) => (
          <span key={field} className={styles.planFieldChip}>
            <span className={styles.matchFieldLabel}>
              {FIELD_LABELS[field]}{' '}
            </span>
            <span className={styles.matchNewNote}>
              {formatFieldValue(field, value)}
            </span>
          </span>
        ))}
      </p>
    </li>
  );
}

function AiBulkNoteUpdateDiff({ newRow, targetRow }) {
  return (
    <>
      {buildUpdateFields(newRow).map(({ field, value }) => {
        const oldValue = formatFieldValue(field, targetRow?.[field]);
        const newValue = formatFieldValue(field, value);

        return (
          <p key={field} className={styles.matchNoteDiff}>
            <span className={styles.matchFieldLabel}>
              {FIELD_LABELS[field]}:{' '}
            </span>
            {oldValue ? (
              <span className={styles.matchOldNote}>{oldValue}</span>
            ) : null}
            {oldValue ? <span className={styles.matchArrow}> → </span> : null}
            <span className={styles.matchNewNote}>{newValue}</span>
          </p>
        );
      })}
    </>
  );
}

function AiBulkNoteConflictEntry({ entry }) {
  return (
    <li className={styles.matchItem}>
      <div className={styles.matchHeader}>
        <strong>{entry.targetRow?.product_name || entry.productCode}</strong>
        {entry.targetRow?.spec ? (
          <span className={styles.matchSpec}>{entry.targetRow.spec}</span>
        ) : null}
        <span className={styles.planCode}>{entry.productCode}</span>
        <AiBulkNoteStaticBadge hasStaticData={entry.hasStaticData} />
      </div>
      <AiBulkNoteUpdateDiff newRow={entry.newRow} targetRow={entry.targetRow} />
    </li>
  );
}

function AiBulkNoteAmbiguousEntry({
  entry,
  ambiguousSelection,
  onToggleTarget,
}) {
  return (
    <li className={styles.matchItem}>
      <div className={styles.matchHeader}>
        <strong>{entry.productCode}</strong>
        <span className={styles.matchSpec}>
          같은 상품코드의 행 {entry.targetRows.length}개 — 갱신할 행을 고르세요
        </span>
        <AiBulkNoteStaticBadge hasStaticData={entry.hasStaticData} />
      </div>
      {entry.targetRows.map((targetRow) => (
        <label key={targetRow.row_id} className={styles.planTargetOption}>
          <input
            type="checkbox"
            checked={ambiguousSelection.has(
              `${entry.productCode}::${targetRow.row_id}`,
            )}
            onChange={() => onToggleTarget(entry.productCode, targetRow.row_id)}
          />
          <span>
            {targetRow.product_name || targetRow.row_id}
            {targetRow.sale_price_type_name
              ? ` · ${targetRow.sale_price_type_name}`
              : ''}
          </span>
        </label>
      ))}
      <AiBulkNoteUpdateDiff
        newRow={entry.newRow}
        targetRow={entry.targetRows[0]}
      />
    </li>
  );
}

export function AiBulkNoteRowPlanList({
  rowPlan,
  ambiguousSelection,
  onToggleTarget,
}) {
  return (
    <div className={styles.planGroups}>
      {rowPlan.appended.length > 0 ? (
        <section>
          <p className={styles.planGroupTitle}>
            신규 {rowPlan.appended.length}건
          </p>
          <ul className={styles.matchList}>
            {rowPlan.appended.map((entry) => (
              <AiBulkNoteAppendedEntry key={entry.productCode} entry={entry} />
            ))}
          </ul>
        </section>
      ) : null}

      {rowPlan.conflicting.length > 0 ? (
        <section>
          <p className={styles.planGroupTitle}>
            겹침 {rowPlan.conflicting.length}건 — 기존 행을 갱신합니다
          </p>
          <ul className={styles.matchList}>
            {rowPlan.conflicting.map((entry) => (
              <AiBulkNoteConflictEntry key={entry.productCode} entry={entry} />
            ))}
          </ul>
        </section>
      ) : null}

      {rowPlan.ambiguous.length > 0 ? (
        <section>
          <p className={styles.planGroupTitle}>
            확인 필요 {rowPlan.ambiguous.length}건
          </p>
          <ul className={styles.matchList}>
            {rowPlan.ambiguous.map((entry) => (
              <AiBulkNoteAmbiguousEntry
                key={entry.productCode}
                entry={entry}
                ambiguousSelection={ambiguousSelection}
                onToggleTarget={onToggleTarget}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
