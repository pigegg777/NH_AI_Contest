import styles from './CategoryNav.module.css';

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
  const officeChip = view.canRenderOfficeInformation
    ? [
        {
          sectionId: view.officeInformationItemId,
          sectionName: view.officeInformationItemId,
          label: '사무소 정보',
        },
      ]
    : [];
  const chipEntries = [
    ...officeChip,
    ...view.catalogSectionEntries.map(({ sectionId, sectionName }) => ({
      sectionId,
      sectionName,
      label: sectionName,
    })),
  ];

  return (
    <div className={styles.productCategorySection}>
      <div
        className={`${styles.productCategoryWrap} ${PRODUCT_CHIP_VARIANT_CLASS_NAMES[productCategoryChipVariant] || ''}`}
        data-testid="storefront-product-category-chips"
        data-chip-variant={productCategoryChipVariant}
        role="group"
        aria-label="상품 분류"
      >
        {chipEntries.map(({ sectionId, sectionName, label }) => {
          const isActive =
            sectionName === view.officeInformationItemId
              ? view.isOfficeInformationActive
              : !view.isOfficeInformationActive &&
                view.activeSectionTitle === sectionName;

          return (
            <button
              key={`${elementKey}-${sectionId}`}
              type="button"
              className={`${styles.productCategoryChip} ${isActive ? styles.productCategoryChipActive : ''}`}
              aria-pressed={isActive}
              onClick={() =>
                view.handleCategoryRailSectionSelect(sectionName, sectionId)
              }
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
