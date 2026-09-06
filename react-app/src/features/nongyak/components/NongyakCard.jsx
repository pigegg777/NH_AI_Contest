import { formatNongyakDisplayValue } from '../model/nongyakCardFields';
import styles from './NongyakCard.module.css';

export default function NongyakCard({ tab, item, isSelected, onSelect }) {
  const showSpec = tab === 'inventory' && formatNongyakDisplayValue(item.spec) !== '-';

  return (
    <li className={styles.card}>
      <button
        type="button"
        className={[styles.cardButton, isSelected ? styles.cardButtonSelected : '']
          .filter(Boolean)
          .join(' ')}
        onClick={() => onSelect(item)}
        aria-pressed={isSelected}
      >
        <div className={styles.cardTopRow}>
          <span className={styles.category}>
            {formatNongyakDisplayValue(item.product_category)}
          </span>
          {showSpec ? <span className={styles.spec}>{item.spec}</span> : null}
        </div>

        <h2 className={styles.name}>{formatNongyakDisplayValue(item.product_name)}</h2>

        <dl className={styles.metaList}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>표시기호</dt>
            <dd className={styles.metaValue}>{formatNongyakDisplayValue(item.indict_symbl)}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>성분</dt>
            <dd
              className={`${styles.metaValue} ${styles.nutrient}`}
              title={item.nutirent || ''}
            >
              {formatNongyakDisplayValue(item.nutirent)}
            </dd>
          </div>
        </dl>
      </button>
    </li>
  );
}
