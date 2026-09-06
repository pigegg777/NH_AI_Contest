import styles from "./CategoryTabs.module.css";

const COMMON_TAB_ID = "common";

/**
 * 공통 요소 · 비료 · 농약 · 그 외 순. 손님 화면의 분류 순서와 같은 규칙이라
 * (storefront-view 의 sectionMatching), 사장님이 빌더에서 보는 칩 순서와
 * 스토어프론트가 어긋나지 않는다. 그 외는 가나다순.
 */
const CATEGORY_TAB_PRIORITY = new Map([
  [COMMON_TAB_ID, 0],
  ["비료", 1],
  ["농약", 2],
]);
const OTHER_CATEGORY_PRIORITY = 3;
const KOREAN_CATEGORY_COLLATOR = new Intl.Collator("ko-KR");

function toPriority(tab) {
  return CATEGORY_TAB_PRIORITY.get(tab?.id) ?? OTHER_CATEGORY_PRIORITY;
}

function orderCategoryTabs(categoryTabs) {
  return [...(Array.isArray(categoryTabs) ? categoryTabs : [])].sort((left, right) => {
    const priorityGap = toPriority(left) - toPriority(right);

    if (priorityGap !== 0) {
      return priorityGap;
    }

    return KOREAN_CATEGORY_COLLATOR.compare(left?.label ?? "", right?.label ?? "");
  });
}

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
        {orderCategoryTabs(categoryTabsMode.categoryTabs).map((tab) => {
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
