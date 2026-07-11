import styles from '../StorefrontView.module.css';

const SEARCH_VARIANT_CLASS_NAMES = {
  pill: styles.searchBoxPill,
  outlined: styles.searchBoxOutlined,
  soft: styles.searchBoxSoft,
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
