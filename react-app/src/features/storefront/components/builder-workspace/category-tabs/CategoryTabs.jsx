import styles from "./CategoryTabs.module.css";

export default function CategoryTabs({ categoryTabsMode }) {
  if (!categoryTabsMode) {
    return null;
  }

  return (
    <div
      className={styles.categoryTabsBlock}
      data-testid="storefront-sticky-category-tabs"
    >
      <p className={styles.tabLabel}>카테고리 탭</p>
      <div className={styles.tabList} role="tablist" aria-label="카테고리 탭">
        {categoryTabsMode.categoryTabs.map((tab) => {
          const isSelected = tab.id === categoryTabsMode.selectedCategoryId;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={isSelected ? styles.tabButtonActive : styles.tabButton}
              onClick={() => categoryTabsMode.selectCategory(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
