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
