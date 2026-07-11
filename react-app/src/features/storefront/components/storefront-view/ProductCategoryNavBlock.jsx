import styles from '../StorefrontView.module.css';

export default function ProductCategoryNavBlock({ view, elementKey }) {
  if (view.catalogSectionEntries.length === 0) {
    return null;
  }

  return (
    <div className={styles.productCategorySection}>
      <p className={styles.selectionLabel}>대분류 선택</p>
      <div
        className={styles.productCategoryWrap}
        data-testid="storefront-product-category-chips"
      >
        {view.catalogSectionEntries.map(({ sectionId, sectionName }) => (
          <button
            key={`${elementKey}-${sectionId}`}
            type="button"
            className={`${styles.productCategoryChip} ${view.activeSectionTitle === sectionName ? styles.productCategoryChipActive : ''}`}
            aria-pressed={view.activeSectionTitle === sectionName}
            onClick={() =>
              view.handleCategoryRailSectionSelect(sectionName, sectionId)
            }
          >
            {sectionName}
          </button>
        ))}
      </div>
    </div>
  );
}
