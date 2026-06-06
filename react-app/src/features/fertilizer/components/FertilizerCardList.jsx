import styles from './FertilizerCardList.module.css';

function FertilizerCard({ item }) {
  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.typeTag}>{item.fertilizerType}</span>
        <h3 className={styles.cardTitle} title={item.productName}>
          {item.productName}
        </h3>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.infoRow}>
          <span className={styles.infoKey}>가격</span>
          <span className={styles.price}>{item.priceLabel}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoKey}>지원</span>
          <span className={styles.support}>{item.supportLabel}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoKey}>사용</span>
          <span className={styles.infoVal}>{item.usageLabel}</span>
        </div>

        <p className={styles.summary}>{item.featureSummary}</p>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        <path d="M11 8v6M11 16h.01" strokeLinecap="round" />
      </svg>
      검색 결과가 없습니다.<br />
      다른 검색어나 카테고리를 시도해 보세요.
    </div>
  );
}

export default function FertilizerCardList({ items }) {
  if (!items.length) {
    return <EmptyState />;
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <FertilizerCard key={item.productCode} item={item} />
      ))}
    </ul>
  );
}
