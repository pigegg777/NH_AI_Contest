import { useEditorMeta, useTableCtx } from '../contexts/editorContexts';
import { getTableColumnsByMode } from '../model/review-table/reviewTableConfigModel';
import { DataTableFilter } from './data-table/DataTableFilter';
import { DataTable } from './data-table/DataTable';
import styles from './DataTableSection.module.css';

export function DataTableSection() {
  const { tableNameMode } = useEditorMeta();
  const {
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
  } = useTableCtx();

  const columns = getTableColumnsByMode(tableNameMode);

  return (
    <section
      id="section-result"
      className={`${styles.panel} ${styles.resultSection}`.trim()}
    >
      <div className={styles.panelHeader}>
        <div className={styles.resultPanelHeaderMain}>
          <h2 className={styles.panelTitle}>집계 결과</h2>
          <span className={styles.panelMeta}>{rows.length}건 표시</span>
        </div>
      </div>

      <DataTableFilter
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
      />

      <DataTable
        rows={rows}
        columns={columns}
        tableNameMode={tableNameMode}
        sortState={sortState}
        onSortChange={onSortChange}
        onShadowToggle={onShadowToggle}
        onVisibleRowsShadowChange={onVisibleRowsShadowChange}
        onNoteChange={onNoteChange}
        onPriceChange={onPriceChange}
      />
    </section>
  );
}
