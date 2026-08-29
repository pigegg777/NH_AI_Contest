import styles from './CategoryNav.module.css';

const PRODUCT_CHIP_STYLE_MODE_CLASS_NAMES = {
  chip: styles.productCategoryWrapChip,
  tab: styles.productCategoryWrapTab,
};

export default function ProductCategoryNavBlock({ view, elementKey }) {
  if (view.catalogSectionEntries.length === 0 && !view.hasInformationContent) {
    return null;
  }

  const productCategoryChipStyleMode = view.pageStyle.productCategoryChips.styleMode;
  const chipEntries = [
    ...(view.hasInformationContent
      ? [{ sectionId: 'information', sectionName: '', label: '안내' }]
      : []),
    ...view.catalogSectionEntries.map(
    ({ sectionId, sectionName }) => ({
      sectionId,
      sectionName,
      label: sectionName,
    }),
    ),
  ];

  return (
    <div className={styles.productCategorySection}>
      <div
        className={`${styles.productCategoryWrap} ${PRODUCT_CHIP_STYLE_MODE_CLASS_NAMES[productCategoryChipStyleMode] || ''}`}
        data-testid="storefront-product-category-chips"
        data-chip-style-mode={productCategoryChipStyleMode}
        role="group"
        aria-label="상품 분류"
      >
        {chipEntries.map(({ sectionId, sectionName, label }) => {
          const isActive =
            sectionId === 'information'
              ? view.isGuideNavigationActive
              : !view.isGuideNavigationActive &&
                !view.isOfficeInformationIntroActive &&
                view.activeSectionTitle === sectionName;

          return (
            <button
              key={`${elementKey}-${sectionId}`}
              type="button"
              className={`${styles.productCategoryChip} ${isActive ? styles.productCategoryChipActive : ''}`}
              aria-pressed={isActive}
              onClick={() => {
                if (sectionId === 'information') {
                  view.handleGuideNavigationSelect();
                  return;
                }

                view.handleCategoryRailSectionSelect(sectionName, sectionId);
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
