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

  const categoryChipVariant = view.pageStyle.categoryChips.variant;

  return (
    <div className={styles.categoryChipsSection}>
      <div
        className={`${styles.categoryWrap} ${CHIP_VARIANT_CLASS_NAMES[categoryChipVariant] || ''}`}
        data-testid="storefront-category-chips"
        data-chip-variant={categoryChipVariant}
        data-category-layout="single-row-scroll"
        data-chip-size="compact"
        role="group"
        aria-label="세부 분류"
      >
        {view.mediumCategoryItems.map((item) => (
          <button
            key={`${elementKey}-${item}`}
            type="button"
            className={`${styles.categoryChip} ${view.activeMediumCategory === item ? styles.categoryChipActive : ''}`}
            aria-pressed={view.activeMediumCategory === item}
            onClick={() => view.handleMediumCategorySelect(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
