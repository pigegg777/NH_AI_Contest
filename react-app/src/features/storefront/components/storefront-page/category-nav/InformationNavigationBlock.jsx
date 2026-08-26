import styles from './CategoryNav.module.css';

export default function InformationNavigationBlock({ view }) {
  if (!view.isInformationNavigationActive || view.informationNavigationItems.length === 0) {
    return null;
  }

  return (
    <nav className={styles.informationNavigation} aria-label="안내 분류">
      <div className={styles.informationNavigationList}>
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
