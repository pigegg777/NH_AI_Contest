import { buildLineClampStyle } from '../../model/card-grid-section/cardGridFieldStyleModel';
import styles from '../CardGridSection.module.css';

export default function CardHeaderSection({ product, cardStyle }) {
  return (
    <div className={styles.cardHeader}>
      <strong
        className={styles.cardName}
        style={buildLineClampStyle(cardStyle.layoutPlan.titleClamp)}
        title={product?.product_name || '-'}
      >
        {product?.product_name || '-'}
      </strong>
    </div>
  );
}
