import styles from './WorkbookReviewSidebar.module.css';

function SidebarCatalogItem({ card, isSelected, onSelect, onDelete }) {
  const isEditingRegistered = isSelected && !card.isEmpty && card.variant !== 'add';
  const statusLabel = isEditingRegistered ? '편집 중' : card.statusLabel;
  const isDeletable = !card.isEmpty && card.variant !== 'add';

  function handleDeleteClick(event) {
    event.stopPropagation();

    if (
      !window.confirm(
        `'${card.categoryName}' 데이터를 삭제하면 복구할 수 없습니다. 계속할까요?`,
      )
    ) {
      return;
    }

    onDelete(card);
  }

  return (
    <li role="listitem" className={styles.catalogListItem}>
      <button
        type="button"
        className={[
          styles.catalogListItemButton,
          isSelected ? styles.catalogListItemButtonActive : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-pressed={isSelected}
        onClick={onSelect}
      >
        <div className={styles.catalogListMain}>
          <span className={styles.catalogListName}>{card.categoryName}</span>
          {card.meta.length > 0 ? (
            <span className={styles.catalogListMeta}>{card.meta[0]}</span>
          ) : (
            <span className={styles.catalogListMeta}>{card.description || card.statusLabel}</span>
          )}
        </div>
        <span
          className={[
            styles.catalogListStatus,
            isEditingRegistered
              ? styles.catalogListStatusActive
              : card.isEmpty
                ? styles.catalogListStatusEmpty
                : styles.catalogListStatusRegistered,
          ].join(' ')}
        >
          {statusLabel}
        </span>
      </button>

      {isDeletable ? (
        <button
          type="button"
          className={styles.catalogListDeleteButton}
          aria-label={`${card.categoryName} 삭제`}
          onClick={handleDeleteClick}
        >
          삭제
        </button>
      ) : null}
    </li>
  );
}

export function WorkbookReviewSidebar({
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

        {isLoading ? <p className={styles.sidebarMutedText}>등록 데이터 불러오는 중...</p> : null}

        {errorMessage ? <p className={styles.sidebarErrorText}>{errorMessage}</p> : null}

        <ul className={styles.catalogList} role="list" aria-label="등록 데이터 목록">
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
