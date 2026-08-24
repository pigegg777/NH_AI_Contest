import { buildLineClampStyle } from '../../../../model/card-grid-section/cardGridFieldStyleModel';
import styles from '../CardGridSection.module.css';

export default function CardInlineTitleSlot({ product, cardStyle }) {
  return (
    <div className={styles.field}>
      <span
        className={styles.fieldValue}
        style={buildLineClampStyle(cardStyle.layoutPlan.titleClamp)}
      >
        {product?.product_name || '-'}
      </span>
    </div>
  );
}
