import { useId } from 'react';

import InformationText from './InformationText';
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
            <dd className={styles.entryDescription}>
              <InformationText text={entry.description} />
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export default function OfficeInformationPanel({ entries = [] }) {
  const titleId = useId();

  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby={titleId}
      data-testid="storefront-office-information"
    >
      <h2 id={titleId} className={styles.panelTitle}>
        사무소 안내
      </h2>
      <InformationEntryList entries={entries} />
    </section>
  );
}
