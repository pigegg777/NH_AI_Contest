import { useId } from 'react';

import InformationText from './InformationText';
import styles from './CategoryInformationPanel.module.css';

/** 상품 분류 탭을 열었을 때 먼저 보여주는 안내 패널. */
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
      <h2 id={titleId} className={styles.title}>
        {categoryName} 안내
      </h2>

      <dl className={styles.entryList}>
        {entries.map((entry) => (
          <div key={entry.id} className={styles.entry}>
            {entry.label ? (
              <dt className={styles.entryLabel}>{entry.label}</dt>
            ) : null}
            {entry.description ? (
              <dd className={styles.entryDescription}>
                <InformationText text={entry.description} />
              </dd>
            ) : null}
          </div>
        ))}
      </dl>

      <p
        className={styles.productHint}
        role="note"
        aria-label="상품정보를 보려면 위의 전체를 선택하세요."
      >
        상품정보를 보려면 위의 <strong>전체</strong>를 선택하세요.
      </p>
    </section>
  );
}
