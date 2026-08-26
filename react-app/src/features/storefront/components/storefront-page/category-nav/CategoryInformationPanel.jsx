import { useId } from 'react';

import styles from './CategoryInformationPanel.module.css';

/**
 * 중분류 칩의 `{분류명} 정보` 탭이 여는 패널. 사무소 정보 탭과 내용이 겹치지만,
 * 그 분류를 보고 있는 구매자가 바로 읽을 수 있는 경로다.
 */
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
