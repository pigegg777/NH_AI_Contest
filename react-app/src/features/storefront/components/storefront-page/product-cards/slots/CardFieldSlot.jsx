import { STOREFRONT_FIELD_LABELS } from '../../../../model/storefront-config/storefrontBuilderModel';
import {
  PRICE_FIELD_SET,
  buildFieldValueStyle,
} from '../../../../model/card-grid-section/cardGridFieldStyleModel';
import { renderFieldSlotValue } from './cardFieldValueRenderer';
import styles from '../CardGridSection.module.css';

export default function CardFieldSlot({ slot, product }) {
  const label = slot.label || STOREFRONT_FIELD_LABELS[slot.field] || slot.field;
  const className = PRICE_FIELD_SET.has(slot.field)
    ? styles.priceField
    : styles.field;

  return (
    <div className={className}>
      <span className={styles.fieldLabel}>{label}</span>
      <span
        className={styles.fieldValue}
        style={buildFieldValueStyle(slot.style)}
      >
        {renderFieldSlotValue(slot.field, product?.[slot.field])}
      </span>
    </div>
  );
}
