import styles from './CategoryNav.module.css';

const CHIP_VARIANT_CLASS_NAMES = {
  filled: styles.categoryWrapFilled,
  outline: styles.categoryWrapOutline,
  soft: styles.categoryWrapSoft,
};

export default function CategoryChipsBlock({ view, elementKey }) {
  const hasCategoryInformation = Boolean(view.activeCategoryDescription);
  const chipItems = hasCategoryInformation
    ? [view.categoryInformationItemId, ...view.mediumCategoryItems]
    : view.mediumCategoryItems;

  if (chipItems.length <= 1) {
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
        {chipItems.map((item) => {
          const label =
            item === view.categoryInformationItemId
              ? `${view.activeSectionTitle} 정보`
              : item;

          return (
            <button
              key={`${elementKey}-${item}`}
              id={
                item === view.categoryInformationItemId
                  ? view.categoryInformationChipId
                  : undefined
              }
              type="button"
              className={`${styles.categoryChip} ${view.activeMediumCategory === item ? styles.categoryChipActive : ''}`}
              aria-pressed={view.activeMediumCategory === item}
              onClick={() => view.handleMediumCategorySelect(item)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
