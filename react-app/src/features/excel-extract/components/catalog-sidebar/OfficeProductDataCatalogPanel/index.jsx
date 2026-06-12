import styles from '../../../pages/ExcelExtractWorkbookReviewPage.module.css';
import { OfficeProductCatalogCard } from './OfficeProductCatalogCard';
import { useOfficeProductDataCatalogPanel } from '../../../hooks/useOfficeProductDataCatalogPanel';

export function OfficeProductDataCatalogPanel({ items, isLoading, errorMessage }) {
  const { cards, registeredCount } = useOfficeProductDataCatalogPanel(items);

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
        {cards.map((card) => (
          <OfficeProductCatalogCard key={card.categoryName} card={card} />
        ))}
      </div>
    </section>
  );
}
