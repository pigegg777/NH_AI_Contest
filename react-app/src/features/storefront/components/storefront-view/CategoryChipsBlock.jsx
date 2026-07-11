import styles from '../StorefrontView.module.css';

const CHIP_VARIANT_CLASS_NAMES = {
  filled: styles.categoryWrapFilled,
  outline: styles.categoryWrapOutline,
  soft: styles.categoryWrapSoft,
};

export default function CategoryChipsBlock({ view, elementKey }) {
  if (view.mediumCategoryItems.length <= 1) {
    return null;
  }

  return (
    <div className={styles.categoryChipsSection}>
      <p className={styles.selectionLabel}>중분류 선택</p>
      <div
        className={`${styles.categoryWrap} ${CHIP_VARIANT_CLASS_NAMES[view.categoryChipVariant] || ''}`}
        data-testid="storefront-category-chips"
        data-chip-variant={view.categoryChipVariant}
        data-category-layout="single-row-scroll"
        data-chip-size="compact"
      >
        {view.mediumCategoryItems.map((item) => (
          <button
            key={`${elementKey}-${item}`}
            type="button"
            className={`${styles.categoryChip} ${view.activeMediumCategory === item ? styles.categoryChipActive : ''}`}
            onClick={() => view.handleMediumCategorySelect(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
