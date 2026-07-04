import styles from './EditorSidebar.module.css';

export function SidebarCatalogItem({ card, isSelected, onSelect, onDelete }) {
  const isEditingRegistered = isSelected && !card.isEmpty && !card.isAdd;
  const statusLabel = isEditingRegistered ? '편집 중' : card.statusLabel;
  const isDeletable = !card.isEmpty && !card.isAdd;

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
            <span className={styles.catalogListMeta}>
              {card.description || card.statusLabel}
            </span>
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
