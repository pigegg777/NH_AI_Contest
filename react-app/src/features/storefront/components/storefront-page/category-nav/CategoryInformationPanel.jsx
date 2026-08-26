import { useId } from 'react';

import styles from './CategoryInformationPanel.module.css';

/** 안내 분류에서 선택한 상품 분류의 항목을 보여주는 패널. */
export default function CategoryInformationPanel({
  categoryName,
  entries = [],
}) {
  const titleId = useId();

  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby={titleId}
      data-testid="storefront-category-information"
    >
      <div className={styles.headingRow}>
        <span className={styles.icon} aria-hidden="true">
          i
        </span>
        <h2 id={titleId} className={styles.title}>
          {categoryName} 안내
        </h2>
      </div>

      <dl className={styles.entryList}>
        {entries.map((entry) => (
          <div key={entry.id} className={styles.entry}>
            {entry.label ? (
              <dt className={styles.entryLabel}>{entry.label}</dt>
            ) : null}
            {entry.description ? (
              <dd className={styles.entryDescription}>{entry.description}</dd>
            ) : null}
          </div>
        ))}
      </dl>

      <p className={styles.helper}>다른 안내는 위 안내 항목에서 선택하세요.</p>
    </section>
  );
}
