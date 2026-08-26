import { useId } from 'react';

import { normalizeCardStyle } from '../../../model/card-design/style/cardStyleModel';
import { buildShellCssVars } from '../../../model/card-grid-section/cardGridFieldStyleModel';
import styles from './CategoryInformationPanel.module.css';

export default function CategoryInformationPanel({
  id,
  categoryName,
  description,
  cardStyle,
}) {
  const titleId = useId();

  if (!description) {
    return null;
  }

  const cssVars = buildShellCssVars(normalizeCardStyle(cardStyle));

  return (
    <section
      id={id}
      className={styles.panel}
      aria-labelledby={titleId}
      data-testid="storefront-category-information"
      style={cssVars}
    >
      <div className={styles.headingRow}>
        <span className={styles.icon} aria-hidden="true">
          i
        </span>
        <h2 id={titleId} className={styles.title}>
          {categoryName} 안내
        </h2>
      </div>

      <p className={styles.description}>{description}</p>

      <p className={styles.helper}>상품을 보려면 위 중분류를 선택하세요.</p>
    </section>
  );
}
