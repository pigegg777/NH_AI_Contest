import { formatFieldDisplayValue } from '../../model/card-design/cardFieldRenderModel';
import { isUrlValue } from '../../model/card-grid-section/cardGridFieldStyleModel';
import styles from '../CardGridSection.module.css';

export function renderFieldSlotValue(field, value) {
  if (isUrlValue(value)) {
    return (
      <a
        href={value}
        className={styles.fieldValueLink}
        target="_blank"
        rel="noreferrer"
      >
        View
      </a>
    );
  }

  return formatFieldDisplayValue(field, value);
}
