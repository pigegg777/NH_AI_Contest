import styles from '../pages/ExcelExtractWorkbookReviewPage.module.css';
import { ResultTableSection } from './ResultTableSection';

export function WorkbookReviewResultSection({
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
  highlightedRowIds,
  aiRecommendations,
  aiAnalysisMode,
  aiIsAnalyzing,
  aiErrorMessage,
  aiActiveRecommendationId,
  onAiAnalyze,
  onAiRecommendationSelect,
  aiDisabled,
}) {
  return (
    <div id="section-result" className={styles.resultSection}>
      <ResultTableSection
        rows={rows}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
        sortState={sortState}
        onSortChange={onSortChange}
        onShadowToggle={onShadowToggle}
        onVisibleRowsShadowChange={onVisibleRowsShadowChange}
        onNoteChange={onNoteChange}
        onPriceChange={onPriceChange}
        tableNameMode={tableNameMode}
        highlightedRowIds={highlightedRowIds}
        aiRecommendations={aiRecommendations}
        aiAnalysisMode={aiAnalysisMode}
        aiIsAnalyzing={aiIsAnalyzing}
        aiErrorMessage={aiErrorMessage}
        aiActiveRecommendationId={aiActiveRecommendationId}
        onAiAnalyze={onAiAnalyze}
        onAiRecommendationSelect={onAiRecommendationSelect}
        aiDisabled={aiDisabled}
      />
    </div>
  );
}
