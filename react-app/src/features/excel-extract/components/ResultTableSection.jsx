import { useEffect, useMemo, useRef, useState } from 'react';

import styles from '../pages/ExcelExtractWorkbookReviewPage.module.css';
import {
  EMPTY_FILTER_VALUE,
  FILTER_FIELDS,
  formatManufacturerList,
  getTableColumnsByMode,
  SORT_DIRECTION,
} from '../model/table';

const NOTE_COLUMN = {
  key: 'note',
  label: '비고',
};

const LEADING_COLUMN_KEYS = new Set(['product_code', 'product_name']);
const PRICE_COLUMN_KEYS = new Set(['tax_price', 'zero_tax_price']);

function FilterSelect({ field, value, options, onChange }) {
  return (
    <label className={styles.filterField} htmlFor={field.id}>
      <span className={styles.filterLabel}>{field.label}</span>
      <select
        id={field.id}
        className={styles.filterSelect}
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
      >
        <option value="">전체</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === EMPTY_FILTER_VALUE ? '(빈값)' : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SortButton({ column, sortState, onSortChange }) {
  const isActive = sortState?.key === column.key;
  const nextDirection =
    !isActive || sortState.direction === SORT_DIRECTION.descending
      ? SORT_DIRECTION.ascending
      : SORT_DIRECTION.descending;
  const indicator = isActive
    ? sortState.direction === SORT_DIRECTION.ascending
      ? '^'
      : 'v'
    : '';

  return (
    <button
      type="button"
      className={`${styles.sortButton} ${isActive ? styles.sortButtonActive : ''}`.trim()}
      onClick={() => onSortChange({ key: column.key, direction: nextDirection })}
    >
      <span>{column.label}</span>
      {indicator ? <span className={styles.sortIndicator}>{indicator}</span> : null}
    </button>
  );
}

function SelectionHeaderCheckbox({ checked, indeterminate, onChange }) {
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

function NoteCell({ row, onNoteChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftNote, setDraftNote] = useState(row.note ?? '');

  useEffect(() => {
    if (!isEditing) {
      setDraftNote(row.note ?? '');
    }
  }, [isEditing, row.note]);

  function closeEditor() {
    setIsEditing(false);
  }

  function commitNote() {
    onNoteChange(row.row_id, draftNote);
    closeEditor();
  }

  if (isEditing) {
    return (
      <input
        aria-label={`note-input-${row.row_id}`}
        autoFocus
        className={styles.noteInput}
        type="text"
        value={draftNote}
        onBlur={commitNote}
        onChange={(event) => setDraftNote(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commitNote();
          }

          if (event.key === 'Escape') {
            setDraftNote(row.note ?? '');
            closeEditor();
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`note-cell-${row.row_id}`}
      className={styles.noteButton}
      onClick={() => setIsEditing(true)}
    >
      {row.note || '-'}
    </button>
  );
}

function PriceCell({ row, columnKey, onPriceChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(row[columnKey] ?? '');

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(row[columnKey] ?? '');
    }
  }, [isEditing, row, columnKey]);

  function closeEditor() {
    setIsEditing(false);
  }

  function commitPrice() {
    const trimmed = String(draftValue).trim();

    if (trimmed === '') {
      onPriceChange(row.row_id, columnKey, null);
      closeEditor();
      return;
    }

    const numericValue = Number(trimmed);

    if (Number.isNaN(numericValue)) {
      return;
    }

    onPriceChange(row.row_id, columnKey, numericValue);
    closeEditor();
  }

  if (isEditing) {
    return (
      <input
        aria-label={`price-input-${columnKey}-${row.row_id}`}
        autoFocus
        className={styles.noteInput}
        type="number"
        value={draftValue}
        onBlur={commitPrice}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commitPrice();
          }

          if (event.key === 'Escape') {
            setDraftValue(row[columnKey] ?? '');
            closeEditor();
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`price-cell-${columnKey}-${row.row_id}`}
      className={styles.noteButton}
      onClick={() => setIsEditing(true)}
    >
      {typeof row[columnKey] === 'number' ? row[columnKey] : '-'}
    </button>
  );
}

function getCellTextValue(row, key) {
  if (key === 'manufacturer_list') {
    return formatManufacturerList(row.manufacturer_list);
  }

  if (key === 'img_url' || key === 'product_url') {
    return row[key] ?? '-';
  }

  return row[key] || row[key] === 0 ? row[key] : '-';
}

function LinkCell({ href, ariaLabel }) {
  if (!href) {
    return <span>-</span>;
  }

  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className={styles.tableLink}
      target="_blank"
      rel="noreferrer"
    >
      링크
    </a>
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

  if (PRICE_COLUMN_KEYS.has(key)) {
    return <PriceCell row={row} columnKey={key} onPriceChange={onPriceChange} />;
  }

  return row[key] || row[key] === 0 ? row[key] : '-';
}

function ResultTable({
  rows,
  columns,
  sortState,
  onSortChange,
  onShadowToggle,
  onVisibleRowsShadowChange,
  onNoteChange,
  onPriceChange,
  highlightedRowIds,
}) {
  const leadingColumns = columns.filter((column) => LEADING_COLUMN_KEYS.has(column.key));
  const trailingColumns = columns.filter((column) => !LEADING_COLUMN_KEYS.has(column.key));
  const visibleRowIds = useMemo(() => rows.map((row) => row.row_id).filter(Boolean), [rows]);
  const selectedCount = useMemo(() => rows.filter((row) => row.shadow === true).length, [rows]);
  const highlightedRowIdSet = useMemo(
    () => new Set(highlightedRowIds.filter((rowId) => typeof rowId === 'string')),
    [highlightedRowIds],
  );
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const isPartiallySelected = selectedCount > 0 && selectedCount < rows.length;

  if (rows.length === 0) {
    return <div className={styles.emptyState}>표시할 집계 결과가 없습니다.</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
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

            {leadingColumns.map((column) => (
              <th
                key={column.key}
                aria-sort={
                  sortState?.key !== column.key
                    ? 'none'
                    : sortState.direction === SORT_DIRECTION.ascending
                      ? 'ascending'
                      : 'descending'
                }
              >
                <SortButton column={column} sortState={sortState} onSortChange={onSortChange} />
              </th>
            ))}

            <th className={styles.noteHeader}>{NOTE_COLUMN.label}</th>

            {trailingColumns.map((column) => (
              <th
                key={column.key}
                aria-sort={
                  sortState?.key !== column.key
                    ? 'none'
                    : sortState.direction === SORT_DIRECTION.ascending
                      ? 'ascending'
                      : 'descending'
                }
              >
                <SortButton column={column} sortState={sortState} onSortChange={onSortChange} />
              </th>
            ))}
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
              className={
                row.row_id && highlightedRowIdSet.has(row.row_id)
                  ? `${styles.rowHighlighted} rowHighlighted`
                  : undefined
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

              {leadingColumns.map((column) => (
                <td key={`${row.row_id}-${column.key}`} title={String(getCellTextValue(row, column.key))}>
                  {renderCellContent(row, column.key, onPriceChange)}
                </td>
              ))}

              <td className={styles.noteCell}>
                <NoteCell row={row} onNoteChange={onNoteChange} />
              </td>

              {trailingColumns.map((column) => (
                <td key={`${row.row_id}-${column.key}`} title={String(getCellTextValue(row, column.key))}>
                  {renderCellContent(row, column.key, onPriceChange)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WorkbookDropzone({
  inputId = 'excel-workbook-input',
  selectedFileName,
  isExtracting,
  disabled = false,
  disabledHint,
  onFileSelected,
}) {
  const [isDragActive, setIsDragActive] = useState(false);

  function handleDragOver(event) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    setIsDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragActive(false);

    if (disabled) {
      return;
    }

    const [file] = event.dataTransfer?.files ?? [];

    if (file) {
      onFileSelected(file);
    }
  }

  function handleInputChange(event) {
    const [file] = event.target.files ?? [];

    if (file) {
      onFileSelected(file);
    }

    event.target.value = '';
  }

  return (
    <div
      className={[
        styles.dropzone,
        isDragActive ? styles.dropzoneActive : '',
        disabled ? styles.dropzoneDisabled : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <p className={styles.dropzoneIcon} aria-hidden="true">
        📄
      </p>
      <p className={styles.dropzoneTitle}>엑셀 파일을 끌어다 놓거나 선택하세요</p>
      <p className={styles.dropzoneHint}>.xlsx, .xls 파일을 지원합니다</p>

      <label
        className={[styles.uploadButton, disabled ? styles.uploadButtonDisabled : '']
          .filter(Boolean)
          .join(' ')}
        htmlFor={inputId}
      >
        파일 선택
      </label>
      <input
        id={inputId}
        className={styles.fileInput}
        type="file"
        accept=".xlsx,.xls"
        disabled={disabled}
        onChange={handleInputChange}
      />

      {selectedFileName ? (
        <p className={styles.dropzoneFileName}>선택된 파일: {selectedFileName}</p>
      ) : null}

      {isExtracting ? <p className={styles.dropzoneStatus}>엑셀 추출 중...</p> : null}

      {disabled && disabledHint ? <p className={styles.dropzoneDisabledHint}>{disabledHint}</p> : null}
    </div>
  );
}

export function ResultTableSection({
  rows,
  searchQuery,
  onSearchQueryChange,
  filters,
  filterOptions,
  onFilterChange,
  onResetFilters,
  sortState,
  onSortChange,
  onShadowToggle,
  onVisibleRowsShadowChange,
  onNoteChange,
  onPriceChange,
  tableNameMode,
  highlightedRowIds = [],
}) {
  const columns = getTableColumnsByMode(tableNameMode);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>집계 결과</h2>
        <span className={styles.panelMeta}>{rows.length}건 표시</span>
      </div>

      <div className={styles.filterToolbar}>
        <label className={`${styles.filterField} ${styles.filterFieldWide}`} htmlFor="row-search">
          <span className={styles.filterLabel}>검색</span>
          <input
            id="row-search"
            className={styles.filterInput}
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="상품코드, 상품명, 분류명 검색"
          />
        </label>

        {FILTER_FIELDS.map((field) => (
          <FilterSelect
            key={field.key}
            field={field}
            value={filters[field.key]}
            options={filterOptions[field.key] ?? []}
            onChange={onFilterChange}
          />
        ))}

        <button type="button" className={styles.resetButton} onClick={onResetFilters}>
          필터 초기화
        </button>
      </div>

      <ResultTable
        rows={rows}
        columns={columns}
        sortState={sortState}
        onSortChange={onSortChange}
        onShadowToggle={onShadowToggle}
        onVisibleRowsShadowChange={onVisibleRowsShadowChange}
        onNoteChange={onNoteChange}
        onPriceChange={onPriceChange}
        highlightedRowIds={highlightedRowIds}
      />
    </section>
  );
}

