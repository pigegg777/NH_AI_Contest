import { useMemo } from 'react';

import { LinkCell, NoteCell, PriceCell, SelectionHeaderCheckbox, UsageCell } from './DataTableCells';
import {
  formatManufacturerList,
  formatPriceValue,
  getCellTextValue,
  NUMERIC_FORMAT_COLUMN_KEYS,
  PRICE_COLUMN_KEYS,
} from '../../utils/reviewTableCellValueUtils';
import formStyles from '../shared/formControls.module.css';
import styles from './DataTable.module.css';

function SortButton({ column, sortState, onSortChange }) {
  const isActive = sortState?.key === column.key;
  const nextDirection =
    !isActive || sortState.direction === 'desc' ? 'asc' : 'desc';
  const isDescending = isActive && sortState.direction === 'desc';
  const sortIndicator = isDescending ? 'v' : '^';

  return (
    <button
      type="button"
      className={`${styles.sortButton} ${isActive ? styles.sortButtonActive : ''}`.trim()}
      onClick={() => onSortChange({ key: column.key, direction: nextDirection })}
    >
      <span>{column.label}</span>
      {isActive ? (
        <span
          className={`${styles.sortIndicator} ${isDescending ? styles.sortIndicatorDesc : ''}`.trim()}
          aria-hidden="true"
        >
          {sortIndicator}
        </span>
      ) : null}
    </button>
  );
}

function renderCellContent(row, key, onPriceChange) {
  if (key === 'manufacturer_list') {
    return formatManufacturerList(row.manufacturer_list);
  }

  if (key === 'img_url') {
    return <LinkCell href={row.img_url} ariaLabel={`img-${row.row_id}`} />;
  }

  if (key === 'product_url') {
    return <LinkCell href={row.product_url} ariaLabel={`product-${row.row_id}`} />;
  }

  if (key === 'product_usage') {
    return <UsageCell usage={row.product_usage} productName={row.product_name} rowId={row.row_id} />;
  }

  if (PRICE_COLUMN_KEYS.has(key)) {
    return <PriceCell row={row} columnKey={key} onPriceChange={onPriceChange} />;
  }

  if (NUMERIC_FORMAT_COLUMN_KEYS.has(key)) {
    return formatPriceValue(row[key]);
  }

  return row[key] || row[key] === 0 ? row[key] : '-';
}

export function DataTable({
  rows,
  columns,
  tableNameMode,
  sortState,
  onSortChange,
  onShadowToggle,
  onVisibleRowsShadowChange,
  onNoteChange,
  onPriceChange,
}) {
  const visibleRowIds = useMemo(() => rows.map((row) => row.row_id).filter(Boolean), [rows]);
  const selectedCount = useMemo(() => rows.filter((row) => row.shadow === true).length, [rows]);
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const isPartiallySelected = selectedCount > 0 && selectedCount < rows.length;

  if (rows.length === 0) {
    return <div className={styles.emptyState}>표시할 집계 결과가 없습니다.</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table
        className={styles.table}
        data-mode={tableNameMode === 'fertilizer' || tableNameMode === 'pesticide' ? tableNameMode : 'default'}
      >
        <thead>
          <tr>
            <th className={styles.selectionHeader}>
              <SelectionHeaderCheckbox
                checked={allSelected}
                indeterminate={isPartiallySelected}
                onChange={(event) =>
                  onVisibleRowsShadowChange(visibleRowIds, event.target.checked)
                }
              />
            </th>

            {columns.map((column) =>
              column.key === 'note' ? (
                <th key={column.key} data-col={column.key} className={styles.noteHeader}>
                  {column.label}
                </th>
              ) : (
                <th
                  key={column.key}
                  data-col={column.key}
                  aria-sort={
                    sortState?.key !== column.key
                      ? 'none'
                      : sortState.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                  }
                >
                  <SortButton column={column} sortState={sortState} onSortChange={onSortChange} />
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              data-testid={row.row_id ? `row-${row.row_id}` : undefined}
              key={
                row.row_id ??
                `${row.product_code ?? 'missing-code'}-${row.sale_price_type_code ?? 'missing-type'}`
              }
            >
              <td className={styles.selectionCell}>
                <input
                  checked={row.shadow === true}
                  type="checkbox"
                  aria-label={`shadow-${row.row_id}`}
                  className={formStyles.shadowCheckbox}
                  onChange={() => onShadowToggle(row.row_id)}
                />
              </td>

              {columns.map((column) =>
                column.key === 'note' ? (
                  <td key={`${row.row_id}-note`} data-col={column.key} className={styles.noteCell}>
                    <NoteCell row={row} onNoteChange={onNoteChange} />
                  </td>
                ) : (
                  <td
                    key={`${row.row_id}-${column.key}`}
                    data-col={column.key}
                    title={String(getCellTextValue(row, column.key))}
                  >
                    {renderCellContent(row, column.key, onPriceChange)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
