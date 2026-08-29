import { useMemo } from 'react';

import { buildPesticideInfoUrl } from '../../../../common/utils/pesticideInfoUrl';
import { ImageThumbnailCell } from './data-table-cell/ImageThumbnailCell';
import { LinkCell } from './data-table-cell/LinkCell';
import { NoteCell } from './data-table-cell/NoteCell';
import { PriceCell } from './data-table-cell/PriceCell';
import { SelectionHeaderCheckbox } from './data-table-cell/SelectionHeaderCheckbox';
import {
  formatManufacturerList,
  formatPriceValue,
  getCellTextValue,
  NUMERIC_FORMAT_COLUMN_KEYS,
  PRICE_COLUMN_KEYS,
} from '../../utils/reviewTableCellValueUtils';
import { SortButton } from './SortButton';
import styles from './DataTable.module.css';

function renderCellContent(row, key, onPriceChange, onImgUrlChange, officeCode) {
  if (key === 'manufacturer_list') {
    return formatManufacturerList(row.manufacturer_list);
  }

  if (key === 'img_url') {
    return (
      <ImageThumbnailCell
        src={row.img_url}
        ariaLabel={`img-${row.row_id}`}
        rowId={row.row_id}
        officeCode={officeCode}
        onImgUrlChange={onImgUrlChange}
        isLocked={row.img_url_is_static === true}
      />
    );
  }

  if (key === 'product_url') {
    return (
      <LinkCell href={row.product_url} ariaLabel={`product-${row.row_id}`} />
    );
  }

  if (key === 'pesticide_info_link') {
    return (
      <LinkCell
        href={buildPesticideInfoUrl(row)}
        ariaLabel={`pesticide-info-${row.row_id}`}
      />
    );
  }

  if (PRICE_COLUMN_KEYS.has(key)) {
    return (
      <PriceCell row={row} columnKey={key} onPriceChange={onPriceChange} />
    );
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
  onImgUrlChange,
  officeCode,
}) {
  const visibleRowIds = useMemo(
    () => rows.map((row) => row.row_id).filter(Boolean),
    [rows],
  );
  const selectedCount = useMemo(
    () => rows.filter((row) => row.shadow === true).length,
    [rows],
  );
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const isPartiallySelected = selectedCount > 0 && selectedCount < rows.length;

  if (rows.length === 0) {
    return (
      <div className={styles.emptyState}>표시할 집계 결과가 없습니다.</div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table
        className={styles.table}
        data-mode={
          tableNameMode === 'fertilizer' || tableNameMode === 'pesticide'
            ? tableNameMode
            : 'default'
        }
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
                <th
                  key={column.key}
                  data-col={column.key}
                  className={styles.noteHeader}
                >
                  {column.label}
                </th>
              ) : (
                <th
                  key={column.key}
                  data-col={column.key}
                  style={column.width ? { width: `${column.width}px` } : undefined}
                  aria-sort={
                    sortState?.key !== column.key
                      ? 'none'
                      : sortState.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                  }
                >
                  <SortButton
                    column={column}
                    sortState={sortState}
                    onSortChange={onSortChange}
                  />
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
                  className={styles.shadowCheckbox}
                  onChange={() => onShadowToggle(row.row_id)}
                />
              </td>

              {columns.map((column) =>
                column.key === 'note' ? (
                  <td
                    key={`${row.row_id}-note`}
                    data-col={column.key}
                    className={styles.noteCell}
                  >
                    <NoteCell row={row} onNoteChange={onNoteChange} />
                  </td>
                ) : (
                  <td
                    key={`${row.row_id}-${column.key}`}
                    data-col={column.key}
                    style={
                      column.width || column.noWrap
                        ? {
                            width: column.width ? `${column.width}px` : undefined,
                            whiteSpace: column.noWrap ? 'nowrap' : undefined,
                          }
                        : undefined
                    }
                    title={String(getCellTextValue(row, column.key))}
                  >
                    {renderCellContent(row, column.key, onPriceChange, onImgUrlChange, officeCode)}
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
