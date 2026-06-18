import { EMPTY_FILTER_VALUE, FILTER_FIELDS } from '../../../model/table';
import styles from './WorkbookReviewFilters.module.css';

function FilterSelect({ field, value, options, onChange }) {
  return (
    <label className={styles.filterField} htmlFor={field.id}>
      <span className={styles.filterLabel}>{field.label}</span>
      <select
        id={field.id}
        name={field.key}
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

export function WorkbookReviewFilters({
  searchQuery,
  onSearchQueryChange,
  filters,
  filterOptions,
  onFilterChange,
  onResetFilters,
  onAiAnalyze,
  aiDisabled,
  aiIsAnalyzing,
  hasRows,
}) {
  return (
    <div className={styles.filterToolbar} role="region" aria-label="result table controls">
      <div className={styles.filterTopRow} role="group" aria-label="search and actions">
        <label className={`${styles.filterField} ${styles.filterFieldWide}`} htmlFor="row-search">
          <span className={styles.filterLabel}>검색</span>
          <input
            id="row-search"
            name="row-search"
            className={styles.filterInput}
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            autoComplete="off"
            placeholder="상품코드, 상품명, 분류명 검색"
          />
        </label>

        <button
          type="button"
          className={styles.aiButton}
          onClick={onAiAnalyze}
          disabled={aiDisabled || aiIsAnalyzing || !hasRows}
        >
          {aiIsAnalyzing ? 'AI 분석 중...' : 'AI 분석하기'}
        </button>
      </div>

      <div className={styles.filterBottomRow} role="group" aria-label="filter controls">
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
    </div>
  );
}
