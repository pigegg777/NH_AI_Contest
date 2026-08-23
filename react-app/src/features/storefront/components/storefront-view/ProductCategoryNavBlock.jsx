import styles from '../StorefrontView.module.css';

const PRODUCT_CHIP_VARIANT_CLASS_NAMES = {
  filled: styles.productCategoryWrapFilled,
  outline: styles.productCategoryWrapOutline,
  soft: styles.productCategoryWrapSoft,
};

export default function ProductCategoryNavBlock({ view, elementKey }) {
  if (view.catalogSectionEntries.length === 0) {
    return null;
  }

  const productCategoryChipVariant = view.pageStyle.productCategoryChips.variant;

  return (
    <div className={styles.productCategorySection}>
      <div
        className={`${styles.productCategoryWrap} ${PRODUCT_CHIP_VARIANT_CLASS_NAMES[productCategoryChipVariant] || ''}`}
        data-testid="storefront-product-category-chips"
        data-chip-variant={productCategoryChipVariant}
        role="group"
        aria-label="상품 분류"
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
