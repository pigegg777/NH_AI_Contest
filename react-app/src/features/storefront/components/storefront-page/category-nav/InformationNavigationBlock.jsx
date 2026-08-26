import styles from './CategoryNav.module.css';

const CHIP_VARIANT_CLASS_NAMES = {
  filled: styles.categoryWrapFilled,
  outline: styles.categoryWrapOutline,
  soft: styles.categoryWrapSoft,
};

export default function InformationNavigationBlock({ view }) {
  if (!view.isInformationNavigationActive || view.informationNavigationItems.length === 0) {
    return null;
  }

  const categoryChipVariant = view.pageStyle.categoryChips.variant;

  return (
    <nav className={styles.categoryChipsSection} aria-label="안내 분류">
      <div
        className={`${styles.categoryWrap} ${CHIP_VARIANT_CLASS_NAMES[categoryChipVariant] || ''}`}
        data-testid="storefront-information-category-chips"
        data-chip-variant={categoryChipVariant}
        data-category-layout="single-row-scroll"
        data-chip-size="compact"
      >
        {view.informationNavigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.categoryChip} ${view.activeInformationItem?.id === item.id ? styles.categoryChipActive : ''}`}
            aria-pressed={view.activeInformationItem?.id === item.id}
            onClick={() => view.handleInformationItemSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
