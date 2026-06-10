import styles from '../pages/ExcelExtractWorkbookReviewPage.module.css';
import { buildOfficeProductDataCatalogModel } from '../model/catalog/officeProductDataCatalogModel';

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

export function OfficeProductDataCatalogPanel({ items, isLoading, errorMessage }) {
  const { cards, registeredCount } = buildOfficeProductDataCatalogModel(items);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>등록 데이터</h2>
          <p className={styles.catalogDescription}>office_code 기준으로 저장된 데이터 목록입니다.</p>
        </div>
        <span className={styles.panelMeta}>{registeredCount}개 등록</span>
      </div>

      {isLoading ? <div className={styles.statusMessage}>등록 데이터 불러오는 중...</div> : null}
      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}

      <div className={styles.catalogGrid} role="list" aria-label="등록 데이터 목록">
        {cards.map((card) => {
          const cardClassName = [
            styles.catalogCard,
            card.variant === 'default' ? styles.catalogCardDefault : '',
            card.variant === 'add' ? styles.catalogCardAdd : '',
            card.isEmpty ? styles.catalogCardEmpty : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <article key={card.categoryName} role="listitem" className={cardClassName}>
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
        })}
      </div>
    </section>
  );
}

