import { formatFieldDisplayValue } from '../../../../model/card-grid-section/cardFieldRenderModel';
import { isUrlValue } from '../../../../model/card-grid-section/cardGridFieldStyleModel';
import { PESTICIDE_INFO_LINK_FIELD } from '../../../../model/view/pesticideInfoLinkModel';
import styles from '../CardGridSection.module.css';

export function renderFieldSlotValue(field, value) {
  if (field === PESTICIDE_INFO_LINK_FIELD && isUrlValue(value)) {
    return (
      <a
        href={value}
        className={styles.fieldValueLink}
        target="_blank"
        rel="noopener noreferrer"
      >
        농약상세정보
      </a>
    );
  }

  if (isUrlValue(value)) {
    return (
      <a
        href={value}
        className={styles.fieldValueLink}
        target="_blank"
        rel="noreferrer"
      >
        바로가기
      </a>
    );
  }

  return formatFieldDisplayValue(field, value);
}
