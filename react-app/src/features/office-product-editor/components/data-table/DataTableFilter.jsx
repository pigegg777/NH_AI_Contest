import { FILTER_FIELDS } from '../../model/review-table/reviewTableFilterModel';
import styles from './DataTableFilter.module.css';

export function DataTableFilter({
  searchQuery,
  onSearchQueryChange,
  filters,
  filterOptions,
  onFilterChange,
  onResetFilters,
}) {
  return (
    <div
      className={styles.filterToolbar}
      role="region"
      aria-label="result table controls"
    >
      <div
        className={styles.filterTopRow}
        role="group"
        aria-label="search and actions"
      >
        <label
          className={`${styles.filterField} ${styles.filterFieldWide}`}
          htmlFor="row-search"
        >
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
      </div>

      <div
        className={styles.filterBottomRow}
        role="group"
        aria-label="filter controls"
      >
        {FILTER_FIELDS.map((field) => (
          <label
            key={field.key}
            className={styles.filterField}
            htmlFor={field.id}
          >
            <span className={styles.filterLabel}>{field.label}</span>
            <select
              id={field.id}
              name={field.key}
              className={styles.filterSelect}
              value={filters[field.key]}
              onChange={(event) =>
                onFilterChange(field.key, event.target.value)
              }
            >
              <option value="">전체</option>
              {(filterOptions[field.key] ?? []).map((option) => (
                <option key={option} value={option}>
                  {option === '__empty__' ? '(빈값)' : option}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button
          type="button"
          className={styles.resetButton}
          onClick={onResetFilters}
        >
          필터 초기화
        </button>
      </div>
    </div>
  );
}
