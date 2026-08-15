import styles from './TabBar.module.css';

export function TabBar({ tabs, activeTabId, onTabChange }) {
  return (
    <div className={styles.tabBar} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`.trim()}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
