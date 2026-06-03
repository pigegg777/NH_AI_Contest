import styles from './FertilizerCardList.module.css';

function FertilizerCard({ item }) {
  return (
    <li className={styles.card}>
      <article className={styles.cardInner}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle} title={item.productName}>
            {item.productName}
          </h3>
          <span title={item.fertilizerType}>{item.fertilizerType}</span>
        </div>

        <div className={styles.cardVisual}>
          <div className={styles.cardVisualBadge} aria-hidden="true">
            {item.fertilizerType.slice(0, 1)}
          </div>
          <p className={styles.cardVisualText}>{item.usageLabel}</p>
        </div>

        <div className={styles.cardBody}>
          <div className={styles.meta}>
            <span className={styles.price}>{item.priceLabel}</span>
            <span className={styles.support}>{item.supportLabel}</span>
          </div>

          <p className={styles.summary}>{item.featureSummary}</p>

          <button type="button" className={styles.action}>
            상세 보기
          </button>
        </div>
      </article>
    </li>
  );
}

export default function FertilizerCardList({ items }) {
  if (!items.length) {
    return <p className={styles.empty}>검색 결과가 없습니다.</p>;
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <FertilizerCard key={item.productCode} item={item} />
      ))}
    </ul>
  );
}
