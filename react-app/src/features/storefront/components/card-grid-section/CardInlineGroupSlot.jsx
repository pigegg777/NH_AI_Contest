import { STOREFRONT_FIELD_LABELS } from '../../model/storefront-config/storefrontBuilderModel';
import { filterVisibleSlotItems } from '../../model/card-grid-section/cardGridSlotModel';
import {
  PRICE_FIELD_SET,
  buildFieldValueStyle,
} from '../../model/card-grid-section/cardGridFieldStyleModel';
import { renderFieldSlotValue } from './cardFieldValueRenderer';
import styles from '../CardGridSection.module.css';

export default function CardInlineGroupSlot({ slot, product }) {
  const visibleItems = filterVisibleSlotItems(slot.items, product);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className={styles.inlineGroup}>
      {slot.label ? (
        <span className={styles.fieldLabel}>{slot.label}</span>
      ) : null}
      <div className={styles.inlineGroupItems}>
        {visibleItems.map((item) => (
          <div key={item.id} className={styles.inlineGroupItem}>
            <span className={styles.groupFieldLabel}>
              {item.label || STOREFRONT_FIELD_LABELS[item.field] || item.field}
            </span>
            <span
              className={`${styles.fieldValue} ${
                PRICE_FIELD_SET.has(item.field)
                  ? styles.groupPriceValue
                  : styles.groupFieldValue
              }`}
              style={buildFieldValueStyle(item.style)}
            >
              {renderFieldSlotValue(item.field, product?.[item.field])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
