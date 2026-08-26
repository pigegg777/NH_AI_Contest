import { useId } from 'react';

import styles from './OfficeInformationPanel.module.css';

function InformationEntryList({ entries }) {
  return (
    <dl className={styles.entryList}>
      {entries.map((entry) => (
        <div key={entry.id} className={styles.entry}>
          {entry.label ? (
            <dt
              className={styles.entryLabel}
              data-testid={`storefront-office-information-label-${entry.id}`}
            >
              {entry.label}
            </dt>
          ) : null}
          {entry.description ? (
            <dd className={styles.entryDescription}>{entry.description}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/**
 * 대분류 칩의 `사무소 정보` 탭이 여는 패널. 사무소 안내와 모든 분류의 안내를
 * 한 화면에 모아 보여준다. 문구 자체는 판매자가 표시항목 선택에서 쓴다.
 */
export default function OfficeInformationPanel({
  officeEntries = [],
  categoryGroups = [],
}) {
  const titleId = useId();

  if (officeEntries.length === 0 && categoryGroups.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby={titleId}
      data-testid="storefront-office-information"
    >
      <h2 id={titleId} className={styles.panelTitle}>
        안내
      </h2>

      {officeEntries.length > 0 ? (
        <div
          className={styles.block}
          data-testid="storefront-office-information-office"
        >
          <h3 className={styles.blockTitle}>사무소 안내</h3>
          <InformationEntryList entries={officeEntries} />
        </div>
      ) : null}

      {categoryGroups.map((group) => (
        <div
          key={group.categoryName}
          className={styles.block}
          data-testid={`storefront-office-information-group-${group.categoryName}`}
        >
          <h3 className={styles.blockTitle}>{group.categoryName}</h3>
          <InformationEntryList entries={group.entries} />
        </div>
      ))}
    </section>
  );
}
