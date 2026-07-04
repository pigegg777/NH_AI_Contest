import { useEditorMeta, useTableCtx } from '../contexts/editorContexts';
import { getTableColumnsByMode } from '../model/review-table/reviewTableConfigModel';
import panelStyles from './shared/panel.module.css';
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
      className={`${panelStyles.panel} ${styles.resultSection}`.trim()}
    >
      <div className={panelStyles.panelHeader}>
        <div className={styles.resultPanelHeaderMain}>
          <h2 className={panelStyles.panelTitle}>집계 결과</h2>
          <span className={panelStyles.panelMeta}>{rows.length}건 표시</span>
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
