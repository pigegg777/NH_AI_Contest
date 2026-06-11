import styles from '../../pages/ExcelExtractWorkbookReviewPage.module.css';

function CatalogMeta({ card }) {
  if (card.isEmpty) {
    return <p className={styles.catalogEmptyText}>{card.description}</p>;
  }

  return (
    <div className={styles.catalogMeta}>
      {card.meta.map((value, index) => (
        <span key={`${card.categoryName}:${index}`}>{value}</span>
      ))}
    </div>
  );
}

export function OfficeProductCatalogCard({ card }) {
  const cardClassName = [
    styles.catalogCard,
    card.variant === 'default' ? styles.catalogCardDefault : '',
    card.variant === 'add' ? styles.catalogCardAdd : '',
    card.isEmpty ? styles.catalogCardEmpty : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article role="listitem" className={cardClassName}>
      <div className={styles.catalogCardHeader}>
        <strong className={styles.catalogTitle}>{card.categoryName}</strong>
        <span className={styles.catalogStatus}>{card.statusLabel}</span>
      </div>

      {card.variant === 'add' ? (
        <p className={styles.catalogAddText}>{card.description}</p>
      ) : (
        <CatalogMeta card={card} />
      )}
    </article>
  );
}
