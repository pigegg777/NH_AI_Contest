import { buildUniqueMediumCategories } from '../../model/storefront-config/sectionMatching';
import styles from '../StorefrontView.module.css';

function CategoryRailToggleIcon({ collapsed = false }) {
  return (
    <svg
      className={`${styles.categoryRailToggleIcon} ${collapsed ? styles.categoryRailToggleIconCollapsed : ''}`}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DesktopCategoryRail({
  catalogSectionEntries,
  activeSectionTitle,
  title,
  isOpen,
  onToggle,
  activeMediumCategory,
  onSectionSelect,
  onMediumSelect,
}) {
  return (
    <aside className={styles.categoryRail} data-testid="storefront-category-rail">
      <div className={styles.categoryRailHeader}>
        {isOpen ? (
          <div className={styles.categoryRailSummary}>
            <strong className={styles.categoryRailTitle}>{activeSectionTitle || title}</strong>
            <span className={styles.categoryRailHint}>중분류 전체 보기</span>
          </div>
        ) : null}
        <button
          type="button"
          className={styles.categoryRailToggle}
          aria-label={isOpen ? 'Hide category navigation' : 'Show category navigation'}
          aria-expanded={isOpen}
          onClick={onToggle}
        >
          <CategoryRailToggleIcon collapsed={!isOpen} />
        </button>
      </div>

      {isOpen ? (
        <div className={styles.categoryRailBody}>
          {catalogSectionEntries.map(({ section, sectionId, sectionName }) => {
            const railItems = buildUniqueMediumCategories(section?.products);
            const isActiveSection = sectionName === activeSectionTitle;

            if (!sectionName || railItems.length === 0) {
              return null;
            }

            return (
              <section key={sectionId} className={styles.categoryRailSection}>
                <button
                  type="button"
                  className={`${styles.categoryRailSectionButton} ${isActiveSection ? styles.categoryRailSectionButtonActive : ''}`}
                  aria-pressed={isActiveSection}
                  onClick={() => onSectionSelect(sectionName, sectionId)}
                >
                  {sectionName}
                </button>
                <div className={styles.categoryRailChipList}>
                  {railItems.map((item) => (
                    <button
                      key={`${sectionId}-${item}`}
                      type="button"
                      className={`${styles.categoryRailChip} ${isActiveSection && activeMediumCategory === item ? styles.categoryRailChipActive : ''}`}
                      onClick={() => onMediumSelect(sectionName, sectionId, item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}
