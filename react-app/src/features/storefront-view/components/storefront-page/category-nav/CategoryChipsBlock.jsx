import styles from './CategoryNav.module.css';

const CHIP_STYLE_MODE_CLASS_NAMES = {
  chip: styles.categoryWrapChip,
  tab: styles.categoryWrapTab,
};

export default function CategoryChipsBlock({ view, elementKey }) {
  if (
    view.isGuideNavigationActive ||
    view.isOfficeInformationIntroActive ||
    view.mediumCategoryItems.length <= 1
  ) {
    return null;
  }

  const categoryChipStyleMode = view.pageStyle.categoryChips.styleMode;
  // 위 대분류 줄이 탭 모드면 상자가 안 보여 글자가 왼쪽 기준선이 된다. 이 줄은
  // 알약이라 상자가 그보다 왼쪽에서 시작해 어긋나므로, 그때만 들여쓴다.
  const productCategoryChipStyleMode =
    view.pageStyle?.productCategoryChips?.styleMode ?? '';

  return (
    <div className={styles.categoryChipsSection}>
      <div
        className={`${styles.categoryWrap} ${CHIP_STYLE_MODE_CLASS_NAMES[categoryChipStyleMode] || ''}`}
        data-testid="storefront-category-chips"
        data-chip-style-mode={categoryChipStyleMode}
        data-product-chip-style-mode={productCategoryChipStyleMode}
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
