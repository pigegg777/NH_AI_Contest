import styles from './EditorSidebar.module.css';
import { SidebarCatalogItem } from './SidebarCatalogItem';

export function EditorSidebar({
  isCollapsed,
  onToggleCollapse,
  registeredCount,
  isLoading,
  errorMessage,
  cards,
  isCardSelected,
  onCardSelect,
  onCardDelete,
}) {
  return (
    <aside
      className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`.trim()}
      aria-label="등록 데이터 현황"
    >
      <button
        type="button"
        className={styles.sidebarToggle}
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? '등록 데이터 펼치기' : '등록 데이터 접기'}
        title={isCollapsed ? '등록 데이터 펼치기' : '등록 데이터 접기'}
      >
        <span aria-hidden="true">{isCollapsed ? '»' : '«'}</span>
        <span>{isCollapsed ? '펼치기' : '접기'}</span>
      </button>

      <div className={styles.sidebarCard}>
        <div className={styles.sidebarCardHeader}>
          <h2 className={styles.sidebarTitle}>등록 데이터</h2>
          <span className={styles.sidebarBadge}>{registeredCount}개</span>
        </div>

        {isLoading ? (
          <p className={styles.sidebarMutedText}>등록 데이터 불러오는 중...</p>
        ) : null}

        {errorMessage ? (
          <p className={styles.sidebarErrorText}>{errorMessage}</p>
        ) : null}

        <ul
          className={styles.catalogList}
          role="list"
          aria-label="등록 데이터 목록"
        >
          {cards.map((card) => (
            <SidebarCatalogItem
              key={card.categoryName}
              card={card}
              isSelected={isCardSelected(card)}
              onSelect={() => onCardSelect(card)}
              onDelete={onCardDelete}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}
