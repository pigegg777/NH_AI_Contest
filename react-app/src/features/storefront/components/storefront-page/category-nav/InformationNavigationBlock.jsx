import styles from './CategoryNav.module.css';

const CHIP_STYLE_MODE_CLASS_NAMES = {
  chip: styles.categoryWrapChip,
  tab: styles.categoryWrapTab,
};

export default function InformationNavigationBlock({ view }) {
  if (!view.isGuideNavigationActive) return null;

  // The 안내 분류 row wears the 중분류 칩 design and follows the same styleMode, so a
  // page-design request aimed at the 세부카테고리 버튼 moves both rows together. It
  // wraps rather than scrolls, though, so it lines up under the 상품 분류 row above it.
  const categoryChipStyleMode = view.pageStyle.categoryChips.styleMode;

  return (
    <nav className={styles.categoryChipsSection} aria-label="안내 분류">
      <div
        className={`${styles.categoryWrap} ${CHIP_STYLE_MODE_CLASS_NAMES[categoryChipStyleMode] || ''}`}
        data-testid="storefront-information-category-chips"
        data-chip-style-mode={categoryChipStyleMode}
        data-category-layout="wrap"
        data-chip-size="compact"
      >
        {view.informationNavigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.categoryChip} ${view.activeInformationNavigationItem?.id === item.id ? styles.categoryChipActive : ''}`}
            aria-pressed={view.activeInformationNavigationItem?.id === item.id}
            onClick={() => view.handleInformationItemSelect(item)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
