import styles from './HeroSection.module.css';

// Only the pill variant has its own rule; outlined and soft render as the base
// search box, and data-search-variant below still records which one was chosen.
const SEARCH_VARIANT_CLASS_NAMES = {
  pill: styles.searchBoxPill,
};

export default function SearchBoxBlock({ view }) {
  return (
    <div className={styles.searchRow}>
      <label
        className={`${styles.searchBox} ${SEARCH_VARIANT_CLASS_NAMES[view.searchVariant] || ''}`}
        data-testid="storefront-search"
        data-search-variant={view.searchVariant}
      >
        <span className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.searchInput}
          aria-label={view.searchPlaceholder}
          placeholder={view.searchPlaceholder}
          value={view.searchText}
          onChange={(event) => view.setSearchText(event.target.value)}
        />
      </label>
    </div>
  );
}
